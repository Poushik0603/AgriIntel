package com.agriintel.price.dto;

import java.math.BigDecimal;

public record PricePredictionResponse(String crop, String season, BigDecimal basePrice, BigDecimal predictedPrice) {
}
