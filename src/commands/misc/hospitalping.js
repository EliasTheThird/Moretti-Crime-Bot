const { MessageFlags } = require('discord.js');
const { getAllVerified } = require('../../utils/verifiedMembers');
const {
  enableHospitalPing,
  disableHospitalPing,
  isHospitalPingEnabled,
} = require('../../utils/hospitalOptIns');

module.exports = {
  name: 'hospitalping',
  description:
    'Get pinged in the hospital-alert channel a couple minutes before you leave hospital.',
  options: [
    {
      name: 'action',
      description: 'Turn hospital-release pings on or off for yourself.',
      type: 3, // ApplicationCommandOptionType.String
      required: true,
      choices: [
        { name: 'enable', value: 'enable' },
        { name: 'disable', value: 'disable' },
      ],
    },
  ],

  callback: async (client, interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const action = interaction.options.getString('action');
      const discordId = interaction.user.id;

      const verified = getAllVerified();
      if (!verified[discordId]) {
        return interaction.editReply(
          "You need to `/verify` first so the bot knows which Torn character to watch."
        );
      }

      if (action === 'enable') {
        if (isHospitalPingEnabled(discordId)) {
          return interaction.editReply('Hospital-release pings are already **on** for you.');
        }
        enableHospitalPing(discordId);
        return interaction.editReply(
          "Hospital-release pings are now **on**. You'll get mentioned in the alert channel a couple minutes before you're released."
        );
      }

      // action === 'disable'
      if (!isHospitalPingEnabled(discordId)) {
        return interaction.editReply('Hospital-release pings are already **off** for you.');
      }
      disableHospitalPing(discordId);
      return interaction.editReply('Hospital-release pings are now **off**.');
    } catch (error) {
      console.log(`Error in /hospitalping: ${error}`);
      await interaction.editReply('Something went wrong updating your hospital-ping setting.');
    }
  },
};