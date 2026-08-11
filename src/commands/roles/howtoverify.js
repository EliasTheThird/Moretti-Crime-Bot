const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'howtoverify',
  description: 'Posts a guide explaining how to verify your Torn account.',

  callback: async (client, interaction) => {
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('📋 How to Verify')
      .setDescription(
        "Verifying links your Discord account to your Torn character so we can keep faction roles up to date automatically. Here's how:"
      )
      .addFields(
        {
          name: '1️⃣ Get your Torn API key',
          value:
            'In Torn, go to **Settings → API** and generate a new key.',
        },
        {
          name: '2️⃣ Use "Public Only" access',
          value:
            "That's all we need — no need to give a higher access level. We never store your key, and you're free to delete it right after you verify if you'd like.",
        },
        {
          name: '3️⃣ Run the command',
          value:
            `Head over to <#1439720596727660666> and run \`/verify api_key:YOUR_KEY_HERE\`.`,
        },
        {
          name: '4️⃣ Done!',
          value:
            "You'll get a confirmation once it's verified, and your roles/nickname will update automatically.",
        }
      )
      .setFooter({
        text: 'Want to bypass this and verify a different way? Message HankyPete.',
      });

    await interaction.channel.send({
      embeds: [embed],
    });

    // Acknowledge the interaction so Discord doesn't show "This interaction failed"
    await interaction.reply({
      content: '✅ Posted the verification guide.',
      flags: MessageFlags.Ephemeral,
    });
  },
};