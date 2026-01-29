// lib/sessionHandler.js - UPDATED FOR BASE64 ONLY (NO MEGA.NZ)
const { initAuthCreds } = require('@whiskeysockets/baileys');

// Helper for Buffer serialization (CRITICAL for WhatsApp credentials)
const BufferJSON = {
    replacer: (k, value) => {
        if (value instanceof Buffer || value?.type === 'Buffer') {
            return { type: 'Buffer', data: Array.from(value.data || value) };
        }
        return value;
    },
    reviver: (k, value) => {
        if (value?.type === 'Buffer' && Array.isArray(value.data)) {
            return Buffer.from(value.data);
        }
        return value;
    }
};

class SessionHandler {
    /**
     * Decodes clean Base64 Session IDs from your updated pairing site
     */
    static async decodeSessionId(sessionIdString) {
        console.log('[SESSION] 🔍 Processing Session ID');
        
        try {
            // 1. Remove RAHL-XMD~ prefix if present
            let dataPart = sessionIdString;
            if (sessionIdString.includes('~')) {
                dataPart = sessionIdString.split('~')[1];
            }
            
            console.log('[SESSION] Base64 data length:', dataPart.length);
            
            // 2. Decode from Base64
            const jsonString = Buffer.from(dataPart, 'base64').toString('utf-8');
            console.log('[SESSION] First 100 chars of decoded:', jsonString.substring(0, 100));
            
            // 3. Parse JSON with Buffer handling
            const sessionData = JSON.parse(jsonString, BufferJSON.reviver);
            
            // 4. Validate session structure
            if (!sessionData.creds) {
                throw new Error('Session data missing "creds" field');
            }
            
            const creds = sessionData.creds || initAuthCreds();
            const keys = sessionData.keys || {};
            
            // 5. Create save function for credential updates
            const saveCreds = () => {
                console.log('[SESSION] Credentials were updated.');
                // Optional: You could add logic here to update the session in your pairing site
            };
            
            console.log('[SESSION] ✅ Base64 decode successful!');
            console.log('[SESSION] Bot will login as:', creds.me?.id || 'Unknown');
            
            return { state: { creds, keys }, saveCreds };
            
        } catch (error) {
            console.error('[SESSION] ❌ Decode failed:', error.message);
            
            if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
                console.error('[SESSION] The Session ID is NOT valid Base64. Is your pairing site updated?');
            }
            
            // Fallback: Create empty session (will show QR code)
            console.log('[SESSION] Falling back to QR code session');
            const creds = initAuthCreds();
            const keys = {};
            const saveCreds = () => { 
                console.log('[SESSION] Saving new credentials from QR session.');
                console.log('[SESSION] TIP: Scan QR, then update your Session ID with the new credentials!');
            };
            
            return { state: { creds, keys }, saveCreds };
        }
    }
    
    /**
     * Get session from environment variable (for Render deployment)
     */
    static async getAuthStateFromEnv() {
        const sessionIdFromEnv = process.env.WHATSAPP_SESSION_ID;
        
        if (!sessionIdFromEnv || sessionIdFromEnv.trim() === '') {
            console.log('[SESSION] ⚠️ WHATSAPP_SESSION_ID is empty or not set');
            throw new Error('WHATSAPP_SESSION_ID environment variable is not set.');
        }
        
        console.log('[SESSION] Found Session ID in environment (length:', sessionIdFromEnv.length, ')');
        return this.decodeSessionId(sessionIdFromEnv);
    }
}

module.exports = SessionHandler;
