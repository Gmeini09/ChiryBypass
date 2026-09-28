const {
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OverwriteType
} = require('discord.js');
const { getGuild } = require('../utils/store');
const { baseEmbed, BRAND, ok, error } = require('../utils/ui');
const { rebuildServer } = require('../utils/serverSetup');

const suggestionVotes = new Map();

function sanitize(name) {
  return name.toLowerCase().replace(/[^a-z0-9äöüß_-]/gi, '-').replace(/-+/g, '-').slice(0, 50);
}

async function handleButton(interaction) {
  const cfg = getGuild(interaction.guild.id);

  if (interaction.customId.startsWith('setup_server_cancel:')) {
    const ownerId = interaction.customId.split(':')[1];
    if (interaction.user.id !== ownerId) return interaction.reply({ content: 'Nur der Server-Inhaber kann diese Aktion bestätigen.', ephemeral: true });
    return interaction.update({ embeds: [baseEmbed('Setup abgebrochen', 'Es wurden keine Änderungen vorgenommen.', BRAND.color)], components: [] });
  }

  if (interaction.customId.startsWith('setup_server_confirm:')) {
    const ownerId = interaction.customId.split(':')[1];
    if (interaction.user.id !== ownerId || interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'Nur der Server-Inhaber kann diese Aktion bestätigen.', ephemeral: true });
    }

    await interaction.update({
      embeds: [baseEmbed('Chiry Bypass Setup', 'Der Neuaufbau wurde gestartet. Die neue Struktur wird automatisch erstellt.', BRAND.warning)],
      components: []
    });

    try {
      const result = await rebuildServer(interaction.guild);
      const summary = baseEmbed(
        'Setup abgeschlossen',
        `**Chiry Bypass** wurde vollständig eingerichtet.\n\nGelöschte Channels: **${result.deletedChannels}**\nGelöschte Rollen: **${result.deletedRoles}**${result.skippedRoles.length ? `\nNicht löschbare Rollen: **${result.skippedRoles.join(', ')}**` : ''}`,
        BRAND.success
      );
      await result.channels.teamChat.send({ embeds: [summary] }).catch(() => {});
    } catch (err) {
      console.error('[ServerSetup]', err);
      await interaction.followUp({ embeds: [error(`Setup fehlgeschlagen: ${err.message}`)], ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.customId === 'verify') {
    if (!cfg.verifyRoleId) return interaction.reply({ embeds: [error('Verify ist nicht konfiguriert.')], ephemeral: true });
    const role = interaction.guild.roles.cache.get(cfg.verifyRoleId);
    if (!role) return interaction.reply({ embeds: [error('Die Verify-Rolle existiert nicht mehr.')], ephemeral: true });
    if (interaction.member.roles.cache.has(role.id)) return interaction.reply({ content: 'Du bist bereits verifiziert.', ephemeral: true });
    await interaction.member.roles.add(role).catch(() => null);
    if (!interaction.member.roles.cache.has(role.id)) return interaction.reply({ embeds: [error('Rolle konnte nicht vergeben werden. Prüfe die Rollen-Hierarchie.')], ephemeral: true });
    return interaction.reply({ embeds: [ok('Du wurdest erfolgreich verifiziert.')], ephemeral: true });
  }

  if (interaction.customId === 'ticket_create' || interaction.customId === 'ticket_create_buy' || interaction.customId === 'ticket_create_support') {
    if (!cfg.ticketCategoryId || !cfg.supportRoleId) return interaction.reply({ embeds: [error('Tickets sind nicht korrekt eingerichtet.')], ephemeral: true });

    const existing = interaction.guild.channels.cache.find(c => c.topic?.startsWith(`ticket-owner:${interaction.user.id}`));
    if (existing) return interaction.reply({ content: `Du hast bereits ein Ticket: ${existing}`, ephemeral: true });

    const type = interaction.customId === 'ticket_create_buy' ? 'buy' : 'support';
    const typeLabel = type === 'buy' ? 'Kaufen' : 'Support';
    const me = interaction.guild.members.me;
    const channel = await interaction.guild.channels.create({
      name: `${type}-${sanitize(interaction.user.username)}`,
      type: ChannelType.GuildText,
      parent: cfg.ticketCategoryId,
      topic: `ticket-owner:${interaction.user.id};type:${type}`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel], type: OverwriteType.Role },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], type: OverwriteType.Member },
        { id: cfg.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], type: OverwriteType.Role },
        { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory], type: OverwriteType.Member }
      ]
    });

    const embed = baseEmbed(`${typeLabel} Ticket`, `Willkommen ${interaction.user}. Beschreibe dein Anliegen möglichst genau.\n\n<@&${cfg.supportRoleId}> kümmert sich um dich.`, BRAND.accent);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Schließen').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );
    await channel.send({ content: `${interaction.user} <@&${cfg.supportRoleId}>`, embeds: [embed], components: [row] });
    return interaction.reply({ content: `Ticket erstellt: ${channel}`, ephemeral: true });
  }

  if (interaction.customId === 'ticket_claim') {
    if (!interaction.member.roles.cache.has(cfg.supportRoleId) && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'Nur das Support-Team kann Tickets claimen.', ephemeral: true });
    }
    await interaction.channel.setName(`${interaction.channel.name}-claimed`).catch(() => {});
    return interaction.reply({ embeds: [ok(`Ticket wurde von ${interaction.user} übernommen.`)] });
  }

  if (interaction.customId === 'ticket_close') {
    const ownerMatch = interaction.channel.topic?.match(/ticket-owner:(\d+)/);
    const ownerId = ownerMatch?.[1] || null;
    const isOwner = ownerId === interaction.user.id;
    const isSupport = interaction.member.roles.cache.has(cfg.supportRoleId) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    if (!isOwner && !isSupport) return interaction.reply({ content: 'Du darfst dieses Ticket nicht schließen.', ephemeral: true });

    await interaction.reply({ embeds: [baseEmbed('Ticket geschlossen', `Geschlossen von ${interaction.user}. Der Channel wird gleich gelöscht.`, BRAND.danger)] });

    if (cfg.ticketLogChannelId) {
      const log = interaction.guild.channels.cache.get(cfg.ticketLogChannelId);
      if (log?.isTextBased()) {
        await log.send({ embeds: [baseEmbed('Ticket Log', `**Channel:** ${interaction.channel.name}\n**Owner:** ${ownerId ? `<@${ownerId}>` : 'Unbekannt'}\n**Geschlossen von:** ${interaction.user}`, BRAND.warning)] }).catch(() => {});
      }
    }

    setTimeout(() => interaction.channel.delete('Ticket geschlossen').catch(() => {}), 2500);
    return;
  }

  if (interaction.customId === 'suggest_up' || interaction.customId === 'suggest_down') {
    const key = interaction.message.id;
    const state = suggestionVotes.get(key) || { up: new Set(), down: new Set() };
    const uid = interaction.user.id;

    if (interaction.customId === 'suggest_up') {
      state.down.delete(uid);
      state.up.has(uid) ? state.up.delete(uid) : state.up.add(uid);
    } else {
      state.up.delete(uid);
      state.down.has(uid) ? state.down.delete(uid) : state.down.add(uid);
    }
    suggestionVotes.set(key, state);

    const old = interaction.message.embeds[0];
    const embed = baseEmbed(old.title || 'Vorschlag', old.description || '', old.color || BRAND.accent)
      .addFields({ name: 'Abstimmung', value: `👍 **${state.up.size}**  •  👎 **${state.down.size}**` });
    if (old.author?.name) embed.setAuthor({ name: old.author.name, iconURL: old.author.iconURL || undefined });

    await interaction.update({ embeds: [embed], components: interaction.message.components });
  }
}

module.exports = { handleButton };
