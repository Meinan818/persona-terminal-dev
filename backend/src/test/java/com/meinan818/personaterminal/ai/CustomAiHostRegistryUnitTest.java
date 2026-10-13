package com.meinan818.personaterminal.ai;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class CustomAiHostRegistryUnitTest {
    @Test
    void legacyHostAllowlistCannotGrantArbitraryCredentialSelection() {
        CustomAiHostRegistry registry = new CustomAiHostRegistry(null, key -> "synthetic");
        assertThat(registry.isAllowed("relay.example.invalid")).isFalse();
    }

    @Test
    void exactBasePathUsesOnlyItsDedicatedServerCredential() {
        var registry = new CustomAiHostRegistry("[{\"baseUrl\":\"https://relay.example.invalid/custom/v1\",\"keyRef\":\"CUSTOM_AI_KEY_RELAY\"}]", key -> key.equals("CUSTOM_AI_KEY_RELAY") ? "synthetic" : null);
        var endpoint = registry.resolve("https://relay.example.invalid/custom/v1/", null);
        assertThat(endpoint.baseUrl()).isEqualTo("https://relay.example.invalid/custom/v1");
        assertThat(registry.credential(endpoint)).isEqualTo("synthetic");
        assertThat(registry.resolve("https://relay.example.invalid/wrong/v1", null)).isNull();
        assertThat(registry.resolve(null, "relay.example.invalid")).isEqualTo(endpoint);
    }

    @Test
    void invalidAddressesAndNonAiCredentialReferencesAreRejected() {
        for (String base : new String[] { "http://relay.invalid", "https://name:pw@relay.invalid/v1", "https://relay.invalid/../v1", "https://relay.invalid/v1?query=x", "https://relay.invalid/v1#fragment", "https://relay.invalid/%2e%2e/v1" }) {
            assertThatThrownBy(() -> new CustomAiHostRegistry("[{\"baseUrl\":\"" + base + "\",\"keyRef\":\"CUSTOM_AI_KEY_RELAY\"}]", key -> null)).as("invalid base %s", base).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> new CustomAiHostRegistry("[{\"baseUrl\":\"https://relay.invalid\",\"keyRef\":\"NON_AI_SENTINEL\"}]", key -> null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void ambiguousLegacyHostDoesNotPickAnArbitraryBasePath() {
        var registry = new CustomAiHostRegistry("[{\"baseUrl\":\"https://relay.invalid/a\",\"keyRef\":\"CUSTOM_AI_KEY_A\"},{\"baseUrl\":\"https://relay.invalid/b\",\"keyRef\":\"CUSTOM_AI_KEY_B\"}]", key -> null);
        assertThat(registry.resolve(null, "relay.invalid")).isNull();
    }
}
