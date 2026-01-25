const config = require('../lib/config');
const moment = require('moment');

module.exports = {
  name: 'time',
  description: 'Show current date and time',
  usage: `${config.PREFIX}time`,
  
  async execute(sock, msg, args) {
    const now = moment();
    
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🕐 *Current Time*\n\n` +
            `📅 *Date:* ${now.format('dddd, MMMM Do YYYY')}\n` +
            `⏰ *Time:* ${now.format('h:mm:ss A')}\n` +
            `🌍 *Timezone:* ${moment.tz.guess()}\n` +
            `📆 *Timestamp:* ${now.unix()}\n\n` +
            `👑 *Owner:* ${config.OWNER_NAME}`
    }, { quoted: msg });
  }
};
