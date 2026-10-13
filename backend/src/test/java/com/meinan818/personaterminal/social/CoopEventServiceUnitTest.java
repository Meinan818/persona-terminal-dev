package com.meinan818.personaterminal.social;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoopEventServiceUnitTest {
    private CoopBondMapper bonds;
    private SocialNotificationMapper notifications;
    private CoopEventService service;
    private final Map<String, SocialNotification> rows = new ConcurrentHashMap<>();
    @BeforeEach void setup() {
        rows.clear(); bonds = mock(CoopBondMapper.class); notifications = mock(SocialNotificationMapper.class);
        service = new CoopEventService(bonds, notifications);
        CoopBond bond = new CoopBond(); bond.setId("bond"); bond.setUserA("a"); bond.setUserB("b"); bond.setStatus("linked");
        when(bonds.selectOne(any())).thenReturn(bond);
        when(notifications.selectById(anyString())).thenAnswer(invocation -> rows.get((String) invocation.getArgument(0)));
        when(notifications.insert(any(SocialNotification.class))).thenAnswer(invocation -> {
            SocialNotification row = invocation.getArgument(0);
            if (rows.putIfAbsent(row.getId(), row) != null) throw new DuplicateKeyException("synthetic duplicate");
            return 1;
        });
    }
    private Map<String, Object> request() { return Map.of("recipientId", "b", "eventId", "event-a", "date", "2026-10-13", "delta", 2, "userInput", "synthetic event"); }
    @Test void legitimateBroadcastReachesOnlyPartnerAndRetriesDoNotDuplicate() {
        var first = service.broadcast("a", request()); assertThat(first).containsEntry("created", true);
        assertThat(service.broadcast("a", request())).containsEntry("created", false); assertThat(rows).hasSize(1);
        SocialNotification row = rows.values().iterator().next();
        assertThat(row.getReceiver()).isEqualTo("b"); assertThat(row.getPayload()).contains("\"event_id\":\"event-a\"", "\"from_id\":\"a\"");
        // 使用同一通知读取服务核对接收账号与事件形状。
        when(notifications.selectList(any())).thenReturn(java.util.List.of(row));
        var reader = new NotificationService(notifications, mock(SocialUserService.class));
        assertThat(reader.listFor("b").get(0)).containsEntry("userId", "b").containsEntry("fromId", "a");
    }
    @Test void fakeOrSeveredRelationshipNeverCreatesNotification() {
        when(bonds.selectOne(any())).thenReturn(null);
        assertThatThrownBy(() -> service.broadcast("a", request())).isInstanceOf(SocialException.class);
        verify(notifications, never()).insert(any(SocialNotification.class));
    }
    @Test void thirdPartyCannotForgeSenderOrRecipient() {
        assertThatThrownBy(() -> service.broadcast("c", request())).isInstanceOf(SocialException.class);
        verify(notifications, never()).insert(any(SocialNotification.class));
    }
    @Test void invalidDeltaAndDateAreRejected() {
        var input = new java.util.HashMap<>(request()); input.put("delta", 999);
        assertThatThrownBy(() -> service.broadcast("a", input)).isInstanceOf(SocialException.class);
        input.put("delta", 2); input.put("date", "invalid");
        assertThatThrownBy(() -> service.broadcast("a", input)).isInstanceOf(SocialException.class);
    }
    @Test void concurrentDuplicateInsertReadsBackOnlySameEvent() throws Exception {
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> service.broadcast("a", request()));
            var second = executor.submit(() -> service.broadcast("a", request()));
            first.get(5, java.util.concurrent.TimeUnit.SECONDS); second.get(5, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(rows).hasSize(1);
        } finally { executor.shutdownNow(); }
    }
    @Test void persistenceFailureIsNotReportedAsDelivered() {
        when(notifications.insert(any(SocialNotification.class))).thenReturn(0);
        assertThatThrownBy(() -> service.broadcast("a", request())).isInstanceOf(IllegalStateException.class);
    }
}
