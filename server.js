const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3050;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Base64 utilities (React Native compatible)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToBytes(base64) {
    if (!base64) return new Uint8Array(0);
    
    // Remove padding
    let input = String(base64).replace(/=+$/, '');
    let output = '';
    let bc = 0, bs, buffer, idx = 0;
    
    while ((buffer = input.charAt(idx++))) {
        buffer = BASE64_CHARS.indexOf(buffer);
        if (~buffer) {
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) {
                output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
            }
        }
    }
    
    // Convert string to bytes
    const bytes = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) {
        bytes[i] = output.charCodeAt(i);
    }
    return bytes;
}

// AES-GCM Decryption using Node.js crypto module
function decryptAesGcm(encryptedB64, passphraseB64) {
    try {
        console.log('[Server] Starting AES-GCM decryption...');
        
        // Base64 decode encrypted data and key
        const encryptedBytes = base64ToBytes(encryptedB64);
        const keyBytes = base64ToBytes(passphraseB64).slice(0, 32); // Take first 32 bytes
        
        console.log(`[Server] Encrypted data length: ${encryptedBytes.length} bytes`);
        console.log(`[Server] Key length: ${keyBytes.length} bytes`);
        
        // Extract components (AES-GCM format: IV + ciphertext + auth tag)
        const iv = encryptedBytes.slice(0, 12); // 12-byte IV for GCM
        const ciphertext = encryptedBytes.slice(12, -16); // Middle part
        const tag = encryptedBytes.slice(-16); // Last 16 bytes for auth tag
        
        console.log(`[Server] IV length: ${iv.length}, Ciphertext length: ${ciphertext.length}, Tag length: ${tag.length}`);
        
        // Create decipher using Node.js crypto module with proper API
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyBytes), Buffer.from(iv));
        decipher.setAuthTag(Buffer.from(tag));
        
        // Decrypt
        let decrypted = decipher.update(Buffer.from(ciphertext), null, 'utf8');
        decrypted += decipher.final('utf8');
        
        console.log('[Server] Decryption successful');
        return decrypted;
        
    } catch (error) {
        console.error(`[Server] Decryption failed: ${error.message}`);
        throw error;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Vidnest Decryption Server is running',
        timestamp: new Date().toISOString()
    });
});

// Main decryption endpoint
app.post('/decrypt', (req, res) => {
    try {
        const { encryptedData, passphrase } = req.body;
        
        // Validate input
        if (!encryptedData || !passphrase) {
            return res.status(400).json({
                error: 'Missing required fields: encryptedData and passphrase are required'
            });
        }
        
        console.log(`[Server] Received decryption request - Data length: ${encryptedData.length}`);
        
        // Perform decryption
        const decrypted = decryptAesGcm(encryptedData, passphrase);
        
        res.json({
            success: true,
            decrypted: decrypted,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`[Server] Decryption error: ${error.message}`);
        res.status(500).json({
            error: `Decryption failed: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('[Server] Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: ['/health', '/decrypt'],
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`[Server] Vidnest Decryption Server running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    console.log(`[Server] Decrypt endpoint: http://localhost:${PORT}/decrypt`);
});

module.exports = app;