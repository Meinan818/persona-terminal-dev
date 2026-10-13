package com.meinan818.personaterminal.security;

import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtSessionUnitTest {
    private static final String SYNTHETIC_SIGNING = "test-only-signing-material-never-used-outside-unit-tests";
    private final JwtUtil jwt = new JwtUtil(SYNTHETIC_SIGNING, 24);
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    private boolean authenticated(String token, User user) throws Exception {
        UserMapper mapper = mock(UserMapper.class); when(mapper.selectById("test")).thenReturn(user);
        var request = new MockHttpServletRequest(); request.addHeader("Authorization", "Bearer " + token);
        var filter = new JwtAuthFilter(jwt, mapper);
        boolean[] auth = { false };
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> auth[0] = SecurityContextHolder.getContext().getAuthentication() != null);
        SecurityContextHolder.clearContext();
        return auth[0];
    }
    @Test
    void passwordChangeInvalidatesOldSessionsAndNewSessionWorks() throws Exception {
        User user = new User(); user.setId("test"); user.setPassword("synthetic-old-hash");
        String old = jwt.generate("test", "test@example.invalid", user.getPassword());
        assertThat(authenticated(old, user)).isTrue();
        user.setPassword("synthetic-new-hash");
        assertThat(authenticated(old, user)).isFalse();
        assertThat(authenticated(jwt.generate("test", "test@example.invalid", user.getPassword()), user)).isTrue();
    }
    @Test
    void deletedAccountAndLegacySessionCannotAuthenticate() throws Exception {
        String token = jwt.generate("test", "test@example.invalid", "synthetic-hash");
        assertThat(authenticated(token, null)).isFalse();
        String legacy = Jwts.builder().setSubject("test").setExpiration(new Date(System.currentTimeMillis() + 60000))
                .signWith(Keys.hmacShaKeyFor(SYNTHETIC_SIGNING.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256).compact();
        User user = new User(); user.setId("test"); user.setPassword("synthetic-hash");
        assertThat(authenticated(legacy, user)).isFalse();
    }
    @Test
    void ordinaryProfileChangesDoNotLogOutTheAccount() throws Exception {
        User user = new User(); user.setId("test"); user.setPassword("synthetic-hash");
        String token = jwt.generate("test", "test@example.invalid", user.getPassword());
        user.setName("updated-name"); user.setProfile("{\"nickname\":\"Updated\"}");
        assertThat(authenticated(token, user)).isTrue();
    }
}
