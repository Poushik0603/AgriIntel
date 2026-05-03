package com.agriintel.insight.dto;

import java.util.List;

public record CropRecommendationResponse(
        String soilType,
        double rainfall,
        double temperature,
        String city,
        List<RankedCropDto> recommendedCrops,
        Object soilSnapshot,
        String summary
) {
}
