package com.agriintel.insight.dto;

import java.util.List;

public record AnalysisResponse(
        WeatherSnapshot weather,
        List<RankedCropDto> recommendedCrops,
        List<SelectedCropAnalysisDto> selectedCropAnalysis,
        RiskLevel riskLevel,
        ProfitabilityLevel profitability,
        List<String> insights,
        List<CropComparisonDto> comparison
) {
}
