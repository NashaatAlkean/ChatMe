package com.ChatMe.Assignment.service;

import com.ChatMe.Assignment.model.Message;
import com.ChatMe.Assignment.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;

    /**
     * Save a new message to the database
     */
    public Message saveMessage(Message message) {
        try {
            Message savedMessage = messageRepository.save(message);
            log.debug("Message saved successfully: {}", savedMessage.getId());
            return savedMessage;
        } catch (Exception e) {
            log.error("Error saving message: {}", e.getMessage());
            throw new RuntimeException("Failed to save message", e);
        }
    }

    /**
     * Get chat history between two users
     */
    public List<Message> getChatHistory(String userId1, String userId2) {
        try {
            List<Message> messages = messageRepository.findMessagesBetweenUsers(userId1, userId2);
            log.debug("Retrieved {} messages between users {} and {}", messages.size(), userId1, userId2);
            return messages;
        } catch (Exception e) {
            log.error("Error retrieving chat history: {}", e.getMessage());
            throw new RuntimeException("Failed to retrieve chat history", e);
        }
    }

    /**
     * Get recent messages between two users (limited to last 50)
     */
    public List<Message> getRecentChatHistory(String userId1, String userId2) {
        try {
            List<Message> messages = messageRepository.findRecentMessagesBetweenUsers(userId1, userId2);
            // Limit to last 50 messages if needed
            if (messages.size() > 50) {
                messages = messages.subList(0, 50);
            }
            log.debug("Retrieved {} recent messages between users {} and {}", messages.size(), userId1, userId2);
            return messages;
        } catch (Exception e) {
            log.error("Error retrieving recent chat history: {}", e.getMessage());
            throw new RuntimeException("Failed to retrieve recent chat history", e);
        }
    }

    /**
     * Get all messages sent by a user
     */
    public List<Message> getMessagesBySender(String senderId) {
        try {
            List<Message> messages = messageRepository.findBySenderIdOrderByTimestampDesc(senderId);
            log.debug("Retrieved {} messages sent by user {}", messages.size(), senderId);
            return messages;
        } catch (Exception e) {
            log.error("Error retrieving messages by sender: {}", e.getMessage());
            throw new RuntimeException("Failed to retrieve messages by sender", e);
        }
    }

    /**
     * Get all messages received by a user
     */
    public List<Message> getMessagesByReceiver(String receiverId) {
        try {
            List<Message> messages = messageRepository.findByReceiverIdOrderByTimestampDesc(receiverId);
            log.debug("Retrieved {} messages received by user {}", messages.size(), receiverId);
            return messages;
        } catch (Exception e) {
            log.error("Error retrieving messages by receiver: {}", e.getMessage());
            throw new RuntimeException("Failed to retrieve messages by receiver", e);
        }
    }

    /**
     * Create and save a new message
     */
    public Message createMessage(String senderId, String receiverId, String messageContent) {
        try {
            Message message = new Message(senderId, receiverId, messageContent);
            return saveMessage(message);
        } catch (Exception e) {
            log.error("Error creating message: {}", e.getMessage());
            throw new RuntimeException("Failed to create message", e);
        }
    }
}