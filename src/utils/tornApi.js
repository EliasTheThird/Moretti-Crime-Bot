const TORN_API_BASE = 'https://api.torn.com';
const TORN_API_V2_BASE = 'https://api.torn.com/v2';

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
 * Fetches bounties placed on a SPECIFIC player via Torn's v2 API
 * (GET /v2/user/{id}/bounties). This avoids paging through the entire
 * game-wide bounty board (200+ pages) - for a small faction, calling this
 * once per member (25-30 calls) is far cheaper. Only requires a Public
 * access key.
 */
async function fetchBountiesForUser(tornId, apiKey) {
  const url = `${TORN_API_V2_BASE}/user/${tornId}/bounties?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Torn API error: ${data.error.error}`);
  }

  return data.bounties || []; // array of bounties placed on this specific user
}

/**
 * Fetches faction position definitions (GET /v2/faction/{id}/positions),
 * used by syncFactionRoles.js to determine which positions currently have
 * money-giving permission for the dynamic Banker role. Requires a key
 * with Faction API Access - if the key lacks it, this call fails and the
 * caller falls back to the hardcoded Leader/Co-leader-only list.
 *
 * VERIFIED against a live response on 2026-08-28: `data.positions` is an
 * ARRAY of objects, each shaped like:
 *   { name: "Hanky", is_default: false, abilities: ["Medical Usage", "Money Giving", ...] }
 * There is no boolean/int permission flag - money-giving is just the
 * string "Money Giving" inside the `abilities` array. Normalized here into
 * { [positionName]: { canGiveMoney: boolean } } so callers don't need to
 * know about the raw shape.
 */
async function fetchFactionPositions(factionId, apiKey) {
  const url = `${TORN_API_V2_BASE}/faction/${factionId}/positions?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Torn API error: ${data.error.error}`);
  }

  const normalized = {};
  for (const position of data.positions || []) {
    normalized[position.name] = {
      canGiveMoney: (position.abilities || []).includes('Money Giving'),
    };
  }

  return normalized; // { [positionName]: { canGiveMoney: boolean } }
}

module.exports = {
  fetchFactionMembers,
  fetchUserProfile,
  fetchBountiesForUser,
  fetchFactionPositions,
};