// src/main/java/com/ChatMe/Assignment/websocket/ChatWebSocketController.java - COMPLETE FIXED VERSION
package com.ChatMe.Assignment.websocket;

import com.ChatMe.Assignment.model.Message;
import com.ChatMe.Assignment.service.MessageService;
import com.ChatMe.Assignment.service.FirebaseNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FirebaseNotificationService firebaseNotificationService;

    /**
     * Handle incoming chat messages via WebSocket
     * Clients send messages to /app/chat
     */
    @MessageMapping("/chat")
    public void handleChatMessage(@Payload Map<String, String> messageData, Principal principal) {
        try {
            String senderId = messageData.get("senderId");
            String receiverId = messageData.get("receiverId");
            String messageContent = messageData.get("message");

            // Validate required fields
            if (senderId == null || receiverId == null || messageContent == null) {
                log.error("❌ Invalid message data: missing required fields");
                return;
            }

            log.info("📨 Received WebSocket message from {} to {}: {}", senderId, receiverId, messageContent);

            // 💾 Save message to database first
            Message savedMessage = messageService.createMessage(senderId, receiverId, messageContent);
            log.info("✅ Message saved to database: {}", savedMessage.getId());

            // 🔥 FIXED: Send to BOTH users immediately for real-time updates

            // 1. Send to receiver's personal queue (/user/{receiverId}/queue/messages)
            messagingTemplate.convertAndSendToUser(
                    receiverId,
                    "/queue/messages",
                    savedMessage
            );
            log.debug("📨 Message sent to receiver: {}", receiverId);

            // 2. Send confirmation back to sender (/user/{senderId}/queue/messages)
            messagingTemplate.convertAndSendToUser(
                    senderId,
                    "/queue/messages",
                    savedMessage
            );
            log.debug("📨 Message confirmation sent to sender: {}", senderId);

            // 3. FIXED: Also send to shared chat topic for both users
            String chatId = createChatId(senderId, receiverId);
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, savedMessage);
            log.debug("📨 Message sent to chat topic: /topic/chat/{}", chatId);

            // 4. Send to global chat topic that both users can subscribe to
            messagingTemplate.convertAndSend("/topic/chat/" + senderId, savedMessage);
            messagingTemplate.convertAndSend("/topic/chat/" + receiverId, savedMessage);

            log.info("✅ Message broadcasted successfully via WebSocket");

            // 🔔 Trigger Firebase Function for push notification
            try {
                String senderName = messageData.get("senderName");
                firebaseNotificationService.sendPushNotification(
                        receiverId,
                        senderId,
                        messageContent,
                        senderName
                );
                log.debug("✅ Push notification triggered");
            } catch (Exception e) {
                log.warn("⚠️ Push notification failed (message delivery not affected): {}", e.getMessage());
            }

        } catch (Exception e) {
            log.error("❌ Error handling chat message: {}", e.getMessage(), e);
        }
    }

    /**
     * FIXED: Handle typing indicators
     */
    @MessageMapping("/typing")
    public void handleTypingIndicator(@Payload Map<String, String> typingData) {
        try {
            String senderId = typingData.get("senderId");
            String receiverId = typingData.get("receiverId");
            String isTyping = typingData.get("isTyping");

            if (senderId == null || receiverId == null) {
                log.warn("❌ Invalid typing data: missing senderId or receiverId");
                return;
            }

            log.debug("✍️ Typing indicator: {} -> {} (typing: {})", senderId, receiverId, isTyping);

            // Send typing indicator to receiver
            messagingTemplate.convertAndSendToUser(
                    receiverId,
                    "/queue/typing",
                    Map.of(
                            "senderId", senderId,
                            "isTyping", isTyping != null ? isTyping : "false"
                    )
            );

            log.debug("✅ Typing indicator sent successfully");

        } catch (Exception e) {
            log.error("❌ Error handling typing indicator: {}", e.getMessage());
        }
    }

    /**
     * Handle user connection status
     */
    @MessageMapping("/status")
    @SendToUser("/queue/status")
    public Map<String, String> handleUserStatus(@Payload Map<String, String> statusData, Principal principal) {
        try {
            String userId = statusData.get("userId");
            String status = statusData.get("status");

            if (principal != null && !userId.equals(principal.getName())) {
                log.warn("⚠️ User {} trying to update status for {}", principal.getName(), userId);
                return Map.of("error", "Unauthorized");
            }

            log.info("👤 User {} status changed to: {}", userId, status);

            // Broadcast user status to all users
            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", userId,
                    "status", status,
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

            return Map.of(
                    "userId", userId,
                    "status", status,
                    "timestamp", String.valueOf(System.currentTimeMillis())
            );

        } catch (Exception e) {
            log.error("❌ Error handling user status: {}", e.getMessage());
            return Map.of("error", "Failed to update status");
        }
    }

    /**
     * Handle user joining/leaving notifications
     */
    @MessageMapping("/join")
    public void handleUserJoin(@Payload Map<String, String> joinData, Principal principal) {
        try {
            String userId = joinData.get("userId");
            String action = joinData.get("action");

            if (principal != null && !userId.equals(principal.getName())) {
                log.warn("⚠️ Unauthorized join/leave action");
                return;
            }

            log.info("👤 User {} {}", userId, action);

            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", userId,
                    "action", action,
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

        } catch (Exception e) {
            log.error("❌ Error handling user join/leave: {}", e.getMessage());
        }
    }

    /**
     *  Public method to send messages programmatically (called from REST API)
     */
    public void broadcastMessage(Message message) {
        try {
            log.info("📢 Broadcasting message via WebSocket: {} -> {}",
                    message.getSenderId(), message.getReceiverId());

            // Send to both users' personal queues
            messagingTemplate.convertAndSendToUser(
                    message.getReceiverId(),
                    "/queue/messages",
                    message
            );

            messagingTemplate.convertAndSendToUser(
                    message.getSenderId(),
                    "/queue/messages",
                    message
            );

            // Send to shared chat topic
            String chatId = createChatId(message.getSenderId(), message.getReceiverId());
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, message);

            // Send to individual user topics
            messagingTemplate.convertAndSend("/topic/chat/" + message.getSenderId(), message);
            messagingTemplate.convertAndSend("/topic/chat/" + message.getReceiverId(), message);

            log.info("✅ Message broadcasted successfully: {}", message.getId());

        } catch (Exception e) {
            log.error("❌ Error broadcasting message: {}", e.getMessage(), e);
        }
    }

    /**
     * Test endpoint to verify WebSocket functionality
     */
    @MessageMapping("/test")
    public void handleTestMessage(@Payload Map<String, String> testData, Principal principal) {
        try {
            String userId = testData.get("userId");
            String testMessage = testData.get("message");

            log.info("🧪 Test message received from {}: {}", userId, testMessage);

            // Echo back to sender
            messagingTemplate.convertAndSendToUser(
                    userId,
                    "/queue/test",
                    Map.of(
                            "echo", "Test successful: " + testMessage,
                            "timestamp", String.valueOf(System.currentTimeMillis()),
                            "principal", principal != null ? principal.getName() : "anonymous"
                    )
            );

            log.info("✅ Test message echoed back to user: {}", userId);

        } catch (Exception e) {
            log.error("❌ Error handling test message: {}", e.getMessage());
        }
    }

    /**
     * Handle connection establishment notifications
     */
    @MessageMapping("/connect")
    public void handleUserConnect(@Payload Map<String, String> connectData, Principal principal) {
        try {
            String userId = connectData.get("userId");

            log.info("🔌 User connected: {}", userId);

            // Send welcome message to user
            messagingTemplate.convertAndSendToUser(
                    userId,
                    "/queue/system",
                    Map.of(
                            "type", "welcome",
                            "message", "Welcome to ChatMe! WebSocket connection established.",
                            "timestamp", String.valueOf(System.currentTimeMillis())
                    )
            );

            // Notify other users about new connection (optional)
            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", userId,
                    "status", "online",
                    "action", "connect",
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

        } catch (Exception e) {
            log.error("❌ Error handling user connect: {}", e.getMessage());
        }
    }

    /**
     * Handle disconnection notifications
     */
    @MessageMapping("/disconnect")
    public void handleUserDisconnect(@Payload Map<String, String> disconnectData, Principal principal) {
        try {
            String userId = disconnectData.get("userId");

            log.info("🔌 User disconnecting: {}", userId);

            // Notify other users about disconnection
            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", userId,
                    "status", "offline",
                    "action", "disconnect",
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

        } catch (Exception e) {
            log.error("❌ Error handling user disconnect: {}", e.getMessage());
        }
    }

    /**
     * Helper method to create consistent chat ID for both users
     * This ensures both users subscribe to the same chat topic
     */
    private String createChatId(String userId1, String userId2) {
        // Create consistent chat ID regardless of order
        return userId1.compareTo(userId2) < 0 ? userId1 + "_" + userId2 : userId2 + "_" + userId1;
    }

    /**
     * Utility method to validate message data
     */
    private boolean isValidMessageData(Map<String, String> messageData) {
        return messageData != null &&
                messageData.get("senderId") != null &&
                messageData.get("receiverId") != null &&
                messageData.get("message") != null &&
                !messageData.get("message").trim().isEmpty();
    }

    /**
     * Utility method to sanitize message content
     */
    private String sanitizeMessage(String message) {
        if (message == null) return "";
        return message.trim().substring(0, Math.min(message.length(), 1000)); // Limit to 1000 chars
    }

    /**
     * Get WebSocket connection statistics (for monitoring)
     */
    public Map<String, Object> getConnectionStats() {
        return Map.of(
                "service", "ChatWebSocketController",
                "status", "active",
                "timestamp", System.currentTimeMillis(),
                "endpoints", Map.of(
                        "chat", "/app/chat",
                        "typing", "/app/typing",
                        "status", "/app/status",
                        "join", "/app/join",
                        "test", "/app/test",
                        "connect", "/app/connect",
                        "disconnect", "/app/disconnect"
                )
        );
    }
}