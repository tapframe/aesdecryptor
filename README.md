# Vidnest Decryption Server

A standalone Express.js server that handles AES-GCM decryption for Vidnest providers, making them compatible with React Native environments.

## Features

- **AES-GCM Decryption**: Handles Vidnest's encrypted API responses
- **React Native Compatible**: Replaces Web Crypto API calls with HTTP requests
- **Express.js Server**: Lightweight and easy to deploy
- **CORS Enabled**: Ready for cross-origin requests
- **Error Handling**: Comprehensive error responses
- **Health Check**: Built-in health monitoring endpoint

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   cd decryption-server
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   Server will run on `http://localhost:3050`

3. **Test the Server**
   ```bash
   # From the main project directory
   node test_server_decryption.js
   ```

### API Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Vidnest Decryption Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Decryption
```http
POST /decrypt
Content-Type: application/json

{
  "encryptedData": "base64-encoded-encrypted-data",
  "passphrase": "base64-encoded-passphrase"
}
```

**Success Response:**
```json
{
  "success": true,
  "decrypted": "decrypted-json-string",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "Decryption failed: Invalid encrypted data",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Deployment

### VPS Deployment

1. **Upload Server Files**
   ```bash
   # Upload the decryption-server directory to your VPS
   scp -r decryption-server/ user@your-vps:/path/to/deployment/
   ```

2. **Install Dependencies**
   ```bash
   ssh user@your-vps
   cd /path/to/deployment/decryption-server
   npm install --production
   ```

3. **Configure Environment**
   ```bash
   # Set port (optional, defaults to 3050)
   export PORT=3050
   ```

4. **Start Server**
   ```bash
   # Using PM2 for process management (recommended)
   npm install -g pm2
   pm2 start server.js --name "vidnest-decryption"
   pm2 save
   pm2 startup
   ```

5. **Update Provider URLs**
   Update the server URL in both providers:
   ```javascript
   // In providers/vidnest.js and providers/vidnest-anime.js
   return fetch('http://your-vps-ip:3050/decrypt', {
       // ... rest of the request
   });
   ```

### Docker Deployment

Create a `Dockerfile` in the decryption-server directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js ./

EXPOSE 3050

CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t vidnest-decryption .
docker run -p 3050:3050 vidnest-decryption
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3050)
- `NODE_ENV`: Environment mode (development/production)

### Security Considerations

For production deployment:

1. **Add Authentication**
   ```javascript
   // Add API key middleware
   app.use('/decrypt', (req, res, next) => {
       const apiKey = req.headers['x-api-key'];
       if (apiKey !== process.env.API_KEY) {
           return res.status(401).json({ error: 'Unauthorized' });
       }
       next();
   });
   ```

2. **Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

3. **HTTPS**: Use reverse proxy (nginx) with SSL certificates

## Monitoring

### Health Check
Monitor server health:
```bash
curl http://localhost:3050/health
```

### Logs
Server logs include:
- Request/response details
- Decryption success/failure
- Error messages with timestamps

### PM2 Monitoring
```bash
pm2 status
pm2 logs vidnest-decryption
pm2 monit
```

## Troubleshooting

### Common Issues

1. **Server Not Starting**
   - Check if port 3050 is available
   - Verify all dependencies are installed
   - Check for syntax errors in server.js

2. **Decryption Failures**
   - Verify encrypted data format
   - Check passphrase is correct
   - Ensure base64 encoding is valid

3. **Provider Connection Issues**
   - Verify server URL in providers
   - Check CORS settings
   - Test with curl/Postman

### Debug Mode

Enable verbose logging:
```javascript
// Add to server.js
process.env.DEBUG = 'true';
```

## Integration

The server integrates seamlessly with Vidnest providers:

- **vidnest.js**: Movies and TV shows
- **vidnest-anime.js**: Anime content

Both providers automatically use the server for decryption when running in React Native environments.

## License

MIT License - See LICENSE file for details.
# aesdecryptor
