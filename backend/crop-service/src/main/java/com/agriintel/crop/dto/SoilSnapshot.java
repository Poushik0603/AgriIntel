package com.agriintel.crop.dto;

public record SoilSnapshot(double ph,
                           double moisture,
                           double nitrogen,
                           double phosphorus,
                           double potassium,
                           String source) {
}
