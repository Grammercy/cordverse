import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api, { clearMasterToken } from './api';
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
  console.log("Cordverse App Version: 3.0 (Master Lock Enabled)");
  
  const [isLocked, setIsLocked] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cordverse_token'));
  const [account, setAccount] = useState<Account | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [guildMembers, setGuildMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string, displayName: string }>>({}); // New state for typing indicators
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // Declared once
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedChannelIdRef] = useState(() => useRef<string | null>(null));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('cordverse_theme');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('cordverse_theme', theme);
  }, [theme]);

  // Define handleLogout here, before it's used in useEffect
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

  useEffect(() => {
    // Check Master Password Auth
    const checkMasterAuth = async () => {
      const masterToken = localStorage.getItem('cordverse_master_token');
      if (!masterToken) {
        setCheckingAuth(false);
        return;
      }

      try {
        // Token is already set in api defaults by api.ts initialization
        await api.get('/api/auth/verify');
        setIsLocked(false);
      } catch (err) {
        console.error('Master auth failed', err);
        clearMasterToken();
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

  let socketRef: React.MutableRefObject<any> = useRef(null);
  useEffect(() => {
    if (token && !isLocked) {
        // Re-login/Verify token to get user info
        // Note: We use relative URL here too
        api.post(`${API_BASE}/login`, { token })
          .then(res => {
            setAccount(res.data);
            const activeToken = res.data.token || token;
            if (res.data.token && res.data.token !== token) {
              setToken(res.data.token);
              localStorage.setItem('cordverse_token', res.data.token);
            }
            // Fetch guilds after successful login to ensure backend client is ready
            fetchGuilds(activeToken);
          })
          .catch(err => {
            console.error('Token invalid or login failed', err);
            handleLogout(); 
          });

        // Initialize socket if not already connected or if it was closed
        if (!socketRef.current || !socketRef.current.connected) {
          socketRef.current = io(); 

          socketRef.current.on('message', (msg: any) => {
              if (msg.channelId === selectedChannelIdRef.current) {
                  setMessages((prev) => [...prev, msg]);
              }
          });

          socketRef.current.on('messageUpdate', (msg: any) => {
              if (msg.channelId === selectedChannelIdRef.current) {
                  setMessages((prev) => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
              }
          });

          socketRef.current.on('messageDelete', (msg: any) => {
              if (msg.channelId === selectedChannelIdRef.current) {
                  setMessages((prev) => prev.filter(m => m.id !== msg.id));
              }
          });

          socketRef.current.on('typing', (data: { channelId: string; userId: string; username: string; displayName: string; }) => {
              if (data.channelId === selectedChannelIdRef.current && data.userId !== account?.id) { // Don't show typing for self
                  setTypingUsers((prev) => {
                      const newState = { ...prev, [data.userId]: { username: data.username, displayName: data.displayName } };
                      // Auto-remove typing status after a few seconds (Discord default is usually 5-10s)
                      setTimeout(() => {
                          setTypingUsers((current) => {
                              const tempState = { ...current };
                              delete tempState[data.userId];
                              return tempState;
                          });
                      }, 7000); // Remove after 7 seconds
                      return newState;
                  });
              }
          });

          socketRef.current.on('discordClientError', (data: { accountId: string; message: string; }) => {
            if (data.accountId === account?.id) {
              alert(`Discord client error for ${account.username}: ${data.message}`);
            }
          });

          socketRef.current.on('discordClientInvalidated', (data: { accountId: string; message: string; }) => {
            if (data.accountId === account?.id) {
              alert(`Discord client invalidated for ${account.username}: ${data.message}. Logging out.`);
              handleLogout(); // Log out the user
            }
          });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }
}, [token, isLocked, account?.id, handleLogout]); // Add handleLogout as dependency.

  const fetchGuilds = async (authToken: string) => {
    try {
      const res = await api.get(`${API_BASE}/guilds`, {
        headers: { 'X-Discord-Token': authToken }
      });
      const fetchedGuilds: Guild[] = res.data;

      // For each guild, fetch online member count
      const guildsWithCounts = await Promise.all(fetchedGuilds.map(async (guild) => {
        try {
          const membersRes = await api.get(`${API_BASE}/guilds/${guild.id}/members?onlineOnly=true`, {
            headers: { 'X-Discord-Token': authToken }
          });
          const allMembersRes = await api.get(`${API_BASE}/guilds/${guild.id}/members`, {
            headers: { 'X-Discord-Token': authToken }
          });
          return {
            ...guild,
            onlineMemberCount: membersRes.data.length,
            memberCount: allMembersRes.data.length
          };
        } catch (err) {
          console.warn(`Failed to fetch member count for guild ${guild.id}:`, err);
          return { ...guild, onlineMemberCount: 0, memberCount: 0 }; // Default to 0 or handle error
        }
      }));
      
      setGuilds(guildsWithCounts);
    } catch (err) {
      console.error('Failed to fetch guilds', err);
    }
  };

  const fetchDMs = async () => {
    try {
      const res = await api.get(`${API_BASE}/dms`, {
        headers: { 'X-Discord-Token': token }
      });
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to fetch DMs', err);
    }
  };

  const fetchChannels = async (guildId: string) => {
    try {
      const res = await api.get(`${API_BASE}/channels/${guildId}`, {
        headers: { 'X-Discord-Token': token }
      });
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to fetch channels', err);
    }
  };

  const fetchGuildMembers = async (guildId: string) => {
    if (!token) return;
    try {
      const res = await api.get(`${API_BASE}/guilds/${guildId}/members`, {
        headers: { 'X-Discord-Token': token }
      });
      setGuildMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch guild members', err);
    }
  };

  const fetchMessages = async (channelId: string, before?: string) => {
    try {
      const url = before 
        ? `${API_BASE}/messages/${channelId}?before=${before}` 
        : `${API_BASE}/messages/${channelId}`;
      const res = await api.get(url, {
        headers: { 'X-Discord-Token': token }
      });
      const newMessages = res.data.reverse(); // New messages are older, so reverse them to be in chronological order
      
      setMessages((prevMessages) => {
        // Filter out duplicates if any (can happen with Discord API on boundaries)
        const uniqueNewMessages = newMessages.filter(
          (nm: Message) => !prevMessages.some((pm) => pm.id === nm.id)
        );
        return [...uniqueNewMessages, ...prevMessages]; // Prepend older messages
      });
      
      if (newMessages.length < 50) { // Assuming a limit of 50 per fetch
        setHasMoreMessages(false);
      } else {
        setHasMoreMessages(true);
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const loadMoreMessages = () => {
    if (selectedChannelId && hasMoreMessages && messages.length > 0) {
      const oldestMessageId = messages[0].id;
      fetchMessages(selectedChannelId, oldestMessageId);
    }
  };

  const startTyping = () => {
    if (socketRef.current && selectedChannelId && account) {
      socketRef.current.emit('typing', {
        channelId: selectedChannelId,
        userId: account.id,
        username: account.username,
        displayName: account.displayName
      });
    }
  };

  const stopTyping = () => {
    // Optionally emit a 'stopped_typing' event if backend distinguishes
    // For now, relies on auto-timeout
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogin = (newToken: string, user: Account) => {
    setToken(newToken);
    setAccount(user);
    localStorage.setItem('cordverse_token', newToken);
  };

  const handleSelectGuild = (guildId: string) => {
    setSelectedGuildId(guildId);
    setSelectedChannelId(null);
    setMessages([]);
    setGuildMembers([]); // Clear members on guild switch
    
    if (guildId === '@me') {
        fetchDMs();
    } else if (guildId) {
      fetchChannels(guildId);
      fetchGuildMembers(guildId);
    } else {
      setChannels([]);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setMessages([]); // Clear messages from previous channel
    setHasMoreMessages(true); // Reset pagination state
    fetchMessages(channelId);
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!selectedChannelId || !token) return;
    try {
      if (files && files.length > 0) {
        const formData = new FormData();
        if (content) formData.append('content', content);
        files.forEach(file => {
          formData.append('files', file);
        });

        await api.post(`${API_BASE}/messages/${selectedChannelId}`, formData, {
          headers: { 
            'X-Discord-Token': token,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await api.post(`${API_BASE}/messages/${selectedChannelId}`, { content }, {
          headers: { 'X-Discord-Token': token }
        });
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!selectedChannelId || !token) return;
    try {
      await api.patch(`${API_BASE}/messages/${selectedChannelId}/${messageId}`, { content }, {
         headers: { 'X-Discord-Token': token }
      });
    } catch (err) {
        console.error('Failed to edit message', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
      if (!selectedChannelId || !token) return;
      try {
        await api.delete(`${API_BASE}/messages/${selectedChannelId}/${messageId}`, {
           headers: { 'X-Discord-Token': token }
        });
      } catch (err) {
          console.error('Failed to delete message', err);
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
        onLogin={handleLogin} // Pass handleLogin for account switching
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      {selectedGuildId && (
        <ChannelList 
          channels={channels} 
          selectedChannelId={selectedChannelId} 
          onSelectChannel={handleSelectChannel}
          guildName={selectedGuildId === '@me' ? 'Direct Messages' : (selectedGuild?.name || 'Guild')}
          guildMembers={guildMembers} // Pass members
          selectedGuildId={selectedGuildId} // Pass selectedGuildId
        />
      )}

      {selectedChannelId ? (
        <ChatArea 
          messages={messages} 
          channelName={selectedChannel?.name || 'channel'} 
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          guildId={selectedGuildId}
          currentUserId={account?.id}
          loadMoreMessages={loadMoreMessages}
          hasMoreMessages={hasMoreMessages}
          typingUsers={typingUsers}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
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