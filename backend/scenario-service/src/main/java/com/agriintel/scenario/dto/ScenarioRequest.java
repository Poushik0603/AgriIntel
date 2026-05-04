package com.agriintel.scenario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ScenarioRequest(
        @NotNull Long userId,
        @NotBlank String location,
        String title,
        String status,
        String riskSnapshot,
        List<String> selectedCrops,
        List<String> recommendedCrops,
        List<String> insights,
        String reportNotes,
        Double latitude,
        Double longitude,
        Double markerX,
        Double markerY
) {
}
