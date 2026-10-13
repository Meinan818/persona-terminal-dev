package com.meinan818.personaterminal.ai;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiProxyUnitTest {
    private AiProxyController controller;
    private HttpClient http;
    private MockHttpServletRequest request;

    @BeforeEach
    void setup() {
        var registry = new CustomAiHostRegistry("[{\"baseUrl\":\"https://relay.example.invalid/custom/v1\",\"keyRef\":\"CUSTOM_AI_KEY_RELAY\"}]", key -> "synthetic-upstream");
        controller = new AiProxyController(registry); http = mock(HttpClient.class);
        ReflectionTestUtils.setField(controller, "http", http);
        request = new MockHttpServletRequest(); request.addHeader("X-Upstream-Provider", "custom");
        request.addHeader("X-Upstream-Base-Url", "https://relay.example.invalid/custom/v1");
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new JwtAuthFilter.UserIdPrincipal("synthetic"), null, List.of()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @SuppressWarnings("unchecked")
    private void response(String contentType, int status) throws Exception {
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn("synthetic-body".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        when(response.headers()).thenReturn(HttpHeaders.of(contentType == null ? Map.of() : Map.of("Content-Type", List.of(contentType)), (a, b) -> true));
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
    }

    @Test
    void successfulJsonKeepsStatusAndRegisteredPrefix() throws Exception {
        response("application/json", 200);
        var result = controller.chat("{}".getBytes(), request);
        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getHeaders().getContentType().toString()).isEqualTo("application/json");
        var sent = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(sent.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(sent.getValue().uri().toString()).isEqualTo("https://relay.example.invalid/custom/v1/chat/completions");
        assertThat(sent.getValue().headers().firstValue("Authorization")).hasValue("Bearer synthetic-upstream");
    }

    @Test
    void sseMediaTypeAndUpstreamErrorStatusesArePreserved() throws Exception {
        response("text/event-stream", 200);
        assertThat(controller.chat("{}".getBytes(), request).getHeaders().getContentType().toString()).isEqualTo("text/event-stream");
        response("application/json", 429);
        assertThat(controller.chat("{}".getBytes(), request).getStatusCode().value()).isEqualTo(429);
    }

    @Test
    void missingContentTypeUsesJsonAndInvalidTypeReportsGatewayError() throws Exception {
        response(null, 200); assertThat(controller.chat("{}".getBytes(), request).getStatusCode().value()).isEqualTo(200);
        response("bad-content-type", 200); assertThat(controller.chat("{}".getBytes(), request).getStatusCode().value()).isEqualTo(502);
    }

    @Test
    void clientCannotChooseNonAiEnvironmentVariable() {
        request.addHeader("X-Upstream-Key-Ref", "NON_AI_SENTINEL");
        assertThat(controller.chat("{}".getBytes(), request).getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(http);
    }

    @Test
    void unknownAddressAndLoggedOutRequestNeverReachUpstream() {
        request.removeHeader("X-Upstream-Base-Url"); request.addHeader("X-Upstream-Base-Url", "http://unregistered.invalid/v1");
        assertThat(controller.chat("{}".getBytes(), request).getStatusCode().value()).isEqualTo(400);
        SecurityContextHolder.clearContext(); assertThat(controller.chat("{}".getBytes(), request).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(http);
    }

    @Test
    void anthropicDoesNotDuplicateRegisteredV1Suffix() throws Exception {
        response("application/json", 200);
        controller.messages("{}".getBytes(), request);
        var sent = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(sent.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(sent.getValue().uri().toString()).isEqualTo("https://relay.example.invalid/custom/v1/messages");
    }

    @Test
    void unsupportedProviderReturnsParsableJson() throws Exception {
        MockHttpServletRequest bad = new MockHttpServletRequest();
        bad.addHeader("X-Upstream-Provider", "not-a-provider");
        var result = controller.chat("{}".getBytes(), bad);
        assertThat(result.getStatusCode().value()).isEqualTo(400);
        String body = new String(result.getBody(), java.nio.charset.StandardCharsets.UTF_8);
        // 修前这里是手工拼串，拼出 {"message":"不支持的服务商: " + "not-a-provider"}，JSON 解析必失败
        assertThatCode(() -> new com.fasterxml.jackson.databind.ObjectMapper().readTree(body))
                .as("错误体必须是合法 JSON").doesNotThrowAnyException();
        assertThat(new com.fasterxml.jackson.databind.ObjectMapper().readTree(body).path("message").asText())
                .isEqualTo("不支持的服务商: not-a-provider");
    }
}
