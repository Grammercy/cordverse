import React from 'react';
import { Hash } from 'lucide-react';
import type { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  guildName: string;
}

const ChannelList: React.FC<ChannelListProps> = ({ channels, selectedChannelId, onSelectChannel, guildName }) => {
  return (
    <div className="w-60 bg-gray-800 flex flex-col">
      <div className="h-12 border-b border-gray-900 flex items-center px-4 shadow-sm">
        <h2 className="text-white font-bold truncate">{guildName}</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`flex items-center px-2 py-1.5 rounded cursor-pointer group ${selectedChannelId === channel.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'}`}
            onClick={() => onSelectChannel(channel.id)}
          >
            <Hash className="w-5 h-5 mr-1.5 text-gray-500" />
            <span className="font-medium truncate">{channel.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelList;
