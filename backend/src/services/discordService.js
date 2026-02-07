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
    client.setMaxListeners(20); // Increase limit for guildMembersChunk listeners to suppress warning

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
        this.io.emit('discordClientError', { accountId: client.user.id, message: error.message });
        reject(error);
      });

      client.on('invalidated', () => {
        console.error(`Client token invalidated for ${client.user.tag}!`);
        this.io.emit('discordClientInvalidated', { accountId: client.user.id, message: 'Token invalidated. Please re-login.' });
        // Optionally, remove the client from this.clients map and clean up
        const clientToken = Array.from(this.clients.entries()).find(([, c]) => c === client)?.[0];
        if (clientToken) {
          this.clients.delete(clientToken);
        }
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
          displayName: message.member?.displayName ?? message.author.globalName ?? message.author.username,
          avatar: message.author.avatar,
        },
        timestamp: message.createdTimestamp,
        embeds: message.embeds,
        attachments: [...message.attachments.values()],
        mentions: message.mentions.users.map(u => ({
          id: u.id,
          username: u.username,
          displayName: message.mentions.members?.get(u.id)?.displayName ?? u.globalName ?? u.username,
        })),
      });
    });

    client.on('messageUpdate', (oldMessage, newMessage) => {
      if (!newMessage.author) return; // Partial message
      this.io.emit('messageUpdate', {
        accountId: client.user.id,
        channelId: newMessage.channelId,
        guildId: newMessage.guildId,
        id: newMessage.id,
        content: newMessage.content,
        author: {
          id: newMessage.author.id,
          username: newMessage.author.username,
          displayName: newMessage.member?.displayName ?? newMessage.author.globalName ?? newMessage.author.username,
          avatar: newMessage.author.avatar,
        },
        timestamp: newMessage.editedTimestamp || newMessage.createdTimestamp,
        embeds: newMessage.embeds,
        attachments: [...newMessage.attachments.values()],
        mentions: newMessage.mentions.users.map(u => ({
          id: u.id,
          username: u.username,
          displayName: newMessage.mentions.members?.get(u.id)?.displayName ?? u.globalName ?? u.username,
        })),
      });
    });

    client.on('messageDelete', (message) => {
      this.io.emit('messageDelete', {
        accountId: client.user.id,
        channelId: message.channelId,
        id: message.id,
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

  async getDMs(token) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    // Filter for DMs (type 1) and Group DMs (type 3)
    const channels = client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM');

    // Sort by last message timestamp (descending) if available, roughly approximating recent activity
    // Note: client.channels.cache order isn't guaranteed. fetching them sorted from API is better but cache is faster.
    // We can map then sort.

    return channels.map(channel => {
      let name = channel.name;
      let avatar = null;

      if (channel.type === 'DM') {
        name = channel.recipient?.globalName || channel.recipient?.username || 'Unknown User';
        avatar = channel.recipient?.avatar;
      } else if (channel.type === 'GROUP_DM') {
        if (!name) {
          name = channel.recipients.map(u => u.username).join(', ');
        }
        avatar = channel.icon;
      }

      return {
        id: channel.id,
        name: name,
        type: channel.type === 'DM' ? 'dm' : 'group',
        avatar: avatar,
        recipientId: channel.recipient?.id,
        lastMessageId: channel.lastMessageId
      };
    }).sort((a, b) => {
      // Simple sort, robust sorting would require fetching message timestamps
      return 0; 
    });
  }

  async getChannels(token, guildId) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const categories = guild.channels.cache
      .filter(c => c.type === 'GUILD_CATEGORY')
      .sort((a, b) => a.position - b.position)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        type: 'GUILD_CATEGORY',
        position: cat.position,
        channels: [] // Will hold text channels
      }));

    const uncategorizedChannels = [];
    const uncategorizedVoiceChannels = [];

    guild.channels.cache
      .filter(c => c.type === 'GUILD_TEXT' || c.type === 'GUILD_VOICE')
      .sort((a, b) => a.position - b.position)
      .forEach(channel => {
        const category = categories.find(cat => cat.id === channel.parentId);
        const mappedChannel = {
          id: channel.id,
          name: channel.name,
          parentId: channel.parentId,
          type: channel.type === 'GUILD_TEXT' ? 'GUILD_TEXT' : 'GUILD_VOICE', // Differentiate type
          position: channel.position,
        };
        if (category) {
          category.channels.push(mappedChannel);
        } else {
          // Uncategorized text/voice channels
          if (channel.type === 'GUILD_TEXT') {
            uncategorizedChannels.push(mappedChannel);
          } else {
            uncategorizedVoiceChannels.push(mappedChannel);
          }
        }
      });
    
    // Combine uncategorized channels and categories
    // Uncategorized channels appear before categories, or at the top for Discord client standard
    const flatChannels = [
      ...uncategorizedChannels, 
      ...uncategorizedVoiceChannels, // Add uncategorized voice channels here
      ...categories.flatMap(cat => {
        // Sort channels within category by type (text first, then voice) and then by position
        cat.channels.sort((a, b) => {
          if (a.type === 'GUILD_TEXT' && b.type === 'GUILD_VOICE') return -1;
          if (a.type === 'GUILD_VOICE' && b.type === 'GUILD_TEXT') return 1;
          return a.position - b.position;
        });
        return [
          { ...cat, channels: undefined }, // Represent category as a channel-like object
          ...cat.channels
        ];
      })
    ];

    return flatChannels;
  }

  async getMessages(token, channelId, limit = 50, before = null) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error('Channel not found');

    const fetchOptions = { limit };
    if (before) {
      fetchOptions.before = before;
    }

    const messages = await channel.messages.fetch(fetchOptions);
    return messages.map(m => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username,
        displayName: m.member?.displayName ?? m.author.globalName ?? m.author.username,
        avatar: m.author.avatar,
      },
      timestamp: m.createdTimestamp,
      embeds: m.embeds,
      attachments: [...m.attachments.values()],
      mentions: m.mentions.users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: m.mentions.members?.get(u.id)?.displayName ?? u.globalName ?? u.username,
      })),
    }));
  }

  async sendMessage(token, channelId, content, files = []) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error('Channel not found');

    const payload = {};
    if (content) payload.content = content;
    
    if (files && files.length > 0) {
      payload.files = files.map(f => ({
        attachment: f.buffer,
        name: f.originalname
      }));
    }

    if (!payload.content && (!payload.files || payload.files.length === 0)) {
      throw new Error('Message must have content or attachments');
    }

    return await channel.send(payload);
  }

  async editMessage(token, channelId, messageId, content) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error('Channel not found');

    const message = await channel.messages.fetch(messageId);
    if (!message) throw new Error('Message not found');

    return await message.edit(content);
  }

  async deleteMessage(token, channelId, messageId) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error('Channel not found');

    const message = await channel.messages.fetch(messageId);
    if (!message) throw new Error('Message not found');

    return await message.delete();
  }

  async setStatus(token, status) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');

    // map 'invisible' to 'invisible' (which is offline in discord terms for selfbots mostly, but works)
    return client.user.setPresence({ status });
  }

  async getGuildMembers(token, guildId, onlineOnly = false, query = '') {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    // Rely on guild.members.cache which should be populated by intents.
    // Explicit guild.members.fetch() often adds event listeners that can exceed limits.
    let members = Array.from(guild.members.cache.values());

    if (onlineOnly) {
      members = members.filter(m => m.presence?.status === 'online');
    }

    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      members = members.filter(m => 
        (m.displayName && m.displayName.toLowerCase().includes(lowerCaseQuery)) ||
        (m.user.username.toLowerCase().includes(lowerCaseQuery))
      );
    }

    return members.map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      avatar: m.user.avatar,
      status: m.presence?.status || 'offline',
    }));
  }

  async searchMembers(token, guildId, query) {
    const client = this.clients.get(token);
    if (!client) throw new Error('Client not logged in');
    
    if (guildId === '@me') {
       return [];
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    try {
      const members = await guild.members.search({ query, limit: 3 });
      return members.map(m => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.avatar,
        discriminator: m.user.discriminator
      }));
    } catch (e) {
      console.error('Member search failed', e);
      return [];
    }
  }
}

module.exports = DiscordService;
