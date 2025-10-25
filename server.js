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
        
        console.log('[Server] AES-GCM decryption successful');
        return decrypted;
        
    } catch (error) {
        console.error(`[Server] AES-GCM decryption failed: ${error.message}`);
        throw error;
    }
}

// AES-CBC Encryption using Node.js crypto module
function encryptAesCbc(text, passphrase) {
    try {
        console.log('[Server] Starting AES-CBC encryption...');
        
        // Convert passphrase to bytes
        const passphraseBytes = Buffer.from(passphrase, 'utf8');
        const key = passphraseBytes; // Use full passphrase as key
        const iv = passphraseBytes.slice(0, 16); // First 16 bytes as IV
        
        console.log(`[Server] Text length: ${text.length}, Key length: ${key.length}, IV length: ${iv.length}`);
        
        // Create cipher using Node.js crypto module
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        
        // Encrypt
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        console.log('[Server] AES-CBC encryption successful');
        return encrypted;
        
    } catch (error) {
        console.error(`[Server] AES-CBC encryption failed: ${error.message}`);
        throw error;
    }
}

// AES-CBC Decryption using Node.js crypto module
function decryptAesCbc(encryptedB64, passphrase) {
    try {
        console.log('[Server] Starting AES-CBC decryption...');
        
        // Base64 decode encrypted data
        const encryptedBytes = base64ToBytes(encryptedB64);
        // Convert passphrase to bytes (same as encryption)
        const passphraseBytes = Buffer.from(passphrase, 'utf8');
        
        console.log(`[Server] Encrypted data length: ${encryptedBytes.length} bytes`);
        console.log(`[Server] Passphrase length: ${passphraseBytes.length} bytes`);
        
        // Extract key and IV (same as encryption)
        const key = passphraseBytes; // Use full passphrase as key
        const iv = passphraseBytes.slice(0, 16); // First 16 bytes as IV
        
        console.log(`[Server] IV length: ${iv.length}, Key length: ${key.length}`);
        
        // Create decipher using Node.js crypto module
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        // Decrypt
        let decrypted = decipher.update(Buffer.from(encryptedBytes), null, 'utf8');
        decrypted += decipher.final('utf8');
        
        console.log('[Server] AES-CBC decryption successful');
        return decrypted;
        
    } catch (error) {
        console.error(`[Server] AES-CBC decryption failed: ${error.message}`);
        throw error;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Vidnest & Vidrock Decryption Server is running',
        supportedMethods: ['aes-gcm', 'aes-cbc'],
        timestamp: new Date().toISOString()
    });
});

// Encryption endpoint
app.post('/encrypt', (req, res) => {
    try {
        const { text, passphrase, method = 'cbc' } = req.body;
        
        // Validate input
        if (!text || !passphrase) {
            return res.status(400).json({
                error: 'Missing required fields: text and passphrase are required'
            });
        }
        
        // Validate method
        if (!['cbc'].includes(method)) {
            return res.status(400).json({
                error: 'Invalid method: only "cbc" is supported for encryption'
            });
        }
        
        console.log(`[Server] Received encryption request - Method: ${method.toUpperCase()}, Text length: ${text.length}`);
        
        // Perform encryption based on method
        let encrypted;
        if (method === 'cbc') {
            encrypted = encryptAesCbc(text, passphrase);
        } else {
            throw new Error('Unsupported encryption method');
        }
        
        res.json({
            success: true,
            encrypted: encrypted,
            method: method.toUpperCase(),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`[Server] Encryption error: ${error.message}`);
        res.status(500).json({
            error: `Encryption failed: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
});

// Main decryption endpoint
app.post('/decrypt', (req, res) => {
    try {
        const { encryptedData, passphrase, method = 'gcm' } = req.body;
        
        // Validate input
        if (!encryptedData || !passphrase) {
            return res.status(400).json({
                error: 'Missing required fields: encryptedData and passphrase are required'
            });
        }
        
        // Validate method
        if (!['gcm', 'cbc'].includes(method)) {
            return res.status(400).json({
                error: 'Invalid method: must be "gcm" or "cbc"'
            });
        }
        
        console.log(`[Server] Received decryption request - Method: ${method.toUpperCase()}, Data length: ${encryptedData.length}`);
        
        // Perform decryption based on method
        let decrypted;
        if (method === 'cbc') {
            decrypted = decryptAesCbc(encryptedData, passphrase);
        } else {
            decrypted = decryptAesGcm(encryptedData, passphrase);
        }
        
        res.json({
            success: true,
            decrypted: decrypted,
            method: method.toUpperCase(),
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
        availableEndpoints: ['/health', '/decrypt', '/encrypt'],
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`[Server] Vidnest & Vidrock Decryption Server running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    console.log(`[Server] Decrypt endpoint: http://localhost:${PORT}/decrypt`);
    console.log(`[Server] Supported methods: AES-GCM (Vidnest), AES-CBC (Vidrock)`);
});

module.exports = app;