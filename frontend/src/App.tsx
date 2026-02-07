import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChannelList from './components/ChannelList';
import ChatArea from './components/ChatArea';
import Login from './components/Login';
import MasterLock from './components/MasterLock';
import type { Account, Guild, Channel, Message } from './types';

// Use relative path for API calls. 
// In dev (Vite), we might need a proxy or keep it absolute, but for the unified build, relative is key.
// If window.location.hostname is localhost, we assume dev mode on 3001 if mostly local, 
// but sticking to relative '/api/discord' works best if served by the same express app.
const API_BASE = '/api/discord';

function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cordverse_token'));
  const [account, setAccount] = useState<Account | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const selectedChannelIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Check Master Password Auth
    const checkMasterAuth = async () => {
      const masterToken = localStorage.getItem('cordverse_master_token');
      if (!masterToken) {
        setCheckingAuth(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${masterToken}`;
        await axios.get('/api/auth/verify');
        setIsLocked(false);
      } catch (err) {
        console.error('Master auth failed', err);
        localStorage.removeItem('cordverse_master_token');
        delete axios.defaults.headers.common['Authorization'];
        setIsLocked(true);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkMasterAuth();
  }, []);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  useEffect(() => {
    if (token && !isLocked) {
      // Re-login/Verify token to get user info
      // Note: We use relative URL here too
      axios.post(`${API_BASE}/login`, { token })
        .then(res => {
          setAccount(res.data);
          if (res.data.token && res.data.token !== token) {
             setToken(res.data.token);
             localStorage.setItem('cordverse_token', res.data.token);
          }
        })
        .catch(err => {
          console.error('Token invalid or login failed', err);
          handleLogout(); 
        });

      // Socket.io should connect to the host serving the page by default if no URL is passed,
      // but let's be explicit to avoid issues if ports differ in dev.
      const newSocket = io(); 

      newSocket.on('message', (msg: any) => {
        if (msg.channelId === selectedChannelIdRef.current) {
          setMessages((prev) => [...prev, msg]);
        }
      });

      fetchGuilds(token);

      return () => {
        newSocket.close();
      };
    }
  }, [token, isLocked]);

  const fetchGuilds = async (authToken: string) => {
    try {
      const res = await axios.get(`${API_BASE}/guilds`, {
        headers: { 'X-Discord-Token': authToken }
      });
      setGuilds(res.data);
    } catch (err) {
      console.error('Failed to fetch guilds', err);
    }
  };

  const fetchChannels = async (guildId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/channels/${guildId}`, {
        headers: { 'X-Discord-Token': token }
      });
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to fetch channels', err);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/messages/${channelId}`, {
        headers: { 'X-Discord-Token': token }
      });
      setMessages(res.data.reverse());
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const handleLogin = (newToken: string, user: Account) => {
    setToken(newToken);
    setAccount(user);
    localStorage.setItem('cordverse_token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setAccount(null);
    localStorage.removeItem('cordverse_token');
    setGuilds([]);
    setChannels([]);
    setMessages([]);
    setSelectedGuildId(null);
    setSelectedChannelId(null);
  };

  const handleSelectGuild = (guildId: string) => {
    setSelectedGuildId(guildId);
    setSelectedChannelId(null);
    setMessages([]);
    if (guildId) {
      fetchChannels(guildId);
    } else {
      setChannels([]);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    fetchMessages(channelId);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedChannelId || !token) return;
    try {
      await axios.post(`${API_BASE}/messages/${selectedChannelId}`, { content }, {
        headers: { 'X-Discord-Token': token }
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (checkingAuth) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-100">Loading...</div>;
  }

  if (isLocked) {
    return <MasterLock onUnlock={() => setIsLocked(false)} />;
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }