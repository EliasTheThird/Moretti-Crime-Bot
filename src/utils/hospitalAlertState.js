const fs = require('fs');
const path = require('path');

// Stored at <repo root>/data/hospitalAlertState.json - add this to
// .gitignore. Tracks, per Torn ID, the `until` timestamp of the hospital
// stay we last warned about. Torn's `status.until` is stable for the
// duration of a single stay, so comparing against it is how we avoid
// re-pinging every poll cycle while someone sits in the warning window.
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'hospitalAlertState.json');

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
 * Returns true if we've already sent the warning for this specific
 * hospital stay (identified by its `until` timestamp).
 */
function alreadyWarned(tornId, until) {
  const store = loadStore();
  return store[tornId] === until;
}

function markWarned(tornId, until) {
  const store = loadStore();
  store[tornId] = until;
  saveStore(store);
}

/**
 * Clears the record once someone's no longer in hospital, so their NEXT
 * stay (a new `until` value) is free to trigger a fresh warning. Not
 * strictly required since a new stay has a different `until` anyway, but
 * keeps the file from accumulating stale entries forever.
 */
function clearWarning(tornId) {
  const store = loadStore();
  if (store[tornId] !== undefined) {
    delete store[tornId];
    saveStore(store);
  }
}

module.exports = { alreadyWarned, markWarned, clearWarning };