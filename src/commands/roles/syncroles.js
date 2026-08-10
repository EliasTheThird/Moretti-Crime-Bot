const { PermissionsBitField } = require('discord.js');
const { syncFactionRoles } = require('../../utils/syncFactionRoles');

module.exports = {
  name: 'syncroles',
  description:
    "Manually sync every verified member's Discord roles with their current Torn faction position.",
  permissionsRequired: [PermissionsBitField.Flags.ManageRoles],

  callback: async (client, interaction) => {
    await interaction.deferReply();

    try {
      const result = await syncFactionRoles(interaction.guild);

      await interaction.editReply(
        `Sync complete.\n` +
          `• Updated roles for **${result.updated}** member(s)\n` +
          `• Removed faction roles from **${result.removedFromLeavers}** member(s) who left the faction\n` +
          `• Skipped **${result.exempted}** exempt member(s)\n` +
          `• Skipped **${result.goneFromServer}** verified member(s) no longer in this server`
      );
    } catch (error) {
      console.log(`Error in /syncroles: ${error}`);
      await interaction.editReply('Something went wrong syncing roles.');
    }
  },
};