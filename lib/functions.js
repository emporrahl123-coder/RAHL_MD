const axios = require('axios');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

module.exports = {
  // Format time
  formatTime: (time) => {
    return moment(time).format('YYYY-MM-DD HH:mm:ss');
  },
  
  // Download file from URL
  downloadFile: async (url, filename) => {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(filename);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filename));
      writer.on('error', reject);
    });
  },
  
  // Generate random text
  randomText: (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Check if URL is valid
  isValidUrl: (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  },
  
  // Delay function
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Parse command arguments
  parseArgs: (text) => {
    const args = text.trim().split(/ +/);
    const command = args.shift().toLowerCase();
    return { command, args };
  }
};
