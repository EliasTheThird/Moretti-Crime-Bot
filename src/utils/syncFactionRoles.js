const { fetchFactionMembers } = require('./tornApi');
const {
  factionMemberRoleId,
  positionRoles,
  exemptRoleId,
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
        ...Object.values(positionRoles),
      ].filter((id) => guildMember.roles.cache.has(id));

      if (rolesToRemove.length) await guildMember.roles.remove(rolesToRemove);
      removeVerified(discordId);
      removedFromLeavers++;
      continue;
    }

    const correctPositionRoleId = positionRoles[tornMember.position];

    const staleRoles = Object.values(positionRoles).filter(
      (id) => id !== correctPositionRoleId && guildMember.roles.cache.has(id)
    );
    if (staleRoles.length) await guildMember.roles.remove(staleRoles);

    const rolesToAdd = [factionMemberRoleId];
    if (correctPositionRoleId) rolesToAdd.push(correctPositionRoleId);

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