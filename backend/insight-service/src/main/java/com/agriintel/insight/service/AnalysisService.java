package com.agriintel.insight.service;

import com.agriintel.insight.dto.AnalysisRequest;
import com.agriintel.insight.dto.AnalysisResponse;
import com.agriintel.insight.dto.CropComparisonDto;
import com.agriintel.insight.dto.CropRecommendationRequest;
import com.agriintel.insight.dto.CropRecommendationResponse;
import com.agriintel.insight.dto.LoanSuggestion;
import com.agriintel.insight.dto.MarketDataRecordDto;
import com.agriintel.insight.dto.PricePredictionDto;
import com.agriintel.insight.dto.ProfitabilityLevel;
import com.agriintel.insight.dto.RankedCropDto;
import com.agriintel.insight.dto.RiskLevel;
import com.agriintel.insight.dto.SelectedCropAnalysisDto;
import com.agriintel.insight.dto.WeatherSnapshot;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AnalysisService {

    private final RestTemplate restTemplate;

    public AnalysisService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public AnalysisResponse analyze(AnalysisRequest request) {
        WeatherSnapshot weather = restTemplate.getForObject(
                "http://weather-service/weather?city={city}",
                WeatherSnapshot.class,
                request.city()
        );

        CropRecommendationResponse cropResponse = restTemplate.postForObject(
                "http://crop-service/crop/recommend",
                new CropRecommendationRequest(
                        request.soilType(),
                        weather != null ? weather.rainfall() : null,
                        weather != null ? weather.temperature() : null,
                        request.city()
                ),
                CropRecommendationResponse.class
        );

        List<String> analysisCrops = buildAnalysisCropList(request.selectedCrops(), cropResponse);
        List<PricePredictionDto> pricePredictions = fetchPricePredictions(analysisCrops);
        Map<String, PricePredictionDto> predictionByCrop = pricePredictions.stream()
                .collect(Collectors.toMap(dto -> dto.crop().toLowerCase(Locale.ROOT), Function.identity()));

        List<SelectedCropAnalysisDto> selectedAnalysis = request.selectedCrops().stream()
                .distinct()
                .map(crop -> buildSelectedAnalysis(crop, predictionByCrop.get(crop.toLowerCase(Locale.ROOT)), fetchMarketData(crop), cropResponse))
                .toList();

        List<CropComparisonDto> comparison = analysisCrops.stream()
                .map(crop -> buildComparison(crop, predictionByCrop.get(crop.toLowerCase(Locale.ROOT)), fetchMarketData(crop), cropResponse))
                .sorted(Comparator.comparing(CropComparisonDto::recommendationScore).reversed())
                .toList();

        ProfitabilityLevel profitability = deriveOverallProfitability(selectedAnalysis);
        RiskLevel riskLevel = deriveOverallRisk(selectedAnalysis, weather);
        LoanSuggestion loanSuggestion = deriveLoanSuggestion(profitability, riskLevel);

        List<String> insights = generateInsights(request, weather, cropResponse, selectedAnalysis, profitability, riskLevel);

        List<RankedCropDto> rankedRecommendations = adjustRecommendations(
                cropResponse != null ? cropResponse.recommendedCrops() : List.of(),
                request.discountFactor()
        );

        return new AnalysisResponse(weather, rankedRecommendations, selectedAnalysis, riskLevel, profitability, loanSuggestion, insights, comparison);
    }

    private List<String> buildAnalysisCropList(List<String> selectedCrops, CropRecommendationResponse cropResponse) {
        Set<String> allCrops = new LinkedHashSet<>(selectedCrops);
        if (cropResponse != null && cropResponse.recommendedCrops() != null) {
            cropResponse.recommendedCrops().stream()
                    .limit(3)
                    .map(RankedCropDto::crop)
                    .forEach(allCrops::add);
        }
        return new ArrayList<>(allCrops);
    }

    private List<PricePredictionDto> fetchPricePredictions(List<String> crops) {
        String joined = String.join(",", crops);
        ResponseEntity<List<PricePredictionDto>> response = restTemplate.exchange(
                RequestEntity.get(URI.create("http://price-service/price/predict?crops=" + joined)).build(),
                new ParameterizedTypeReference<>() {
                }
        );
        return response.getBody() == null ? List.of() : response.getBody();
    }

    private List<MarketDataRecordDto> fetchMarketData(String crop) {
        ResponseEntity<List<MarketDataRecordDto>> response = restTemplate.exchange(
                "http://market-data-service/market-data?crop={crop}",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {
                },
                crop
        );
        return response.getBody() == null ? List.of() : response.getBody();
    }

    private SelectedCropAnalysisDto buildSelectedAnalysis(String crop,
                                                          PricePredictionDto prediction,
                                                          List<MarketDataRecordDto> marketData,
                                                          CropRecommendationResponse cropResponse) {
        BigDecimal predictedPrice = prediction != null ? prediction.predictedPrice() : BigDecimal.ZERO;
        BigDecimal averageMarketPrice = averageMarketPrice(marketData);
        BigDecimal spread = predictedPrice.subtract(averageMarketPrice).setScale(2, RoundingMode.HALF_UP);
        ProfitabilityLevel profitability = profitabilityFor(predictedPrice, averageMarketPrice);
        RiskLevel riskLevel = riskFor(marketData, cropResponse, crop);
        String recommendationFit = isRecommended(cropResponse, crop) ? "Aligned with crop recommendation" : "Outside top recommendation set";
        return new SelectedCropAnalysisDto(crop, predictedPrice, averageMarketPrice, spread, riskLevel, profitability, recommendationFit);
    }

    private CropComparisonDto buildComparison(String crop,
                                              PricePredictionDto prediction,
                                              List<MarketDataRecordDto> marketData,
                                              CropRecommendationResponse cropResponse) {
        BigDecimal predictedPrice = prediction != null ? prediction.predictedPrice() : BigDecimal.ZERO;
        BigDecimal averageMarketPrice = averageMarketPrice(marketData);
        return new CropComparisonDto(
                crop,
                recommendationScore(cropResponse, crop),
                predictedPrice,
                averageMarketPrice,
                profitabilityFor(predictedPrice, averageMarketPrice),
                riskFor(marketData, cropResponse, crop)
        );
    }

    private List<RankedCropDto> adjustRecommendations(List<RankedCropDto> recommendations, BigDecimal discountFactor) {
        BigDecimal factor = discountFactor == null ? BigDecimal.ZERO : discountFactor;
        return recommendations.stream()
                .map(item -> new RankedCropDto(item.crop(), Math.max(0.0, roundScore(BigDecimal.valueOf(item.score()).subtract(factor.multiply(new BigDecimal("0.10"))).doubleValue()))))
                .sorted(Comparator.comparing(RankedCropDto::score).reversed())
                .toList();
    }

    private double recommendationScore(CropRecommendationResponse cropResponse, String crop) {
        if (cropResponse == null || cropResponse.recommendedCrops() == null) {
            return 0.0;
        }
        return cropResponse.recommendedCrops().stream()
                .filter(item -> item.crop().equalsIgnoreCase(crop))
                .map(RankedCropDto::score)
                .findFirst()
                .orElse(0.0);
    }

    private boolean isRecommended(CropRecommendationResponse cropResponse, String crop) {
        return recommendationScore(cropResponse, crop) > 0;
    }

    private BigDecimal averageMarketPrice(List<MarketDataRecordDto> marketData) {
        if (marketData == null || marketData.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal total = marketData.stream()
                .map(MarketDataRecordDto::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(marketData.size()), 2, RoundingMode.HALF_UP);
    }

    private ProfitabilityLevel profitabilityFor(BigDecimal predictedPrice, BigDecimal averageMarketPrice) {
        if (averageMarketPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return predictedPrice.compareTo(new BigDecimal("2000")) >= 0 ? ProfitabilityLevel.HIGH : ProfitabilityLevel.MODERATE;
        }
        BigDecimal ratio = predictedPrice.divide(averageMarketPrice, 2, RoundingMode.HALF_UP);
        if (ratio.compareTo(new BigDecimal("1.10")) >= 0) {
            return ProfitabilityLevel.HIGH;
        }
        if (ratio.compareTo(new BigDecimal("0.95")) >= 0) {
            return ProfitabilityLevel.MODERATE;
        }
        return ProfitabilityLevel.LOW;
    }

    private RiskLevel riskFor(List<MarketDataRecordDto> marketData, CropRecommendationResponse cropResponse, String crop) {
        double score = recommendationScore(cropResponse, crop);
        if (marketData == null || marketData.size() < 2) {
            return score >= 0.75 ? RiskLevel.MEDIUM : RiskLevel.HIGH;
        }

        BigDecimal min = marketData.stream().map(MarketDataRecordDto::price).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal max = marketData.stream().map(MarketDataRecordDto::price).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal spread = max.subtract(min);

        if (score >= 0.80 && spread.compareTo(new BigDecimal("150")) <= 0) {
            return RiskLevel.LOW;
        }
        if (score >= 0.60 && spread.compareTo(new BigDecimal("350")) <= 0) {
            return RiskLevel.MEDIUM;
        }
        return RiskLevel.HIGH;
    }

    private ProfitabilityLevel deriveOverallProfitability(List<SelectedCropAnalysisDto> selectedAnalysis) {
        long high = selectedAnalysis.stream().filter(item -> item.profitability() == ProfitabilityLevel.HIGH).count();
        long low = selectedAnalysis.stream().filter(item -> item.profitability() == ProfitabilityLevel.LOW).count();
        if (high == selectedAnalysis.size() && !selectedAnalysis.isEmpty()) {
            return ProfitabilityLevel.HIGH;
        }
        if (low > 0) {
            return ProfitabilityLevel.LOW;
        }
        return ProfitabilityLevel.MODERATE;
    }

    private RiskLevel deriveOverallRisk(List<SelectedCropAnalysisDto> selectedAnalysis, WeatherSnapshot weather) {
        boolean harshClimate = weather != null && (weather.rainfall() > 240 || weather.temperature() > 34);
        long high = selectedAnalysis.stream().filter(item -> item.riskLevel() == RiskLevel.HIGH).count();
        if (high > 0 || harshClimate) {
            return RiskLevel.HIGH;
        }
        long medium = selectedAnalysis.stream().filter(item -> item.riskLevel() == RiskLevel.MEDIUM).count();
        return medium > 0 ? RiskLevel.MEDIUM : RiskLevel.LOW;
    }

    private LoanSuggestion deriveLoanSuggestion(ProfitabilityLevel profitability, RiskLevel riskLevel) {
        if (profitability == ProfitabilityLevel.HIGH && riskLevel == RiskLevel.LOW) {
            return LoanSuggestion.APPROVED;
        }
        if (profitability == ProfitabilityLevel.LOW || riskLevel == RiskLevel.HIGH) {
            return LoanSuggestion.REJECTED;
        }
        return LoanSuggestion.CONDITIONAL;
    }

    private List<String> generateInsights(AnalysisRequest request,
                                          WeatherSnapshot weather,
                                          CropRecommendationResponse cropResponse,
                                          List<SelectedCropAnalysisDto> selectedAnalysis,
                                          ProfitabilityLevel profitability,
                                          RiskLevel riskLevel) {
        List<String> insights = new ArrayList<>();
        if (weather != null) {
            insights.add("Weather baseline for " + weather.city() + " shows " + weather.temperature() + "C temperature and " + weather.rainfall() + " mm rainfall.");
        }
        if (cropResponse != null && cropResponse.recommendedCrops() != null && !cropResponse.recommendedCrops().isEmpty()) {
            RankedCropDto topCrop = cropResponse.recommendedCrops().getFirst();
            insights.add("Top agronomic recommendation is " + topCrop.crop() + " with a suitability score of " + topCrop.score() + ".");
        }
        selectedAnalysis.forEach(item -> insights.add(
                item.crop() + " shows " + item.profitability().name() + " profitability with " + item.riskLevel().name() + " risk and spread " + item.spread() + "."
        ));
        if (request.discountFactor() != null && request.discountFactor().compareTo(BigDecimal.ZERO) > 0) {
            insights.add("Discount factor " + request.discountFactor() + " was applied to make profitability assumptions more conservative.");
        }
        insights.add("Overall analyst view: profitability is " + profitability.name() + " and risk is " + riskLevel.name() + ".");
        return insights;
    }

    private double roundScore(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
