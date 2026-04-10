package com.agriintel.weather.dto;

public record WeatherResponse(String city, double temperature, double humidity, double rainfall) {
}
