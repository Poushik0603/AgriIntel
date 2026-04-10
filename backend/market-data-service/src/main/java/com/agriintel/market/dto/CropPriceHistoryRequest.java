package com.agriintel.market.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CropPriceHistoryRequest(
        @NotBlank String cropName,
        @NotNull @DecimalMin("0.0") BigDecimal price,
        @NotBlank String marketName,
        @NotNull LocalDate recordDate
) {
}
