const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuild } = require('../utils/store');
const { baseEmbed, BRAND, error } = require('../utils/ui');

const definitions = [
  new SlashCommandBuilder().setName('suggest').setDescription('Sendet einen Vorschlag.')
    .addStringOption(o => o.setName('text').setDescription('Dein Vorschlag').setRequired(true).setMaxLength(1500))
];

async function execute(interaction) {
  const cfg = getGuild(interaction.guild.id);
  const channel = interaction.guild.channels.cache.get(cfg.suggestionsChannelId);
  if (!channel?.isTextBased()) return interaction.reply({ embeds: [error('Suggestions sind noch nicht eingerichtet.')], ephemeral: true });

  const text = interaction.options.getString('text', true);
  const embed = baseEmbed('Neuer Vorschlag', text, BRAND.accent)
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .addFields({ name: 'Abstimmung', value: '👍 **0**  •  👎 **0**' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('suggest_up').setEmoji('👍').setLabel('Dafür').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('suggest_down').setEmoji('👎').setLabel('Dagegen').setStyle(ButtonStyle.Danger)
  );

  const message = await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: `Vorschlag gesendet: ${message.url}`, ephemeral: true });
}

module.exports = { definitions, execute };
