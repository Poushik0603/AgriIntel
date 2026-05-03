package com.agriintel.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MarketTrendSummaryResponse(
        String crop,
        LocalDate fromDate,
        LocalDate toDate,
        long totalRecords,
        BigDecimal averagePrice,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        BigDecimal latestPrice
) {
}
