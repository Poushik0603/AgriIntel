package com.agriintel.crop.dto;

public record WeatherResponse(String city,
                              double temperature,
                              double humidity,
                              double rainfall,
                              Double latitude,
                              Double longitude,
                              String source) {
}
