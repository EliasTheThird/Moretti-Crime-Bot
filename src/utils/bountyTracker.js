const { EmbedBuilder } = require('discord.js');
const { fetchFactionMembers, fetchBountiesForUser } = require('./tornApi');
const { getAllVerified } = require('./verifiedMembers');
const {
  getTrackedBountyIds,
  addTrackedBountyId,
  pruneTrackedBountyIds,
} = require('./trackedBounties');
const { tornFactionId, bountyChannelId } = require('../../config.json');

/**
 * Normalizes a raw bounty entry from Torn's v2 API. Confirmed live against
 * a real fetchBountiesForUser() response on 2026-08-27:
 *
 * {
 *   "target_id": 4068727, "target_name": "BadMule", "target_level": 33,
 *   "lister_id": 4230945, "lister_name": "AlexADT", "reward": 100000,
 *   "reason": "...", "quantity": 5, "is_anonymous": false,
 *   "valid_until": 1788424849
 * }
 *
 * Important: Torn does NOT return a unique bounty id. Multiple stacked
 * bounties from the same lister with the same reward/reason are collapsed
 * into one object with a "quantity" count. Since there's nothing to key
 * dedup off of, we build a synthetic id from target + lister + reward +
 * valid_until. If a new bounty is added with different terms, or the
 * expiry changes, this will (correctly) be treated as new and re-alerted.
 *
 * NOTE: the target ID must stay as the FIRST segment of this id - trackedBounties.js
 * parses it back out (id.split(':')[0]) to know which target a stored id
 * belongs to when deciding what's safe to prune.
 */
function normalizeBounty(raw, targetId, targetName) {
  const listerId = raw.lister_id ?? 'anon';
  return {
    id: `${targetId}:${listerId}:${raw.reward}:${raw.valid_until}`,
    targetId: String(targetId),
    targetName,
    reward: raw.reward ?? 0,
    reason: raw.reason || null,
    quantity: raw.quantity ?? 0,
    isAnonymous: Boolean(raw.is_anonymous),
    listerId: raw.lister_id ?? null,
    listerName: raw.lister_name ?? null,
    validUntil: raw.valid_until ?? null,
  };
}

/**
 * Checks every faction member for active bounties and posts an alert to
 * `bountyChannelId` for any new one found. Calls Torn's per-user bounties
 * endpoint once per faction member (25-30 calls for a small faction),
 * rather than paging through the entire game-wide bounty board.
 */
async function checkBounties(client) {
  if (!bountyChannelId) {
    console.log('[BountyTracker] No bountyChannelId set in config.json - skipping.');
    return;
  }

  const channel = await client.channels.fetch(bountyChannelId).catch(() => null);
  if (!channel) {
    console.log('[BountyTracker] Could not find bounty channel - check bountyChannelId.');
    return;
  }

  const rosterMembers = await fetchFactionMembers(tornFactionId, process.env.TORN_API_KEY);
  const verified = getAllVerified();

  // Reverse lookup so we can @mention verified members - used for both the
  // target AND the lister, since either one could be a faction member.
  const tornIdToDiscordId = {};
  for (const [discordId, record] of Object.entries(verified)) {
    tornIdToDiscordId[record.tornId] = discordId;
  }

  const trackedIds = getTrackedBountyIds();
  const stillActiveIds = new Set();

  // Which targets we actually got a successful response for this cycle.
  // Only these targets' old tracked IDs are eligible for pruning - if a
  // target's fetch failed (Torn backend error, rate limit, etc.) we keep
  // all of their previously-tracked IDs untouched rather than risk
  // re-alerting on a bounty that's still active but we just couldn't see.
  const fetchedTargetIds = new Set();

  let posted = 0;

  for (const [tornId, member] of Object.entries(rosterMembers)) {
    let rawBounties;
    try {
      rawBounties = await fetchBountiesForUser(tornId, process.env.TORN_API_KEY);
    } catch (error) {
      console.log(
        `[BountyTracker] Failed to fetch bounties for ${member.name} [${tornId}]: ${error}`
      );
      continue;
    }

    fetchedTargetIds.add(String(tornId));

    for (const raw of rawBounties) {
      const bounty = normalizeBounty(raw, tornId, member.name);
      stillActiveIds.add(bounty.id);

      if (trackedIds.has(bounty.id)) continue; // already alerted on this one

      // Target: verified members' nicknames already include "[tornId]" (set
      // by /verify and syncFactionRoles), so the mention alone carries the
      // ID - no need to append it again. Unverified fallback is just the name.
      const targetDiscordId = tornIdToDiscordId[tornId];
      const targetText = targetDiscordId
        ? `<@${targetDiscordId}>`
        : bounty.targetName;

      // Placed by: mention them the same way if they're ALSO a verified
      // faction member. Otherwise fall back to plain name, and in that case
      // (no mention/nickname to carry it) append the Torn ID for clarity.
      const listerDiscordId = bounty.listerId
        ? tornIdToDiscordId[String(bounty.listerId)]
        : null;

      let listerText;
      if (bounty.isAnonymous) {
        listerText = 'Anonymous';
      } else if (listerDiscordId) {
        listerText = `<@${listerDiscordId}>`;
      } else if (bounty.listerName) {
        listerText = bounty.listerId
          ? `${bounty.listerName} [${bounty.listerId}]`
          : bounty.listerName;
      } else {
        listerText = 'Unknown';
      }

      const embed = new EmbedBuilder()
        .setTitle('🎯 New Bounty Placed on a Faction Member')
        .setColor(0xcc0000)
        .addFields(
          { name: 'Target', value: targetText, inline: true },
          { name: 'Placed by', value: listerText, inline: true },
          { name: 'Reward', value: `$${Number(bounty.reward).toLocaleString()}`, inline: true },
          { name: 'Quantity', value: String(bounty.quantity), inline: true }
        );

      if (bounty.reason) {
        embed.addFields({ name: 'Reason', value: bounty.reason });
      }

      await channel.send({ embeds: [embed] });
      addTrackedBountyId(bounty.id);
      posted++;
    }
  }

  pruneTrackedBountyIds(stillActiveIds, fetchedTargetIds);

  if (posted) {
    console.log(`[BountyTracker] Posted ${posted} new bounty alert(s).`);
  }
}

module.exports = { checkBounties };