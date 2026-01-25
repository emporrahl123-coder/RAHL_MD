const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.loadCommands();
  }
  
  async loadCommands() {
    try {
      const files = await fs.readdir(path.resolve(__dirname, '../commands'));
      for (const file of files) {
        if (file.endsWith('.js')) {
          const command = require(path.join(__dirname, '../commands', file));
          this.commands.set(command.name, command);
          console.log(`✅ Loaded command: ${command.name}`);
        }
      }
      console.log(`📦 Total commands loaded: ${this.commands.size}`);
    } catch (error) {
      console.error('❌ Error loading commands:', error);
    }
  }
  
  getCommand(name) {
    return this.commands.get(name);
  }
  
  getAllCommands() {
    return Array.from(this.commands.values());
  }
  
  async execute(sock, msg, text) {
    const { PREFIX } = config;
    const args = text.slice(PREFIX.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    
    const command = this.getCommand(cmdName);
    if (!command) {
      return false;
    }
    
    try {
      await command.execute(sock, msg, args);
      return true;
    } catch (error) {
      console.error(`Error executing command ${cmdName}:`, error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Error executing command: ${error.message}`
      });
      return false;
    }
  }
}

module.exports = CommandHandler;
