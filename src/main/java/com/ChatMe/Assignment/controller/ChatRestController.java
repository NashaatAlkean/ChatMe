package com.ChatMe.Assignment.controller;

import com.ChatMe.Assignment.model.Message;
import com.ChatMe.Assignment.service.MessageService;
import com.ChatMe.Assignment.service.FirebaseNotificationService;
import com.ChatMe.Assignment.websocket.ChatWebSocketController;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*") // Allow all origins for development
public class ChatRestController {
    // Add this field at the top with your other @Autowired fields:
    private final ChatWebSocketController webSocketController; // ADD THIS

    private final MessageService messageService;
    private final FirebaseNotificationService firebaseNotificationService; // ADD THIS

    /**
     * Get chat history between two users
     * GET /api/chat/history?user1=userId1&user2=userId2
     */
    @GetMapping("/history")
    public ResponseEntity<List<Message>> getChatHistory(
            @RequestParam String user1,
            @RequestParam String user2) {
        try {
            log.debug("Fetching chat history between {} and {}", user1, user2);
            List<Message> messages = messageService.getChatHistory(user1, user2);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching chat history: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get recent chat history between two users (last 50 messages)
     * GET /api/chat/recent?user1=userId1&user2=userId2
     */
    @GetMapping("/recent")
    public ResponseEntity<List<Message>> getRecentChatHistory(
            @RequestParam String user1,
            @RequestParam String user2) {
        try {
            log.debug("Fetching recent chat history between {} and {}", user1, user2);
            List<Message> messages = messageService.getRecentChatHistory(user1, user2);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching recent chat history: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Send a message via REST API (alternative to WebSocket)
     * POST /api/chat/send
     * INCLUDES FIREBASE FUNCTION CALL
     */
    @PostMapping("/send")
    public ResponseEntity<Message> sendMessage(@RequestBody Map<String, String> messageData) {
        try {
            String senderId = messageData.get("senderId");
            String receiverId = messageData.get("receiverId");
            String messageContent = messageData.get("message");

            if (senderId == null || receiverId == null || messageContent == null) {
                log.warn("Invalid message data: missing required fields");
                return ResponseEntity.badRequest().build();
            }

            log.debug("Sending message via REST from {} to {}: {}", senderId, receiverId, messageContent);

            // 💾 Save message to MongoDB
            Message savedMessage = messageService.createMessage(senderId, receiverId, messageContent);
            log.debug("✅ Message saved to MongoDB: {}", savedMessage.getId());

            //  Broadcast message via WebSocket for real-time updates
            try {
                webSocketController.broadcastMessage(savedMessage);
                log.debug("✅ Message broadcasted via WebSocket");
            } catch (Exception e) {
                log.warn("Failed to broadcast via WebSocket: {}", e.getMessage());
            }

            // CALL FIREBASE FUNCTION FOR PUSH NOTIFICATION
            try {
                String senderName = messageData.get("senderName"); // Optional sender name from frontend

                firebaseNotificationService.sendPushNotification(
                        receiverId,
                        senderId,
                        messageContent,
                        senderName
                );

                log.debug("✅ Firebase push notification triggered successfully");

            } catch (Exception e) {
                // Don't fail the message sending if notification fails
                log.warn("⚠️ Failed to send push notification (message saved successfully): {}", e.getMessage());
            }

            return ResponseEntity.ok(savedMessage);

        } catch (Exception e) {
            log.error("Error sending message via REST: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get all messages sent by a user
     * GET /api/chat/sent/{userId}
     */
    @GetMapping("/sent/{userId}")
    public ResponseEntity<List<Message>> getMessagesBySender(@PathVariable String userId) {
        try {
            log.debug("Fetching messages sent by user {}", userId);
            List<Message> messages = messageService.getMessagesBySender(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching messages by sender: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get all messages received by a user
     * GET /api/chat/received/{userId}
     */
    @GetMapping("/received/{userId}")
    public ResponseEntity<List<Message>> getMessagesByReceiver(@PathVariable String userId) {
        try {
            log.debug("Fetching messages received by user {}", userId);
            List<Message> messages = messageService.getMessagesByReceiver(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching messages by receiver: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Health check endpoint
     * GET /api/chat/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "service", "chat-api",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    /**
     * Get system info - useful for debugging
     * GET /api/chat/info
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, String>> getSystemInfo() {
        return ResponseEntity.ok(Map.of(
                "service", "ChatMe Assignment Backend",
                "version", "1.0.0",
                "status", "running",
                "database", "MongoDB",
                "websocket", "enabled",
                "firebase-functions", "enabled",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}