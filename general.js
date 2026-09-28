const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { info } = require('../utils/ui');

const definitions = [
  new SlashCommandBuilder().setName('help').setDescription('Zeigt alle Bot-Funktionen.'),
  new SlashCommandBuilder().setName('ping').setDescription('Zeigt Bot-Latenz.'),
  new SlashCommandBuilder().setName('avatar').setDescription('Zeigt einen Avatar.')
    .addUserOption(o => o.setName('user').setDescription('Benutzer')),
  new SlashCommandBuilder().setName('userinfo').setDescription('Zeigt Benutzerinformationen.')
    .addUserOption(o => o.setName('user').setDescription('Benutzer')),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Zeigt Serverinformationen.'),
  new SlashCommandBuilder().setName('say').setDescription('Lässt den Bot eine Nachricht senden.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(o => o.setName('text').setDescription('Nachricht').setRequired(true))
];

async function execute(interaction) {
  if (interaction.commandName === 'help') {
    const embed = info('Chiry Bypass', [
      '**Community**', '`/avatar` `/userinfo` `/serverinfo` `/suggest`',
      '',
      '**Moderation**', '`/clear` `/kick` `/ban` `/timeout` `/untimeout` `/say`',
      '',
      '**Setup**', '`/setup server` `/setup status` `/setup verify` `/setup tickets` `/setup welcome` `/setup leave` `/setup autorole` `/setup suggestions` `/setup modlogs`',
      '',
      '**Panels**', '`/panel verify` `/panel tickets`',
      '',
      'Alles läuft über Slash-Commands, Buttons und cleane Embeds.'
    ].join('\n'));
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'ping') {
    return interaction.reply({ content: `🏓 ${interaction.client.ws.ping} ms`, ephemeral: true });
  }

  if (interaction.commandName === 'avatar') {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = info(`Avatar • ${user.username}`, `[Avatar öffnen](${user.displayAvatarURL({ size: 4096 })})`)
      .setImage(user.displayAvatarURL({ size: 1024 }));
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'userinfo') {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const embed = info(`Userinfo • ${user.username}`, `Informationen zu <@${user.id}>`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'User ID', value: user.id, inline: true },
        { name: 'Account erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Server beigetreten', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unbekannt', inline: true },
        { name: 'Rollen', value: member ? `${Math.max(0, member.roles.cache.size - 1)}` : '0', inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'serverinfo') {
    const g = interaction.guild;
    const embed = info(`Serverinfo • ${g.name}`, 'Aktuelle Serverdaten')
      .setThumbnail(g.iconURL())
      .addFields(
        { name: 'Mitglieder', value: String(g.memberCount), inline: true },
        { name: 'Channels', value: String(g.channels.cache.size), inline: true },
        { name: 'Rollen', value: String(g.roles.cache.size), inline: true },
        { name: 'Server ID', value: g.id, inline: true },
        { name: 'Erstellt', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'say') {
    const text = interaction.options.getString('text', true);
    await interaction.channel.send({ content: text });
    return interaction.reply({ content: 'Nachricht gesendet.', ephemeral: true });
  }
}

module.exports = { definitions, execute };
