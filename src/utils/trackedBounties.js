const fs = require('fs');
const path = require('path');

// Stored at <repo root>/data/trackedBounties.json - add this to .gitignore.
// Just a list of bounty IDs we've already alerted on, so restarts and
// repeated sync cycles don't re-post the same bounty.
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'trackedBounties.json');

function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return []; // file doesn't exist yet or is unreadable - start fresh
  }
}

function saveStore(ids) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(ids, null, 2));
}

function getTrackedBountyIds() {
  return new Set(loadStore());
}

function addTrackedBountyId(id) {
  const ids = loadStore();
  if (!ids.includes(id)) {
    ids.push(id);
    saveStore(ids);
  }
}

/**
 * Drops IDs for bounties that are no longer active (claimed, expired, or
 * removed) so the store doesn't grow forever. Pass in every bounty ID seen
 * as still-active during the current sync pass.
 *
 * `fetchedTargetIds` is the set of Torn IDs (as strings) we successfully
 * queried this cycle. This is required: if a member's bounty fetch failed
 * (e.g. a Torn API backend error), we have NO information about their
 * bounties this cycle, so we must NOT prune their previously-tracked IDs -
 * doing so would make a still-active bounty look "new" again the next time
 * the fetch succeeds, causing a duplicate repost. A tracked ID is only
 * eligible for removal if its target was actually fetched this cycle and
 * the bounty didn't show up in the results.
 */
function pruneTrackedBountyIds(stillActiveIds, fetchedTargetIds) {
  const ids = loadStore().filter((id) => {
    if (stillActiveIds.has(id)) return true; // confirmed still active

    const targetId = id.split(':')[0];
    if (!fetchedTargetIds || !fetchedTargetIds.has(targetId)) {
      // We never got a successful fetch for this target this cycle -
      // don't guess, just keep the ID until we know for sure.
      return true;
    }

    return false; // target was fetched successfully and this ID wasn't in it
  });
  saveStore(ids);
}

module.exports = { getTrackedBountyIds, addTrackedBountyId, pruneTrackedBountyIds };