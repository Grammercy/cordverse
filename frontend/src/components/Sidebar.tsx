import React from 'react';
import type { Guild, Account } from '../types';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  guilds: Guild[];
  selectedGuildId: string | null;
  onSelectGuild: (guildId: string) => void;
  account: Account | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ guilds, selectedGuildId, onSelectGuild, account, onLogout }) => {
  return (
    <div className="w-20 bg-gray-900 flex flex-col items-center py-4 space-y-4 h-full">
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
            </div>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1 bg-black text-white text-sm rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              {guild.name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-800 w-full flex flex-col items-center space-y-2">
         {account && (
          <div className="group relative">
             <div className="w-12 h-12 bg-gray-700 rounded-3xl hover:rounded-2xl transition-all duration-200 overflow-hidden cursor-pointer" title={account.displayName || account.username}>
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
             <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1 bg-black text-white text-sm rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                {account.displayName || account.username}
            </div>
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
