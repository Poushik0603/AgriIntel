package com.agriintel.insight.dto;

public record CropRecommendationRequest(
        String soilType,
        Double rainfall,
        Double temperature,
        String city
) {
}
