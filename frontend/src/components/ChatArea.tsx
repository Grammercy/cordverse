import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { Hash, Send } from 'lucide-react';
import { parseMessageContent } from '../utils/messageParser';
import api from '../api';

interface ChatAreaProps {
  messages: Message[];
  channelName: string;
  onSendMessage: (content: string) => void;
  guildId: string | null;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, channelName, onSendMessage, guildId }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mention State
  const [mentions, setMentions] = useState<any[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
     setShowMentions(false);
  }, [channelName]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    
    const cursor = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    
    if (match && guildId && guildId !== '@me') {
        const query = match[1];
        // Only search if we have at least 1 char or if the user explicitly wants top members (empty query)
        // But searching empty query on huge servers might return randoms. 
        // Let's allow it but the backend limits to 10.
        try {
             const res = await api.get(`/api/discord/members/${guildId}?query=${query}`);
             setMentions(res.data);
             setShowMentions(res.data.length > 0);
             setMentionIndex(0);
        } catch (err) {
             console.error(err);
        }
    } else {
        setShowMentions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && mentions.length > 0) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setMentionIndex(prev => (prev > 0 ? prev - 1 : mentions.length - 1));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMentionIndex(prev => (prev < mentions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            selectMention(mentions[mentionIndex]);
        } else if (e.key === 'Escape') {
            setShowMentions(false);
        }
    }
  };
  
  const selectMention = (user: any) => {
      const cursor = inputRef.current?.selectionStart || input.length;
      const textBeforeCursor = input.slice(0, cursor);
      const textAfterCursor = input.slice(cursor);
      
      const match = textBeforeCursor.match(/@(\w*)$/);
      if (match) {
          const prefix = textBeforeCursor.slice(0, match.index);
          const replacement = `<@${user.id}>`; 
          
          const newVal = prefix + replacement + ' ' + textAfterCursor;
          setInput(newVal);
          setShowMentions(false);
          // Ideally move cursor after mention.
          setTimeout(() => {
              if (inputRef.current) {
                  const newCursorPos = prefix.length + replacement.length + 1; // +1 for space?
                  // I didn't add space in newVal logic above (prefix + replacement + ' ' + textAfterCursor) ?
                  // Wait, previous logic was: prefix + replacement + ' ' + textAfterCursor;
                  // So yes.
                  // Cursor should be at newPos.
                  inputRef.current.focus();
                  inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
          }, 0);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
      setShowMentions(false);
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

      <div className="p-4 relative">
        {showMentions && mentions.length > 0 && (
            <div className="absolute bottom-full left-4 mb-2 w-64 bg-gray-800 border border-gray-900 rounded-lg shadow-xl overflow-hidden z-10">
                <div className="text-xs text-gray-400 uppercase font-bold px-3 py-2 bg-gray-900">
                    Members matching @
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {mentions.map((user, idx) => (
                        <div 
                            key={user.id}
                            className={`flex items-center px-3 py-2 cursor-pointer ${idx === mentionIndex ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            onClick={() => selectMention(user)}
                        >
                            <div className="w-6 h-6 rounded-full bg-gray-600 mr-2 flex-shrink-0 overflow-hidden">
                                {user.avatar ? (
                                    <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="w-full h-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white">
                                        {user.username[0]}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="font-medium">{user.displayName || user.username}</span>
                                {user.discriminator !== '0' && <span className="text-xs opacity-50 ml-1">#{user.discriminator}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-600 rounded-lg flex items-center px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-gray-200 outline-none placeholder-gray-400 py-1"
            placeholder={`Message #${channelName}`}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
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