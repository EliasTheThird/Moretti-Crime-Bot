const fs = require('fs');
const path = require('path');

// Stored at <repo root>/data/verifiedMembers.json - add this to .gitignore,
// since it maps your members' Discord IDs to their Torn IDs.
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'verifiedMembers.json');

function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return {}; // file doesn't exist yet or is unreadable - start fresh
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
}

/**
 * Records that this Discord user owns this Torn character. This is the
 * ONLY thing role-syncing trusts for identity - nicknames are cosmetic only.
 */
function setVerified(discordId, { tornId, name }) {
  const store = loadStore();
  store[discordId] = { tornId: String(tornId), name, verifiedAt: Date.now() };
  saveStore(store);
}

function removeVerified(discordId) {
  const store = loadStore();
  if (store[discordId]) {
    delete store[discordId];
    saveStore(store);
  }
}

function getAllVerified() {
  return loadStore(); // { [discordId]: { tornId, name, verifiedAt } }
}

module.exports = { setVerified, removeVerified, getAllVerified };