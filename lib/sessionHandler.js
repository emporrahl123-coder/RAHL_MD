static async downloadFromMega(megaUrl) {
    const { Storage } = require('megajs');
    
    console.log('[SESSION] Downloading from Mega.nz URL:', megaUrl);
    
    try {
        // METHOD 1: Direct download from public link (no credentials needed)
        console.log('[SESSION] Attempting direct public download...');
        
        // Create storage instance from the public URL
        const storage = await Storage.fromURL(megaUrl);
        
        // Get the first file in the storage (should be our creds.json)
        const file = storage.files[0];
        if (!file) {
            throw new Error('No file found in the Mega.nz link');
        }
        
        console.log('[SESSION] Found file:', file.name, 'Size:', file.size);
        
        // Download the file
        return new Promise((resolve, reject) => {
            let data = Buffer.from('');
            
            const downloadStream = file.download();
            
            downloadStream.on('data', chunk => {
                data = Buffer.concat([data, chunk]);
            });
            
            downloadStream.on('end', () => {
                console.log('[SESSION] ✅ File downloaded successfully');
                console.log('[SESSION] Downloaded size:', data.length, 'bytes');
                
                try {
                    // Parse the JSON content
                    const jsonString = data.toString('utf-8');
                    const sessionData = JSON.parse(jsonString);
                    
                    // Validate it has the required structure
                    if (!sessionData.creds) {
                        throw new Error('Downloaded file missing "creds" field');
                    }
                    
                    console.log('[SESSION] ✅ Session data parsed successfully');
                    resolve(sessionData);
                    
                } catch (parseError) {
                    console.error('[SESSION] ❌ Failed to parse downloaded file:', parseError.message);
                    // Try to see what we got
                    console.log('[SESSION] First 200 chars of downloaded data:', data.toString('utf-8').substring(0, 200));
                    reject(new Error('Invalid JSON in downloaded file'));
                }
            });
            
            downloadStream.on('error', (error) => {
                console.error('[SESSION] ❌ Download stream error:', error);
                reject(error);
            });
        });
        
    } catch (error) {
        console.error('[SESSION] ❌ Mega.nz download failed:', error.message);
        
        // METHOD 2: Fallback - Try with credentials (if provided)
        if (process.env.MEGA_EMAIL && process.env.MEGA_PASSWORD) {
            console.log('[SESSION] Trying with credentials...');
            try {
                return await this.downloadWithCredentials(megaUrl);
            } catch (credError) {
                console.error('[SESSION] ❌ Credential download also failed:', credError.message);
            }
        }
        
        throw new Error(`Mega.nz download failed: ${error.message}`);
    }
}

/**
 * Alternative method using Mega.nz credentials
 */
static async downloadWithCredentials(megaUrl) {
    const { Storage } = require('megajs');
    
    // Extract file ID from URL
    const fileId = megaUrl.split('/file/')[1].split('#')[0];
    console.log('[SESSION] File ID for credential download:', fileId);
    
    // Login with credentials
    const storage = await new Storage({
        email: process.env.MEGA_EMAIL,
        password: process.env.MEGA_PASSWORD
    }).ready;
    
    // Find the file by ID (files are stored by nodeId)
    const file = Object.values(storage.files).find(f => 
        f.downloadId === fileId || f.nodeId === fileId
    );
    
    if (!file) {
        throw new Error('File not found in your Mega.nz account');
    }
    
    // Download the file
    const downloadStream = file.download();
    let data = '';
    
    return new Promise((resolve, reject) => {
        downloadStream.on('data', chunk => data += chunk);
        downloadStream.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                reject(new Error('Invalid JSON in downloaded file'));
            }
        });
        downloadStream.on('error', reject);
    });
}
