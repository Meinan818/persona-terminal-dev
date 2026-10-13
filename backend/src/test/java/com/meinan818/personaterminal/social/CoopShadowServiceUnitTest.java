package com.meinan818.personaterminal.social;

import com.meinan818.personaterminal.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DuplicateKeyException;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoopShadowServiceUnitTest {
    @Mock CoopShadowMapper shadows;
    @Mock CoopAttackMapper attacks;
    @Mock SocialNotificationMapper notifications;
    @Mock SocialUserService users;
    @Mock CoopBondMapper bonds;
    @InjectMocks CoopShadowService service;
    private AutoCloseable mocks;

    @org.junit.jupiter.api.AfterEach
    void closeMocks() throws Exception { mocks.close(); }

    @BeforeEach
    void setup() {
        mocks = MockitoAnnotations.openMocks(this);
        CoopBond bond = new CoopBond();
        bond.setId("bond"); bond.setUserA("a"); bond.setUserB("b"); bond.setStatus("linked");
        when(bonds.selectById("bond")).thenReturn(bond);
        User partner = new User(); partner.setId("b");
        when(users.requireUser("b")).thenReturn(partner);
    }

    private Map<String, Object> request() {
        return Map.of("id", "shadow", "bondId", "bond", "userAId", "a", "userBId", "b", "hpMax", 200);
    }

    private CoopShadow shadow(String bond, String a, String b) {
        CoopShadow row = new CoopShadow();
        row.setId("shadow"); row.setBondId(bond); row.setUserA(a); row.setUserB(b); row.setStatus("active");
        return row;
    }

    @Test
    void anotherPairsExistingShadowCannotBeReadThroughSpawn() {
        when(shadows.selectById("shadow")).thenReturn(shadow("third-bond", "c", "d"));
        assertThatThrownBy(() -> service.spawn("a", request())).isInstanceOf(SocialException.class);
        verify(shadows, never()).insert(any(CoopShadow.class));
    }

    @Test
    void nonexistentBondCannotCreateShadow() {
        when(bonds.selectById("bond")).thenReturn(null);
        assertThatThrownBy(() -> service.spawn("a", request())).isInstanceOf(SocialException.class);
        verify(shadows, never()).insert(any(CoopShadow.class));
    }

    @Test
    void forgedPartnerCannotCreateShadow() {
        Map<String, Object> forged = new java.util.HashMap<>(request()); forged.put("userBId", "c");
        assertThatThrownBy(() -> service.spawn("a", forged)).isInstanceOf(SocialException.class);
        verify(shadows, never()).insert(any(CoopShadow.class));
    }

    @Test
    void unlinkedBondCannotCreateShadow() {
        for (String status : new String[] { "pending", "severed", "expired", "rejected" }) {
            CoopBond bond = new CoopBond(); bond.setId("bond"); bond.setUserA("a"); bond.setUserB("b"); bond.setStatus(status);
            when(bonds.selectById("bond")).thenReturn(bond);
            assertThatThrownBy(() -> service.spawn("a", request())).isInstanceOf(SocialException.class);
        }
        verify(shadows, never()).insert(any(CoopShadow.class));
    }

    @Test
    void sameOwnersButDifferentBondCannotReadExistingShadow() {
        when(shadows.selectById("shadow")).thenReturn(shadow("other-bond", "a", "b"));
        assertThatThrownBy(() -> service.spawn("a", request())).isInstanceOf(SocialException.class);
    }

    @Test
    void conflictReadbackAlsoChecksOwnership() {
        when(shadows.selectById("shadow")).thenReturn(null, shadow("third-bond", "c", "d"));
        when(shadows.insert(any(CoopShadow.class))).thenThrow(new DuplicateKeyException("synthetic conflict"));
        assertThatThrownBy(() -> service.spawn("a", request())).isInstanceOf(SocialException.class);
    }

    @Test
    void legitimateRetryReturnsExistingShadowWithoutAnotherNotification() {
        when(shadows.selectById("shadow")).thenReturn(shadow("bond", "a", "b"));
        assertThat(service.spawn("a", request())).containsEntry("created", false);
        verify(shadows, never()).insert(any(CoopShadow.class));
        verifyNoInteractions(notifications);
    }

    @Test
    void legitimateLinkedPairCanCreateShadow() {
        assertThat(service.spawn("a", request())).containsEntry("created", true).containsEntry("userAId", "a").containsEntry("userBId", "b");
        verify(shadows).insert(any(CoopShadow.class));
    }

    @Test
    void missingPartnerCannotCreateShadow() {
        when(users.requireUser("b")).thenThrow(new SocialException(org.springframework.http.HttpStatus.NOT_FOUND, "synthetic missing partner"));
        assertThatThrownBy(() -> service.spawn("a", request())).isInstanceOf(SocialException.class);
        verify(shadows, never()).insert(any(CoopShadow.class));
    }
}
