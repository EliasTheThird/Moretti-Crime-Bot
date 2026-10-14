const { fetchFactionMembers } = require('./tornApi');
const { getAllVerified } = require('./verifiedMembers');
const { getEnabledDiscordIds } = require('./hospitalOptIns');
const { alreadyWarned, markWarned, clearWarning } = require('./hospitalAlertState');
const {
  tornFactionId,
  hospitalChannelId,
  hospitalWarningSeconds,
} = require('../../config.json');

const DEFAULT_WARNING_SECONDS = 120;

/**
 * Checks every opted-in, verified member's live Torn status and pings
 * `hospitalChannelId` once each time one of them is about to leave the
 * hospital - useful during war for turtling/timing coordination.
 *
 * Relies on `fetchFactionMembers`'s "basic" selection, which already
 * includes each member's `status` object:
 *   status: { description, details, state: "Hospital"|"Okay"|..., until }
 * `until` is a unix-seconds timestamp for when they're released. No extra
 * Torn API calls needed beyond the roster fetch you already make for role
 * syncing. Confirmed live against a real hospitalized roster on 2026-09-05.
 */
async function checkHospitalReleases(client) {
  if (!hospitalChannelId) {
    console.log('[HospitalTracker] No hospitalChannelId set in config.json - skipping.');
    return;
  }

  const enabledDiscordIds = getEnabledDiscordIds();
  if (!enabledDiscordIds.length) return; // nobody's opted in - skip the API call entirely

  const channel = await client.channels.fetch(hospitalChannelId).catch(() => null);
  if (!channel) {
    console.log('[HospitalTracker] Could not find hospital channel - check hospitalChannelId.');
    return;
  }

  const rosterMembers = await fetchFactionMembers(tornFactionId, process.env.TORN_API_KEY);
  const verified = getAllVerified();
  const warningWindowMs = (hospitalWarningSeconds || DEFAULT_WARNING_SECONDS) * 1000;

  let pinged = 0;

  for (const discordId of enabledDiscordIds) {
    const record = verified[discordId];
    if (!record) continue; // opted in but not (or no longer) verified - nothing to key off of

    const tornMember = rosterMembers[record.tornId];
    if (!tornMember || !tornMember.status) continue;

    const { state, until } = tornMember.status;

    if (state !== 'Hospital' || !until) {
      // Not currently hospitalized - reset so their next stay warns fresh.
      clearWarning(record.tornId);
      continue;
    }

    const msRemaining = until * 1000 - Date.now();

    if (msRemaining <= 0) {
      // Roster hasn't refreshed their state yet even though time's up -
      // nothing useful to warn about, and about to clear on next poll anyway.
      continue;
    }

    if (msRemaining > warningWindowMs) continue; // not close enough yet

    if (alreadyWarned(record.tornId, until)) continue; // already pinged for this stay

    const minutesLeft = Math.max(1, Math.round(msRemaining / 60000));

    await channel.send(
      `🏥 <@${discordId}> is coming out of hospital in ~${minutesLeft} minute${
        minutesLeft === 1 ? '' : 's'
      } - get ready.`
    );

    markWarned(record.tornId, until);
    pinged++;
  }

  if (pinged) {
    console.log(`[HospitalTracker] Sent ${pinged} hospital-release ping(s).`);
  }
}

module.exports = { checkHospitalReleases };