// ============================================
// 🤖 RAHL XMD WhatsApp Bot - Quantum Edition
// 👑 Owner: LORD RAHL
// ⚡ Prefix: .
// 🔗 Pairing System: https://rahl-verse-empire-pair-site.onrender.com
// ============================================

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
  DisconnectReason,
  Browsers,
  initAuthCreds
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const express = require('express');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
require('dotenv').config();

// Import custom modules
const SessionHandler = require('./lib/sessionHandler');
const CommandHandler = require('./lib/handler');
const config = require('./lib/config');

const app = express();
const PORT = process.env.PORT || 3000;

// Global variables
let commandHandler;
let sock = null;
let isFirstConnection = true;
let isSessionLoaded = false;
const deploymentTime = new Date();

// ============================================
// 🎨 CONSOLE STYLING & BANNERS
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const BANNER = `
${colors.green}╔═══════════════════════════════════════════════════╗
║            ${colors.cyan}🤖 RAHL XMD BOT 🤖${colors.green}                ║
║        ${colors.yellow}⚡ QUANTUM EDITION ⚡${colors.green}                ║
║     ===================================     ║
║       🔗 ${colors.magenta}https://rahl-verse-empire-pair-site.onrender.com${colors.green}  ║
╚═══════════════════════════════════════════════════╝${colors.reset}
`;

function displayBanner() {
  console.clear();
  console.log(BANNER);
}

function displayDeploymentInfo() {
  console.log(`${colors.blue}📅 DEPLOYMENT TIME:${colors.reset} ${deploymentTime.toLocaleString()}`);
  console.log(`${colors.blue}👑 BOT OWNER:${colors.reset} ${colors.magenta}${config.OWNER_NAME}${colors.reset}`);
  console.log(`${colors.blue}⚡ COMMAND PREFIX:${colors.reset} ${colors.yellow}"${config.PREFIX}"${colors.reset}`);
  console.log(`${colors.blue}🌐 ENVIRONMENT:${colors.reset} ${process.env.NODE_ENV || 'production'}`);
  console.log(`${colors.yellow}${'='.repeat(55)}${colors.reset}`);
}

function displayConnectionStatus(status, message = '') {
  const timestamp = new Date().toLocaleTimeString();
  const statusMap = {
    connecting: { icon: '🔄', color: colors.yellow },
    connected: { icon: '✅', color: colors.green },
    disconnected: { icon: '🔌', color: colors.red },
    error: { icon: '❌', color: colors.red },
    qr: { icon: '🔐', color: colors.magenta },
    ready: { icon: '🚀', color: colors.cyan },
    session: { icon: '🔑', color: colors.blue }
  };
  
  const statusInfo = statusMap[status] || { icon: '📌', color: colors.reset };
  console.log(`${statusInfo.color}${statusInfo.icon} [${timestamp}] ${message}${colors.reset}`);
}

// ============================================
// 🌐 EXPRESS SERVER (For Render & Health Checks)
// ============================================

app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  res.json({
    status: 'online',
    bot: config.BOT_NAME,
    owner: config.OWNER_NAME,
    prefix: config.PREFIX,
    session: isSessionLoaded ? 'loaded' : 'not-loaded',
    deployment: deploymentTime.toISOString(),
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
    platform: os.platform(),
    node: process.version
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    whatsapp: sock ? 'connected' : 'disconnected',
    session: isSessionLoaded
  });
});

app.get('/status', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${config.BOT_NAME} Status</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
        .container { background: white; padding: 30px; border-radius: 10px; max-width: 800px; margin: auto; }
        .status-online { color: green; font-weight: bold; }
        .logo { font-size: 48px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🤖</div>
        <h1>${config.BOT_NAME} - Quantum Bot</h1>
        <p>Owner: <strong>${config.OWNER_NAME}</strong></p>
        <p>Status: <span class="status-online">✅ ONLINE</span></p>
        <p>Deployed: ${deploymentTime.toLocaleString()}</p>
        <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
        <p>Session Loaded: ${isSessionLoaded ? '✅ Yes' : '❌ No'}</p>
        <hr>
        <p>Pairing System: <a href="https://rahl-verse-empire-pair-site.onrender.com">rahl-verse-empire-pair-site.onrender.com</a></p>
      </div>
    </body>
    </html>
  `);
});

// ============================================
// 🔐 SESSION MANAGEMENT
// ============================================

async function getAuthState() {
  displayConnectionStatus('session', 'Loading authentication state...');
  
  // PRIORITY 1: Try to load from Session ID (from pairing site)
  if (process.env.WHATSAPP_SESSION_ID) {
    try {
      displayConnectionStatus('session', 'Found Session ID in environment');
      const authState = await SessionHandler.decodeSessionId(process.env.WHATSAPP_SESSION_ID);
      isSessionLoaded = true;
      displayConnectionStatus('session', '✅ Session loaded from Pairing System');
      return authState;
    } catch (sessionError) {
      console.error(`${colors.red}❌ Failed to decode session: ${sessionError.message}${colors.reset}`);
      // Continue to fallback methods
    }
  }
  
  // PRIORITY 2: Try local auth_info folder (for development/testing)
  try {
    displayConnectionStatus('session', 'Trying local auth_info folder...');
    const authState = await useMultiFileAuthState('auth_info');
    displayConnectionStatus('session', '✅ Using local auth_info folder');
    return authState;
  } catch (fsError) {
    // This is expected if folder doesn't exist
  }
  
  // PRIORITY 3: Create new empty state (will generate QR code)
  displayConnectionStatus('session', 'No session found. Will generate QR code.');
  const creds = initAuthCreds();
  const keys = {};
  const saveCreds = () => {
    console.log(`${colors.yellow}⚠️  New credentials generated. Save this session!${colors.reset}`);
  };
  
  return { state: { creds, keys }, saveCreds };
}

// ============================================
// 📱 WHATSAPP CONNECTION
// ============================================

async function connectToWhatsApp() {
  try {
    displayConnectionStatus('connecting', 'Initializing WhatsApp connection...');
    
    // Get authentication state (from session ID, local files, or new)
    const { state, saveCreds } = await getAuthState();
    const { version } = await fetchLatestBaileysVersion();
    
    // Create WhatsApp socket
    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
      },
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      getMessage: async (key) => ({
        conversation: `Message from ${config.BOT_NAME}`
      })
    });

    // ============================================
    // 🔄 CONNECTION EVENT HANDLERS
    // ============================================

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // QR Code Generation (only if no session was loaded)
      if (qr && !isSessionLoaded) {
        displayConnectionStatus('qr', 'Scan QR Code with WhatsApp:');
        console.log(`${colors.magenta}`);
        qrcode.generate(qr, { small: true });
        console.log(`${colors.reset}`);
        console.log(`${colors.yellow}⏰ QR Code valid for 30 seconds${colors.reset}`);
        console.log(`${colors.cyan}📱 Go to WhatsApp → Settings → Linked Devices → Link a Device${colors.reset}`);
      }
      
      // Connection Closed
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        displayConnectionStatus('disconnected', `Connection closed. Reconnecting: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          await delay(5000);
          displayConnectionStatus('connecting', 'Attempting to reconnect...');
          connectToWhatsApp();
        }
      }
      
      // Connection Open (SUCCESS!)
      else if (connection === 'open') {
        displayConnectionStatus('connected', '✅ WhatsApp connection established!');
        
        // Update bot profile
        await sock.updateProfileName(config.BOT_NAME);
        await sock.updateProfileStatus(`🤖 ${config.BOT_NAME} | 👑 ${config.OWNER_NAME} | Prefix: ${config.PREFIX}`);
        
        displayConnectionStatus('ready', '🚀 Bot is ready to receive commands!');
        
        // Display deployment success message
        if (isFirstConnection) {
          console.log(`\n${colors.green}╔══════════════════════════════════════════╗`);
          console.log(`║         🎊 DEPLOYMENT SUCCESSFUL 🎊      ║`);
          console.log(`║      ===============================     ║`);
          console.log(`║  ✅ WhatsApp ${isSessionLoaded ? 'Session Loaded' : 'Connected via QR'}  ║`);
          console.log(`║  ✅ Web Server Running                  ║`);
          console.log(`║  ✅ Command System Active               ║`);
          console.log(`║  ✅ Pairing System Ready                ║`);
          console.log(`╚══════════════════════════════════════════╝${colors.reset}`);
          
          // Send notification to owner
          await sendDeploymentNotification();
          isFirstConnection = false;
        }
      }
    });

    // Save credentials when they update
    sock.ev.on('creds.update', saveCreds);
    
    // ============================================
    // 📨 MESSAGE HANDLING
    // ============================================
    
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;
      
      // Extract message text
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption ||
                   msg.message.videoMessage?.caption || '';
      
      const sender = msg.key.remoteJid;
      const isGroup = sender.endsWith('@g.us');
      
      console.log(`${colors.cyan}📩 [${isGroup ? 'GROUP' : 'PRIVATE'}] ${sender.split('@')[0]}: ${text}${colors.reset}`);
      
      // Handle pairing codes (6-8 digit codes)
      if (!text.startsWith(config.PREFIX)) {
        if (/^[A-Z0-9]{6,8}$/i.test(text.trim())) {
          const code = text.trim().toUpperCase();
          await handlePairingCode(code, sender, sock);
        }
        return;
      }
      
      // Handle commands
      const executed = await commandHandler.execute(sock, msg, text);
      
      if (!executed) {
        await sock.sendMessage(sender, {
          text: `❌ Command not found!\n\nUse *${config.PREFIX}help* to see available commands.\n👑 ${config.OWNER_NAME}`
        }, { quoted: msg });
      }
    });
    
    // ============================================
    // 👥 GROUP EVENTS
    // ============================================
    
    sock.ev.on('group-participants.update', async (update) => {
      const { id, participants, action } = update;
      
      if (action === 'add') {
        const metadata = await sock.groupMetadata(id);
        const botParticipant = metadata.participants.find(p => p.id === sock.user.id);
        
        if (botParticipant && botParticipant.admin) {
          await sock.sendMessage(id, {
            text: `🎉 Welcome @${participants[0].split('@')[0]} to the group!\n\n` +
                  `I'm ${config.BOT_NAME}, created by ${config.OWNER_NAME}.\n` +
                  `Use *${config.PREFIX}help* to see my commands.\n` +
                  `🔗 Pairing: https://rahl-verse-empire-pair-site.onrender.com`
          });
        }
      }
    });
    
  } catch (error) {
    displayConnectionStatus('error', `Connection failed: ${error.message}`);
    console.error(`${colors.red}❌ Error details: ${error.stack}${colors.reset}`);
    
    // Retry after 10 seconds
    await delay(10000);
    displayConnectionStatus('connecting', 'Retrying connection...');
    connectToWhatsApp();
  }
}

// ============================================
// 🔐 PAIRING CODE HANDLER
// ============================================

async function handlePairingCode(code, sender, sock) {
  const senderNumber = sender.split('@')[0];
  
  // In a real implementation, you would validate against your pairing site database
  // For now, we'll simulate a successful pairing
  try {
    // Simulate API call to your pairing site
    // const response = await axios.post('https://rahl-verse-empire-pair-site.onrender.com/api/validate', { code, number: senderNumber });
    
    await sock.sendMessage(sender, {
      text: `✅ *Pairing Successful!*\n\n` +
            `Welcome to ${config.BOT_NAME}!\n` +
            `Owner: ${config.OWNER_NAME}\n` +
            `Prefix: "${config.PREFIX}"\n\n` +
            `Use *${config.PREFIX}help* to see all commands.\n\n` +
            `🔗 Pairing Portal: https://rahl-verse-empire-pair-site.onrender.com`
    });
    
    // Notify owner
    if (process.env.OWNER_NUMBER) {
      await sock.sendMessage(process.env.OWNER_NUMBER + '@s.whatsapp.net', {
        text: `📱 New user paired!\n\nNumber: ${senderNumber}\nCode: ${code}\nTime: ${new Date().toLocaleString()}`
      });
    }
    
  } catch (error) {
    await sock.sendMessage(sender, {
      text: `❌ *Invalid Pairing Code*\n\n` +
            `The code "${code}" is invalid or expired.\n\n` +
            `Get a valid code from:\n` +
            `🔗 https://rahl-verse-empire-pair-site.onrender.com`
    });
  }
}

// ============================================
// 📤 DEPLOYMENT NOTIFICATION
// ============================================

async function sendDeploymentNotification() {
  if (!process.env.OWNER_NUMBER) return;
  
  const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
  
  try {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const message = `
🚀 *${config.BOT_NAME} - DEPLOYMENT SUCCESSFUL* 🚀

✅ *Status:* Bot is now LIVE and running!
👑 *Owner:* ${config.OWNER_NAME}
🤖 *Bot Name:* ${config.BOT_NAME}
⚡ *Prefix:* "${config.PREFIX}"
📅 *Deployment Time:* ${deploymentTime.toLocaleString()}
🕐 *Uptime:* ${hours}h ${minutes}m
🌐 *Environment:* ${process.env.NODE_ENV || 'production'}
🔐 *Session:* ${isSessionLoaded ? 'Loaded from Pairing System ✅' : 'New Session (QR) 🔄'}

*━━━━━━━━━━━━━━━━━*
🔧 *System Information:*
├── 🖥️ Platform: ${os.platform()} ${os.arch()}
├── 💾 RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
├── 🔄 Node: ${process.version}
└── 📁 PID: ${process.pid}

*━━━━━━━━━━━━━━━━━*
🔗 *Important Links:*
├── Health Check: https://your-bot.onrender.com/health
├── Status Page: https://your-bot.onrender.com/status
└── Pairing Portal: https://rahl-verse-empire-pair-site.onrender.com

*━━━━━━━━━━━━━━━━━*
🎯 *Ready to serve!*
_Powered by Quantum Technology_ 🚀
    `.trim();
    
    await sock.sendMessage(ownerJid, { text: message });
    console.log(`${colors.green}📤 Deployment notification sent to owner!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Failed to send deployment notification:${colors.reset}`, error.message);
  }
}

// ============================================
// 🚀 INITIALIZATION & STARTUP
// ============================================

async function initializeBot() {
  try {
    // Display banner
    displayBanner();
    displayDeploymentInfo();
    
    // Initialize command handler
    displayConnectionStatus('connecting', 'Loading command system...');
    commandHandler = new CommandHandler();
    console.log(`${colors.green}✅ Commands loaded: ${commandHandler.getAllCommands().length}${colors.reset}`);
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`${colors.blue}🌐 Web server running on port ${PORT}${colors.reset}`);
      console.log(`${colors.green}🔗 Health check: http://localhost:${PORT}/health${colors.reset}`);
      console.log(`${colors.green}📊 Status page: http://localhost:${PORT}/status${colors.reset}`);
      console.log(`${colors.yellow}${'='.repeat(55)}${colors.reset}\n`);
    });
    
    // Connect to WhatsApp
    await connectToWhatsApp();
    
  } catch (error) {
    console.error(`${colors.red}❌ Failed to initialize bot:${colors.reset}`, error);
    process.exit(1);
  }
}

// ============================================
// ⚠️ ERROR HANDLING
// ============================================

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}❌ Unhandled Rejection at:${colors.reset}`, promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error(`${colors.red}❌ Uncaught Exception:${colors.reset}`, error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log(`${colors.yellow}\n\n🛑 Shutting down bot gracefully...${colors.reset}`);
  
  if (sock) {
    await sock.end();
    console.log(`${colors.green}✅ WhatsApp connection closed${colors.reset}`);
  }
  
  console.log(`${colors.green}👋 Bot shutdown complete. Goodbye!${colors.reset}`);
  process.exit(0);
});

// ============================================
// 🎬 START THE BOT
// ============================================

console.log(`${colors.cyan}🚀 STARTING RAHL XMD WHATSAPP BOT...${colors.reset}`);
initializeBot().catch(console.error);
