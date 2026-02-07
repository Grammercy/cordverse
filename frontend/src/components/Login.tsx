import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface LoginProps {
  onLogin: (token: string, account: any) => void;
}

interface SavedAccount {
  id: string;
  username: string;
  avatar: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    fetchSavedAccounts();
  }, []);

  const fetchSavedAccounts = async () => {
    try {
      const res = await axios.get('/api/accounts');
      setSavedAccounts(res.data);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  const handleLogin = async (credentials: { token?: string; accountId?: string }) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/discord/login', credentials);
      onLogin(response.data.token, response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin({ token });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Login to Cordverse</h1>
        
        {savedAccounts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm font-bold mb-3 uppercase tracking-wider">Saved Accounts</h3>
            <div className="space-y-2">
              {savedAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => handleLogin({ accountId: acc.id })}
                  className="w-full flex items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                  disabled={loading}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden mr-3">
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
                    <div className="font-medium text-white">{acc.username}</div>
                    <div className="text-xs text-gray-400">Click to login</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2">
              New Account Token
            </label>
            <input
              type="password"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Connect'}
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500 text-center">
          Cordverse is a self-hosted Discord client. Your token is only sent to your proxy server.
        </p>
      </div>
    </div>
  );
};

export default Login;
