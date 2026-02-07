const WebSocket = require('ws');
const crypto = require('crypto');
const axios = require('axios');

class QrLoginService {
  constructor(io) {
    this.io = io;
    this.sessions = new Map(); // socketId -> { ws, keyPair }
  }

  startSession(socket) {
    // If session exists, close it first
    this.stopSession(socket);

    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // Remove header/footer and newlines from PEM for the payload
    const publicKeyEncoded = keyPair.publicKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\n/g, '');

    const ws = new WebSocket('wss://remote-auth-gateway.discord.gg/?v=2', {
      headers: { Origin: 'https://discord.com' }
    });

    const session = { ws, keyPair };
    this.sessions.set(socket.id, session);

    ws.on('message', async (data) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch (e) {
        return;
      }

      switch (message.op) {
        case 'hello':
          ws.send(JSON.stringify({
            op: 'init',
            encoded_public_key: publicKeyEncoded
          }));
          break;

        case 'nonce_proof':
          try {
            const encryptedNonce = Buffer.from(message.encrypted_nonce, 'base64');
            const decryptedNonce = crypto.privateDecrypt(
              {
                key: keyPair.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
              },
              encryptedNonce
            );
            
            // Base64URL encode the decrypted nonce
            const nonce = decryptedNonce.toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            ws.send(JSON.stringify({
              op: 'nonce_proof',
              nonce: nonce
            }));
          } catch (err) {
            console.error('Nonce decryption failed', err);
            socket.emit('qr_error', 'Security handshake failed');
            this.stopSession(socket);
          }
          break;

        case 'pending_remote_init':
          const fingerprint = message.fingerprint;
          socket.emit('qr_code', `https://discord.com/ra/${fingerprint}`);
          break;

        case 'pending_ticket':
          const user = message.encrypted_user_payload 
            ? null // If we wanted to show user info, we'd need to decrypt this too, similar to nonce
            : null; 
          // For now, just notify frontend that scan happened
          socket.emit('qr_scanned');
          break;

        case 'pending_login':
          try {
            const ticket = message.ticket;
            
            // Exchange ticket for token
            const response = await axios.post('https://discord.com/api/v9/users/@me/remote-auth/login', {
              ticket: ticket
            });

            const encryptedToken = response.data.encrypted_token;
            const decryptedTokenBuffer = crypto.privateDecrypt(
              {
                key: keyPair.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
              },
              Buffer.from(encryptedToken, 'base64')
            );
            
            const token = decryptedTokenBuffer.toString('utf-8');
            socket.emit('qr_success', { token });
            this.stopSession(socket);

          } catch (err) {
            console.error('Token exchange failed', err);
            socket.emit('qr_error', 'Login verification failed');
            this.stopSession(socket);
          }
          break;
        
        case 'cancel':
        case 'finish': 
          // Finish is usually handled via pending_login -> exchange -> success, 
          // but sometimes protocol varies.
          break;
      }
    });

    ws.on('close', () => {
      // socket.emit('qr_error', 'Connection timed out');
      this.sessions.delete(socket.id);
    });

    // Heartbeat loop
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ op: 'heartbeat' }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 41250); // Default ~41s
    
    session.heartbeat = heartbeatInterval;
  }

  stopSession(socket) {
    const session = this.sessions.get(socket.id);
    if (session) {
      if (session.heartbeat) clearInterval(session.heartbeat);
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }
      this.sessions.delete(socket.id);
    }
  }
}

module.exports = QrLoginService;
