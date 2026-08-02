package com.agriintel.price.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    @Bean
    @Qualifier("mlRestTemplate")
    public RestTemplate mlRestTemplate(
            RestTemplateBuilder builder,
            @Value("${ml.price-service.connect-timeout-ms}") long connectTimeoutMs,
            @Value("${ml.price-service.read-timeout-ms}") long readTimeoutMs) {
        return builder
                .setConnectTimeout(Duration.ofMillis(connectTimeoutMs))
                .setReadTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
    }
}
