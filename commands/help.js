const config = require('../lib/config');
const CommandHandler = require('../lib/handler');
const handler = new CommandHandler();

module.exports = {
  name: 'help',
  description: 'Show all available commands',
  usage: `${config.PREFIX}help [command]`,
  
  async execute(sock, msg, args) {
    const commands = handler.getAllCommands();
    
    if (args.length > 0) {
      const cmdName = args[0].toLowerCase();
      const command = handler.getCommand(cmdName);
      
      if (command) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: `📚 *Command Help: ${command.name}*\n\n` +
                `📝 *Description:* ${command.description}\n` +
                `💡 *Usage:* ${command.usage}\n` +
                `👑 *Owner:* ${config.OWNER_NAME}`
        }, { quoted: msg });
        return;
      }
    }
    
    let helpText = `🤖 *${config.BOT_NAME} - Command List*\n\n`;
    helpText += `👑 *Owner:* ${config.OWNER_NAME}\n`;
    helpText += `⚡ *Prefix:* ${config.PREFIX}\n\n`;
    helpText += '*━━━━━ Commands ━━━━━*\n\n';
    
    commands.forEach(cmd => {
      helpText += `• *${config.PREFIX}${cmd.name}*\n`;
      helpText += `  ↳ ${cmd.description}\n\n`;
    });
    
    helpText += `*━━━━━━━━━━━━━━━━━*\n\n`;
    helpText += `Use *${config.PREFIX}help <command>* for more info.\n`;
    helpText += `Example: *${config.PREFIX}help ping*`;
    
    await sock.sendMessage(msg.key.remoteJid, {
      text: helpText
    }, { quoted: msg });
  }
};
