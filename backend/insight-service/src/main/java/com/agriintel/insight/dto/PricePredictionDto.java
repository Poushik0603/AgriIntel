package com.agriintel.insight.dto;

import java.math.BigDecimal;
import java.util.List;

public record PricePredictionDto(
        String crop,
        String season,
        BigDecimal basePrice,
        BigDecimal predictedPrice,
        BigDecimal yieldEstimate,
        Integer confidence,
        List<String> drivers
) {
    public PricePredictionDto(String crop, String season, BigDecimal basePrice, BigDecimal predictedPrice) {
        this(crop, season, basePrice, predictedPrice, null, null, null);
    }
}
