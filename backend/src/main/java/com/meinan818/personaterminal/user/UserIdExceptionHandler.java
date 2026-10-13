package com.meinan818.personaterminal.user;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class UserIdExceptionHandler {
    @ExceptionHandler(UserIdPolicy.UserIdException.class)
    public ResponseEntity<?> handle(UserIdPolicy.UserIdException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("velvet", "not_found", "message", error.getReason()));
    }
}
