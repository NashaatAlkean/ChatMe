package com.ChatMe.Assignment.repository;

import com.ChatMe.Assignment.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {

    // Find messages between two users (both directions)
    @Query("{ $or: [ { $and: [ { 'senderId': ?0 }, { 'receiverId': ?1 } ] }, { $and: [ { 'senderId': ?1 }, { 'receiverId': ?0 } ] } ] }")
    List<Message> findMessagesBetweenUsers(String userId1, String userId2);

    // Find messages sent by a specific user
    List<Message> findBySenderIdOrderByTimestampDesc(String senderId);

    // Find messages received by a specific user
    List<Message> findByReceiverIdOrderByTimestampDesc(String receiverId);

    // Find recent messages between two users (limited)
    @Query(value = "{ $or: [ { $and: [ { 'senderId': ?0 }, { 'receiverId': ?1 } ] }, { $and: [ { 'senderId': ?1 }, { 'receiverId': ?0 } ] } ] }",
            sort = "{ 'timestamp': -1 }")
    List<Message> findRecentMessagesBetweenUsers(String userId1, String userId2);
}