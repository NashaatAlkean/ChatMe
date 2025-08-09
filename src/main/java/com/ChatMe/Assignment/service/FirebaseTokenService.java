package com.ChatMe.Assignment.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class FirebaseTokenService {

    public FirebaseToken verifyToken(String idToken) throws FirebaseAuthException {
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            log.debug("Token verified successfully for user: {}", decodedToken.getUid());
            return decodedToken;
        } catch (FirebaseAuthException e) {
            log.error("Failed to verify Firebase token: {}", e.getMessage());
            throw e;
        }
    }

    public String getUserIdFromToken(String idToken) {
        try {
            FirebaseToken decodedToken = verifyToken(idToken);
            return decodedToken.getUid();
        } catch (FirebaseAuthException e) {
            log.error("Failed to get user ID from token: {}", e.getMessage());
            return null;
        }
    }

    public boolean isTokenValid(String idToken) {
        try {
            verifyToken(idToken);
            return true;
        } catch (FirebaseAuthException e) {
            return false;
        }
    }
}