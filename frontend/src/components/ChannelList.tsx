import React, { useState } from 'react';
import { Hash, Search, ChevronDown, ChevronRight, Volume2 } from 'lucide-react'; // Added Volume2 icon
import type { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  guildName: string;
  guildMembers?: any[];
  selectedGuildId: string | null;
}

const ChannelList: React.FC<ChannelListProps> = ({ channels, selectedChannelId, onSelectChannel, guildName, guildMembers, selectedGuildId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const onlineMembers = guildMembers?.filter(m => m.status === 'online' || m.status === 'idle' || m.status === 'dnd') || [];
  const offlineMembers = guildMembers?.filter(m => m.status === 'offline' || m.status === 'invisible') || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      case 'invisible': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const renderMember = (member: any) => (
    <div key={member.id} className="flex items-center px-2 py-1.5 rounded text-gray-300">
      <div className="relative w-7 h-7 flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center text-xs text-white">
          {member.avatar ? (
            <img 
              src={`https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png`} 
              alt={member.displayName || member.username}
              className="w-full h-full object-cover"
            />
          ) : (
            member.username[0]
          )}
        </div>
        <div className={`absolute bottom-0 right-0 w-2 h-2 ${getStatusColor(member.status)} rounded-full border border-gray-800`}></div>
      </div>
      <span className="font-medium ml-2 truncate">{member.displayName || member.username}</span>
    </div>
  );

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const filteredChannels = channels.filter(channel => 
    channel.type === 'GUILD_CATEGORY' || channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVisibleChannels = () => {
    if (searchTerm) {
      // If searching, show all matching channels, even if in a collapsed category
      return channels.filter(c => 
        (c.type === 'GUILD_TEXT' || c.type === 'GUILD_VOICE') && c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const grouped: (Channel | { category: Channel, channels: Channel[] })[] = [];
    let currentCategory: { category: Channel, channels: Channel[] } | null = null;

    channels.forEach(channel => {
      if (channel.type === 'GUILD_CATEGORY') {
        currentCategory = { category: channel, channels: [] };
        grouped.push(currentCategory);
      } else if (channel.type === 'GUILD_TEXT' || channel.type === 'GUILD_VOICE') {
        if (currentCategory && channel.parentId === currentCategory.category.id) {
          currentCategory.channels.push(channel);
        } else {
          // Uncategorized channels
          grouped.push(channel);
        }
      } else {
         // DMs or Group DMs are handled separately, so they should not appear here
         grouped.push(channel); // Still include for robustness if they appear unexpectedly
      }
    });

    return grouped;
  };

  const visibleChannels = getVisibleChannels();

  const getChannelIcon = (channel: Channel) => {
    if (channel.type === 'GUILD_VOICE') {
      return <Volume2 className="w-5 h-5 mr-1.5 text-gray-500" />;
    } else if (channel.type === 'GUILD_TEXT') {
      return <Hash className="w-5 h-5 mr-1.5 text-gray-500" />;
    } else if (channel.type === 'dm' || channel.type === 'group') {
      // Logic for DM/Group icons as already present
      return (
        <div className="w-5 h-5 mr-1.5 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-white overflow-hidden">
            {channel.type === 'dm' && channel.avatar && channel.recipientId ? (
                <img src={`https://cdn.discordapp.com/avatars/${channel.recipientId}/${channel.avatar}.png`} className="w-full h-full object-cover"/>
            ) : channel.type === 'group' && channel.avatar ? (
                <img src={`https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.avatar}.png`} className="w-full h-full object-cover"/>
            ) : (
                channel.name[0]
            )}
        </div>
      );
    }
    return null; // Fallback
  };

  return (
    <div className="w-60 bg-gray-800 flex flex-col">
      <div className="h-12 border-b border-gray-900 flex items-center px-4 shadow-sm">
        <h2 className="text-white font-bold truncate">{guildName}</h2>
      </div>

      {selectedGuildId && selectedGuildId !== '@me' && (
        <div className="px-2 py-2 border-b border-gray-900">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search channels"
              className="w-full pl-8 pr-3 py-1 bg-gray-900 rounded-md text-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
        {/* Channels */}
        <div className="mb-4">
          {searchTerm ? (
            // If search term is present, show flat list of matching channels (text or voice)
            filteredChannels.map((channel) => (channel.type === 'GUILD_TEXT' || channel.type === 'GUILD_VOICE') && (
              <div
                key={channel.id}
                className={`flex items-center px-2 py-1.5 rounded cursor-pointer group ${selectedChannelId === channel.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'}`}
                onClick={() => onSelectChannel(channel.id)}
              >
                {getChannelIcon(channel)}
                <span className="font-medium truncate">{channel.name}</span>
              </div>
            ))
          ) : (
            // Normal view with categories
            visibleChannels.map((item) => {
              if ('category' in item) {
                // Render category
                const isCollapsed = collapsedCategories.has(item.category.id);
                return (
                  <div key={item.category.id} className="mt-4 first:mt-0">
                    <button 
                      className="w-full flex items-center text-gray-400 hover:text-gray-300 px-2 py-1.5 font-bold text-xs uppercase focus:outline-none"
                      onClick={() => toggleCategory(item.category.id)}
                    >
                      {isCollapsed ? <ChevronRight size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
                      {item.category.name}
                    </button>
                    {!isCollapsed && (
                      <div className="ml-2 space-y-0.5">
                        {item.channels.map(channel => (
                          <div
                            key={channel.id}
                            className={`flex items-center px-2 py-1.5 rounded cursor-pointer group ${selectedChannelId === channel.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'}`}
                            onClick={() => onSelectChannel(channel.id)}
                          >
                            {getChannelIcon(channel)}
                            <span className="font-medium truncate">{channel.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Render uncategorized channel or DM/Group DM
                return (item.type === 'GUILD_TEXT' || item.type === 'GUILD_VOICE' || item.type === 'dm' || item.type === 'group') && (
                  <div
                    key={item.id}
                    className={`flex items-center px-2 py-1.5 rounded cursor-pointer group ${selectedChannelId === item.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'}`}
                    onClick={() => onSelectChannel(item.id)}
                  >
                    {getChannelIcon(item)}
                    <span className="font-medium truncate">{item.name}</span>
                  </div>
                );
              }
            })
          )}
        </div>

        {/* Guild Members */}
        {guildMembers && guildMembers.length > 0 && selectedGuildId && selectedGuildId !== '@me' && (
          <div>
            <h3 className="text-xs text-gray-400 uppercase font-bold mt-4 mb-2 px-2">Online — {onlineMembers.length}</h3>
            <div className="space-y-0.5">
              {onlineMembers.map(renderMember)}
            </div>

            <h3 className="text-xs text-gray-400 uppercase font-bold mt-4 mb-2 px-2">Offline — {offlineMembers.length}</h3>
            <div className="space-y-0.5">
              {offlineMembers.map(renderMember)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelList;