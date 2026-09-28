const {
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { patchGuild } = require('./store');
const { baseEmbed, BRAND } = require('./ui');

const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'chiry-logo.base64');

const P = PermissionFlagsBits;

function roleOverwrite(id, allow = [], deny = []) {
  return { id, type: OverwriteType.Role, allow, deny };
}

function memberOverwrite(id, allow = [], deny = []) {
  return { id, type: OverwriteType.Member, allow, deny };
}

async function createText(guild, parent, name, overwrites, topic = null) {
  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent,
    topic,
    permissionOverwrites: overwrites
  });
}

async function createVoice(guild, parent, name, overwrites, userLimit = 0) {
  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent,
    userLimit,
    permissionOverwrites: overwrites
  });
}

async function rebuildServer(guild) {
  const me = guild.members.me || await guild.members.fetchMe();
  if (!me.permissions.has(P.Administrator)) {
    throw new Error('Der Bot benötigt Administrator-Rechte für `/setup server`.');
  }

  const oldChannels = [...guild.channels.cache.values()];
  const oldRoles = [...guild.roles.cache.values()]
    .filter(role => role.id !== guild.id && !role.managed && role.editable)
    .sort((a, b) => a.position - b.position);

  const skippedRoles = [...guild.roles.cache.values()]
    .filter(role => role.id !== guild.id && !role.managed && !role.editable)
    .map(role => role.name);

  // Die alte Struktur bleibt bis zum erfolgreichen Aufbau der neuen Struktur bestehen.
  // So hinterlässt ein API-Fehler nicht sofort einen leeren Discord.
  let deletedRoles = 0;

  await guild.setName('Chiry Bypass', 'Chiry Bypass /setup server').catch(() => {});

  // Chiry Branding: das mitgelieferte Logo wird als Server-Icon genutzt.
  // Der Bot-Avatar ist global; Discord kann häufige Avatar-Wechsel rate-limitieren,
  // deshalb ist der Wechsel best-effort und blockiert das Setup nicht.
  if (fs.existsSync(LOGO_PATH)) {
    const logo = Buffer.from(fs.readFileSync(LOGO_PATH, 'utf8').trim(), 'base64');
    await guild.setIcon(logo, 'Chiry Bypass Branding').catch(err =>
      console.warn('[Branding] Server-Icon konnte nicht gesetzt werden:', err.message)
    );
    await guild.client.user.setAvatar(logo).catch(err =>
      console.warn('[Branding] Bot-Avatar konnte nicht gesetzt werden:', err.message)
    );
  }
  await me.setNickname('Chiry Bypass', 'Chiry Bypass Branding').catch(() => {});
  await guild.roles.everyone.setPermissions([
    P.ViewChannel,
    P.ReadMessageHistory,
    P.UseApplicationCommands,
    P.ChangeNickname
  ], 'Chiry Bypass Basisrechte').catch(() => {});

  // Neue Rollen – Reihenfolge von niedrig nach hoch erstellen.
  const verified = await guild.roles.create({
    name: '✓ Verified',
    color: 0x9ca3af,
    hoist: false,
    mentionable: false,
    reason: 'Chiry Bypass Setup'
  });
  const customer = await guild.roles.create({
    name: '✦ Customer',
    color: 0x60a5fa,
    hoist: true,
    mentionable: false,
    reason: 'Chiry Bypass Setup'
  });
  const support = await guild.roles.create({
    name: 'Support',
    color: 0xa78bfa,
    hoist: true,
    mentionable: true,
    permissions: [P.ManageMessages, P.ModerateMembers, P.ViewAuditLog],
    reason: 'Chiry Bypass Setup'
  });
  const developer = await guild.roles.create({
    name: 'Developer',
    color: 0x22d3ee,
    hoist: true,
    mentionable: false,
    permissions: [P.ManageMessages, P.ViewAuditLog],
    reason: 'Chiry Bypass Setup'
  });
  const management = await guild.roles.create({
    name: 'Management',
    color: 0xf59e0b,
    hoist: true,
    mentionable: true,
    permissions: [
      P.ManageChannels,
      P.ManageRoles,
      P.ManageMessages,
      P.ModerateMembers,
      P.KickMembers,
      P.BanMembers,
      P.ViewAuditLog
    ],
    reason: 'Chiry Bypass Setup'
  });
  const ownerRole = await guild.roles.create({
    name: 'Chiry Owner',
    color: 0xf8fafc,
    hoist: true,
    mentionable: false,
    permissions: [P.Administrator],
    reason: 'Chiry Bypass Setup'
  });

  const owner = await guild.members.fetch(guild.ownerId).catch(() => null);
  if (owner && ownerRole.editable) await owner.roles.add(ownerRole).catch(() => {});

  const everyone = guild.roles.everyone.id;
  const botId = me.id;
  const publicRead = [
    roleOverwrite(everyone, [P.ViewChannel, P.ReadMessageHistory], [P.SendMessages]),
    memberOverwrite(botId, [P.ViewChannel, P.SendMessages, P.ManageChannels, P.ManageMessages, P.ReadMessageHistory])
  ];
  const publicChat = [
    roleOverwrite(everyone, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory]),
    memberOverwrite(botId, [P.ViewChannel, P.SendMessages, P.ManageChannels, P.ManageMessages, P.ReadMessageHistory])
  ];
  const verifiedChat = [
    roleOverwrite(everyone, [], [P.ViewChannel]),
    roleOverwrite(verified.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory]),
    roleOverwrite(customer.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory]),
    roleOverwrite(support.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages]),
    roleOverwrite(developer.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory]),
    roleOverwrite(management.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages]),
    roleOverwrite(ownerRole.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages]),
    memberOverwrite(botId, [P.ViewChannel, P.SendMessages, P.ManageChannels, P.ManageMessages, P.ReadMessageHistory])
  ];
  const verifiedVoice = [
    roleOverwrite(everyone, [], [P.ViewChannel, P.Connect]),
    roleOverwrite(verified.id, [P.ViewChannel, P.Connect, P.Speak]),
    roleOverwrite(customer.id, [P.ViewChannel, P.Connect, P.Speak]),
    roleOverwrite(support.id, [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers]),
    roleOverwrite(developer.id, [P.ViewChannel, P.Connect, P.Speak]),
    roleOverwrite(management.id, [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers]),
    roleOverwrite(ownerRole.id, [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers]),
    memberOverwrite(botId, [P.ViewChannel, P.Connect, P.Speak, P.ManageChannels])
  ];
  const staffOnly = [
    roleOverwrite(everyone, [], [P.ViewChannel]),
    roleOverwrite(support.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages]),
    roleOverwrite(developer.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory]),
    roleOverwrite(management.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages]),
    roleOverwrite(ownerRole.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages]),
    memberOverwrite(botId, [P.ViewChannel, P.SendMessages, P.ManageChannels, P.ManageMessages, P.ReadMessageHistory])
  ];

  // Kategorien + Channels. Die Namen bleiben bewusst minimal und clean.
  const startCat = await guild.channels.create({ name: '━━ START HERE ━━', type: ChannelType.GuildCategory });
  const welcome = await createText(guild, startCat.id, '・willkommen', publicRead, 'Willkommen bei Chiry Bypass.');
  const rules = await createText(guild, startCat.id, '・regeln', publicRead, 'Regeln von Chiry Bypass.');
  const verify = await createText(guild, startCat.id, '・verifizieren', publicRead, 'Verifiziere dich hier.');

  const brandCat = await guild.channels.create({ name: '━━ CHIRY BYPASS ━━', type: ChannelType.GuildCategory });
  const info = await createText(guild, brandCat.id, '・informationen', publicRead, 'Informationen zu Chiry Bypass.');
  const updates = await createText(guild, brandCat.id, '・updates', publicRead, 'Updates und Ankündigungen.');
  const prices = await createText(guild, brandCat.id, '・produkte・preise', publicRead, 'Produkte und Preise.');
  const feedback = await createText(guild, brandCat.id, '・feedback', verifiedChat, 'Kundenfeedback zu Chiry Bypass.');

  const communityCat = await guild.channels.create({ name: '━━ COMMUNITY ━━', type: ChannelType.GuildCategory });
  const chat = await createText(guild, communityCat.id, '・chat', verifiedChat, 'Community Chat.');
  await createText(guild, communityCat.id, '・media', verifiedChat, 'Screenshots, Clips und Medien.');
  const suggestions = await createText(guild, communityCat.id, '・vorschläge', verifiedChat, 'Vorschläge für Chiry Bypass.');

  const supportCat = await guild.channels.create({ name: '━━ SUPPORT ━━', type: ChannelType.GuildCategory });
  const ticketPanel = await createText(guild, supportCat.id, '・ticket-erstellen', publicRead, 'Erstelle hier ein Support- oder Kauf-Ticket.');
  await createText(guild, supportCat.id, '・support-info', publicRead, 'Informationen zum Support.');

  const ticketCat = await guild.channels.create({
    name: '━━ OPEN TICKETS ━━',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [roleOverwrite(everyone, [], [P.ViewChannel])]
  });

  const voiceCat = await guild.channels.create({ name: '━━ VOICE ━━', type: ChannelType.GuildCategory });
  await createVoice(guild, voiceCat.id, 'Lobby', verifiedVoice);
  await createVoice(guild, voiceCat.id, 'Talk 01', verifiedVoice, 10);
  await createVoice(guild, voiceCat.id, 'Talk 02', verifiedVoice, 10);
  await createVoice(guild, voiceCat.id, 'AFK', verifiedVoice);

  const teamCat = await guild.channels.create({ name: '━━ TEAM ━━', type: ChannelType.GuildCategory });
  const teamChat = await createText(guild, teamCat.id, '・team-chat', staffOnly, 'Interner Teamchat.');
  const modLogs = await createText(guild, teamCat.id, '・mod-logs', staffOnly, 'Moderations-Logs.');
  const ticketLogs = await createText(guild, teamCat.id, '・ticket-logs', staffOnly, 'Ticket-Logs.');
  const memberLogs = await createText(guild, teamCat.id, '・member-logs', staffOnly, 'Join/Leave-Logs.');

  // Bot-Konfiguration direkt auf die neue Struktur setzen.
  patchGuild(guild.id, {
    verifyRoleId: verified.id,
    ticketCategoryId: ticketCat.id,
    supportRoleId: support.id,
    ticketLogChannelId: ticketLogs.id,
    welcomeChannelId: welcome.id,
    leaveChannelId: memberLogs.id,
    autoRoleId: null,
    suggestionsChannelId: suggestions.id,
    modLogChannelId: modLogs.id,
    serverSetupVersion: 2,
    customerRoleId: customer.id,
    developerRoleId: developer.id,
    managementRoleId: management.id,
    ownerRoleId: ownerRole.id,
    ticketPanelChannelId: ticketPanel.id
  });

  const verifyEmbed = baseEmbed(
    'Verifizierung',
    'Willkommen bei **Chiry Bypass**.\n\nDrücke auf **Verifizieren**, um den Community-Bereich freizuschalten.',
    BRAND.accent
  ).setThumbnail(guild.iconURL());
  const verifyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify').setLabel('Verifizieren').setEmoji('✓').setStyle(ButtonStyle.Secondary)
  );
  await verify.send({ embeds: [verifyEmbed], components: [verifyRow] });

  const ticketEmbed = baseEmbed(
    'Support Center',
    'Wähle den passenden Bereich für dein Anliegen.\n\n**Kaufen** – Produkt- oder Bestellfragen\n**Support** – Hilfe mit einem bestehenden Anliegen\n\nErstelle bitte nur ein Ticket gleichzeitig.',
    BRAND.accent
  ).setThumbnail(guild.iconURL());
  const ticketRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_create_buy').setLabel('Kaufen').setEmoji('🛒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_create_support').setLabel('Support').setEmoji('🎫').setStyle(ButtonStyle.Primary)
  );
  await ticketPanel.send({ embeds: [ticketEmbed], components: [ticketRow] });

  await welcome.send({ embeds: [baseEmbed(
    'Chiry Bypass',
    'Willkommen bei **Chiry Bypass**.\n\nLies zuerst die Regeln und verifiziere dich anschließend. Bei Fragen steht dir unser Ticket-System zur Verfügung.',
    BRAND.accent
  )] });

  await rules.send({ embeds: [baseEmbed(
    'Server Regeln',
    '**01** Respektvoller Umgang.\n**02** Kein Spam, Flooding oder unnötige Pings.\n**03** Keine Werbung ohne Freigabe.\n**04** Keine Leaks, Scams oder schädlichen Dateien.\n**05** Nutze Support-Tickets nur für echte Anliegen.\n**06** Folge den Discord ToS und Community Guidelines.',
    BRAND.color
  )] });

  await info.send({ embeds: [baseEmbed(
    'Über Chiry Bypass',
    '**Chiry Bypass** ist dein zentraler Discord für Produkte, Updates, Support und Community.\n\nAlle wichtigen Bereiche sind über die Kategorien links erreichbar.',
    BRAND.accent
  )] });

  await prices.send({ embeds: [baseEmbed(
    'Produkte & Preise',
    'Hier kannst du später deine Produkte und Preise eintragen.\n\nFür einen Kauf öffnest du im Support Center ein **Kaufen-Ticket**.',
    BRAND.color
  )] });

  await updates.send({ embeds: [baseEmbed(
    'Updates',
    'Neue Releases, Änderungen und wichtige Ankündigungen werden hier veröffentlicht.',
    BRAND.color
  )] });

  await teamChat.send({ embeds: [baseEmbed(
    'Team Bereich',
    'Interner Bereich für das **Chiry Bypass Team**. Dieser Channel ist für normale Mitglieder nicht sichtbar.',
    BRAND.color
  )] });

  // Erst nachdem die neue Struktur steht, alte Channels löschen.
  // Neue IDs separat bestimmen, damit ausschließlich die vorherige Struktur entfernt wird.
  const newIds = new Set([
    startCat.id, welcome.id, rules.id, verify.id,
    brandCat.id, info.id, updates.id, prices.id, feedback.id,
    communityCat.id, chat.id, suggestions.id,
    supportCat.id, ticketPanel.id, ticketCat.id,
    voiceCat.id, teamCat.id, teamChat.id, modLogs.id, ticketLogs.id, memberLogs.id
  ]);
  for (const channel of guild.channels.cache.values()) {
    if (channel.parentId && [communityCat.id, voiceCat.id, supportCat.id, teamCat.id, brandCat.id, startCat.id].includes(channel.parentId)) {
      newIds.add(channel.id);
    }
  }

  let deletedChannels = 0;
  for (const channel of oldChannels) {
    if (newIds.has(channel.id)) continue;
    try {
      await channel.delete('Chiry Bypass /setup server');
      deletedChannels += 1;
    } catch (_) {}
  }

  // Rollen zuletzt entfernen. Discord lässt @everyone, Integrationsrollen und Rollen
  // oberhalb der Bot-Rolle absichtlich nicht löschen.
  for (const role of oldRoles) {
    try {
      await role.delete('Chiry Bypass /setup server');
      deletedRoles += 1;
    } catch (_) {}
  }

  return {
    deletedChannels,
    deletedRoles,
    skippedRoles,
    channels: { welcome, rules, verify, info, updates, prices, feedback, chat, suggestions, ticketPanel, teamChat, modLogs, ticketLogs, memberLogs },
    roles: { verified, customer, support, developer, management, ownerRole }
  };
}

module.exports = { rebuildServer };
