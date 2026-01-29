// lib/sessionHandler.js
const { initAuthCreds } = require('@whiskeysockets/baileys');

// Helper required by Baileys to serialize/deserialize the session data
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
     * Decodes the Base64 Session ID from your pairing site into a usable auth state for Baileys.
     * @param {string} sessionIdString - The encoded string from your site (e.g., "RAHL-XMD~C5wFFSCB#...")
     * @returns {Promise<{state: {creds: any, keys: any}, saveCreds: Function}>}
     */
    static async decodeSessionId(sessionIdString) {
        try {
            // 1. Clean the string if it has a prefix like "RAHL-XMD~"
            let encodedData = sessionIdString;
            if (sessionIdString.includes('~')) {
                encodedData = sessionIdString.split('~')[1];
            }

            // 2. Decode from Base64
            const decodedJson = Buffer.from(encodedData, 'base64').toString('utf-8');
            
            // 3. Parse the JSON using Baileys' special reviver for Buffer objects
            const sessionData = JSON.parse(decodedJson, BufferJSON.reviver);
            
            // 4. Extract the credentials and keys
            const creds = sessionData.creds || initAuthCreds();
            const keys = sessionData.keys || {};

            // 5. Define the function to save updated credentials (crucial for session persistence)
            const saveCreds = () => {
                // This function is called by Baileys when credentials update.
                // You can choose to send updated credentials back to your pairing site's API here.
                console.log('[SESSION] Credentials were updated. Consider syncing back to your session vault.');
                
                // Example: Re-encode and log the updated state (for debugging)
                // const updatedData = JSON.stringify({ creds, keys }, BufferJSON.replacer);
                // const newEncodedString = Buffer.from(updatedData).toString('base64');
                // console.log('[SESSION] New encoded state:', 'RAHL-XMD~' + newEncodedString);
            };

            console.log('[SESSION] ✅ Successfully loaded session from ID.');
            return { state: { creds, keys }, saveCreds };

        } catch (error) {
            console.error('[SESSION] ❌ Failed to decode session ID:', error.message);
            console.error('[SESSION] The Session ID might be invalid or corrupted.');
            // Fallback: Create a new, empty auth state. The bot will then generate a QR code.
            const creds = initAuthCreds();
            const keys = {};
            const saveCreds = () => { console.log('[SESSION] Saving new credentials.') };
            
            return { state: { creds, keys }, saveCreds };
        }
    }

    /**
     * Alternative: Get session from an environment variable (for Render/Heroku deployment).
     * Set the env variable WHATSAPP_SESSION_ID to your encoded string.
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
