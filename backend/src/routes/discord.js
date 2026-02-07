const express = require('express');
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

module.exports = (discordService) => {
  router.post('/login', async (req, res) => {
    try {
      const { token, accountId } = req.body;
      let client;

      if (accountId) {
        client = await discordService.loginWithId(accountId);
      } else if (token) {
        client = await discordService.login(token);
      } else {
        throw new Error('Token or accountId required');
      }

      res.json({
        id: client.user.id,
        username: client.user.username,
        displayName: client.user.globalName || client.user.username,
        avatar: client.user.avatar,
        token: client.token
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  });

  router.get('/guilds', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const guilds = await discordService.getGuilds(token);
      res.json(guilds);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/dms', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const dms = await discordService.getDMs(token);
      res.json(dms);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/channels/:guildId', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { guildId } = req.params;
      const channels = await discordService.getChannels(token, guildId);
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/messages/:channelId', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { channelId } = req.params;
      const { limit, before } = req.query;
      const messages = await discordService.getMessages(token, channelId, limit ? parseInt(limit) : 50, before);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/messages/:channelId', upload.array('files'), async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { channelId } = req.params;
      const { content } = req.body;
      const files = req.files;
      
      const message = await discordService.sendMessage(token, channelId, content, files);
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch('/messages/:channelId/:messageId', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { channelId, messageId } = req.params;
      const { content } = req.body;
      const message = await discordService.editMessage(token, channelId, messageId, content);
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/messages/:channelId/:messageId', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { channelId, messageId } = req.params;
      await discordService.deleteMessage(token, channelId, messageId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/status', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { status } = req.body;
      await discordService.setStatus(token, status);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/members/:guildId', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { guildId } = req.params;
      const { query } = req.query;
      
      if (!query) return res.json([]);

      const members = await discordService.searchMembers(token, guildId, query);
      res.json(members);
    } catch (error) {
      console.error(error); // Log the full error for debugging
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/guilds/:guildId/members', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { guildId } = req.params;
      const { onlineOnly, query } = req.query; // Query params are strings
      
      const members = await discordService.getGuildMembers(
        token, 
        guildId, 
        onlineOnly === 'true', // Convert string to boolean
        query ? String(query) : ''
      );
      res.json(members);
    } catch (error) {
      console.error(error); // Log the full error for debugging
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};