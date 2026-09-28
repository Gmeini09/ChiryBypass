const { getGuild } = require('./store');
const { baseEmbed, BRAND } = require('./ui');

async function modLog(guild, title, description, fields = []) {
  const cfg = getGuild(guild.id);
  if (!cfg.modLogChannelId) return;
  const channel = guild.channels.cache.get(cfg.modLogChannelId);
  if (!channel?.isTextBased()) return;

  const embed = baseEmbed(title, description, BRAND.warning);
  if (fields.length) embed.addFields(fields);
  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { modLog };
