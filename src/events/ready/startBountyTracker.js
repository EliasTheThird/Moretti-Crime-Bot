const { checkBounties } = require('../../utils/bountyTracker');
const { bountyCheckIntervalMinutes } = require('../../../config.json');

// Runs alongside your other events/ready/ handlers (e.g. consoleLog.js,
// startAutoSync.js) - eventHandler.js calls every file in this folder when
// the client fires "ready".
module.exports = async (client) => {
  const minutes = bountyCheckIntervalMinutes || 5;
  const intervalMs = minutes * 60 * 1000;

  setInterval(() => {
    checkBounties(client).catch((error) => {
      console.log(`[BountyTracker] Error checking bounties: ${error}`);
    });
  }, intervalMs);

  console.log(`Bounty tracker scheduled every ${minutes} minute(s).`);
};