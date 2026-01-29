const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const express = require('express');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const moment = require('moment');
require('dotenv').config();

// Import custom modules
const CommandHandler = require('./lib/handler');
const config = require('./lib/config');

const app = express();
const PORT = process.env.PORT || 3000;
let commandHandler;
let sock = null;
let isFirstConnection = true;
const deploymentTime = new Date();

// ASCII Art for Bot Logo
const BOT_LOGO = `
╔══════════════════════════════════════╗
║         🤖 RAHL XMD BOT 🤖           ║
║      ==========================      ║
║      🚀 DEPLOYMENT SUCCESSFUL 🚀     ║
╚══════════════════════════════════════╝
`;

// Console Colors
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

// Display banner
function displayBanner() {
  console.log(colors.green + BOT_LOGO + colors.reset);
  console.log(colors.cyan + '📱 WHATSAPP BOT BY LORD RAHL' + colors.reset);
  console.log(colors.yellow + '='.repeat(50) + colors.reset);
}

// Display deployment info
function displayDeploymentInfo() {
  console.log(colors.blue + '\n⚡ BOT INFORMATION:' + colors.reset);
  console.log(colors.bright + '├── 🤖 Name: ' + colors.green + config.BOT_NAME + colors.reset);
  console.log(colors.bright + '├── 👑 Owner: ' + colors.magenta + config.OWNER_NAME + colors.reset);
  console.log(colors.bright + '├── ⚡ Prefix: ' + colors.yellow + config.PREFIX + colors.reset);
  console.log(colors.bright + '├── 🚀 Deployment Time: ' + colors.cyan + deploymentTime.toLocaleString() + colors.reset);
  console.log(colors.bright + '├── 🖥️  Platform: ' + colors.blue + os.platform() + ' ' + os.arch() + colors.reset);
  console.log(colors.bright + '└── 💾 Node Version: ' + colors.green + process.version + colors.reset);
  
  // Memory info
  const used = process.memoryUsage();
  console.log(colors.blue + '\n💾 MEMORY USAGE:' + colors.reset);
  console.log(colors.bright + `├── RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB` + colors.reset);
  console.log(colors.bright + `├── Heap Total: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB` + colors.reset);
  console.log(colors.bright + `└── Heap Used: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB` + colors.reset);
}

// Display connection status
function displayConnectionStatus(status, message = '') {
  const timestamp = new Date().toLocaleTimeString();
  const statusIcons = {
    connecting: '🔄',
    connected: '✅',
    disconnected: '🔌',
    error: '❌',
    qr: '🔐',
    ready: '🚀'
  };
  
  const statusColors = {
    connecting: colors.yellow,
    connected: colors.green,
    disconnected: colors.red,
    error: colors.red,
    qr: colors.magenta,
    ready: colors.cyan
  };
  
  console.log(`${statusColors[status] || colors.reset}${statusIcons[status] || '📌'} [${timestamp}] ${message}${colors.reset}`);
}

// Send deployment notification to owner
async function sendDeploymentNotification(sock) {
  if (!process.env.OWNER_NUMBER || !isFirstConnection) return;
  
  const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
  
  try {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const deploymentMessage = `
🚀 *${config.BOT_NAME} - DEPLOYMENT SUCCESSFUL* 🚀

✅ *Status:* Bot is now running and ready!
👑 *Owner:* ${config.OWNER_NAME}
🤖 *Bot Name:* ${config.BOT_NAME}
⚡ *Prefix:* "${config.PREFIX}"
⏰ *Deployment Time:* ${deploymentTime.toLocaleString()}
🕐 *Uptime:* ${hours}h ${minutes}m ${seconds}s
🌐 *Environment:* ${process.env.NODE_ENV || 'development'}
📦 *Commands Loaded:* ${commandHandler.getAllCommands().length}

*━━━━━━━━━━━━━━━━━*
📊 *System Info:*
├── 🖥️ Platform: ${os.platform()} ${os.arch()}
├── 💾 RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
├── 🔄 Node: ${process.version}
└── 📁 PID: ${process.pid}

*━━━━━━━━━━━━━━━━━*
🔧 *Quick Commands:*
├── .help - Show all commands
├── .ping - Check bot status
├── .owner - Owner information
├── .about - About this bot
└── .time - Current time

*━━━━━━━━━━━━━━━━━*
📱 *Next Steps:*
1. Share pair codes with users
2. Monitor bot activity
3. Check logs for errors
4. Update commands as needed

*━━━━━━━━━━━━━━━━━*
💡 *Tips:*
• Bot auto-reconnects if disconnected
• Pairing system is active
• Check /status endpoint for health
• Use .owner commands for management

*━━━━━━━━━━━━━━━━━*
🎯 *Bot is ready to serve!*
_Deployed successfully on Render_
    `.trim();
    
    await sock.sendMessage(ownerJid, { text: deploymentMessage });
    
    console.log(colors.green + '📤 Deployment notification sent to owner!' + colors.reset);
    isFirstConnection = false;
    
  } catch (error) {
    console.error(colors.red + '❌ Failed to send deployment notification:' + colors.reset, error.message);
  }
}

// Send system status message
async function sendSystemStatus(sock, targetJid) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const statusMessage = `
🤖 *${config.BOT_NAME} - SYSTEM STATUS* 🤖

✅ *Status:* Online and Running
⚡ *Response:* Active
📊 *Health:* Excellent

*━━━━━━━━━━━━━━━━━*
📈 *Performance Metrics:*
├── 🕐 Uptime: ${hours}h ${minutes}m ${seconds}s
├── 💾 Memory: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
├── 📦 Commands: ${commandHandler.getAllCommands().length}
├── 🔄 Restarts: 0
└── ⚡ Speed: Excellent

*━━━━━━━━━━━━━━━━━*
🌐 *Server Information:*
├── 🖥️ Platform: ${os.platform()} ${os.arch()}
├── 💿 Node: ${process.version}
├── 📍 Region: Render Cloud
├── 🔒 Security: Enabled
└── 📡 Connection: Stable

*━━━━━━━━━━━━━━━━━*
🔧 *Bot Configuration:*
├── 👑 Owner: ${config.OWNER_NAME}
├── 🤖 Name: ${config.BOT_NAME}
├── ⚡ Prefix: "${config.PREFIX}"
├── 🚀 Version: ${require('./package.json').version}
└── 🔐 Pairing: Enabled

*━━━━━━━━━━━━━━━━━*
📊 *Quick Stats:*
• Deployment: ${deploymentTime.toLocaleDateString()}
• Last Update: Just now
• Status: ✅ Operational
• Response: 🟢 Immediate

*━━━━━━━━━━━━━━━━━*
🎯 *System is running optimally!*
_All systems are go! 🚀_
  `.trim();
  
  await sock.sendMessage(targetJid, { text: statusMessage });
}

// Web server for health checks
app.use(express.json());

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
    deployment: deploymentTime.toISOString(),
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
    commands: commandHandler.getAllCommands().length,
    health: 'excellent',
    message: '🤖 rahl xmd bot is running successfully!'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    platform: os.platform(),
    node: process.version
  });
});

app.get('/status', (req, res) => {
  const statusHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>${config.BOT_NAME} Status</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 20px;
            background: #25D366;
            color: white;
            border-radius: 50px;
            font-weight: bold;
            margin-top: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 15px;
            border-left: 5px solid #25D366;
        }
        .stat-card h3 {
            margin-top: 0;
            color: #075E54;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
        }
        .highlight {
            color: #25D366;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🤖</div>
            <h1>${config.BOT_NAME}</h1>
            <p>WhatsApp Bot by ${config.OWNER_NAME}</p>
            <div class="status-badge">✅ ONLINE & RUNNING</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>📊 System Status</h3>
                <p>Status: <span class="highlight">Operational</span></p>
                <p>Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m</p>
                <p>Memory: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            
            <div class="stat-card">
                <h3>🤖 Bot Info</h3>
                <p>Owner: ${config.OWNER_NAME}</p>
                <p>Prefix: "${config.PREFIX}"</p>
                <p>Commands: ${commandHandler.getAllCommands().length}</p>
            </div>
            
            <div class="stat-card">
                <h3>🖥️ Server Info</h3>
                <p>Platform: ${os.platform()}</p>
                <p>Node: ${process.version}</p>
                <p>PID: ${process.pid}</p>
            </div>
            
            <div class="stat-card">
                <h3>📅 Deployment</h3>
                <p>Time: ${deploymentTime.toLocaleString()}</p>
                <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
                <p>Health: Excellent</p>
            </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <h3>🔧 Quick Actions</h3>
            <p>Use these commands in WhatsApp:</p>
            <p><code>.help</code> - Show all commands</p>
            <p><code>.ping</code> - Check bot response</p>
            <p><code>.status</code> - System status</p>
        </div>
        
        <div class="footer">
            <p>${config.BOT_NAME} Bot • Powered by Baileys MD</p>
            <p>Deployed on Render • ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>
  `;
  
  res.send(statusHTML);
});

// Initialize systems
async function initSystems() {
  try {
    displayBanner();
    displayDeploymentInfo();
    
    // Initialize command handler
    commandHandler = new CommandHandler();
    
    console.log(colors.blue + '\n🚀 INITIALIZING SYSTEMS...' + colors.reset);
    displayConnectionStatus('connecting', 'Initializing bot systems...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(colors.green + '✅ All systems initialized successfully!' + colors.reset);
    console.log(colors.yellow + '='.repeat(50) + colors.reset);
    
  } catch (error) {
    console.error(colors.red + '❌ Failed to initialize systems:' + colors.reset, error);
    process.exit(1);
  }
}

// Connect to WhatsApp
async function connectToWhatsApp() {
  try {
    displayConnectionStatus('connecting', 'Connecting to WhatsApp...');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
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
      getMessage: async () => ({ conversation: `Message from ${config.BOT_NAME}` })
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        displayConnectionStatus('qr', 'QR Code generated. Scan with WhatsApp:');
        console.log(colors.magenta);
        qrcode.generate(qr, { small: true });
        console.log(colors.reset);
        console.log(colors.yellow + '⏰ QR Code valid for 30 seconds' + colors.reset);
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        displayConnectionStatus('disconnected', `Connection closed. Reconnecting: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          await delay(5000);
          displayConnectionStatus('connecting', 'Attempting to reconnect...');
          connectToWhatsApp();
        }
      } 
      else if (connection === 'open') {
        displayConnectionStatus('connected', 'Successfully connected to WhatsApp!');
        
        // Update bot profile
        await sock.updateProfileStatus(`🤖 ${config.BOT_NAME} | 👑 ${config.OWNER_NAME} | Prefix: ${config.PREFIX}`);
        await sock.updateProfileName(config.BOT_NAME);
        
        displayConnectionStatus('ready', 'Bot is ready to receive messages!');
        
        console.log(colors.green + '\n🎉 BOT IS NOW ONLINE!' + colors.reset);
        console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
        
        // Display success message
        console.log(colors.bright + colors.green + `
╔══════════════════════════════════════════╗
║         🎊 DEPLOYMENT SUCCESSFUL 🎊      ║
║      ===============================     ║
║  ✅ WhatsApp Connected                   ║
║  ✅ Commands Loaded                     ║
║  ✅ Web Server Running                  ║
║  ✅ Bot Profile Updated                 ║
║  ✅ Ready to Receive Messages           ║
╚══════════════════════════════════════════╝
        ` + colors.reset);
        
        console.log(colors.cyan + '\n📊 QUICK STATS:' + colors.reset);
        console.log(colors.bright + `├── Commands Loaded: ${commandHandler.getAllCommands().length}` + colors.reset);
        console.log(colors.bright + `├── Memory Usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB` + colors.reset);
        console.log(colors.bright + `├── Uptime: ${Math.floor(process.uptime())} seconds` + colors.reset);
        console.log(colors.bright + `└── Bot Name: ${config.BOT_NAME}` + colors.reset);
        
        console.log(colors.cyan + '\n🔗 ACCESS LINKS:' + colors.reset);
        console.log(colors.bright + `├── Health Check: http://localhost:${PORT}/health` + colors.reset);
        console.log(colors.bright + `├── Status Page: http://localhost:${PORT}/status` + colors.reset);
        console.log(colors.bright + `└── API Root: http://localhost:${PORT}/` + colors.reset);
        
        console.log(colors.cyan + '\n💡 NEXT STEPS:' + colors.reset);
        console.log(colors.bright + '1. Use .help to see available commands' + colors.reset);
        console.log(colors.bright + '2. Check bot status with .ping' + colors.reset);
        console.log(colors.bright + '3. Monitor logs for any issues' + colors.reset);
        console.log(colors.bright + '4. Share pair codes with users' + colors.reset);
        
        console.log(colors.yellow + '\n' + '='.repeat(50) + colors.reset);
        console.log(colors.green + '🚀 BOT IS READY TO ROCKET! 🚀' + colors.reset);
        console.log(colors.yellow + '='.repeat(50) + colors.reset);
        
        // Send deployment notification to owner
        await sendDeploymentNotification(sock);
        
        // Schedule periodic status updates (every 6 hours)
        setInterval(async () => {
          try {
            if (sock && process.env.OWNER_NUMBER) {
              const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
              await sendSystemStatus(sock, ownerJid);
            }
          } catch (error) {
            console.error('Periodic status update failed:', error.message);
          }
        }, 6 * 60 * 60 * 1000); // 6 hours
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;
      
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption || '';
      
      const sender = msg.key.remoteJid;
      
      // Handle status check command
      if (text.startsWith(config.PREFIX)) {
        const command = text.slice(config.PREFIX.length).split(' ')[0].toLowerCase();
        
        if (command === 'status' || command === 'deploy' || command === 'startup') {
          await sendSystemStatus(sock, sender);
        }
        
        // Let command handler handle other commands
        const executed = await commandHandler.execute(sock, msg, text);
        
        if (!executed && command !== 'status') {
          await sock.sendMessage(sender, {
            text: `❌ Command not found!\n\nUse *${config.PREFIX}help* to see available commands.\n👑 ${config.OWNER_NAME}`
          }, { quoted: msg });
        }
      }
    });
    
  } catch (error) {
    displayConnectionStatus('error', `Connection failed: ${error.message}`);
    console.error(colors.red + '❌ Failed to connect to WhatsApp:' + colors.reset, error);
    
    // Retry after 10 seconds
    await delay(10000);
    displayConnectionStatus('connecting', 'Retrying connection...');
    connectToWhatsApp();
  }
}

// Start web server
app.listen(PORT, () => {
  console.log(colors.blue + `🌐 Web server listening on port ${PORT}` + colors.reset);
  console.log(colors.green + `✅ Health check: http://localhost:${PORT}/health` + colors.reset);
  console.log(colors.green + `✅ Status page: http://localhost:${PORT}/status` + colors.reset);
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(colors.red + '❌ Unhandled Rejection at:' + colors.reset, promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error(colors.red + '❌ Uncaught Exception:' + colors.reset, error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(colors.yellow + '\n\n🛑 Shutting down bot gracefully...' + colors.reset);
  
  if (sock) {
    await sock.end();
    console.log(colors.green + '✅ WhatsApp connection closed' + colors.reset);
  }
  
  console.log(colors.green + '👋 Bot shutdown complete. Goodbye!' + colors.reset);
  process.exit(0);
});

// Welcome message on startup
console.log(colors.cyan + '\n🚀 STARTING RAHL XMD WHATSAPP BOT...' + colors.reset);

// Start the bot
async function startBot() {
  try {
    await initSystems();
    await connectToWhatsApp();
  } catch (error) {
    console.error(colors.red + '❌ Failed to start bot:' + colors.reset, error);
    process.exit(1);
  }
}

startBot();
