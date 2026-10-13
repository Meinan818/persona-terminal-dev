package com.meinan818.personaterminal.social;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class CoopEventController {
    private final CoopEventService service;
    @PostMapping("/api/social/coop/events")
    public ResponseEntity<?> broadcast(@RequestBody Map<String, Object> input) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal principal)) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(service.broadcast(principal.userId(), input));
    }
}
