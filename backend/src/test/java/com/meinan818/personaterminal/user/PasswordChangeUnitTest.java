package com.meinan818.personaterminal.user;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import com.meinan818.personaterminal.security.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordChangeUnitTest {
    private UserMapper users;
    private PasswordEncoder passwords;
    private AuthController controller;
    private User user;
    @BeforeEach void setup() {
        users = mock(UserMapper.class); passwords = mock(PasswordEncoder.class);
        JwtUtil jwt = mock(JwtUtil.class); when(jwt.generate(anyString(), anyString(), anyString())).thenReturn("synthetic-new-session");
        controller = new AuthController(users, passwords, jwt);
        user = new User(); user.setId("test"); user.setEmail("test@example.invalid"); user.setPassword("synthetic-old-hash");
        when(users.selectById("test")).thenReturn(user); when(users.update(isNull(), any())).thenReturn(1);
        when(passwords.matches("old-password", "synthetic-old-hash")).thenReturn(true);
        when(passwords.encode("new-password")).thenReturn("synthetic-new-hash");
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new JwtAuthFilter.UserIdPrincipal("test"), null, List.of()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    private AuthController.ChangePasswordReq request(String old, String next, String confirm) {
        var request = new AuthController.ChangePasswordReq(); request.setOldPassword(old); request.setPassword(next); request.setPasswordConfirm(confirm); return request;
    }
    @Test void correctOldPasswordPersistsHashAndReturnsNewSession() {
        var result = controller.changePassword(request("old-password", "new-password", "new-password"));
        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(user.getPassword()).isEqualTo("synthetic-new-hash");
        assertThat(((Map<?, ?>) result.getBody()).get("token")).isEqualTo("synthetic-new-session");
        assertThat(((Map<?, ?>) result.getBody()).get("record").toString()).doesNotContain("synthetic-new-hash");
    }
    @Test void wrongOldPasswordDoesNotWrite() {
        assertThat(controller.changePassword(request("wrong-password", "new-password", "new-password")).getStatusCode().value()).isEqualTo(400);
        verify(users, never()).update(isNull(), any());
    }
    @Test void invalidConfirmationAndLoggedOutCannotWrite() {
        assertThat(controller.changePassword(request("old-password", "new-password", "different")).getStatusCode().value()).isEqualTo(400);
        SecurityContextHolder.clearContext();
        assertThat(controller.changePassword(request("old-password", "new-password", "new-password")).getStatusCode().value()).isEqualTo(401);
        verify(users, never()).update(isNull(), any());
    }
    @Test void failedDatabaseWriteCannotReturnSuccess() {
        when(users.update(isNull(), any())).thenReturn(0);
        assertThatThrownBy(() -> controller.changePassword(request("old-password", "new-password", "new-password"))).isInstanceOf(IllegalStateException.class);
    }

    @Test void onlyPasswordAndTimestampAreUpdatedWithOldHashCondition() {
        controller.changePassword(request("old-password", "new-password", "new-password"));
        var wrapper = org.mockito.ArgumentCaptor.forClass(com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper.class);
        verify(users).update(isNull(), wrapper.capture());
        assertThat(wrapper.getValue().getSqlSegment()).contains("id", "password");
        assertThat(wrapper.getValue().getSqlSet()).contains("password", "updated").doesNotContain("profile", "name");
        assertThat(wrapper.getValue().getParamNameValuePairs()).containsValue("synthetic-old-hash");
    }
}
