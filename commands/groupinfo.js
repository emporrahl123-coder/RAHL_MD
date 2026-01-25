const config = require('../lib/config');

module.exports = {
  name: 'groupinfo',
  description: 'Get group information',
  usage: `${config.PREFIX}groupinfo`,
  
  async execute(sock, msg, args) {
    const groupJid = msg.key.remoteJid;
    
    if (!groupJid.endsWith('@g.us')) {
      await sock.sendMessage(groupJid, {
        text: '❌ This command can only be used in groups!'
      }, { quoted: msg });
      return;
    }
    
    try {
      const metadata = await sock.groupMetadata(groupJid);
      const participants = metadata.participants;
      const admins = participants.filter(p => p.admin).map(p => p.id);
      
      let infoText = `👥 *Group Information*\n\n`;
      infoText += `📛 *Name:* ${metadata.subject}\n`;
      infoText += `🆔 *ID:* ${metadata.id}\n`;
      infoText += `👥 *Participants:* ${participants.length}\n`;
      infoText += `👑 *Admins:* ${admins.length}\n`;
      infoText += `📅 *Created:* ${new Date(metadata.creation * 1000).toLocaleDateString()}\n`;
      infoText += `🔗 *Group Owner:* ${metadata.owner ? metadata.owner.split('@')[0] : 'Unknown'}\n\n`;
      
      if (metadata.desc) {
        infoText += `📝 *Description:*\n${metadata.desc}\n\n`;
      }
      
      infoText += `*━━━━━━━━━━━━━━━━━*\n`;
      infoText += `Bot Owner: ${config.OWNER_NAME}\n`;
      infoText += `Prefix: ${config.PREFIX}`;
      
      await sock.sendMessage(groupJid, {
        text: infoText
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Group info error:', error);
      await sock.sendMessage(groupJid, {
        text: '❌ Failed to fetch group information.'
      }, { quoted: msg });
    }
  }
};
