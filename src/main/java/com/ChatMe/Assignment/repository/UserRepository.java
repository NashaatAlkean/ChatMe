// src/main/java/com/ChatMe/Assignment/repository/UserRepository.java - FIXED
package com.ChatMe.Assignment.repository;

import com.ChatMe.Assignment.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    // Find user by email
    Optional<User> findByEmail(String email);

    // Find all users except the specified one (for chat partner selection)
    List<User> findAllByUidNot(String excludeUid);

    // Search users by name containing the query (case insensitive)
    @Query("{ 'name': { $regex: ?0, $options: 'i' } }")
    List<User> findByNameContainingIgnoreCase(String name);

    // Search users by name containing the query, excluding a specific user
    @Query("{ 'name': { $regex: ?0, $options: 'i' }, 'uid': { $ne: ?1 } }")
    List<User> findByNameContainingIgnoreCaseAndUidNot(String name, String excludeUid);

    // Check if user exists by UID
    boolean existsByUid(String uid);

    // Check if user exists by email
    boolean existsByEmail(String email);

    // Find users by provider (google, email, etc.)
    List<User> findByProvider(String provider);

    // Count total users
    long count();
}