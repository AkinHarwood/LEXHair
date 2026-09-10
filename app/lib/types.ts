export type Member = { id: string; name: string };

export type Attachment = {
  id: string;
  fileName: string;
  filePath: string; // storedName on server
  mimeType: string;
  size: number;
};

export type Mention = {
  mentionedUserId: string;
  mentionedUser: Member;
};

export type Message = {
  id: string;
  body: string;
  authorId: string;
  author: Member;
  channelId: string | null;
  conversationId: string | null;
  createdAt: string;
  attachments: Attachment[];
  mentions: Mention[];
};

export type Channel = {
  id: string;
  name: string;
  description: string | null;
  members: Member[];
};

export type Conversation = {
  id: string;
  isGroup: number | boolean;
  members: Member[];
  lastMessage?: { body: string; createdAt: string; authorName?: string } | null;
};
