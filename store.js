const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../../data'));
const file = path.join(dataDir, 'settings.json');

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}', 'utf8');
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function writeAll(data) {
  ensureStore();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function defaults() {
  return {
    verifyRoleId: null,
    ticketCategoryId: null,
    supportRoleId: null,
    ticketLogChannelId: null,
    welcomeChannelId: null,
    leaveChannelId: null,
    autoRoleId: null,
    suggestionsChannelId: null,
    modLogChannelId: null,
    serverSetupVersion: null,
    customerRoleId: null,
    developerRoleId: null,
    managementRoleId: null,
    ownerRoleId: null,
    ticketPanelChannelId: null
  };
}

function getGuild(guildId) {
  const all = readAll();
  return { ...defaults(), ...(all[guildId] || {}) };
}

function patchGuild(guildId, patch) {
  const all = readAll();
  all[guildId] = { ...defaults(), ...(all[guildId] || {}), ...patch };
  writeAll(all);
  return all[guildId];
}

module.exports = { getGuild, patchGuild };
