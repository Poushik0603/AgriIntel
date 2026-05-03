package com.agriintel.insight.dto;

public record WeatherSnapshot(String city,
                              double temperature,
                              double humidity,
                              double rainfall,
                              Double latitude,
                              Double longitude,
                              String source) {
    public WeatherSnapshot(String city, double temperature, double humidity, double rainfall) {
        this(city, temperature, humidity, rainfall, null, null, null);
    }
}
