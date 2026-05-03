package com.agriintel.insight.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.util.List;

public record AnalysisRequest(
        @NotBlank String city,
        @NotEmpty List<String> selectedCrops,
        @NotBlank String soilType,
        BigDecimal discountFactor
) {
}
