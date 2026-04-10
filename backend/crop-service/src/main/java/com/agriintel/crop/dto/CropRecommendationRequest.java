package com.agriintel.crop.dto;

import jakarta.validation.constraints.NotBlank;

public record CropRecommendationRequest(
        @NotBlank String soilType,
        Double rainfall,
        Double temperature,
        String city
) {
}
