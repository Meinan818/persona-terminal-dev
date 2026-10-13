package com.meinan818.personaterminal.user;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 账号注销（App 内必须能注销）：
 *   DELETE /api/velvet/account → 200 {ok:true}
 *
 * 删除本人及其名下数据；本机数据不动（本地优先应用，注销云端 ≠ 清空本地）。
 * 幂等：已经不存在的用户回 200 {ok:true, alreadyGone:true}。
 */
@RestController
@RequiredArgsConstructor
public class AccountController {

    private final AccountDeletionService service;

    @DeleteMapping("/api/velvet/account")
    public ResponseEntity<?> delete() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal principal)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        boolean removed = service.deleteAccount(principal.userId());
        return ResponseEntity.ok(Map.of("ok", true, "alreadyGone", !removed));
    }
}
