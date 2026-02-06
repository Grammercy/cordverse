const { Client } = require('discord.js-selfbot-v13');
const db = require('../db');
const { encrypt, decrypt } = require('../utils/crypto');

class DiscordService {
  constructor(io) {
    this.io = io;
    this.clients = new Map(); // token -> client
  }

  async loginWithId(accountId) {
    const stmt = db.prepare('SELECT token FROM accounts WHERE id = ?');
    const row = stmt.get(accountId);
    
    if (!row) {
      throw new Error('Account not found');
    }

    const token = decrypt(row.token);
    if (!token) {
      throw new Error('Failed to decrypt token');
    }

    return this.login(token);
  }

  async login(token) {
    if (this.clients.has(token)) {
      return this.clients.get(token);
    }

    const client = new Client({
      checkUpdate: false,
    });

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        
        // Save to DB if not exists (Encrypt token)
        const encryptedToken = encrypt(token);
        const stmt = db.prepare('INSERT OR REPLACE INTO accounts (id, token, username, discriminator, avatar) VALUES (?, ?, ?, ?, ?)');
        stmt.run(client.user.id, encryptedToken, client.user.username, client.user.discriminator, client.user.avatar);

        this.clients.set(token, client);
        this.setupEvents(client, token);
        resolve(client);
      });

      client.on('error', (error) => {
        console.error(`Error logging in: ${error.message}`);
        reject(error);
      });

      client.login(token).catch(reject);
    });
  }

  setupEvents(client, token) {
    client.on('messageCreate', (message) => {
      this.io.emit('message', {
        accountId: client.user.id,
        channelId: message.channelId,
        guildId: message.guildId,
        id: message.id,
        content: message.content,
        author: {
          id: message.author.id,
          username: message.author.username,
          avatar: message.author.avatar,
        },
        timestamp: message.createdTimestamp,
        embeds: message.embeds,
        attachments: [...message.attachments.values()],
      });
    });
  }

  async getGuilds(token) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');
    
    return client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
    }));
  }

  async getChannels(token, guildId) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    return guild.channels.cache
      .filter(c => c.type === 'GUILD_TEXT')
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        parentId: channel.parentId,
        position: channel.position,
      }));
  }

  async getMessages(token, channelId, limit = 50) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error('Channel not found');

    const messages = await channel.messages.fetch({ limit });
    return messages.map(m => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username,
        avatar: m.author.avatar,
      },
      timestamp: m.createdTimestamp,
      embeds: m.embeds,
      attachments: [...m.attachments.values()],
    }));
  }

  async sendMessage(token, channelId, content) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error('Channel not found');

    return await channel.send(content);
  }
}

module.exports = DiscordService;
