package com.agriintel.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CropPriceHistoryResponse(Long id, String cropName, BigDecimal price, String marketName, LocalDate recordDate) {
}
