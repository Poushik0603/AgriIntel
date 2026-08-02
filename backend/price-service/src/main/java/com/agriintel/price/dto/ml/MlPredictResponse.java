package com.agriintel.price.dto.ml;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record MlPredictResponse(@JsonProperty("model_version") String modelVersion,
                                String crop,
                                @JsonProperty("predicted_price") double predictedPrice,
                                double confidence,
                                @JsonProperty("model_type") String modelType,
                                @JsonProperty("covered_crops") List<String> coveredCrops,
                                @JsonProperty("uncovered_crops") List<String> uncoveredCrops) {
}
