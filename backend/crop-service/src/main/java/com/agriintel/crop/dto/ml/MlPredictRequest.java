package com.agriintel.crop.dto.ml;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record MlPredictRequest(double nitrogen,
                               double phosphorus,
                               double potassium,
                               double temperature,
                               double humidity,
                               double ph,
                               double rainfall,
                               @JsonProperty("candidate_crops") List<String> candidateCrops) {
}
