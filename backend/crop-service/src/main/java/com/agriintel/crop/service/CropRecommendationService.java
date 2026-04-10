package com.agriintel.crop.service;

import com.agriintel.crop.dto.CropRecommendationRequest;
import com.agriintel.crop.dto.CropRecommendationResponse;
import com.agriintel.crop.dto.WeatherResponse;
import com.agriintel.crop.entity.CropRecommendationAudit;
import com.agriintel.crop.repository.CropRecommendationAuditRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CropRecommendationService {

    private final RestTemplate restTemplate;
    private final CropRecommendationAuditRepository auditRepository;

    public CropRecommendationService(RestTemplate restTemplate, CropRecommendationAuditRepository auditRepository) {
        this.restTemplate = restTemplate;
        this.auditRepository = auditRepository;
    }

    public CropRecommendationResponse recommend(CropRecommendationRequest request) {
        double rainfall = request.rainfall() == null ? 0 : request.rainfall();
        double temperature = request.temperature() == null ? 0 : request.temperature();

        if ((request.rainfall() == null || request.temperature() == null) && request.city() != null && !request.city().isBlank()) {
            WeatherResponse weather = restTemplate.getForObject(
                    "http://weather-service/weather?city={city}",
                    WeatherResponse.class,
                    request.city()
            );
            if (weather != null) {
                rainfall = request.rainfall() != null ? request.rainfall() : weather.rainfall();
                temperature = request.temperature() != null ? request.temperature() : weather.temperature();
            }
        }

        List<String> crops;
        if (rainfall > 200) {
            crops = List.of("Rice");
        } else if (temperature > 30) {
            crops = List.of("Millet");
        } else {
            crops = List.of("Wheat");
        }

        CropRecommendationAudit audit = new CropRecommendationAudit();
        audit.setSoilType(request.soilType());
        audit.setRainfall(rainfall);
        audit.setTemperature(temperature);
        audit.setCity(request.city());
        audit.setRecommendedCrop(crops.getFirst());
        audit.setCreatedAt(LocalDateTime.now());
        auditRepository.save(audit);

        return new CropRecommendationResponse(request.soilType(), rainfall, temperature, request.city(), crops);
    }
}
