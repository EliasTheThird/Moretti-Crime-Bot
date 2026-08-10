const TORN_API_BASE = 'https://api.torn.com';

/**
 * Fetches the current faction roster from the Torn API.
 * Returns an object keyed by Torn player ID:
 * { "123456": { name: "PlayerName", position: "Officer", ... }, ... }
 */
async function fetchFactionMembers(factionId, apiKey) {
  const url = `${TORN_API_BASE}/faction/${factionId}?selections=basic&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Torn API error: ${data.error.error}`);
  }

  return data.members; // { [tornId]: { name, position, ... } }
}

/**
 * Fetches the profile of whoever OWNS the given API key.
 * This is what makes verification trustworthy: Torn resolves the key
 * to its owner server-side, so the caller can't spoof another player's ID.
 * Requires a key with at least "Limited Access" (the "profile" selection).
 */
async function fetchUserProfile(apiKey) {
  const url = `${TORN_API_BASE}/user/?selections=profile&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Torn API error: ${data.error.error}`);
  }

  return data; // { player_id, name, faction: { faction_id, position, ... }, ... }
}

module.exports = { fetchFactionMembers, fetchUserProfile };