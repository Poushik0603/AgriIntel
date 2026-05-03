package com.agriintel.insight.dto;

public record RankedCropDto(String crop,
                            double score,
                            Double riskScore,
                            String riskLevel,
                            String reason,
                            String limitation) {
    public RankedCropDto(String crop, double score) {
        this(crop, score, null, null, null, null);
    }
}
