const { EmbedBuilder } = require('discord.js');

const BRAND = {
  name: 'Chiry Bypass',
  color: 0x07111f,
  accent: 0xaed8ff,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c
};

function baseEmbed(title, description, color = BRAND.color) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'Chiry Bypass • Support & Community' });
}

function ok(text) {
  return baseEmbed('Erledigt', text, BRAND.success);
}

function error(text) {
  return baseEmbed('Fehler', text, BRAND.danger);
}

function info(title, text) {
  return baseEmbed(title, text, BRAND.accent);
}

module.exports = { BRAND, baseEmbed, ok, error, info };
