require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Events
} = require('discord.js');
const { registerCommands, modules } = require('./registerCommands');
const { handleButton } = require('./interactions/buttons');
const { memberAdd, memberRemove } = require('./events/members');
const { error } = require('./utils/ui');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('Fehlende Umgebungsvariablen. Kopiere .env.example zu .env und trage DISCORD_TOKEN + CLIENT_ID ein.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async ready => {
  console.log(`✅ Online als ${ready.user.tag}`);
  if (ready.user.username !== 'Chiry Bypass') {
    await ready.user.setUsername('Chiry Bypass').catch(err => console.warn('[Branding] Bot-Name konnte nicht geändert werden:', err.message));
  }
  ready.user.setPresence({
    activities: [{ name: 'Chiry Bypass', type: ActivityType.Watching }],
    status: 'online'
  });

  try {
    await registerCommands();
  } catch (err) {
    console.error('[Commands]', err);
  }
});

client.on(Events.GuildMemberAdd, memberAdd);
client.on(Events.GuildMemberRemove, memberRemove);

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isButton()) return await handleButton(interaction);
    if (!interaction.isChatInputCommand()) return;

    const module = modules.find(m => m.definitions.some(c => c.name === interaction.commandName));
    if (!module) return;
    await module.execute(interaction);
  } catch (err) {
    console.error(`[Interaction] ${interaction.commandName || interaction.customId}`, err);
    const payload = { embeds: [error('Bei dieser Aktion ist ein Fehler aufgetreten.')], ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

process.on('unhandledRejection', err => console.error('[UnhandledRejection]', err));
process.on('uncaughtException', err => console.error('[UncaughtException]', err));

client.login(process.env.DISCORD_TOKEN);
