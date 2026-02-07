import React from 'react';
import * as emoji from 'node-emoji';

export const parseMessageContent = (content: string, mentions: any[] = []): React.ReactNode[] => {
  // Regex to match custom emojis: <a:name:id> or <:name:id>
  // standard emojis shortcodes: :name:
  // and user mentions: <@id> or <@!id>
  const regex = /<(a?):(\w+):(\d+)>|(:[\w-]+:)|<@!?(\d+)>/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    const [, animated, name, id, shortcode, mentionId] = match;

    if (mentionId) {
      // User Mention
      const user = mentions.find(m => m.id === mentionId);
      const displayName = user ? (user.displayName || user.username) : 'Unknown User';
      
      parts.push(
        <span key={keyIndex++} className="bg-indigo-500/30 text-indigo-300 px-1 rounded hover:bg-indigo-500/50 cursor-pointer">
          @{displayName}
        </span>
      );
    } else if (shortcode) {
      // Standard Emoji
      const unicode = emoji.get(shortcode);
      if (unicode) {
        parts.push(unicode);
      } else {
        parts.push(shortcode); // Return as text if not found
      }
    } else {
      // Custom Emoji
      const isAnimated = animated === 'a';
      const ext = isAnimated ? 'gif' : 'png';
      const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
      
      parts.push(
        <img 
          key={keyIndex++} 
          src={url} 
          alt={`:${name}:`} 
          title={`:${name}:`} 
          className="inline-block w-6 h-6 align-middle object-contain mx-0.5"
        />
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Push remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
};