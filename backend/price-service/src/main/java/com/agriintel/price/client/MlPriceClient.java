package com.agriintel.price.client;

import com.agriintel.price.dto.ml.MlPredictRequest;
import com.agriintel.price.dto.ml.MlPredictResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Optional;

@Component
public class MlPriceClient {

    private static final Logger log = LoggerFactory.getLogger(MlPriceClient.class);

    private final RestTemplate mlRestTemplate;
    private final String baseUrl;

    public MlPriceClient(@Qualifier("mlRestTemplate") RestTemplate mlRestTemplate,
                          @Value("${ml.price-service.base-url}") String baseUrl) {
        this.mlRestTemplate = mlRestTemplate;
        this.baseUrl = baseUrl;
    }

    public Optional<MlPredictResponse> predict(String crop, String marketName, LocalDate targetDate) {
        try {
            MlPredictRequest request = new MlPredictRequest(crop, marketName, targetDate);
            MlPredictResponse response = mlRestTemplate.postForObject(
                    baseUrl + "/predict", request, MlPredictResponse.class);
            return Optional.ofNullable(response);
        } catch (Exception e) {
            log.warn("ML price prediction unavailable, falling back to rule-based prediction: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
