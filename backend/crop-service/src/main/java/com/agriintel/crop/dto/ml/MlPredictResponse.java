package com.agriintel.crop.dto.ml;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record MlPredictResponse(@JsonProperty("model_version") String modelVersion,
                                List<MlCropPrediction> predictions,
                                @JsonProperty("covered_crops") List<String> coveredCrops,
                                @JsonProperty("uncovered_crops") List<String> uncoveredCrops) {
}
