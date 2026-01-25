const config = require('../lib/config');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { isValidUrl } = require('../lib/functions');

module.exports = {
  name: 'dl',
  description: 'Download media from various platforms',
  usage: `${config.PREFIX}dl <url>`,
  
  async execute(sock, msg, args) {
    if (args.length === 0) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ *Usage:* ${config.PREFIX}dl <url>\n\n` +
              `Example: ${config.PREFIX}dl https://example.com/video.mp4`
      }, { quoted: msg });
      return;
    }
    
    const url = args[0];
    
    if (!isValidUrl(url)) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Please provide a valid URL'
      }, { quoted: msg });
      return;
    }
    
    await sock.sendMessage(msg.key.remoteJid, {
      text: '⏳ Downloading media... Please wait.'
    }, { quoted: msg });
    
    try {
      // Check URL for common platforms
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: `📥 *YouTube Download*\n\n` +
                `URL: ${url}\n` +
                `Status: Processing...\n\n` +
                `⚠️ YouTube download requires additional setup.\n` +
                `Contact ${config.OWNER_NAME} for more info.`
        });
      } else if (url.includes('tiktok.com')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: `📥 *TikTok Download*\n\n` +
                `URL: ${url}\n` +
                `Status: Processing...\n\n` +
                `This feature is under development.`
        });
      } else if (url.includes('instagram.com')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: `📥 *Instagram Download*\n\n` +
                `URL: ${url}\n` +
                `Status: Processing...\n\n` +
                `Instagram download coming soon!`
        });
      } else {
        // Generic file download
        const response = await axios.head(url);
        const contentType = response.headers['content-type'];
        const contentLength = response.headers['content-length'];
        
        if (contentLength > config.MAX_FILE_SIZE) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ File too large! Maximum size: ${config.MAX_FILE_SIZE / 1024 / 1024}MB`
          });
          return;
        }
        
        if (contentType.startsWith('image/')) {
          await sock.sendMessage(msg.key.remoteJid, {
            image: { url: url },
            caption: `📸 Image downloaded from URL\n👑 ${config.OWNER_NAME}`
          });
        } else if (contentType.startsWith('video/')) {
          await sock.sendMessage(msg.key.remoteJid, {
            video: { url: url },
            caption: `🎬 Video downloaded from URL\n👑 ${config.OWNER_NAME}`
          });
        } else if (contentType.startsWith('audio/')) {
          await sock.sendMessage(msg.key.remoteJid, {
            audio: { url: url },
            mimetype: contentType
          });
        } else {
          await sock.sendMessage(msg.key.remoteJid, {
            text: `📄 *File Download*\n\n` +
                  `URL: ${url}\n` +
                  `Type: ${contentType}\n` +
                  `Size: ${(contentLength / 1024 / 1024).toFixed(2)}MB\n\n` +
                  `Cannot preview this file type directly.`
          });
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Download failed: ${error.message}\n\nContact ${config.OWNER_NAME} for support.`
      });
    }
  }
};
