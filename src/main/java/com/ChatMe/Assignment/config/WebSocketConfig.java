// src/main/java/com/ChatMe/Assignment/config/WebSocketConfig.java
package com.ChatMe.Assignment.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final FirebaseAuthenticationInterceptor firebaseAuthInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker to carry the greeting messages back to the client
        // on destinations prefixed with "/topic" and "/user"
        config.enableSimpleBroker("/topic", "/user");

        // Define the prefix for messages that are bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");

        // Enable user-specific destinations
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the "/ws" endpoint with authentication interceptor
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow all origins for development
                .addInterceptors(firebaseAuthInterceptor) // Add Firebase authentication
                .withSockJS();

        // Also register without SockJS for native WebSocket connections
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(firebaseAuthInterceptor); // Add Firebase authentication
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Register the Firebase authentication interceptor for STOMP messages
        registration.interceptors(firebaseAuthInterceptor);
    }
}