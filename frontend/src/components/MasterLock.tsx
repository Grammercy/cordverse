import React, { useState } from 'react';
import axios from 'axios';
import { Lock } from 'lucide-react';

interface MasterLockProps {
  onUnlock: () => void;
}

const MasterLock: React.FC<MasterLockProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/login', { password });
      const token = res.data.token;
      
      // Store the master session token
      localStorage.setItem('cordverse_master_token', token);
      
      // Configure global axios default for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      onUnlock();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-100">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-indigo-600 rounded-full mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold">Cordverse Locked</h1>
          <p className="text-gray-400 mt-2 text-center">Enter your master password to access your accounts.</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master Password"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded focus:border-indigo-500 focus:outline-none"
              autoFocus
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MasterLock;
