// functions/index.js - Firebase Cloud Function for push notifications
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * HTTP Function to simulate push notifications
 * Called by your WebSocket server when messages are sent
 */
exports.sendNotificationHTTP = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { senderId, receiverId, message, senderName } = req.body;

    // Validate required fields
    if (!senderId || !receiverId || !message) {
      res.status(400).json({
        error: 'Missing required fields: senderId, receiverId, message'
      });
      return;
    }

    //  SIMULATE PUSH NOTIFICATION
    console.log('🔔 PUSH NOTIFICATION SIMULATION 🔔');
    console.log('==========================================');
    console.log(`📱 Notification sent to: ${receiverId}`);
    console.log(`👤 From: ${senderName || senderId}`);
    console.log(`💬 Message: "${message}"`);
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
    console.log(`🆔 Sender ID: ${senderId}`);
    console.log('==========================================');

    // Simulate notification payload that would be sent to device
    const notificationPayload = {
      title: `New message from ${senderName || 'Someone'}`,
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      icon: '/assets/chat-icon.png',
      click_action: '/chat',
      data: {
        senderId: senderId,
        receiverId: receiverId,
        timestamp: new Date().toISOString(),
        type: 'chat_message'
      }
    };

    console.log('📦 Notification Payload:');
    console.log(JSON.stringify(notificationPayload, null, 2));

    // In a real app, you would send actual push notification here:
    // await admin.messaging().send({
    //   token: userFCMToken,
    //   notification: notificationPayload
    // });

    // Send success response back to WebSocket server
    res.status(200).json({
      success: true,
      message: 'Push notification simulated successfully',
      notificationSent: true,
      timestamp: new Date().toISOString(),
      recipientId: receiverId,
      senderId: senderId,
      simulatedPayload: notificationPayload
    });

  } catch (error) {
    console.error('❌ Error in notification function:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Alternative Callable Function (if you prefer callable functions)
 */
exports.sendNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated (optional)
    if (!context.auth) {
      console.log('⚠️ Unauthenticated call to sendNotification');
      // Don't throw error - allow for testing
    }

    const { senderId, receiverId, message, senderName } = data;

    // Validate required fields
    if (!senderId || !receiverId || !message) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // SIMULATE PUSH NOTIFICATION
    console.log('🔔 CALLABLE PUSH NOTIFICATION SIMULATION 🔔');
    console.log('=============================================');
    console.log(`📱 Notification sent to: ${receiverId}`);
    console.log(`👤 From: ${senderName || senderId}`);
    console.log(`💬 Message: "${message}"`);
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
    console.log('=============================================');

    // Return success response
    return {
      success: true,
      message: 'Push notification simulated successfully',
      notificationSent: true,
      timestamp: new Date().toISOString(),
      recipientId: receiverId,
      senderId: senderId
    };

  } catch (error) {
    console.error('❌ Error in callable notification function:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'An unexpected error occurred');
  }
});