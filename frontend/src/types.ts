export interface Account {
  id: string;
  username: string;
  displayName?: string;
  avatar: string | null;
  token?: string;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount?: number;
  onlineMemberCount?: number;
}

export interface Channel {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  type: 'dm' | 'group' | 'GUILD_TEXT' | 'GUILD_CATEGORY' | 'GUILD_VOICE';
  avatar?: string | null;
  recipientId?: string;
}

export interface Message {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName?: string;
    avatar: string | null;
  };
  timestamp: number;
  embeds?: any[];
  attachments?: any[]; // using any for MVP iteration speed, but typically Map<string, Attachment> or array
  mentions?: {
    id: string;
    username: string;
    displayName: string;
  }[];
}
