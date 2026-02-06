import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChannelList from './components/ChannelList';
import ChatArea from './components/ChatArea';
import Login from './components/Login';
import type { Account, Guild, Channel, Message } from './types';

const API_BASE = 'http://localhost:3001/api/discord';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('cordverse_token'));
  const [account, setAccount] = useState<Account | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const selectedChannelIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  useEffect(() => {
    if (token) {
      // Re-login/Verify token to get user info
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

      const newSocket = io('http://localhost:3001');

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
  }, [token]);

  const fetchGuilds = async (authToken: string) => {
    try {
      const res = await axios.get(`${API_BASE}/guilds`, {
        headers: { Authorization: authToken }
      });
      setGuilds(res.data);
    } catch (err) {
      console.error('Failed to fetch guilds', err);
    }
  };

  const fetchChannels = async (guildId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/channels/${guildId}`, {
        headers: { Authorization: token }
      });
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to fetch channels', err);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/messages/${channelId}`, {
        headers: { Authorization: token }
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
        headers: { Authorization: token }
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const selectedGuild = guilds.find(g => g.id === selectedGuildId);
  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Sidebar 
        guilds={guilds} 
        selectedGuildId={selectedGuildId} 
        onSelectGuild={handleSelectGuild}
        account={account}
        onLogout={handleLogout}
      />
      
      {selectedGuildId && (
        <ChannelList 
          channels={channels} 
          selectedChannelId={selectedChannelId} 
          onSelectChannel={handleSelectChannel}
          guildName={selectedGuild?.name || 'Guild'}
        />
      )}

      {selectedChannelId ? (
        <ChatArea 
          messages={messages} 
          channelName={selectedChannel?.name || 'channel'} 
          onSendMessage={handleSendMessage}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome to Cordverse</h2>
            <p className="text-gray-400">Select a channel to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;