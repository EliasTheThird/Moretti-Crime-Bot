module.exports = {
  // The role EVERY faction member should get, regardless of position

  factionMemberRoleId: '1536494952375263312',
  
  // factionMemberRoleId: '1471678120099713106',

  // Members with this role are completely ignored by /verify's sync logic
  // and the auto-sync (e.g. for allies, honorary members, staff alts). Leave
  // as null to disable.
  exemptRoleId: '1536497076719067136',

  // Map each Torn position name to its Discord role ID.
  // The key must match the "position" string Torn's API returns EXACTLY
  // (log a roster fetch once to confirm the exact strings your faction uses).
  positionRoles: {
     'Hanky': '1536494900231802962',

    // 'Leader': '1439718568907243550',
    // 'Co-leader': '1439718836147585175',
    // 'Hanky': '1439719992341041192',
    // 'Mort': '1470135972329947321',
    // 'Tribal Chief': '1465039744621740042',
    // 'Consigliere': '1471252557979713797',
    // 'Caporegime': '1471252976583573514',
    // 'Soldier': '1439719298934378516',
  
  },
};