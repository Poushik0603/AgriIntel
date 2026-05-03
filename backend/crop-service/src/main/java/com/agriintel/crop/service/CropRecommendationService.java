package com.agriintel.crop.service;

import com.agriintel.crop.dto.CropRecommendationRequest;
import com.agriintel.crop.dto.CropRecommendationResponse;
import com.agriintel.crop.dto.CropScoreResponse;
import com.agriintel.crop.dto.SoilSnapshot;
import com.agriintel.crop.dto.WeatherResponse;
import com.agriintel.crop.entity.CropRecommendationAudit;
import com.agriintel.crop.repository.CropRecommendationAuditRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CropRecommendationService {

    private final RestTemplate restTemplate;
    private final RestTemplate externalRestTemplate = new RestTemplate();
    private final CropRecommendationAuditRepository auditRepository;

    public CropRecommendationService(RestTemplate restTemplate, CropRecommendationAuditRepository auditRepository) {
        this.restTemplate = restTemplate;
        this.auditRepository = auditRepository;
    }

    public CropRecommendationResponse recommend(CropRecommendationRequest request) {
        double rainfall = request.rainfall() == null ? 0 : request.rainfall();
        double temperature = request.temperature() == null ? 0 : request.temperature();

        if ((request.rainfall() == null || request.temperature() == null) && request.city() != null && !request.city().isBlank()) {
            WeatherResponse weather = restTemplate.getForObject(
                    "http://weather-service/weather?city={city}",
                    WeatherResponse.class,
                    request.city()
            );
            if (weather != null) {
                rainfall = request.rainfall() != null ? request.rainfall() : weather.rainfall();
                temperature = request.temperature() != null ? request.temperature() : weather.temperature();
            }
        }

        SoilSnapshot soilSnapshot = buildSoilSnapshot(request, rainfall, temperature);

        double enrichedRainfall = rainfall;
        double enrichedTemperature = temperature;

        List<CropScoreResponse> rankedCrops = List.of("Rice", "Millet", "Wheat", "Cotton", "Maize", "Sorghum", "Groundnut")
                .stream()
                .map(crop -> scoreCrop(crop, enrichedRainfall, enrichedTemperature, request.soilType(), soilSnapshot))
                .sorted(Comparator.comparingDouble(CropScoreResponse::score).reversed())
                .toList();

        rankedCrops = addRelativeLimitations(rankedCrops);

        CropRecommendationAudit audit = new CropRecommendationAudit();
        audit.setSoilType(request.soilType());
        audit.setRainfall(rainfall);
        audit.setTemperature(temperature);
        audit.setCity(request.city());
        audit.setRecommendedCrop(rankedCrops.getFirst().crop());
        audit.setCreatedAt(LocalDateTime.now());
        auditRepository.save(audit);

        String summary = "Recommendations sorted by climate fit, soil composition, estimated NPK, and risk exposure.";
        return new CropRecommendationResponse(request.soilType(), rainfall, temperature, request.city(), rankedCrops, soilSnapshot, summary);
    }

    private CropScoreResponse scoreCrop(String crop, double rainfall, double temperature, String soilType, SoilSnapshot soil) {
        CropProfile profile = profileFor(crop);
        double climateFit = (rangeFit(temperature, profile.minTemperature(), profile.maxTemperature())
                + rangeFit(rainfall, profile.minRainfall(), profile.maxRainfall())) / 2.0;
        double soilFit = (rangeFit(soil.ph(), profile.minPh(), profile.maxPh())
                + rangeFit(soil.moisture(), profile.minMoisture(), profile.maxMoisture())) / 2.0;
        double nutrientFit = (rangeFit(soil.nitrogen(), profile.minNitrogen(), profile.maxNitrogen())
                + rangeFit(soil.phosphorus(), profile.minPhosphorus(), profile.maxPhosphorus())
                + rangeFit(soil.potassium(), profile.minPotassium(), profile.maxPotassium())) / 3.0;

        double soilTypeBonus = soilTypeBonus(crop, soilType);
        double score = roundScore(0.38 + climateFit * 0.26 + soilFit * 0.18 + nutrientFit * 0.14 + soilTypeBonus);
        score = Math.min(0.98, Math.max(0.35, score));

        double climatePenalty = Math.max(0, Math.abs(temperature - profile.idealTemperature()) / 50.0)
                + Math.max(0, Math.abs(rainfall - profile.idealRainfall()) / 800.0);
        double riskScore = Math.min(0.92, Math.max(0.08, roundScore((1 - score) + climatePenalty)));
        String riskLevel = riskScore < 0.28 ? "LOW" : riskScore < 0.55 ? "MEDIUM" : "HIGH";

        String reason = crop + " aligns with "
                + Math.round(climateFit * 100) + "% climate fit, "
                + Math.round(soilFit * 100) + "% soil fit, and "
                + Math.round(nutrientFit * 100) + "% nutrient fit.";

        return new CropScoreResponse(crop, score, riskScore, riskLevel, reason, "");
    }

    private List<CropScoreResponse> addRelativeLimitations(List<CropScoreResponse> rankedCrops) {
        if (rankedCrops.isEmpty()) {
            return rankedCrops;
        }

        double topScore = rankedCrops.getFirst().score();
        List<CropScoreResponse> adjusted = new ArrayList<>();
        for (int index = 0; index < rankedCrops.size(); index++) {
            CropScoreResponse crop = rankedCrops.get(index);
            String limitation = index == 0
                    ? "Best current option because it has the strongest combined field score."
                    : "Not the best option because it trails the leader by "
                    + Math.round((topScore - crop.score()) * 100)
                    + " points across climate, soil, or nutrient fit.";
            adjusted.add(new CropScoreResponse(
                    crop.crop(),
                    crop.score(),
                    crop.riskScore(),
                    crop.riskLevel(),
                    crop.reason(),
                    limitation
            ));
        }
        return adjusted;
    }

    private SoilSnapshot buildSoilSnapshot(CropRecommendationRequest request, double rainfall, double temperature) {
        PartialSoilGrid soilGrid = fetchSoilGrid(request.latitude(), request.longitude());

        double ph = firstPresent(request.soilPh(), soilGrid.ph(), estimatePh(request.soilType(), rainfall));
        double moisture = firstPresent(request.moisture(), null, clamp(rainfall / 4.0, 24, 88));
        double nitrogen = firstPresent(request.nitrogen(), soilGrid.nitrogen(), estimateNitrogen(request.soilType(), moisture));
        double phosphorus = firstPresent(request.phosphorus(), null, clamp(34 + (7.0 - Math.abs(ph - 6.8)) * 4 + temperature / 3, 22, 86));
        double potassium = firstPresent(request.potassium(), null, clamp(42 + moisture / 2.6 + soilTypePotassiumBonus(request.soilType()), 28, 92));

        String source = soilGrid.source() == null
                ? "Estimated NPK from climate and soil type"
                : soilGrid.source() + " with phosphorus/potassium approximation";

        return new SoilSnapshot(round(ph), round(moisture), round(nitrogen), round(phosphorus), round(potassium), source);
    }

    @SuppressWarnings("unchecked")
    private PartialSoilGrid fetchSoilGrid(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return new PartialSoilGrid(null, null, null);
        }

        try {
            String url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
                    + "?lat={latitude}&lon={longitude}"
                    + "&property=phh2o&property=nitrogen"
                    + "&depth=0-5cm&value=mean";
            Map<String, Object> response = externalRestTemplate.getForObject(url, Map.class, latitude, longitude);
            Map<String, Object> properties = response == null ? null : (Map<String, Object>) response.get("properties");
            List<Map<String, Object>> layers = properties == null ? List.of() : (List<Map<String, Object>>) properties.get("layers");

            Double ph = null;
            Double nitrogen = null;
            for (Map<String, Object> layer : layers) {
                String name = String.valueOf(layer.get("name"));
                List<Map<String, Object>> depths = (List<Map<String, Object>>) layer.get("depths");
                if (depths == null || depths.isEmpty()) {
                    continue;
                }
                Map<String, Object> values = (Map<String, Object>) depths.getFirst().get("values");
                Object mean = values == null ? null : values.get("mean");
                if (!(mean instanceof Number number)) {
                    continue;
                }
                double value = number.doubleValue();
                if ("phh2o".equals(name)) {
                    ph = value > 14 ? value / 10.0 : value;
                }
                if ("nitrogen".equals(name)) {
                    nitrogen = clamp(value > 100 ? value / 10.0 : value, 18, 95);
                }
            }

            return new PartialSoilGrid(ph, nitrogen, "SoilGrids");
        } catch (Exception ignored) {
            return new PartialSoilGrid(null, null, null);
        }
    }

    private CropProfile profileFor(String crop) {
        return switch (crop) {
            case "Rice" -> new CropProfile(22, 34, 160, 300, 5.4, 7.1, 55, 92, 52, 88, 30, 72, 42, 88, 29, 225);
            case "Millet" -> new CropProfile(27, 39, 35, 115, 5.5, 8.2, 22, 58, 34, 76, 24, 62, 30, 74, 33, 75);
            case "Wheat" -> new CropProfile(14, 27, 65, 170, 6.0, 7.8, 32, 66, 42, 82, 30, 68, 35, 76, 21, 115);
            case "Cotton" -> new CropProfile(24, 35, 70, 170, 5.8, 8.0, 32, 68, 46, 84, 32, 70, 48, 90, 30, 120);
            case "Maize" -> new CropProfile(20, 34, 80, 190, 5.8, 7.6, 38, 78, 54, 92, 32, 75, 42, 86, 28, 135);
            case "Sorghum" -> new CropProfile(25, 38, 40, 130, 5.5, 8.4, 22, 62, 34, 78, 24, 62, 32, 80, 32, 80);
            case "Groundnut" -> new CropProfile(23, 33, 50, 145, 5.5, 7.3, 30, 64, 28, 68, 34, 76, 48, 88, 29, 95);
            default -> new CropProfile(20, 34, 60, 180, 5.5, 8.0, 30, 75, 35, 80, 25, 70, 35, 80, 28, 110);
        };
    }

    private double soilTypeBonus(String crop, String soilType) {
        String normalized = soilType == null ? "" : soilType.trim().toLowerCase(Locale.ROOT);
        if (normalized.contains("loam")) {
            return List.of("Cotton", "Maize", "Wheat", "Groundnut").contains(crop) ? 0.06 : 0.04;
        }
        if (normalized.contains("clay")) {
            return "Rice".equals(crop) ? 0.08 : 0.02;
        }
        if (normalized.contains("black")) {
            return List.of("Cotton", "Millet", "Sorghum").contains(crop) ? 0.07 : 0.03;
        }
        return 0.02;
    }

    private double estimatePh(String soilType, double rainfall) {
        String normalized = soilType == null ? "" : soilType.toLowerCase(Locale.ROOT);
        double base = normalized.contains("black") ? 7.3 : normalized.contains("clay") ? 6.6 : 6.8;
        return clamp(base - rainfall / 1000.0, 5.2, 8.4);
    }

    private double estimateNitrogen(String soilType, double moisture) {
        String normalized = soilType == null ? "" : soilType.toLowerCase(Locale.ROOT);
        double base = normalized.contains("loam") ? 62 : normalized.contains("black") ? 68 : 54;
        return clamp(base + moisture / 12.0, 28, 92);
    }

    private double soilTypePotassiumBonus(String soilType) {
        String normalized = soilType == null ? "" : soilType.toLowerCase(Locale.ROOT);
        if (normalized.contains("black")) {
            return 12;
        }
        if (normalized.contains("loam")) {
            return 8;
        }
        return 4;
    }

    private double rangeFit(double value, double lower, double upper) {
        if (value >= lower && value <= upper) {
            return 1.0;
        }
        double width = Math.max(1.0, upper - lower);
        double distance = value < lower ? lower - value : value - upper;
        return Math.max(0.0, 1.0 - distance / width);
    }

    private double firstPresent(Double primary, Double secondary, double fallback) {
        if (primary != null) {
            return primary;
        }
        if (secondary != null) {
            return secondary;
        }
        return fallback;
    }

    private double clamp(double value, double lower, double upper) {
        return Math.min(upper, Math.max(lower, value));
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double roundScore(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record PartialSoilGrid(Double ph, Double nitrogen, String source) {
    }

    private record CropProfile(double minTemperature,
                               double maxTemperature,
                               double minRainfall,
                               double maxRainfall,
                               double minPh,
                               double maxPh,
                               double minMoisture,
                               double maxMoisture,
                               double minNitrogen,
                               double maxNitrogen,
                               double minPhosphorus,
                               double maxPhosphorus,
                               double minPotassium,
                               double maxPotassium,
                               double idealTemperature,
                               double idealRainfall) {
    }
}
