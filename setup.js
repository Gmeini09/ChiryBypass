const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { patchGuild, getGuild } = require('../utils/store');
const { ok, error, baseEmbed, BRAND } = require('../utils/ui');

const setup = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Konfiguriert den Bot.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s.setName('verify').setDescription('Setzt die Verify-Rolle.')
    .addRoleOption(o => o.setName('role').setDescription('Rolle nach Verify').setRequired(true)))
  .addSubcommand(s => s.setName('tickets').setDescription('Konfiguriert Tickets.')
    .addChannelOption(o => o.setName('category').setDescription('Ticket-Kategorie').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addRoleOption(o => o.setName('support_role').setDescription('Support-Rolle').setRequired(true))
    .addChannelOption(o => o.setName('log_channel').setDescription('Optionaler Ticket-Log').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s => s.setName('welcome').setDescription('Setzt den Welcome-Channel.')
    .addChannelOption(o => o.setName('channel').setDescription('Welcome-Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(s => s.setName('leave').setDescription('Setzt den Leave-Channel.')
    .addChannelOption(o => o.setName('channel').setDescription('Leave-Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(s => s.setName('autorole').setDescription('Setzt die Auto-Rolle.')
    .addRoleOption(o => o.setName('role').setDescription('Rolle beim Join').setRequired(true)))
  .addSubcommand(s => s.setName('suggestions').setDescription('Setzt den Suggestions-Channel.')
    .addChannelOption(o => o.setName('channel').setDescription('Suggestions-Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(s => s.setName('modlogs').setDescription('Setzt den Moderations-Log.')
    .addChannelOption(o => o.setName('channel').setDescription('Log-Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(s => s.setName('status').setDescription('Zeigt die aktuelle Bot-Konfiguration.'))
  .addSubcommand(s => s.setName('server').setDescription('Setzt den kompletten Discord als Chiry Bypass neu auf.'));

const panel = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Sendet ein interaktives Panel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s.setName('verify').setDescription('Sendet das Verify-Panel.'))
  .addSubcommand(s => s.setName('tickets').setDescription('Sendet das Ticket-Panel.'));

async function execute(interaction) {
  if (interaction.commandName === 'setup') {
    const sub = interaction.options.getSubcommand();

    if (sub === 'server') {
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ embeds: [error('Nur der Server-Inhaber kann `/setup server` ausführen.')], ephemeral: true });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`setup_server_confirm:${interaction.user.id}`)
          .setLabel('Server neu aufbauen')
          .setEmoji('⚠️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`setup_server_cancel:${interaction.user.id}`)
          .setLabel('Abbrechen')
          .setStyle(ButtonStyle.Secondary)
      );

      const embed = baseEmbed(
        'Chiry Bypass Setup',
        '**Achtung:** Der Bot löscht nach der Bestätigung alle löschbaren bestehenden Channels und Rollen und baut den Discord vollständig neu auf.\n\nNicht löschbar sind Discord-Systemrollen, Integrationsrollen und Rollen oberhalb der Bot-Rolle.',
        BRAND.danger
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (sub === 'verify') {
      const role = interaction.options.getRole('role', true);
      patchGuild(interaction.guild.id, { verifyRoleId: role.id });
      return interaction.reply({ embeds: [ok(`Verify-Rolle: ${role}`)], ephemeral: true });
    }

    if (sub === 'tickets') {
      const category = interaction.options.getChannel('category', true);
      const supportRole = interaction.options.getRole('support_role', true);
      const logChannel = interaction.options.getChannel('log_channel');
      patchGuild(interaction.guild.id, {
        ticketCategoryId: category.id,
        supportRoleId: supportRole.id,
        ticketLogChannelId: logChannel?.id || null
      });
      return interaction.reply({ embeds: [ok(`Tickets konfiguriert.\nKategorie: ${category}\nSupport: ${supportRole}${logChannel ? `\nLogs: ${logChannel}` : ''}`)], ephemeral: true });
    }

    const map = {
      welcome: 'welcomeChannelId',
      leave: 'leaveChannelId',
      suggestions: 'suggestionsChannelId',
      modlogs: 'modLogChannelId'
    };

    if (map[sub]) {
      const channel = interaction.options.getChannel('channel', true);
      patchGuild(interaction.guild.id, { [map[sub]]: channel.id });
      return interaction.reply({ embeds: [ok(`${sub} → ${channel}`)], ephemeral: true });
    }

    if (sub === 'autorole') {
      const role = interaction.options.getRole('role', true);
      patchGuild(interaction.guild.id, { autoRoleId: role.id });
      return interaction.reply({ embeds: [ok(`Auto-Rolle: ${role}`)], ephemeral: true });
    }

    if (sub === 'status') {
      const c = getGuild(interaction.guild.id);
      const fmt = id => id ? `<#${id}>` : '—';
      const role = id => id ? `<@&${id}>` : '—';
      const embed = baseEmbed('Bot Setup', 'Aktuelle Konfiguration', BRAND.accent).addFields(
        { name: 'Verify-Rolle', value: role(c.verifyRoleId), inline: true },
        { name: 'Ticket-Kategorie', value: fmt(c.ticketCategoryId), inline: true },
        { name: 'Support-Rolle', value: role(c.supportRoleId), inline: true },
        { name: 'Welcome', value: fmt(c.welcomeChannelId), inline: true },
        { name: 'Leave', value: fmt(c.leaveChannelId), inline: true },
        { name: 'Auto-Rolle', value: role(c.autoRoleId), inline: true },
        { name: 'Suggestions', value: fmt(c.suggestionsChannelId), inline: true },
        { name: 'Modlogs', value: fmt(c.modLogChannelId), inline: true }
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.commandName === 'panel') {
    const sub = interaction.options.getSubcommand();
    const cfg = getGuild(interaction.guild.id);

    if (sub === 'verify') {
      if (!cfg.verifyRoleId) return interaction.reply({ embeds: [error('Zuerst `/setup verify` ausführen.')], ephemeral: true });
      const embed = baseEmbed('Verifizierung', 'Klicke auf **Verifizieren**, um Zugriff auf den Server zu erhalten.', BRAND.accent)
        .setThumbnail(interaction.guild.iconURL());
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify').setLabel('Verifizieren').setEmoji('✅').setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: 'Verify-Panel gesendet.', ephemeral: true });
    }

    if (sub === 'tickets') {
      if (!cfg.ticketCategoryId || !cfg.supportRoleId) return interaction.reply({ embeds: [error('Zuerst `/setup tickets` ausführen.')], ephemeral: true });
      const embed = baseEmbed('Support', 'Benötigst du Hilfe? Öffne über den Button ein privates Ticket.\n\nBitte eröffne nur ein Ticket pro Anliegen.', BRAND.accent)
        .setThumbnail(interaction.guild.iconURL());
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_create_buy').setLabel('Kaufen').setEmoji('🛒').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_create_support').setLabel('Support').setEmoji('🎫').setStyle(ButtonStyle.Primary)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: 'Ticket-Panel gesendet.', ephemeral: true });
    }
  }
}

module.exports = { definitions: [setup, panel], execute };
