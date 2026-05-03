package com.agriintel.insight.dto;

import java.math.BigDecimal;

public record SelectedCropAnalysisDto(
        String crop,
        BigDecimal predictedPrice,
        BigDecimal averageMarketPrice,
        BigDecimal spread,
        RiskLevel riskLevel,
        ProfitabilityLevel profitability,
        String recommendationFit
) {
}
