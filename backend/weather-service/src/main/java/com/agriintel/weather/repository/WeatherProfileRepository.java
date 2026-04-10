package com.agriintel.weather.repository;

import com.agriintel.weather.entity.WeatherProfile;
import org.springframework.stereotype.Repository;

import java.util.Map;

@Repository
public class WeatherProfileRepository {

    private final Map<String, WeatherProfile> weatherProfiles = Map.of(
            "chennai", new WeatherProfile("Chennai", 33.0, 78.0, 220.0),
            "delhi", new WeatherProfile("Delhi", 29.0, 52.0, 90.0),
            "mumbai", new WeatherProfile("Mumbai", 31.0, 80.0, 250.0)
    );

    public WeatherProfile findByCity(String city) {
        return weatherProfiles.getOrDefault(city.toLowerCase(), new WeatherProfile(city, 27.0, 65.0, 140.0));
    }
}
