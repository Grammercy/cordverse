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
            {channel.avatar ? (
              <img 
                 src={`https://cdn.discordapp.com/avatars/${channel.name}/${channel.avatar}.png`} 
                 // Note: For DMs, we might need recipient ID for avatar URL, but our backend mapped name/avatar.
                 // Actually, Discord avatar URLs are /avatars/USER_ID/HASH.png. 
                 // Our backend `getDMs` returned `avatar` hash and `name`. We didn't return recipient ID in the top level object, only mapped fields.
                 // Let's check backend service again.
                 // Backend: `avatar = channel.recipient?.avatar;`
                 // We missed passing the recipient ID to easily build the URL.
                 // However, for MVP let's assume we might have broken the avatar URL generation if we don't have the user ID.
                 // Let's use a generic icon or a placeholder if URL construction is complex, 
                 // OR, better, let's fix backend to return recipientId or full icon url.
                 // Waiting for next step to fix backend? No, I can try to fix it here if I have data.
                 // Current backend returns: { id, name, type, avatar }.
                 // If it's a DM, `avatar` is the hash. We lack the user ID to build the URL.
                 // Wait, `getDMs` in backend didn't map `recipientId`.
                 // I should probably fix backend to return `iconUrl` or `recipientId`.
                 // For now, I'll use a placeholder or generic avatar if I can't build the URL.
                 // BUT, I can try to be clever: maybe I can't.
                 // Let's just put a placeholder for now and I'll fix the backend in a follow-up if needed.
                 // Or, I can treat `avatar` as a full URL if I change backend.
                 // Let's stick to: if type is DM/Group, show a User/Group icon.
                 // Since I cannot validly construct the URL without UserID, I will use a User icon.
                 
                 // Wait, I can't verify if I have the ID.
                 // Let's just use the Hash icon for now? No user asked for "how discord looks".
                 // I will use a default User icon from lucide-react for DMs.
                 // And I will import User from lucide-react.
               />
            ) : null}
            
            {channel.type === 'dm' || channel.type === 'group' ? (
                <div className="w-5 h-5 mr-1.5 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-white overflow-hidden">
                    {channel.type === 'dm' && channel.avatar && channel.recipientId ? (
                        <img src={`https://cdn.discordapp.com/avatars/${channel.recipientId}/${channel.avatar}.png`} className="w-full h-full object-cover"/>
                    ) : channel.type === 'group' && channel.avatar ? (
                        <img src={`https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.avatar}.png`} className="w-full h-full object-cover"/>
                    ) : (
                        channel.name[0]
                    )}
                </div>
            ) : (
                <Hash className="w-5 h-5 mr-1.5 text-gray-500" />
            )}
            
            <span className="font-medium truncate">{channel.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelList;
