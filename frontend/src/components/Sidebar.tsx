import React, { useState } from 'react';
import type { Guild, Account } from '../types';
import { LogOut } from 'lucide-react';
import api from '../api';

interface SidebarProps {
  guilds: Guild[];
  selectedGuildId: string | null;
  onSelectGuild: (guildId: string) => void;
  account: Account | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ guilds, selectedGuildId, onSelectGuild, account, onLogout }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const handleSetStatus = async (status: string) => {
    try {
      await api.post('/api/discord/status', { status });
      setShowStatusMenu(false);
    } catch (err) {
      console.error('Failed to set status', err);
    }
  };

  return (
    <div className="w-20 bg-gray-900 flex flex-col items-center py-4 space-y-4 h-full relative">
      <div className="flex-1 w-full flex flex-col items-center space-y-4 overflow-y-auto no-scrollbar">
        <div 
          className={`w-12 h-12 bg-gray-700 rounded-3xl hover:rounded-2xl transition-all duration-200 flex items-center justify-center cursor-pointer group flex-shrink-0 ${selectedGuildId === '@me' ? 'rounded-2xl bg-indigo-500' : ''}`}
          onClick={() => onSelectGuild('@me')}
        >
          <span className="text-white font-bold">DM</span>
        </div>
        
        <div className="w-8 h-0.5 bg-gray-800 rounded mx-auto flex-shrink-0" />

        {guilds.map((guild) => (
          <div
            key={guild.id}
            className="relative group flex-shrink-0"
            onClick={() => onSelectGuild(guild.id)}
          >
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200 ${selectedGuildId === guild.id ? 'h-10' : 'h-0 group-hover:h-5'}`} />
            <div className={`w-12 h-12 bg-gray-800 rounded-3xl hover:rounded-2xl transition-all duration-200 flex items-center justify-center cursor-pointer overflow-hidden ${selectedGuildId === guild.id ? 'rounded-2xl bg-indigo-500' : ''}`}>
              {guild.icon ? (
                <img 
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                  alt={guild.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs text-center px-1 font-medium">{guild.name.split(' ').map(n => n[0]).join('').slice(0, 3)}</span>
              )}
              {/* Online member count badge */}
              {guild.onlineMemberCount !== undefined && guild.onlineMemberCount > 0 && (
                <span className="absolute bottom-0 right-0 bg-green-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 transform translate-x-1/4 translate-y-1/4 border-2 border-gray-900">
                  {guild.onlineMemberCount}
                </span>
              )}
            </div>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1 bg-black text-white text-sm rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              {guild.name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-800 w-full flex flex-col items-center space-y-2 relative">
         {account && (
          <div className="relative">
             <div 
               className="w-12 h-12 bg-gray-700 rounded-3xl hover:rounded-2xl transition-all duration-200 overflow-hidden cursor-pointer" 
               title={account.displayName || account.username}
               onClick={() => setShowStatusMenu(!showStatusMenu)}
             >
              {account.avatar ? (
                 <img 
                   src={`https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.png`} 
                   alt={account.displayName || account.username}
                   className="w-full h-full"
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-white font-bold">
                   {(account.displayName || account.username)[0]}
                 </div>
               )}
             </div>
             
             {/* Status Menu */}
             {showStatusMenu && (
               <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 rounded shadow-xl border border-gray-900 overflow-hidden z-50">
                 <div className="text-xs font-bold text-gray-400 px-3 py-2 bg-gray-900 uppercase">Set Status</div>
                 <button onClick={() => handleSetStatus('online')} className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2">
                   <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                   <span>Online</span>
                 </button>
                 <button onClick={() => handleSetStatus('idle')} className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2">
                   <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                   <span>Idle</span>
                 </button>
                 <button onClick={() => handleSetStatus('dnd')} className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2">
                   <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                   <span>Do Not Disturb</span>
                 </button>
                 <button onClick={() => handleSetStatus('invisible')} className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2">
                   <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                   <span>Invisible</span>
                 </button>
               </div>
             )}
          </div>
         )}
         
         <button 
           onClick={onLogout}
           className="w-12 h-12 bg-gray-800 rounded-3xl hover:rounded-2xl hover:bg-red-600 transition-all duration-200 flex items-center justify-center text-gray-400 hover:text-white group relative"
         >
           <LogOut className="w-5 h-5" />
           <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1 bg-black text-white text-sm rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              Switch Account
            </div>
         </button>
      </div>
    </div>
  );
};

export default Sidebar;