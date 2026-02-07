const express = require('express');
const router = express.Router();

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
      const { limit } = req.query;
      const messages = await discordService.getMessages(token, channelId, limit ? parseInt(limit) : 50);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/messages/:channelId', async (req, res) => {
    try {
      const token = req.headers['x-discord-token'];
      const { channelId } = req.params;
      const { content } = req.body;
      const message = await discordService.sendMessage(token, channelId, content);
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
