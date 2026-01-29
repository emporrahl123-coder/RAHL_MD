// lib/sessionHandler.js - UPDATED FOR MEGA.NZ SESSION IDS
const { initAuthCreds } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

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
     * Smart Session ID decoder that handles:
     * 1. Mega.nz file IDs (RAHL-XMD~xxxx#yyyy)
     * 2. Standard Base64 encoded sessions
     */
    static async decodeSessionId(sessionIdString) {
        console.log('[SESSION] 🔍 Processing Session ID');
        
        try {
            // Step 1: Check if this is a Mega.nz file ID (contains #)
            if (sessionIdString.includes('#') && sessionIdString.includes('RAHL-XMD~')) {
                console.log('[SESSION] Detected Mega.nz file format');
                return await this.decodeMegaSessionId(sessionIdString);
            }
            
            // Step 2: Try as standard Base64 (clean format)
            console.log('[SESSION] Trying standard Base64 decode...');
            return await this.decodeBase64SessionId(sessionIdString);
            
        } catch (error) {
            console.error('[SESSION] ❌ All decode methods failed:', error.message);
            
            // Ultimate fallback: Empty session (will show QR code)
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
     * Handle Mega.nz file IDs: RAHL-XMD~C5wFFSCB#HC7Yo0NQzZVEa5RojrYHCHuXumxTCEEooWNOhKSySxU
     */
    static async decodeMegaSessionId(sessionIdString) {
        try {
            // 1. Extract the Mega.nz file ID
            const megaFileId = sessionIdString.replace('RAHL-XMD~', '');
            console.log('[SESSION] Mega file ID:', megaFileId);
            
            // 2. Construct the download URL
            const megaUrl = `https://mega.nz/file/${megaFileId}`;
            console.log('[SESSION] Mega URL:', megaUrl);
            
            // 3. Download the creds.json file from Mega.nz
            console.log('[SESSION] Downloading session from Mega.nz...');
            const sessionData = await this.downloadFromMega(megaUrl);
            
            // 4. Parse the downloaded JSON
            const creds = sessionData.creds || initAuthCreds();
            const keys = sessionData.keys || {};
            
            const saveCreds = () => {
                console.log('[SESSION] Credentials updated from Mega session.');
            };
            
            console.log('[SESSION] ✅ Mega.nz session loaded successfully!');
            return { state: { creds, keys }, saveCreds };
            
        } catch (error) {
            console.error('[SESSION] ❌ Mega.nz decode failed:', error.message);
            throw new Error(`Mega.nz download failed: ${error.message}`);
        }
    }
    
    /**
     * Handle standard Base64 encoded sessions
     */
    static async decodeBase64SessionId(sessionIdString) {
        // Remove prefix if present
        let dataPart = sessionIdString;
        if (sessionIdString.includes('~')) {
            dataPart = sessionIdString.split('~')[1];
        }
        
        console.log('[SESSION] Base64 data part length:', dataPart.length);
        
        // Try to decode as Base64
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
     * Download session file from Mega.nz
     * NOTE: This is a simplified version - Mega.nz API requires proper authentication
     */
    static async downloadFromMega(megaUrl) {
        // IMPORTANT: Mega.nz requires API authentication
        // You might need to use a Mega.nz SDK or alternative approach
        
        console.log('[SESSION] ⚠️  Mega.nz download requires API setup');
        console.log('[SESSION] Temporary: Using fallback to QR code');
        
        // For now, throw error so it falls back to QR code
        throw new Error('Mega.nz API not configured. Please scan QR code instead.');
        
        // If you want to implement proper Mega.nz download:
        // 1. Install: npm install megajs
        // 2. Use your Mega.nz credentials from environment variables
        // 3. Implement proper download logic
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
