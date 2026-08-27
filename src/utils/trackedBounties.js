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
 */
function pruneTrackedBountyIds(stillActiveIds) {
  const ids = loadStore().filter((id) => stillActiveIds.has(id));
  saveStore(ids);
}

module.exports = { getTrackedBountyIds, addTrackedBountyId, pruneTrackedBountyIds };