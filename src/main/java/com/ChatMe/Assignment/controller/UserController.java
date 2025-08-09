// src/main/java/com/ChatMe/Assignment/controller/UserController.java
package com.ChatMe.Assignment.controller;

import com.ChatMe.Assignment.model.User;
import com.ChatMe.Assignment.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
@Slf4j
public class UserController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Save or update user (called during authentication)
     */
    @PostMapping
    public ResponseEntity<User> saveUser(@RequestBody User user) {
        try {
            log.info("Saving user: {}", user.getEmail());

            // Check if user already exists
            Optional<User> existingUser = userRepository.findById(user.getUid());

            if (existingUser.isPresent()) {
                // Update existing user with latest info
                User existing = existingUser.get();
                existing.setName(user.getName());
                existing.setPhotoURL(user.getPhotoURL());
                existing.setProvider(user.getProvider());

                User savedUser = userRepository.save(existing);
                log.info("Updated existing user: {}", savedUser.getUid());
                return ResponseEntity.ok(savedUser);
            } else {
                // Save new user
                User savedUser = userRepository.save(user);
                log.info("Saved new user: {}", savedUser.getUid());
                return ResponseEntity.ok(savedUser);
            }

        } catch (Exception e) {
            log.error("Error saving user: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get all users (for chat partner selection)
     * Excludes the current user
     */
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers(@RequestParam(required = false) String excludeUserId) {
        try {
            log.info("Getting all users, excluding: {}", excludeUserId);

            List<User> users;

            if (excludeUserId != null && !excludeUserId.isEmpty()) {
                // Get all users except the specified one
                users = userRepository.findAllByUidNot(excludeUserId);
            } else {
                // Get all users
                users = userRepository.findAll();
            }

            log.info("Retrieved {} users", users.size());
            return ResponseEntity.ok(users);

        } catch (Exception e) {
            log.error("Error retrieving users: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Simple test endpoint
     */
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        try {
            long count = userRepository.count();
            return ResponseEntity.ok("User service working! Total users: " + count);
        } catch (Exception e) {
            log.error("Database connection failed: {}", e.getMessage());
            return ResponseEntity.ok("User service working, but database connection failed: " + e.getMessage());
        }
    }

    /**
     * Get user by ID
     */
    @GetMapping("/{userId}")
    public ResponseEntity<User> getUserById(@PathVariable String userId) {
        try {
            log.info("Getting user by ID: {}", userId);
            Optional<User> user = userRepository.findById(userId);

            if (user.isPresent()) {
                return ResponseEntity.ok(user.get());
            } else {
                log.warn("User not found: {}", userId);
                return ResponseEntity.notFound().build();
            }

        } catch (Exception e) {
            log.error("Error retrieving user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}