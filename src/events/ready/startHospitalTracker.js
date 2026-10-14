const { checkHospitalReleases } = require('../../utils/hospitalTracker');
const { hospitalCheckIntervalSeconds } = require('../../../config.json');

// Runs alongside your other events/ready/ handlers (e.g. consoleLog.js,
// startAutoSync.js, startBountyTracker.js) - eventHandler.js calls every
// file in this folder when the client fires "ready".
//
// This needs to poll much more often than role-sync/bounty checks since
// we're trying to catch a ~2-minute warning window before release - a
// short interval (default 60s) is what makes that window reliable.
module.exports = async (client) => {
  const seconds = hospitalCheckIntervalSeconds || 60;
  const intervalMs = seconds * 1000;

  setInterval(() => {
    checkHospitalReleases(client).catch((error) => {
      console.log(`[HospitalTracker] Error checking hospital releases: ${error}`);
    });
  }, intervalMs);

  console.log(`Hospital-release tracker scheduled every ${seconds} second(s).`);
};