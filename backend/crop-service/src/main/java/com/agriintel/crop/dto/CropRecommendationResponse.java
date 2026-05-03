package com.agriintel.crop.dto;

import java.util.List;

public record CropRecommendationResponse(
        String soilType,
        double rainfall,
        double temperature,
        String city,
        List<CropScoreResponse> recommendedCrops,
        SoilSnapshot soilSnapshot,
        String summary
) {
}
