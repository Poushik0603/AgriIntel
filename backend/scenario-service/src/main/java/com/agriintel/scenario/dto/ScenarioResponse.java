package com.agriintel.scenario.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ScenarioResponse(
        Long id,
        Long userId,
        String location,
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
        Double markerY,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
