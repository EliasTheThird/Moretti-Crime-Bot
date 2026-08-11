const { MessageFlags } = require('discord.js');
const { fetchUserProfile, fetchFactionPositions } = require('../../utils/tornApi');
const {
  factionMemberRoleId,
  positionRoles,
  bankerRoleId,
  alwaysBankerPositions,
} = require('../../utils/positionRoles');
const { setVerified } = require('../../utils/verifiedMembers');
const { tornFactionId } = require('../../../config.json');

module.exports = {
  name: 'verify',
  description: 'Link your Discord account to your Torn character.',
  options: [
    {
      name: 'api_key',
      description:
        'Your Torn API key (Public Only works). Used once to verify you, never stored.',
      type: 3, // ApplicationCommandOptionType.String
      required: true,
    },
  ],

  callback: async (client, interaction) => {
    // Kept ephemeral: this is where the api_key input lives, and ephemeral
    // replies (unlike public ones) hide the whole interaction from other
    // members, not just the response text.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const apiKey = interaction.options.getString('api_key');
      const profile = await fetchUserProfile(apiKey);

      if (
        !profile.faction ||
        String(profile.faction.faction_id) !== String(tornFactionId)
      ) {
        return interaction.editReply(
          "That key isn't tied to a member of this faction. Double-check you're in the faction and try again."
        );
      }

      const guildMember = interaction.member;

      // This is the source of truth for role syncing from now on.
      // Because it's keyed by Discord ID and set only after Torn confirms
      // the key's owner, editing a nickname later can't spoof it.
      setVerified(interaction.user.id, {
        tornId: profile.player_id,
        name: profile.name,
      });

      const newNick = `${profile.name} [${profile.player_id}]`;
      await guildMember.setNickname(newNick).catch(() => {
        // Bot may lack permission to rename this specific user (e.g. server owner)
      });

      const rolesToAdd = [factionMemberRoleId];
      const positionRoleId = positionRoles[profile.faction.position];
      if (positionRoleId) rolesToAdd.push(positionRoleId);

      // Banker role: built-in Leader/Co-leader ranks always qualify, custom
      // positions are checked live against the faction's Give Money permission.
      let isBanker = alwaysBankerPositions.includes(profile.faction.position);
      if (!isBanker) {
        try {
          const positions = await fetchFactionPositions(
            tornFactionId,
            process.env.TORN_API_KEY
          );
          isBanker = positions[profile.faction.position]?.canGiveMoney === 1;
        } catch (error) {
          console.log(
            `[Verify] Couldn't fetch positions for banker check: ${error}`
          );
        }
      }
      if (isBanker) rolesToAdd.push(bankerRoleId);

      await guildMember.roles.add(rolesToAdd);

      // Private confirmation to the user themselves
      await interaction.editReply(
        `Verified! Linked to **${profile.name}** [${profile.player_id}] — Position: **${profile.faction.position}**.`
      );

      // Public announcement in the channel, with no sensitive info in it
      await interaction.channel
        .send(
          `✅ ${guildMember} verified as **${profile.name}** [${profile.player_id}] — Position: **${profile.faction.position}**.`
        )
        .catch((error) => {
          console.log(`[Verify] Couldn't send public confirmation: ${error}`);
        });
    } catch (error) {
      console.log(`Error in /verify: ${error}`);
      await interaction.editReply(
        'Something went wrong verifying you. Double-check your API key and try again.'
      );
    }
  },
};