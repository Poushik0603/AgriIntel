package com.agriintel.price.dto.ml;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

public record MlPredictRequest(String crop,
                               @JsonProperty("market_name") String marketName,
                               @JsonProperty("target_date") LocalDate targetDate) {
}
