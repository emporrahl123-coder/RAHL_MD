const config = require('../lib/config');
const os = require('os');
const packageJson = require('../package.json');

module.exports = {
  name: 'about',
  description: 'About this bot',
  usage: `${config.PREFIX}about`,
  
  async execute(sock, msg, args) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🤖 *${config.BOT_NAME}*\n\n` +
            `👑 *Owner:* ${config.OWNER_NAME}\n` +
            `🔧 *Version:* ${packageJson.version}\n` +
            `🚀 *Engine:* Baileys MD\n` +
            `⚡ *Prefix:* ${config.PREFIX}\n` +
            `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
            `💾 *RAM Usage:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB\n` +
            `🖥️ *Platform:* ${os.platform()} ${os.arch()}\n\n` +
            `*Powered by Node.js & Render*\n` +
            `_A multi-functional WhatsApp bot_`
    }, { quoted: msg });
  }
};
