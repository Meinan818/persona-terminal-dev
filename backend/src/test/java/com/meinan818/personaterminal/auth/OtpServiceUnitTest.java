package com.meinan818.personaterminal.auth;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OtpServiceUnitTest {
    private OtpService service;

    @BeforeEach
    void setup() {
        JavaMailSender mail = mock(JavaMailSender.class);
        when(mail.createMimeMessage()).thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));
        service = new OtpService(mail, "sender@example.invalid", 10, 60);
    }

    @SuppressWarnings("unchecked")
    private String sendCode(String email) {
        service.send(email);
        Map<String, Object> store = (Map<String, Object>) ReflectionTestUtils.getField(service, "store");
        return (String) ReflectionTestUtils.invokeMethod(store.get(email), "code");
    }

    @Test
    @SuppressWarnings("unchecked")
    void concurrentVerifyConsumesCodeOnlyOnce() throws Exception {
        String email = "test@example.invalid";
        String code = sendCode(email);
        Map<String, Object> old = (Map<String, Object>) ReflectionTestUtils.getField(service, "store");
        CyclicBarrier barrier = new CyclicBarrier(2);
        Map<String, Object> simultaneousRead = new ConcurrentHashMap<>() {
            @Override public Object get(Object key) {
                Object value = super.get(key);
                try { barrier.await(5, TimeUnit.SECONDS); } catch (Exception error) { throw new AssertionError(error); }
                return value;
            }
        };
        simultaneousRead.putAll(old);
        ReflectionTestUtils.setField(service, "store", simultaneousRead);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> service.verify(email, code));
            var second = executor.submit(() -> service.verify(email, code));
            int successes = (first.get(10, TimeUnit.SECONDS) ? 1 : 0) + (second.get(10, TimeUnit.SECONDS) ? 1 : 0);
            assertThat(successes).isEqualTo(1);
        } finally { executor.shutdownNow(); }
    }

    @Test
    void wrongCodeDoesNotConsumeValidCode() {
        String code = sendCode("test@example.invalid");
        String wrong = code.equals("000000") ? "999999" : "000000";
        assertThat(service.verify("test@example.invalid", wrong)).isFalse();
        assertThat(service.verify("test@example.invalid", code)).isTrue();
        assertThat(service.verify("test@example.invalid", code)).isFalse();
    }

    @Test
    void differentUsersAreIndependent() {
        String first = sendCode("first@example.invalid");
        String second = sendCode("second@example.invalid");
        assertThat(service.verify("first@example.invalid", first)).isTrue();
        assertThat(service.verify("second@example.invalid", second)).isTrue();
    }

    @Test
    void expiredCodeCannotBeConsumed() {
        JavaMailSender mail = mock(JavaMailSender.class);
        when(mail.createMimeMessage()).thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));
        service = new OtpService(mail, "sender@example.invalid", -1, 0);
        String code = sendCode("test@example.invalid");
        assertThat(service.verify("test@example.invalid", code)).isFalse();
    }

    @Test
    void nullInputFailsWithoutThrowing() {
        assertThat(service.verify(null, "123456")).isFalse();
        assertThat(service.verify("test@example.invalid", null)).isFalse();
    }
}
