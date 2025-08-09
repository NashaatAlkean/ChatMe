// src/main/java/com/ChatMe/Assignment/service/FirebaseNotificationService.java
package com.ChatMe.Assignment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class FirebaseNotificationService {

    @Value("${firebase.functions.base-url:https://us-central1-chatme-assignment.cloudfunctions.net}")
    private String firebaseFunctionsBaseUrl;

    private final RestTemplate restTemplate;

    public FirebaseNotificationService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Trigger Firebase Function to send push notification
     */
    public void sendPushNotification(String receiverId, String senderId, String message, String senderName) {
        try {
            // Prepare the request payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("receiverId", receiverId);
            payload.put("senderId", senderId);
            payload.put("message", message);
            payload.put("senderName", senderName != null ? senderName : senderId);

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Create the request entity
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

            // Call Firebase Function
            String functionUrl = firebaseFunctionsBaseUrl + "/sendNotificationHTTP";

            log.debug("Calling Firebase Function: {} with payload: {}", functionUrl, payload);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    functionUrl,
                    requestEntity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Push notification sent successfully for message to user: {}", receiverId);
                log.debug("Firebase Function response: {}", response.getBody());
            } else {
                log.warn("Firebase Function returned non-success status: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("Failed to send push notification via Firebase Function: {}", e.getMessage(), e);
            // Don't throw exception - notification failure shouldn't break message sending
        }
    }

    /**
     * Test Firebase Functions connectivity
     */
    public boolean testConnection() {
        try {
            String healthUrl = firebaseFunctionsBaseUrl + "/healthCheck";
            ResponseEntity<Map> response = restTemplate.getForEntity(healthUrl, Map.class);

            boolean isHealthy = response.getStatusCode().is2xxSuccessful();
            log.info("Firebase Functions health check: {}", isHealthy ? "HEALTHY" : "UNHEALTHY");

            return isHealthy;
        } catch (Exception e) {
            log.error("Firebase Functions health check failed: {}", e.getMessage());
            return false;
        }
    }
}