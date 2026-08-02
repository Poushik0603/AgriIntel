package com.agriintel.crop.client;

import com.agriintel.crop.dto.ml.MlPredictRequest;
import com.agriintel.crop.dto.ml.MlPredictResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;

@Component
public class MlCropScoringClient {

    private static final Logger log = LoggerFactory.getLogger(MlCropScoringClient.class);

    private final RestTemplate mlRestTemplate;
    private final String baseUrl;

    public MlCropScoringClient(@Qualifier("mlRestTemplate") RestTemplate mlRestTemplate,
                                @Value("${ml.crop-service.base-url}") String baseUrl) {
        this.mlRestTemplate = mlRestTemplate;
        this.baseUrl = baseUrl;
    }

    public Optional<MlPredictResponse> score(double nitrogen,
                                              double phosphorus,
                                              double potassium,
                                              double temperature,
                                              double humidity,
                                              double ph,
                                              double rainfall,
                                              List<String> candidateCrops) {
        try {
            MlPredictRequest request = new MlPredictRequest(
                    nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall, candidateCrops);
            MlPredictResponse response = mlRestTemplate.postForObject(
                    baseUrl + "/predict", request, MlPredictResponse.class);
            return Optional.ofNullable(response);
        } catch (Exception e) {
            log.warn("ML crop scoring unavailable, falling back to rule-based scoring: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
