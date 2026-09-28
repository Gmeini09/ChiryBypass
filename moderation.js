const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ok, error } = require('../utils/ui');
const { modLog } = require('../utils/log');

const definitions = [
  new SlashCommandBuilder().setName('clear').setDescription('Löscht Nachrichten.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName('kick').setDescription('Kickt ein Mitglied.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('Mitglied').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Grund')),
  new SlashCommandBuilder().setName('ban').setDescription('Bannt ein Mitglied.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('Mitglied').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Grund')),
  new SlashCommandBuilder().setName('timeout').setDescription('Gibt einem Mitglied einen Timeout.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Mitglied').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Minuten').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('reason').setDescription('Grund')),
  new SlashCommandBuilder().setName('untimeout').setDescription('Entfernt einen Timeout.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Mitglied').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Grund'))
];

async function execute(interaction) {
  const reason = interaction.options.getString('reason') || `Aktion von ${interaction.user.tag}`;

  if (interaction.commandName === 'clear') {
    const amount = interaction.options.getInteger('amount', true);
    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);
    if (!deleted) return interaction.reply({ embeds: [error('Nachrichten konnten nicht gelöscht werden.')], ephemeral: true });
    await modLog(interaction.guild, 'Clear', `${interaction.user} löschte **${deleted.size}** Nachrichten in ${interaction.channel}.`);
    return interaction.reply({ embeds: [ok(`**${deleted.size}** Nachrichten gelöscht.`)], ephemeral: true });
  }

  const user = interaction.options.getUser('user', true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.reply({ embeds: [error('Mitglied nicht gefunden.')], ephemeral: true });
  if (member.id === interaction.user.id) return interaction.reply({ embeds: [error('Du kannst diese Aktion nicht gegen dich selbst ausführen.')], ephemeral: true });

  if (interaction.commandName === 'kick') {
    if (!member.kickable) return interaction.reply({ embeds: [error('Ich kann dieses Mitglied aufgrund der Rollen-Hierarchie nicht kicken.')], ephemeral: true });
    await member.kick(reason);
    await modLog(interaction.guild, 'Kick', `${user.tag} wurde gekickt.`, [
      { name: 'Moderator', value: `${interaction.user}`, inline: true },
      { name: 'Grund', value: reason, inline: false }
    ]);
    return interaction.reply({ embeds: [ok(`${user.tag} wurde gekickt.`)], ephemeral: true });
  }

  if (interaction.commandName === 'ban') {
    if (!member.bannable) return interaction.reply({ embeds: [error('Ich kann dieses Mitglied aufgrund der Rollen-Hierarchie nicht bannen.')], ephemeral: true });
    await member.ban({ reason });
    await modLog(interaction.guild, 'Ban', `${user.tag} wurde gebannt.`, [
      { name: 'Moderator', value: `${interaction.user}`, inline: true },
      { name: 'Grund', value: reason, inline: false }
    ]);
    return interaction.reply({ embeds: [ok(`${user.tag} wurde gebannt.`)], ephemeral: true });
  }

  if (interaction.commandName === 'timeout') {
    const minutes = interaction.options.getInteger('minutes', true);
    if (!member.moderatable) return interaction.reply({ embeds: [error('Ich kann dieses Mitglied aufgrund der Rollen-Hierarchie nicht timeouten.')], ephemeral: true });
    await member.timeout(minutes * 60_000, reason);
    await modLog(interaction.guild, 'Timeout', `${user.tag} erhielt **${minutes} Minuten** Timeout.`, [
      { name: 'Moderator', value: `${interaction.user}`, inline: true },
      { name: 'Grund', value: reason, inline: false }
    ]);
    return interaction.reply({ embeds: [ok(`${user.tag} hat ${minutes} Minuten Timeout.`)], ephemeral: true });
  }

  if (interaction.commandName === 'untimeout') {
    if (!member.moderatable) return interaction.reply({ embeds: [error('Ich kann dieses Mitglied aufgrund der Rollen-Hierarchie nicht bearbeiten.')], ephemeral: true });
    await member.timeout(null, reason);
    await modLog(interaction.guild, 'Timeout entfernt', `${user.tag} hat keinen Timeout mehr.`, [
      { name: 'Moderator', value: `${interaction.user}`, inline: true },
      { name: 'Grund', value: reason, inline: false }
    ]);
    return interaction.reply({ embeds: [ok(`Timeout von ${user.tag} entfernt.`)], ephemeral: true });
  }
}

module.exports = { definitions, execute };
