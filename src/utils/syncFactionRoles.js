const { fetchFactionMembers, fetchFactionPositions } = require('./tornApi');
const {
  factionMemberRoleId,
  positionRoles,
  exemptRoleId,
  bankerRoleId,
  alwaysBankerPositions,
} = require('./positionRoles');
const { getAllVerified, removeVerified } = require('./verifiedMembers');
const { tornFactionId } = require('../../config.json');

/**
 * Syncs every verified, non-exempt, non-bot member's roles in `guild`
 * against the live Torn faction roster. Identity is resolved purely from
 * the verifiedMembers store (Discord ID -> Torn ID), never from nicknames,
 * so editing a nickname can't spoof another member's role.
 */
async function syncFactionRoles(guild) {
  const rosterMembers = await fetchFactionMembers(
    tornFactionId,
    process.env.TORN_API_KEY
  );

  // Determine which positions currently have money-giving permission.
  // Falls back to just the always-banker list if the key lacks Faction
  // API Access or the call fails for any reason.
  const bankerPositions = new Set(alwaysBankerPositions);
  try {
    const positions = await fetchFactionPositions(
      tornFactionId,
      process.env.TORN_API_KEY
    );
    for (const [name, perms] of Object.entries(positions)) {
      if (perms.canGiveMoney) bankerPositions.add(name);
    }
  } catch (error) {
    console.log(
      `[SyncRoles] Couldn't fetch positions, banker role using fallback only: ${error}`
    );
  }

  const verified = getAllVerified();

  let updated = 0;
  let removedFromLeavers = 0;
  let exempted = 0;
  let goneFromServer = 0;

  for (const [discordId, record] of Object.entries(verified)) {
    let guildMember;
    try {
      guildMember = await guild.members.fetch(discordId);
    } catch {
      // No longer in this Discord server - nothing to update here
      goneFromServer++;
      continue;
    }

    if (guildMember.user.bot) continue;

    if (exemptRoleId && guildMember.roles.cache.has(exemptRoleId)) {
      exempted++;
      continue;
    }

    const tornMember = rosterMembers[record.tornId];

    if (!tornMember) {
      // No longer in the faction -> strip roles and drop their record
      // (they'll need to /verify again if they rejoin)
      const rolesToRemove = [
        factionMemberRoleId,
        bankerRoleId,
        ...Object.values(positionRoles),
      ].filter((id) => guildMember.roles.cache.has(id));

      if (rolesToRemove.length) await guildMember.roles.remove(rolesToRemove);
      removeVerified(discordId);
      removedFromLeavers++;
      continue;
    }

    const correctPositionRoleId = positionRoles[tornMember.position];
    const shouldHaveBanker = bankerPositions.has(tornMember.position);

    const staleRoles = [
      ...Object.values(positionRoles).filter(
        (id) => id !== correctPositionRoleId && guildMember.roles.cache.has(id)
      ),
      ...(!shouldHaveBanker && guildMember.roles.cache.has(bankerRoleId)
        ? [bankerRoleId]
        : []),
    ];
    if (staleRoles.length) await guildMember.roles.remove(staleRoles);

    const rolesToAdd = [factionMemberRoleId];
    if (correctPositionRoleId) rolesToAdd.push(correctPositionRoleId);
    if (shouldHaveBanker) rolesToAdd.push(bankerRoleId);

    const missingRoles = rolesToAdd.filter(
      (id) => !guildMember.roles.cache.has(id)
    );
    if (missingRoles.length) await guildMember.roles.add(missingRoles);

    // Re-correct their nickname in case it was manually edited - cosmetic
    // only, but keeps things tidy and defeats nickname tampering
    const expectedNick = `${tornMember.name} [${record.tornId}]`;
    if (guildMember.nickname !== expectedNick) {
      await guildMember.setNickname(expectedNick).catch(() => {});
    }

    if (staleRoles.length || missingRoles.length) updated++;
  }

  return { updated, removedFromLeavers, exempted, goneFromServer };
}

module.exports = { syncFactionRoles };