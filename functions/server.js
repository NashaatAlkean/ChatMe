// functions/server.js - Enhanced WebSocket server with Firebase Function integration
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios'); // Add this dependency

class PresenceManager {
  constructor() {
    this.onlineUsers = new Map();
    this.userSockets = new Map();
  }

  addUser(userId, ws) {
    if (this.onlineUsers.has(userId)) {
      const oldWs = this.onlineUsers.get(userId).ws;
      if (oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
        oldWs.close();
      }
    }

    this.onlineUsers.set(userId, {
      ws: ws,
      lastSeen: new Date().toISOString()
    });
    this.userSockets.set(ws, userId);

    console.log(`User ${userId} connected. Online users: ${this.onlineUsers.size}`);
    this.broadcastUserStatus(userId, true, ws);
  }

  removeUser(ws) {
    const userId = this.userSockets.get(ws);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.userSockets.delete(ws);

      console.log(`User ${userId} disconnected. Online users: ${this.onlineUsers.size}`);
      this.broadcastUserStatus(userId, false);
    }
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getUserSocket(userId) {
    const user = this.onlineUsers.get(userId);
    return user ? user.ws : null;
  }

  broadcastUserStatus(userId, isOnline, excludeWs = null) {
    const message = JSON.stringify({
      type: isOnline ? 'user_connected' : 'user_disconnected',
      userId: userId,
      timestamp: new Date().toISOString()
    });

    this.onlineUsers.forEach((user, id) => {
      if (user.ws !== excludeWs && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(message);
      }
    });
  }

  sendToUser(userId, message) {
    const user = this.onlineUsers.get(userId);
    if (user && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
}

class ChatServer {
  constructor(port = 3000) {
    this.port = port;
    this.presenceManager = new PresenceManager();
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });

    // Firebase function URL (update with your project ID)
    this.firebaseFunctionUrl = 'http://127.0.0.1:5001/chatme-assignment/us-central1/sendNotificationHTTP';

    this.setupWebSocketHandlers();
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection');

      ws.isAlive = true;
      ws.userId = null;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket closed: ${code} ${reason}`);
        this.presenceManager.removeUser(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.presenceManager.removeUser(ws);
      });
    });

    this.setupHeartbeat();
  }

  setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.presenceManager.removeUser(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  handleMessage(ws, message) {
    const { type } = message;

    switch (type) {
      case 'auth':
        this.handleAuth(ws, message.userId);
        break;
      case 'get_online_users':
        this.handleGetOnlineUsers(ws);
        break;
      case 'message':
        this.handleChatMessage(ws, message);
        break;
      case 'typing':
        this.handleTypingIndicator(ws, message);
        break;
      case 'disconnect':
        this.handleDisconnect(ws);
        break;
      default:
        console.log('Unknown message type:', type);
        this.sendError(ws, 'Unknown message type');
    }
  }

  handleAuth(ws, userId) {
    if (!userId) {
      this.sendError(ws, 'User ID required');
      return;
    }

    ws.userId = userId;
    this.presenceManager.addUser(userId, ws);

    this.send(ws, {
      type: 'auth_success',
      userId: userId,
      timestamp: new Date().toISOString()
    });

    this.handleGetOnlineUsers(ws);
  }

  handleGetOnlineUsers(ws) {
    const onlineUsers = this.presenceManager.getOnlineUsers();
    this.send(ws, {
      type: 'online_users',
      users: onlineUsers,
      timestamp: new Date().toISOString()
    });
  }

  async handleChatMessage(ws, message) {
    const { senderId, receiverId, message: chatMessage, senderName } = message;

    if (!senderId || !receiverId || !chatMessage) {
      this.sendError(ws, 'Invalid message data');
      return;
    }

    const messageObj = {
      type: 'message',
      id: this.generateMessageId(),
      senderId: senderId,
      receiverId: receiverId,
      message: chatMessage,
      timestamp: new Date().toISOString()
    };

    // Send to receiver if online
    const sent = this.presenceManager.sendToUser(receiverId, messageObj);

    // Send confirmation back to sender
    this.send(ws, {
      type: 'message_sent',
      messageId: messageObj.id,
      sent: sent,
      timestamp: messageObj.timestamp
    });

    // NEW: Call Firebase Cloud Function for push notification
    try {
      await this.triggerPushNotification({
        senderId,
        receiverId,
        message: chatMessage,
        senderName: senderName || senderId
      });
    } catch (error) {
      console.error('Failed to trigger push notification:', error);
      // Don't fail the message sending if notification fails
    }

    console.log(`Message from ${senderId} to ${receiverId}: ${chatMessage}`);
  }

  // NEW: Method to trigger Firebase Cloud Function
  async triggerPushNotification(data) {
    try {
      console.log('🚀 Triggering Firebase Cloud Function for push notification...');

      const response = await axios.post(this.firebaseFunctionUrl, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000 // 5 second timeout
      });

      console.log('✅ Firebase Function Response:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error calling Firebase Cloud Function:', error.message);
      throw error;
    }
  }

  handleTypingIndicator(ws, message) {
    const { senderId, receiverId, isTyping } = message;

    if (!senderId || !receiverId) {
      this.sendError(ws, 'Invalid typing indicator data');
      return;
    }

    this.presenceManager.sendToUser(receiverId, {
      type: 'typing',
      senderId: senderId,
      isTyping: isTyping,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(ws) {
    this.presenceManager.removeUser(ws);
    ws.close();
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.send(ws, {
      type: 'error',
      error: error,
      timestamp: new Date().toISOString()
    });
  }

  generateMessageId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`ChatMe WebSocket server running on port ${this.port}`);
      console.log(`WebSocket endpoint: ws://localhost:${this.port}`);
      console.log(`Firebase Function URL: ${this.firebaseFunctionUrl}`);
    });
  }

  stop() {
    this.wss.close();
    this.server.close();
  }
}

// Start the server
const chatServer = new ChatServer(3000);
chatServer.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  chatServer.stop();
  process.exit(0);
});

module.exports = ChatServer;