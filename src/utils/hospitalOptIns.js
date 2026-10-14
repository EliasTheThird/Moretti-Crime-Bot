const fs = require('fs');
const path = require('path');

// Stored at <repo root>/data/hospitalOptIns.json - add this to .gitignore
// (same treatment as verifiedMembers.json/trackedBounties.json).
// Just a set of Discord IDs who've opted in to hospital-release pings.
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'hospitalOptIns.json');

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

function enableHospitalPing(discordId) {
  const store = loadStore();
  store[discordId] = { enabledAt: Date.now() };
  saveStore(store);
}

function disableHospitalPing(discordId) {
  const store = loadStore();
  if (store[discordId]) {
    delete store[discordId];
    saveStore(store);
  }
}

function isHospitalPingEnabled(discordId) {
  const store = loadStore();
  return Boolean(store[discordId]);
}

function getEnabledDiscordIds() {
  return Object.keys(loadStore());
}

module.exports = {
  enableHospitalPing,
  disableHospitalPing,
  isHospitalPingEnabled,
  getEnabledDiscordIds,
};