const { syncFactionRoles } = require('../../utils/syncFactionRoles');
const { syncIntervalMinutes } = require('../../../config.json');

// Runs alongside your other events/ready/ handlers (e.g. consoleLog.js) -
// eventHandler.js calls every file in this folder when the client fires "ready".
module.exports = async (client) => {
  const minutes = syncIntervalMinutes || 60;
  const intervalMs = minutes * 60 * 1000;

  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const result = await syncFactionRoles(guild);
        console.log(
          `[AutoSync] ${guild.name}: updated ${result.updated}, ` +
            `removed ${result.removedFromLeavers}, exempted ${result.exempted}, ` +
            `goneFromServer ${result.goneFromServer}`
        );
      } catch (error) {
        console.log(`[AutoSync] Error syncing ${guild.name}: ${error}`);
      }
    }
  }, intervalMs);

  console.log(`Auto-sync scheduled every ${minutes} minute(s).`);
};