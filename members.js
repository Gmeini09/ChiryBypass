const { getGuild } = require('../utils/store');
const { baseEmbed, BRAND } = require('../utils/ui');

async function memberAdd(member) {
  const cfg = getGuild(member.guild.id);

  if (cfg.autoRoleId) {
    const role = member.guild.roles.cache.get(cfg.autoRoleId);
    if (role) await member.roles.add(role).catch(() => {});
  }

  const channel = member.guild.channels.cache.get(cfg.welcomeChannelId);
  if (channel?.isTextBased()) {
    const embed = baseEmbed('Willkommen', `Hey ${member}, willkommen auf **${member.guild.name}**!\nDu bist Mitglied **#${member.guild.memberCount}**.`, BRAND.success)
      .setThumbnail(member.user.displayAvatarURL());
    await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

async function memberRemove(member) {
  const cfg = getGuild(member.guild.id);
  const channel = member.guild.channels.cache.get(cfg.leaveChannelId);
  if (channel?.isTextBased()) {
    const embed = baseEmbed('Auf Wiedersehen', `**${member.user.tag}** hat den Server verlassen.`, BRAND.danger)
      .setThumbnail(member.user.displayAvatarURL());
    await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = { memberAdd, memberRemove };
