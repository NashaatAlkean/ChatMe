// src/main/java/com/ChatMe/Assignment/config/FirebaseAuthenticationFilter.java
package com.ChatMe.Assignment.config;

import com.ChatMe.Assignment.service.FirebaseTokenService;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@RequiredArgsConstructor
@Slf4j
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    private final FirebaseTokenService firebaseTokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        try {
            String token = extractTokenFromRequest(request);

            if (token != null) {
                try {
                    FirebaseToken decodedToken = firebaseTokenService.verifyToken(token);

                    // Create authentication object
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    decodedToken.getUid(),
                                    null,
                                    new ArrayList<>() // No roles for now
                            );

                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Set authentication in security context
                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    log.debug("Successfully authenticated user: {}", decodedToken.getUid());

                } catch (Exception e) {
                    log.warn("Invalid Firebase token: {}", e.getMessage());
                    SecurityContextHolder.clearContext();
                }
            }

        } catch (Exception e) {
            log.error("Error processing Firebase token: {}", e.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        // Try Authorization header first
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        // Try query parameter (for WebSocket handshake)
        String tokenParam = request.getParameter("token");
        if (tokenParam != null && !tokenParam.isEmpty()) {
            return tokenParam;
        }

        return null;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();

        // Skip filter for public endpoints
        return path.equals("/") ||
                path.equals("/favicon.ico") ||
                path.startsWith("/actuator/health") ||
                path.startsWith("/ws/") || // WebSocket handled by interceptor
                (path.startsWith("/api/users") && "POST".equals(request.getMethod())) ||
                (path.startsWith("/api/chat/health") && "GET".equals(request.getMethod())) ||
                (path.startsWith("/api/chat/info") && "GET".equals(request.getMethod()));
    }
}