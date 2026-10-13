package com.meinan818.personaterminal.user;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.meinan818.personaterminal.security.JwtAuthFilter;
import com.meinan818.personaterminal.security.JwtUtil;
import com.meinan818.personaterminal.sync.SyncController;
import com.meinan818.personaterminal.sync.UserDataMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class UserIdPolicyUnitTest {
    private UserMapper users;
    private AuthController auth;
    private MeController me;
    private SyncController sync;
    private User current;

    @BeforeEach
    void setup() {
        users = mock(UserMapper.class);
        PasswordEncoder passwords = mock(PasswordEncoder.class);
        when(passwords.encode(anyString())).thenReturn("synthetic-hash");
        auth = new AuthController(users, passwords, mock(JwtUtil.class));
        me = new MeController(users);
        sync = new SyncController(mock(UserDataMapper.class), users);
        current = new User(); current.setId("me"); current.setName("original"); current.setEmail("test@example.invalid");
        when(users.selectById("me")).thenReturn(current);
        when(users.selectCount(any())).thenReturn(0L);
        when(users.insert(any(User.class))).thenAnswer(invocation -> { ((User) invocation.getArgument(0)).setId("created"); return 1; });
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new JwtAuthFilter.UserIdPrincipal("me"), null, List.of()));
    }

    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    private AuthController.RegisterReq registration(String name) {
        var request = new AuthController.RegisterReq(); request.setEmail("new@example.invalid"); request.setPassword("synthetic-password"); request.setName(name); return request;
    }

    private int status(Supplier<ResponseEntity<?>> action) {
        try { return action.get().getStatusCode().value(); }
        catch (ResponseStatusException error) { return error.getStatusCode().value(); }
    }

    @Test
    void allWriteRoutesRejectTakenUserId() {
        when(users.selectCount(any())).thenAnswer(invocation -> {
            QueryWrapper<?> query = invocation.getArgument(0);
            return query.getSqlSegment().contains("email") ? 0L : 1L;
        });
        assertThat(status(() -> auth.register(registration("taken")))).isEqualTo(409);
        assertThat(status(() -> me.updateProfile(Map.of("username", "taken")))).isEqualTo(409);
        assertThat(status(() -> sync.updateProfile(Map.of("username", "taken")))).isEqualTo(409);
        verify(users, never()).insert(any(User.class)); verify(users, never()).updateById(any(User.class));
    }

    @Test
    void allWriteRoutesNormalizeCaseAndWhitespace() {
        assertThat(status(() -> auth.register(registration(" MiXeD ")))).isEqualTo(200);
        var registered = org.mockito.ArgumentCaptor.forClass(User.class); verify(users).insert(registered.capture());
        assertThat(registered.getValue().getName()).isEqualTo("mixed");
        assertThat(status(() -> me.updateProfile(Map.of("username", " MiXeD ")))).isEqualTo(200);
        assertThat(current.getName()).isEqualTo("mixed");
        assertThat(status(() -> sync.updateProfile(Map.of("username", " NeW.Name ")))).isEqualTo(200);
        assertThat(current.getName()).isEqualTo("new.name");
    }

    @Test
    void allWriteRoutesRejectInvalidFormat() {
        for (String name : List.of("", "ab", "has space", "x".repeat(19), "用户名字")) {
            assertThat(status(() -> auth.register(registration(name)))).isEqualTo(400);
            assertThat(status(() -> me.updateProfile(Map.of("username", name)))).isEqualTo(400);
            assertThat(status(() -> sync.updateProfile(Map.of("username", name)))).isEqualTo(400);
        }
    }

    @Test
    void nullOrNonStringNameCannotClearUserId() {
        Map<String, Object> nullName = new java.util.HashMap<>(); nullName.put("username", null);
        assertThat(status(() -> me.updateProfile(nullName))).isEqualTo(400);
        assertThat(status(() -> sync.updateProfile(nullName))).isEqualTo(400);
        assertThat(status(() -> sync.updateProfile(Map.of("username", Map.of("forged", "value"))))).isEqualTo(400);
        assertThat(current.getName()).isEqualTo("original");
    }

    @Test
    void profileWithoutUserIdKeepsLegacyName() {
        current.setName("Legacy Display Name");
        assertThat(status(() -> me.updateProfile(Map.of("nickname", "Public nickname")))).isEqualTo(200);
        assertThat(status(() -> sync.updateProfile(Map.of("nickname", "Public nickname")))).isEqualTo(200);
        assertThat(current.getName()).isEqualTo("Legacy Display Name");
    }

    @Test
    void automaticNameAvoidsExistingEmailPrefixAndInvalidFormat() {
        when(users.selectCount(any())).thenAnswer(invocation -> {
            QueryWrapper<?> query = invocation.getArgument(0);
            query.getSqlSegment(); // 与真实 Mapper 渲染一致；apply 的参数延迟生成。
            return query.getParamNameValuePairs().containsValue("taken") ? 1L : 0L;
        });
        String generated = UserIdPolicy.create(users, null, "taken@example.invalid", name -> name);
        assertThat(generated).isNotEqualTo("taken").matches("[a-z0-9][a-z0-9._-]{1,16}[a-z0-9]");
        String invalidFallback = UserIdPolicy.create(users, null, "x+invalid@example.invalid", name -> name);
        assertThat(invalidFallback).matches("[a-z0-9][a-z0-9._-]{1,16}[a-z0-9]");
    }

    @Test
    void ownNameRemainsIdempotentAndQueryExcludesOwnRow() {
        assertThat(status(() -> me.updateProfile(Map.of("username", "original")))).isEqualTo(200);
        var query = org.mockito.ArgumentCaptor.forClass(QueryWrapper.class);
        verify(users).selectCount(query.capture());
        assertThat(query.getValue().getSqlSegment()).contains("LOWER(TRIM(name))", "id <>");
        assertThat(query.getValue().getParamNameValuePairs()).containsValue("me");
    }

    @Test
    void concurrentRegistrationChecksAndWritesTogetherInOneApplicationInstance() throws Exception {
        java.util.Set<String> saved = java.util.concurrent.ConcurrentHashMap.newKeySet();
        when(users.selectCount(any())).thenAnswer(invocation -> {
            QueryWrapper<?> query = invocation.getArgument(0);
            if (query.getSqlSegment().contains("email")) return 0L;
            return query.getParamNameValuePairs().values().stream().anyMatch(saved::contains) ? 1L : 0L;
        });
        when(users.insert(any(User.class))).thenAnswer(invocation -> { User user = invocation.getArgument(0); Thread.sleep(20); saved.add(user.getName()); user.setId("synthetic"); return 1; });
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> status(() -> auth.register(registration("same-name"))));
            var second = executor.submit(() -> status(() -> auth.register(registration("same-name"))));
            assertThat(List.of(first.get(5, java.util.concurrent.TimeUnit.SECONDS), second.get(5, java.util.concurrent.TimeUnit.SECONDS))).containsExactlyInAnyOrder(200, 409);
        } finally { executor.shutdownNow(); }
    }

    @Test
    void registrationIncludesCanonicalUsernameAlongsideName() {
        ResponseEntity<?> response = auth.register(registration("new-user"));
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(((Map<?, ?>) body.get("record")).get("username")).isEqualTo("new-user");
    }

    @Test
    void passwordLoginOtpAndMeReturnSamePublicProfileFields() {
        current.setPassword("synthetic-hash"); current.setProfile("{\"nickname\":\"Public name\",\"total_lv\":5}");
        when(users.selectOne(any())).thenReturn(current);
        PasswordEncoder passwords = mock(PasswordEncoder.class);
        when(passwords.matches(anyString(), anyString())).thenReturn(true);
        JwtUtil jwt = mock(JwtUtil.class); when(jwt.generate(anyString(), anyString(), anyString())).thenReturn("synthetic");
        var login = new AuthController.LoginReq(); login.setIdentity(current.getEmail()); login.setPassword("synthetic");
        ResponseEntity<?> passwordResult = new AuthController(users, passwords, jwt).authWithPassword(login);
        var otpService = mock(com.meinan818.personaterminal.auth.OtpService.class); when(otpService.verify(anyString(), anyString())).thenReturn(true);
        var request = new com.meinan818.personaterminal.auth.OtpAuthController.VerifyReq(); request.setEmail(current.getEmail()); request.setCode("123456");
        ResponseEntity<?> otpResult = new com.meinan818.personaterminal.auth.OtpAuthController(otpService, users, passwords, jwt).verify(request);
        Map<?, ?> passwordRecord = (Map<?, ?>) ((Map<?, ?>) passwordResult.getBody()).get("record");
        Map<?, ?> otpRecord = (Map<?, ?>) ((Map<?, ?>) otpResult.getBody()).get("record");
        for (Map<?, ?> record : List.of(passwordRecord, otpRecord, (Map<?, ?>) me.me().getBody())) {
            assertThat(record.get("username")).isEqualTo("original");
            assertThat(record.get("name")).isEqualTo("original");
            assertThat(record.get("nickname")).isEqualTo("Public name");
            assertThat(record.get("total_lv")).isEqualTo(5);
        }
    }

    @Test void profileWriteDoesNotRestoreAnOldPasswordHash() {
        current.setPassword("synthetic-old-hash");
        me.updateProfile(Map.of("nickname", "Updated"));
        sync.updateProfile(Map.of("nickname", "Updated again"));
        var changes = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users, times(2)).updateById(changes.capture());
        assertThat(changes.getAllValues()).allSatisfy(user -> assertThat(user.getPassword()).isNull());
    }
}
