package com.meinan818.personaterminal.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import com.meinan818.personaterminal.user.UserMapper;
import com.meinan818.personaterminal.user.User;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtUtil.parse(header.substring(7));
                User user = userMapper.selectById(claims.getSubject());
                String version = claims.get("credentialVersion", String.class);
                if (user == null || version == null || !Objects.equals(version, JwtUtil.credentialVersion(user.getPassword()))) {
                    SecurityContextHolder.clearContext();
                } else {
                    UserIdPrincipal principal = new UserIdPrincipal(claims.getSubject());
                    var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
                // 无效 token 一律视为未认证，由 SecurityConfig 兜底返回 401
            }
        }
        chain.doFilter(request, response);
    }

    public record UserIdPrincipal(String userId) {}
}
