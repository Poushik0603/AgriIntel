package com.agriintel.insight.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MarketDataRecordDto(
        Long id,
        String cropName,
        BigDecimal price,
        String marketName,
        LocalDate recordDate
) {
}
