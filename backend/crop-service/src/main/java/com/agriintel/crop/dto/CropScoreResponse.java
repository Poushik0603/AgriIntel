package com.agriintel.crop.dto;

public record CropScoreResponse(String crop,
                                double score,
                                double riskScore,
                                String riskLevel,
                                String reason,
                                String limitation,
                                String scoringSource) {
}
