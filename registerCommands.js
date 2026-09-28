const { REST, Routes } = require('discord.js');
const general = require('./commands/general');
const moderation = require('./commands/moderation');
const setup = require('./commands/setup');
const suggestions = require('./commands/suggestions');

const modules = [general, moderation, setup, suggestions];
const commandJson = modules.flatMap(m => m.definitions.map(c => c.toJSON()));

async function registerCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  if (!token || !clientId) throw new Error('DISCORD_TOKEN und CLIENT_ID müssen gesetzt sein.');

  const rest = new REST({ version: '10' }).setToken(token);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandJson });
    console.log(`[Commands] ${commandJson.length} Guild-Commands registriert (${guildId}).`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commandJson });
    console.log(`[Commands] ${commandJson.length} globale Commands registriert.`);
  }
}

module.exports = { registerCommands, modules };
