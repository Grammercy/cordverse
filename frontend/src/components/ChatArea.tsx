import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '../types';
import { Hash, Send, Plus, X, File, Pencil, Trash2, Loader2 } from 'lucide-react';
import { parseMessageContent } from '../utils/messageParser';
import api from '../api';

interface ChatAreaProps {
  messages: Message[];
  channelName: string;
  onSendMessage: (content: string, files?: File[]) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  guildId: string | null;
  currentUserId?: string;
  loadMoreMessages?: () => void;
  hasMoreMessages?: boolean;
  typingUsers: Record<string, { username: string, displayName: string }>; // Added for typing indicators
  onStartTyping: () => void; // Added for typing indicators
  onStopTyping: () => void; // Added for typing indicators
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, 
  channelName, 
  onSendMessage, 
  onEditMessage, 
  onDeleteMessage, 
  guildId, 
  currentUserId,
  loadMoreMessages,
  hasMoreMessages,
  typingUsers,
  onStartTyping,
  onStopTyping
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mention State
  const [mentions, setMentions] = useState<any[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  
  // File State
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Typing State
  const typingTimeoutRef = useRef<number | null>(null);

  const initialScrollDone = useRef(false);

  const scrollToBottom = () => {
    if (messagesEndRef.current && !initialScrollDone.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        initialScrollDone.current = true;
    } else if (messagesEndRef.current && !editingMessageId) {
        const chatArea = scrollRef.current;
        if (chatArea) {
            const isAtBottom = chatArea.scrollHeight - chatArea.scrollTop <= chatArea.clientHeight + 100;
            if (isAtBottom) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
     setShowMentions(false);
     setSearchQuery(null);
     setFiles([]);
     setEditingMessageId(null);
     initialScrollDone.current = false; // Reset for new channels
     if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
        onStopTyping();
     }
  }, [channelName, onStopTyping]);

  // Debounce search effect
  useEffect(() => {
    if (searchQuery === null) return;

    const timeoutId = setTimeout(async () => {
      if (guildId && guildId !== '@me') {
        try {
             const res = await api.get(`/api/discord/members/${guildId}?query=${searchQuery}`);
             setMentions(res.data);
             setShowMentions(res.data.length > 0);
             setMentionIndex(0);
        } catch (err) {
             console.error(err);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, guildId]);

  // Infinite Scroll Logic
  const handleScroll = useCallback(() => {
    const chatArea = scrollRef.current;
    if (chatArea && chatArea.scrollTop === 0 && hasMoreMessages && loadMoreMessages) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, loadMoreMessages]);

  useEffect(() => {
    const chatArea = scrollRef.current;
    if (chatArea) {
      chatArea.addEventListener('scroll', handleScroll);
      return () => {
        chatArea.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    
    // Typing indicator logic
    if (val.length > 0 && !typingTimeoutRef.current) {
      onStartTyping();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
      typingTimeoutRef.current = null;
    }, 5000); // Stop typing after 5 seconds of inactivity


    const cursor = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\- ]*)$/);
    
    if (match && guildId && guildId !== '@me') {
        setSearchQuery(match[1]);
    } else {
        setSearchQuery(null);
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
      
      const match = textBeforeCursor.match(/@([a-zA-Z0-9_\- ]*)$/);
      if (match) {
          const prefix = textBeforeCursor.slice(0, match.index);
          const replacement = `<@${user.id}>`; 
          
          const newVal = prefix + replacement + ' ' + textAfterCursor;
          setInput(newVal);
          setShowMentions(false);
          setSearchQuery(null);
          
          setTimeout(() => {
              if (inputRef.current) {
                  const newCursorPos = prefix.length + replacement.length + 1;
                  inputRef.current.focus();
                  inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
          }, 0);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || files.length > 0) {
      onSendMessage(input, files);
      setInput('');
      setFiles([]);
      setShowMentions(false);
      setSearchQuery(null);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
        onStopTyping();
      }
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const saveEdit = (msgId: string) => {
    if (onEditMessage && editContent.trim()) {
      onEditMessage(msgId, editContent);
      setEditingMessageId(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, msgId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit(msgId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const typingUserNames = Object.values(typingUsers)
                                .filter(u => u.displayName || u.username)
                                .map(u => u.displayName || u.username);
  const typingStatusText = typingUserNames.length > 0 
    ? typingUserNames.length === 1 
      ? `${typingUserNames[0]} is typing...` 
      : `${typingUserNames.slice(0, 2).join(', ')}${typingUserNames.length > 2 ? ` and ${typingUserNames.length - 2} others` : ''} are typing...`
    : '';

  return (
    <div className="flex-1 flex flex-col bg-gray-700">
      <div className="h-12 border-b border-gray-800 flex items-center px-4 shadow-sm">
        <Hash className="w-6 h-6 text-gray-400 mr-2" />
        <h3 className="text-white font-bold">{channelName}</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {hasMoreMessages && (
          <div className="flex justify-center p-2">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex space-x-3 group relative hover:bg-gray-800/30 -mx-2 px-2 py-1 rounded">
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
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="text-white font-medium hover:underline cursor-pointer">
                  {msg.author.displayName || msg.author.username}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              
              {editingMessageId === msg.id ? (
                <div className="mt-1">
                  <input
                    type="text"
                    className="w-full bg-gray-600 text-gray-200 rounded p-2 outline-none border border-indigo-500"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                    autoFocus
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Escape to cancel • Enter to save
                  </div>
                </div>
              ) : (
                <p className="text-gray-200 whitespace-pre-wrap break-words">
                  {parseMessageContent(msg.content, msg.mentions)}
                </p>
              )}
              
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

            {/* Actions */}
            {currentUserId && msg.author.id === currentUserId && !editingMessageId && (
               <div className="absolute top-0 right-2 bg-gray-800 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center p-1 space-x-1">
                 <button 
                   onClick={() => startEditing(msg)} 
                   className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                   title="Edit"
                 >
                   <Pencil size={14} />
                 </button>
                 <button 
                   onClick={() => onDeleteMessage && onDeleteMessage(msg.id)}
                   className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"
                   title="Delete"
                 >
                   <Trash2 size={14} />
                 </button>
               </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 relative bg-gray-700">
        {/* Mentions Dropdown */}
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
        
        {/* File Preview */}
        {files.length > 0 && (
            <div className="flex space-x-2 overflow-x-auto pb-2 mb-2 px-2">
                {files.map((file, idx) => (
                    <div key={idx} className="relative bg-gray-800 rounded p-2 w-32 flex flex-col items-center group flex-shrink-0">
                        <button 
                            onClick={() => removeFile(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={12} />
                        </button>
                        <File className="w-8 h-8 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-300 truncate w-full text-center" title={file.name}>{file.name}</span>
                    </div>
                ))}
            </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-600 rounded-lg flex items-center px-4 py-2">
          <button 
             type="button" 
             onClick={() => fileInputRef.current?.click()}
             className="text-gray-400 hover:text-white mr-3 flex-shrink-0"
          >
             <Plus className="w-5 h-5 bg-gray-500 rounded-full p-0.5 text-gray-200" />
          </button>
          <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileSelect} 
             multiple 
             className="hidden" 
          />

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
        {typingStatusText && (
          <div className="text-sm text-gray-400 mt-2 px-2">
            {typingStatusText}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;