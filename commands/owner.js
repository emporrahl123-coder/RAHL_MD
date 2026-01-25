const config = require('../lib/config');

module.exports = {
  name: 'owner',
  description: 'Contact the bot owner',
  usage: `${config.PREFIX}owner`,
  
  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `👑 *Owner Information*\n\n` +
            `*Name:* ${config.OWNER_NAME}\n` +
            `*Bot:* ${config.BOT_NAME}\n\n` +
            `For any issues, suggestions, or collaboration, you can contact the owner.\n\n` +
            `⚠️ *Note:* Please don't spam.`
    }, { quoted: msg });
  }
};
