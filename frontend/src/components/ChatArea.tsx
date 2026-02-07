import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { Hash, Send } from 'lucide-react';
import { parseMessageContent } from '../utils/messageParser';

interface ChatAreaProps {
  messages: Message[];
  channelName: string;
  onSendMessage: (content: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, channelName, onSendMessage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-700">
      <div className="h-12 border-b border-gray-800 flex items-center px-4 shadow-sm">
        <Hash className="w-6 h-6 text-gray-400 mr-2" />
        <h3 className="text-white font-bold">{channelName}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex space-x-3 group">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden">
              {msg.author.avatar ? (
                <img 
                  src={`https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`} 
                  alt={msg.author.displayName || msg.author.username}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                  {(msg.author.displayName || msg.author.username)[0]}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-white font-medium hover:underline cursor-pointer">
                  {msg.author.displayName || msg.author.username}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-200 whitespace-pre-wrap break-words">{parseMessageContent(msg.content)}</p>
              
              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {msg.attachments.map((att: any) => (
                    <div key={att.id}>
                      {att.contentType?.startsWith('image/') ? (
                        <img 
                          src={att.url} 
                          alt={att.name} 
                          className="max-w-sm max-h-64 rounded-lg object-contain bg-gray-900" 
                        />
                      ) : (
                        <a 
                          href={att.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-indigo-400 hover:underline"
                        >
                          {att.name}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Embeds */}
              {msg.embeds && msg.embeds.length > 0 && (
                <div className="mt-2 space-y-2">
                  {msg.embeds.map((embed: any, i: number) => (
                    <div key={i} className="bg-gray-800 border-l-4 border-indigo-500 rounded p-3 max-w-lg">
                      {embed.title && <h4 className="font-bold text-white mb-1">{embed.title}</h4>}
                      {embed.description && <p className="text-gray-300 text-sm mb-2">{embed.description}</p>}
                      {embed.image && (
                        <img 
                          src={embed.image.url} 
                          alt={embed.title || 'Embed image'} 
                          className="max-w-full max-h-64 rounded object-contain mt-2" 
                        />
                      )}
                      {embed.thumbnail && !embed.image && (
                         <img 
                          src={embed.thumbnail.url} 
                          alt="Thumbnail" 
                          className="max-w-24 max-h-24 rounded object-contain mt-2" 
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="bg-gray-600 rounded-lg flex items-center px-4 py-2">
          <input
            type="text"
            className="flex-1 bg-transparent text-gray-200 outline-none placeholder-gray-400 py-1"
            placeholder={`Message #${channelName}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="text-gray-400 hover:text-white transition-colors ml-2">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
