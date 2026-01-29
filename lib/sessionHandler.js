// lib/sessionHandler.js - COMPLETE CORRECTED VERSION
const { initAuthCreds } = require('@whiskeysockets/baileys');
const { Storage } = require('megajs');

// Helper for Buffer serialization
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
     * Smart Session ID decoder that handles Mega.nz file IDs
     */
    static async decodeSessionId(sessionIdString) {
        console.log('[SESSION] 🔍 Processing Session ID');
        
        try {
            // Check if this is a Mega.nz file ID (contains #)
            if (sessionIdString.includes('#') && sessionIdString.includes('RAHL-XMD~')) {
                console.log('[SESSION] Detected Mega.nz file format');
                return await this.downloadFromMega(sessionIdString);
            }
            
            // Try as standard Base64
            console.log('[SESSION] Trying standard Base64 decode...');
            return await this.decodeBase64SessionId(sessionIdString);
            
        } catch (error) {
            console.error('[SESSION] ❌ All decode methods failed:', error.message);
            
            // Fallback: Empty session (will show QR code)
            console.log('[SESSION] Falling back to new empty session (QR code will appear)');
            const creds = initAuthCreds();
            const keys = {};
            const saveCreds = () => { 
                console.log('[SESSION] Saving new credentials from QR session.') 
            };
            
            return { state: { creds, keys }, saveCreds };
        }
    }
    
    /**
     * Download and decode session from Mega.nz
     */
    static async downloadFromMega(sessionIdString) {
        try {
            // Extract the Mega.nz file ID
            const megaFileId = sessionIdString.replace('RAHL-XMD~', '');
            const megaUrl = `https://mega.nz/file/${megaFileId}`;
            
            console.log('[SESSION] Mega URL:', megaUrl);
            console.log('[SESSION] Downloading from Mega.nz...');
            
            // METHOD 1: Try direct download from public link
            try {
                return await this.downloadPublicMegaFile(megaUrl);
            } catch (publicError) {
                console.log('[SESSION] Public download failed, trying with credentials...');
                
                // METHOD 2: Try with credentials if available
                if (process.env.MEGA_EMAIL && process.env.MEGA_PASSWORD) {
                    return await this.downloadMegaWithCredentials(megaUrl);
                }
                
                throw publicError;
            }
            
        } catch (error) {
            console.error('[SESSION] ❌ Mega.nz download failed:', error.message);
            throw new Error(`Mega.nz download failed: ${error.message}`);
        }
    }
    
    /**
     * Download public Mega.nz file
     */
    static async downloadPublicMegaFile(megaUrl) {
        const storage = await Storage.fromURL(megaUrl);
        const file = storage.files[0];
        
        if (!file) {
            throw new Error('No file found in the Mega.nz link');
        }
        
        console.log('[SESSION] Found file:', file.name, 'Size:', file.size);
        
        return new Promise((resolve, reject) => {
            let data = Buffer.from('');
            const downloadStream = file.download();
            
            downloadStream.on('data', chunk => {
                data = Buffer.concat([data, chunk]);
            });
            
            downloadStream.on('end', () => {
                console.log('[SESSION] ✅ File downloaded successfully:', data.length, 'bytes');
                
                try {
                    const jsonString = data.toString('utf-8');
                    const sessionData = JSON.parse(jsonString);
                    
                    if (!sessionData.creds) {
                        throw new Error('Downloaded file missing "creds" field');
                    }
                    
                    console.log('[SESSION] ✅ Session data parsed successfully');
                    const creds = sessionData.creds || initAuthCreds();
                    const keys = sessionData.keys || {};
                    
                    const saveCreds = () => {
                        console.log('[SESSION] Credentials updated from Mega session.');
                    };
                    
                    resolve({ state: { creds, keys }, saveCreds });
                    
                } catch (parseError) {
                    console.error('[SESSION] ❌ Failed to parse downloaded file');
                    reject(parseError);
                }
            });
            
            downloadStream.on('error', reject);
        });
    }
    
    /**
     * Download with Mega.nz credentials (fallback method)
     */
    static async downloadMegaWithCredentials(megaUrl) {
        // Extract file ID
        const fileId = megaUrl.split('/file/')[1].split('#')[0];
        
        const storage = await new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD
        }).ready;
        
        // Find the file
        const file = Object.values(storage.files).find(f => 
            f.downloadId === fileId || f.nodeId === fileId
        );
        
        if (!file) {
            throw new Error('File not found in your Mega.nz account');
        }
        
        const downloadStream = file.download();
        let data = '';
        
        return new Promise((resolve, reject) => {
            downloadStream.on('data', chunk => data += chunk);
            downloadStream.on('end', () => {
                try {
                    const sessionData = JSON.parse(data);
                    const creds = sessionData.creds || initAuthCreds();
                    const keys = sessionData.keys || {};
                    
                    const saveCreds = () => {
                        console.log('[SESSION] Credentials updated from Mega session (credential method).');
                    };
                    
                    resolve({ state: { creds, keys }, saveCreds });
                } catch (e) {
                    reject(new Error('Invalid JSON in downloaded file'));
                }
            });
            downloadStream.on('error', reject);
        });
    }
    
    /**
     * Handle standard Base64 encoded sessions
     */
    static async decodeBase64SessionId(sessionIdString) {
        let dataPart = sessionIdString;
        if (sessionIdString.includes('~')) {
            dataPart = sessionIdString.split('~')[1];
        }
        
        console.log('[SESSION] Base64 data part length:', dataPart.length);
        
        const jsonString = Buffer.from(dataPart, 'base64').toString('utf-8');
        const sessionData = JSON.parse(jsonString, BufferJSON.reviver);
        
        const creds = sessionData.creds || initAuthCreds();
        const keys = sessionData.keys || {};
        
        const saveCreds = () => {
            console.log('[SESSION] Credentials updated from Base64 session.');
        };
        
        console.log('[SESSION] ✅ Standard Base64 decode successful!');
        return { state: { creds, keys }, saveCreds };
    }
    
    /**
     * Get session from environment variable
     */
    static async getAuthStateFromEnv() {
        const sessionIdFromEnv = process.env.WHATSAPP_SESSION_ID;
        if (!sessionIdFromEnv) {
            throw new Error('WHATSAPP_SESSION_ID environment variable is not set.');
        }
        return this.decodeSessionId(sessionIdFromEnv);
    }
}

module.exports = SessionHandler;
