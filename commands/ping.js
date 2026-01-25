const config = require('../lib/config');

module.exports = {
  name: 'ping',
  description: 'Check bot response time',
  usage: `${config.PREFIX}ping`,
  
  async execute(sock, msg, args) {
    const start = Date.now();
    const sent = await sock.sendMessage(msg.key.remoteJid, {
      text: '🏓 Pinging...'
    });
    const latency = Date.now() - start;
    
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🏓 *PONG!*\n\n` +
            `📶 Latency: ${latency}ms\n` +
            `🤖 Bot: ${config.BOT_NAME}\n` +
            `👑 Owner: ${config.OWNER_NAME}`
    }, { quoted: msg });
  }
};
