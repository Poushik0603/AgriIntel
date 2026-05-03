package com.agriintel.insight.dto;

import java.math.BigDecimal;

public record CropComparisonDto(
        String crop,
        double recommendationScore,
        BigDecimal predictedPrice,
        BigDecimal averageMarketPrice,
        ProfitabilityLevel profitability,
        RiskLevel riskLevel
) {
}
