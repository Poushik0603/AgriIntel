package com.agriintel.weather.dto;

public record WeatherResponse(String city,
                              double temperature,
                              double humidity,
                              double rainfall,
                              Double latitude,
                              Double longitude,
                              String source) {
    public WeatherResponse(String city, double temperature, double humidity, double rainfall) {
        this(city, temperature, humidity, rainfall, null, null, "Seeded profile");
    }
}
