package com.agriintel.weather.service;

import com.agriintel.weather.dto.WeatherResponse;
import com.agriintel.weather.entity.WeatherProfile;
import com.agriintel.weather.repository.WeatherProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class WeatherService {

    private final WeatherProfileRepository weatherProfileRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public WeatherService(WeatherProfileRepository weatherProfileRepository) {
        this.weatherProfileRepository = weatherProfileRepository;
    }

    public WeatherResponse getWeather(String city) {
        return getWeather(city, null, null);
    }

    public WeatherResponse getWeather(String city, Double latitude, Double longitude) {
        if (latitude != null && longitude != null) {
            WeatherResponse nasaResponse = fetchNasaPowerWeather(city, latitude, longitude);
            if (nasaResponse != null) {
                return nasaResponse;
            }
        }

        WeatherProfile profile = weatherProfileRepository.findByCity(city == null ? "Unknown" : city.trim());
        return new WeatherResponse(profile.city(), profile.temperature(), profile.humidity(), profile.rainfall(), latitude, longitude, "Seeded profile fallback");
    }

    @SuppressWarnings("unchecked")
    private WeatherResponse fetchNasaPowerWeather(String city, Double latitude, Double longitude) {
        try {
            String date = LocalDate.now().minusDays(2).format(DateTimeFormatter.BASIC_ISO_DATE);
            String url = "https://power.larc.nasa.gov/api/temporal/daily/point"
                    + "?parameters=T2M,RH2M,PRECTOTCORR"
                    + "&community=AG"
                    + "&longitude={longitude}"
                    + "&latitude={latitude}"
                    + "&start={startDate}"
                    + "&end={endDate}"
                    + "&format=JSON";

            Map<String, Object> response = restTemplate.getForObject(url, Map.class, longitude, latitude, date, date);
            if (response == null) {
                return null;
            }

            Map<String, Object> properties = (Map<String, Object>) response.get("properties");
            Map<String, Object> parameter = properties == null ? null : (Map<String, Object>) properties.get("parameter");
            if (parameter == null) {
                return null;
            }

            double temperature = parameterValue(parameter, "T2M", date);
            double humidity = parameterValue(parameter, "RH2M", date);
            double rainfall = parameterValue(parameter, "PRECTOTCORR", date);

            if (temperature <= -900 || humidity <= -900 || rainfall <= -900) {
                return null;
            }

            String resolvedCity = city == null || city.isBlank() ? "Mapped field" : city.trim();
            return new WeatherResponse(resolvedCity, round(temperature), round(humidity), round(rainfall), latitude, longitude, "NASA POWER");
        } catch (Exception ignored) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private double parameterValue(Map<String, Object> parameter, String key, String date) {
        Object values = parameter.get(key);
        if (!(values instanceof Map<?, ?> valueMap)) {
            return -999;
        }
        Object value = ((Map<String, Object>) valueMap).get(date);
        return value instanceof Number number ? number.doubleValue() : -999;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
