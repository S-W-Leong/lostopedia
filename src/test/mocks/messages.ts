import type { Message, MessageWithUsers, Conversation } from '@/types'

/**
 * Mock data for message tests
 */

export const mockMessage: Message = {
  id: 'msg-1',
  itemId: 'item-1',
  senderId: 'user-1',
  recipientId: 'user-2',
  content: 'Hello, is this item still available?',
  isRead: false,
  readAt: null,
  isFlagged: false,
  flaggedBy: null,
  flaggedReason: null,
  createdAt: new Date().toISOString(),
}

export const mockMessageWithUsers: MessageWithUsers = {
  ...mockMessage,
  sender: {
    id: 'user-1',
    displayName: 'John Doe',
    avatarUrl: 'https://example.com/avatar1.jpg',
    reputationScore: 100,
  },
  recipient: {
    id: 'user-2',
    displayName: 'Jane Smith',
    avatarUrl: 'https://example.com/avatar2.jpg',
    reputationScore: 85,
  },
}

export const mockConversation: Conversation = {
  itemId: 'item-1',
  item: {
    id: 'item-1',
    title: 'Lost iPhone 13',
    imageUrl: 'https://example.com/item.jpg',
    type: 'lost',
  },
  otherUser: {
    id: 'user-2',
    displayName: 'Jane Smith',
    avatarUrl: 'https://example.com/avatar2.jpg',
    reputationScore: 85,
  },
  lastMessage: {
    id: 'msg-1',
    content: 'Hello, is this item still available?',
    createdAt: new Date().toISOString(),
    isRead: false,
    senderId: 'user-1',
  } as any,
  unreadCount: 2,
}

export const mockMessages: MessageWithUsers[] = [
  {
    ...mockMessageWithUsers,
    id: 'msg-1',
    content: 'Hello, is this item still available?',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    ...mockMessageWithUsers,
    id: 'msg-2',
    senderId: 'user-2',
    recipientId: 'user-1',
    content: 'Yes, it is still available!',
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    sender: mockMessageWithUsers.recipient,
    recipient: mockMessageWithUsers.sender,
  },
  {
    ...mockMessageWithUsers,
    id: 'msg-3',
    content: 'Great! When can I pick it up?',
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
  },
]

export const mockConversations: Conversation[] = [
  mockConversation,
  {
    ...mockConversation,
    itemId: 'item-2',
    item: {
      id: 'item-2',
      title: 'Found Wallet',
      imageUrl: null,
      type: 'found',
    },
    otherUser: {
      id: 'user-3',
      displayName: 'Bob Johnson',
      avatarUrl: null,
      reputationScore: 120,
    },
    lastMessage: {
      id: 'msg-4',
      content: 'I found your wallet!',
      createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      isRead: true,
      senderId: 'user-3',
    } as any,
    unreadCount: 0,
  },
]

