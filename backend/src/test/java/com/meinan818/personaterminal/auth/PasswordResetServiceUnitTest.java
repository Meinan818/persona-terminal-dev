package com.meinan818.personaterminal.auth;

import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 密码重置的行为约定（不连数据库、不发真邮件）：
 * · 身份存在才发信，且信里有一次性链接；
 * · 链接只能用一次，重复提交、乱码令牌、过期令牌都被拒；
 * · 身份不存在时不发信也不报错（不泄露账号是否存在）；
 * · 同一身份有发送冷却。
 */
class PasswordResetServiceUnitTest {

    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    private UserMapper users;
    private PasswordEncoder encoder;
    private JavaMailSender mail;
    private final List<MimeMessage> sent = new ArrayList<>();

    private PasswordResetService service;

    @BeforeEach
    void setup() {
        users = mock(UserMapper.class);
        encoder = mock(PasswordEncoder.class);
        when(encoder.encode(any())).thenAnswer(invocation -> "ENC:" + invocation.getArgument(0));
        mail = mock(JavaMailSender.class);
        sent.clear();
        when(mail.createMimeMessage()).thenAnswer(invocation -> {
            MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
            sent.add(message);
            return message;
        });
        service = new PasswordResetService(users, encoder, mail,
                "sender@example.invalid", "https://maskaria.example.invalid", 30, 60);
    }

    private User existingUser() {
        User user = new User();
        user.setId("u1");
        user.setEmail("alice@example.invalid");
        user.setPassword("old-hash");
        return user;
    }

    private String tokenFromLastMail() throws Exception {
        assertThat(sent).as("应当发出了邮件").isNotEmpty();
        String body = String.valueOf(sent.get(sent.size() - 1).getContent());
        Matcher matcher = TOKEN.matcher(body);
        assertThat(matcher.find()).as("邮件里应当带一次性令牌链接").isTrue();
        assertThat(body).contains("https://maskaria.example.invalid/reset-password");
        return matcher.group(1);
    }

    @Test
    void linkIsSingleUseAndChangesPassword() throws Exception {
        when(users.selectOne(any())).thenReturn(existingUser());
        when(users.selectById("u1")).thenReturn(existingUser());

        service.request("Alice@Example.invalid");   // 大小写与空白都应能匹配
        String token = tokenFromLastMail();

        assertThat(service.reset(token, "new-pw-123456")).isEqualTo("u1");
        verify(users).updateById(argThat(user -> "ENC:new-pw-123456".equals(user.getPassword())));

        // 同一个令牌再用一次 → 拒（一次性）
        assertThatThrownBy(() -> service.reset(token, "another-pw-123"))
                .isInstanceOf(PasswordResetService.InvalidTokenException.class);
    }

    @Test
    void unknownIdentityStaysSilentAndSendsNothing() {
        when(users.selectOne(any())).thenReturn(null);
        assertThatCode(() -> service.request("nobody@example.invalid")).doesNotThrowAnyException();
        verify(mail, never()).send(any(MimeMessage.class));
        assertThat(sent).isEmpty();
    }

    @Test
    void secondRequestInsideCooldownIsRejected() {
        when(users.selectOne(any())).thenReturn(existingUser());
        service.request("alice@example.invalid");
        assertThatThrownBy(() -> service.request("alice@example.invalid"))
                .isInstanceOf(PasswordResetService.CooldownException.class);
    }

    @Test
    void expiredAndGarbageTokensAreRejected() throws Exception {
        when(users.selectOne(any())).thenReturn(existingUser());
        PasswordResetService expiring = new PasswordResetService(users, encoder, mail,
                "sender@example.invalid", "https://maskaria.example.invalid", -1, 0);
        expiring.request("alice@example.invalid");
        String token = tokenFromLastMail();
        assertThatThrownBy(() -> expiring.reset(token, "new-pw-123456"))
                .isInstanceOf(PasswordResetService.InvalidTokenException.class);

        assertThatThrownBy(() -> service.reset("not-a-real-token", "new-pw-123456"))
                .isInstanceOf(PasswordResetService.InvalidTokenException.class);
        assertThatThrownBy(() -> service.reset("  ", "new-pw-123456"))
                .isInstanceOf(PasswordResetService.InvalidTokenException.class);
    }

    @Test
    void mailFailureSurfacesSoCallerCanReportIt() {
        when(users.selectOne(any())).thenReturn(existingUser());
        doThrow(new RuntimeException("smtp down")).when(mail).send(any(MimeMessage.class));
        assertThatThrownBy(() -> service.request("alice@example.invalid"))
                .isInstanceOf(PasswordResetService.MailSendException.class);
    }
}
