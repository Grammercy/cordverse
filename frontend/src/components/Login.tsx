import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import { RefreshCw, Smartphone, Key, User } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, account: any) => void;
}

interface SavedAccount {
  id: string;
  username: string;
  avatar: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'token' | 'saved'>('qr');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  
  // QR State
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'init' | 'waiting' | 'scanned' | 'success' | 'error'>('init');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchSavedAccounts();
    
    // Connect socket for QR
    const socket = io(); // Connects to same host
    socketRef.current = socket;

    socket.on('connect', () => {
      if (activeTab === 'qr') {
        socket.emit('start_qr');
        setQrStatus('init');
      }
    });

    socket.on('qr_code', (url: string) => {
      setQrUrl(url);
      setQrStatus('waiting');
    });

    socket.on('qr_scanned', () => {
      setQrStatus('scanned');
    });

    socket.on('qr_success', (data: { token: string }) => {
      setQrStatus('success');
      handleLogin({ token: data.token });
    });

    socket.on('qr_error', (msg: string) => {
      console.error('QR Error:', msg);
      setError('QR Login failed: ' + msg);
      setQrStatus('error');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'qr' && socketRef.current?.connected) {
      setQrUrl(null);
      setQrStatus('init');
      setError('');
      socketRef.current.emit('start_qr');
    } else if (activeTab !== 'qr') {
      socketRef.current?.emit('stop_qr');
    }
  }, [activeTab]);

  const fetchSavedAccounts = async () => {
    try {
      const res = await api.get('/api/accounts');
      setSavedAccounts(res.data);
      // If we have saved accounts, maybe default to that tab? 
      // But user requested "login page before account select". 
      // So keeping QR as default or 'saved' as default is a choice.
      // Let's stick to QR as default if requested, but allow switching.
      if (res.data.length > 0 && activeTab === 'qr') {
        // Optional: setActiveTab('saved'); 
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  const handleLogin = async (credentials: { token?: string; accountId?: string }) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/discord/login', credentials);
      onLogin(response.data.token, response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
      setQrStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin({ token });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${activeTab === 'qr' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
          >
            <Smartphone size={18} /> QR Code (v2)
          </button>
          <button 
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${activeTab === 'token' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
          >
            <Key size={18} /> Token
          </button>
          {savedAccounts.length > 0 && (
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${activeTab === 'saved' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
            >
              <User size={18} /> Accounts
            </button>
          )}
        </div>

        <div className="p-8">
          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-bold mb-2">Scan with Discord</h2>
              <p className="text-gray-400 text-sm mb-6">
                Open Discord on your phone, go to Settings &gt; Scan QR Code.
              </p>

              <div className="relative bg-white p-4 rounded-lg mb-6 group">
                {qrUrl ? (
                  <div className={`transition-opacity duration-300 ${qrStatus === 'scanned' ? 'opacity-25' : 'opacity-100'}`}>
                    <QRCodeSVG value={qrUrl} size={180} />
                  </div>
                ) : (
                  <div className="w-[180px] h-[180px] flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {qrStatus === 'scanned' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
                      Check your phone!
                    </div>
                  </div>
                )}
                
                {qrStatus === 'error' && (
                   <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 rounded-lg">
                      <button 
                        onClick={() => { setQrStatus('init'); socketRef.current?.emit('start_qr'); }}
                        className="text-white flex flex-col items-center gap-2 hover:text-indigo-400"
                      >
                        <RefreshCw size={24} />
                        <span>Retry</span>
                      </button>
                   </div>
                )}
              </div>

              {qrStatus === 'success' && (
                 <p className="text-green-400 font-medium">Login successful! Redirecting...</p>
              )}
            </div>
          )}

          {/* Token Tab */}
          {activeTab === 'token' && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold mb-4 text-center">Enter Token</h2>
              <div className="mb-4">
                <input
                  type="password"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 transition-colors"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Nzc..."
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login with Token'}
              </button>
              <p className="mt-4 text-xs text-gray-500 text-center">
                Your token is encrypted and stored locally on your server.
              </p>
            </form>
          )}

          {/* Saved Accounts Tab */}
          {activeTab === 'saved' && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-center">Select Account</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {savedAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleLogin({ accountId: acc.id })}
                    className="w-full flex items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left group"
                    disabled={loading}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden mr-3 ring-2 ring-transparent group-hover:ring-indigo-500 transition-all">
                      {acc.avatar ? (
                        <img 
                          src={`https://cdn.discordapp.com/avatars/${acc.id}/${acc.avatar}.png`} 
                          alt={acc.username}
                          className="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs">
                          {acc.username[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white group-hover:text-indigo-300 transition-colors">{acc.username}</div>
                      <div className="text-xs text-gray-400">ID: {acc.id.slice(0, 8)}...</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {error && <p className="mt-4 text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{error}</p>}

        </div>
      </div>
    </div>
  );
};

export default Login;
