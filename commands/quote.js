const config = require('../lib/config');
const axios = require('axios');

module.exports = {
  name: 'quote',
  description: 'Get random inspirational quote',
  usage: `${config.PREFIX}quote`,
  
  async execute(sock, msg, args) {
    try {
      const response = await axios.get('https://api.quotable.io/random');
      const quote = response.data;
      
      await sock.sendMessage(msg.key.remoteJid, {
        text: `💭 *Quote of the Day*\n\n` +
              `"${quote.content}"\n\n` +
              `— *${quote.author}*\n\n` +
              `📚 Category: ${quote.tags.join(', ')}\n` +
              `👑 Shared by: ${config.OWNER_NAME}`
      }, { quoted: msg });
    } catch (error) {
      const quotes = [
        "The only limit to our realization of tomorrow will be our doubts of today. - Franklin D. Roosevelt",
        "It does not matter how slowly you go as long as you do not stop. - Confucius",
        "Life is what happens to you while you're busy making other plans. - John Lennon",
        "The way to get started is to quit talking and begin doing. - Walt Disney",
        "Your time is limited, so don't waste it living someone else's life. - Steve Jobs"
      ];
      
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      
      await sock.sendMessage(msg.key.remoteJid, {
        text: `💭 *Quote*\n\n${randomQuote}\n\n👑 ${config.OWNER_NAME}`
      }, { quoted: msg });
    }
  }
};
