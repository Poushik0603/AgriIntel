package com.agriintel.weather.service;

import com.agriintel.weather.dto.WeatherResponse;
import com.agriintel.weather.entity.WeatherProfile;
import com.agriintel.weather.repository.WeatherProfileRepository;
import org.springframework.stereotype.Service;

@Service
public class WeatherService {

    private final WeatherProfileRepository weatherProfileRepository;

    public WeatherService(WeatherProfileRepository weatherProfileRepository) {
        this.weatherProfileRepository = weatherProfileRepository;
    }

    public WeatherResponse getWeather(String city) {
        WeatherProfile profile = weatherProfileRepository.findByCity(city == null ? "Unknown" : city.trim());
        return new WeatherResponse(profile.city(), profile.temperature(), profile.humidity(), profile.rainfall());
    }
}
