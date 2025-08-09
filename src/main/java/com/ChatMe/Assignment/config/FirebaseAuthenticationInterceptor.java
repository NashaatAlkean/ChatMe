// src/main/java/com/ChatMe/Assignment/config/FirebaseAuthenticationInterceptor.java
package com.ChatMe.Assignment.config;

import com.ChatMe.Assignment.service.FirebaseTokenService;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.security.Principal;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class FirebaseAuthenticationInterceptor implements HandshakeInterceptor, ChannelInterceptor {

    private final FirebaseTokenService firebaseTokenService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

        log.debug("WebSocket handshake attempt from: {}", request.getRemoteAddress());

        // Extract token from multiple possible locations
        String token = extractTokenFromRequest(request);

        if (token != null && !token.isEmpty()) {
            try {
                FirebaseToken decodedToken = firebaseTokenService.verifyToken(token);
                attributes.put("firebaseToken", decodedToken);
                attributes.put("userId", decodedToken.getUid());
                log.info("✅ WebSocket handshake authenticated for user: {}", decodedToken.getUid());
                return true;
            } catch (Exception e) {
                log.error("❌ Invalid Firebase token in WebSocket handshake: {}", e.getMessage());
                return false;
            }
        }

        log.warn("⚠️ No Firebase token provided in WebSocket handshake. Allowing connection for development.");

        //  TEMPORARY: Allow connections without token for development
        // TODO: Change this to `return false;` in production
        attributes.put("userId", "anonymous-" + System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Nothing needed here
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && accessor.getCommand() != null) {
            switch (accessor.getCommand()) {
                case CONNECT:
                    log.debug("STOMP CONNECT command received");

                    // Try to get user from session attributes first
                    String userId = (String) accessor.getSessionAttributes().get("userId");

                    if (userId != null) {
                        accessor.setUser(new FirebasePrincipal(userId));
                        log.info("✅ STOMP connection established for user: {}", userId);
                    } else {
                        // Verify token on STOMP connect as backup
                        String token = accessor.getFirstNativeHeader("Authorization");
                        if (token != null && token.startsWith("Bearer ")) {
                            token = token.substring(7);
                            try {
                                FirebaseToken decodedToken = firebaseTokenService.verifyToken(token);
                                accessor.setUser(new FirebasePrincipal(decodedToken.getUid()));
                                log.info("✅ STOMP connection authenticated via header for user: {}", decodedToken.getUid());
                            } catch (Exception e) {
                                log.error("❌ Invalid Firebase token in STOMP connect: {}", e.getMessage());
                                // Allow for development
                                accessor.setUser(new FirebasePrincipal("anonymous-" + System.currentTimeMillis()));
                            }
                        } else {
                            log.warn("⚠️ No Authorization header in STOMP connect. Allowing for development.");
                            // Allow for development
                            accessor.setUser(new FirebasePrincipal("anonymous-" + System.currentTimeMillis()));
                        }
                    }
                    break;

                case SEND:
                    // Ensure user is authenticated for sending messages
                    Principal user = accessor.getUser();
                    if (user == null) {
                        log.warn("⚠️ Unauthenticated user trying to send message - allowing for development");
                        // In production, return null to reject the message
                        // return null;
                    }
                    break;
            }
        }

        return message;
    }

    private String extractTokenFromRequest(ServerHttpRequest request) {
        URI uri = request.getURI();

        // 1. Try to get token from query parameters
        String query = uri.getQuery();
        if (query != null) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                String[] keyValue = pair.split("=");
                if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                    try {
                        return java.net.URLDecoder.decode(keyValue[1], "UTF-8");
                    } catch (Exception e) {
                        log.warn("Failed to decode token from URL: {}", e.getMessage());
                    }
                }
            }
        }

        // 2. Try to get from Authorization header
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        // 3. Try to get from custom header
        String tokenHeader = request.getHeaders().getFirst("X-Firebase-Token");
        if (tokenHeader != null) {
            return tokenHeader;
        }

        return null;
    }

    // Custom Principal implementation for Firebase users
    private static class FirebasePrincipal implements Principal {
        private final String uid;

        public FirebasePrincipal(String uid) {
            this.uid = uid;
        }

        @Override
        public String getName() {
            return uid;
        }
    }
}