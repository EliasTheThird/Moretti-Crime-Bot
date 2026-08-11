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

/**
 * Fetches the faction's custom positions and their permissions.
 * Requires a key with Faction API Access.
 * Note: built-in ranks like Leader/Co-leader never appear here - only
 * custom positions created on the Faction > Controls > Positions page do.
 * Returns: { [positionName]: { canGiveMoney: 0|1, canKickMembers: 0|1, ... } }
 */
async function fetchFactionPositions(factionId, apiKey) {
  const url = `${TORN_API_BASE}/faction/${factionId}?selections=positions&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Torn API error: ${data.error.error}`);
  }

  return data.positions; // { [positionName]: { canGiveMoney, ... } }
}

module.exports = { fetchFactionMembers, fetchUserProfile, fetchFactionPositions };