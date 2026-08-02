package com.agriintel.insight.service;

import com.agriintel.insight.dto.AnalysisRequest;
import com.agriintel.insight.dto.CropRecommendationResponse;
import com.agriintel.insight.dto.ProfitabilityLevel;
import com.agriintel.insight.dto.RankedCropDto;
import com.agriintel.insight.dto.RiskLevel;
import com.agriintel.insight.dto.SelectedCropAnalysisDto;
import com.agriintel.insight.dto.WeatherSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Produces the analyst-facing narrative for an analysis result. Reasons
 * causally over data Java has already computed (weather, crop
 * suitability, profitability/risk verdicts, price vs. market spread) via
 * an LLM, rather than restating it in fixed templates. Never recomputes
 * or overrides those verdicts itself.
 */
@Service
public class InsightNarrationService {

    private static final Logger log = LoggerFactory.getLogger(InsightNarrationService.class);

    private static final String SYSTEM_PROMPT = """
            You are an agronomic analyst assistant for AgriIntel. You are given
            structured facts about a location, its weather, a set of crops, and
            already-computed profitability/risk assessments for each crop.

            Write 3-6 short insight statements for a human analyst who will make
            the final call on financing and planting decisions. Each statement
            should:
            - Explain WHY a crop is or isn't well suited here in causal terms
              (e.g. a crop's water/temperature requirement versus the actual
              rainfall/temperature at this location), not just restate numbers.
            - Where you can reasonably infer it from the weather and crop data
              given, note anything relevant about sowing timing relative to the
              season (e.g. rainfall pattern implying early/late monsoon), as
              part of the explanation, not as a separate structured field.
            - Never invent numbers not present in the input. Never suggest a
              loan or financing decision — that is out of scope; you are only
              explaining the agronomic and market reasoning behind the figures.

            Output ONLY the insight statements, one per line, no numbering, no
            preamble, no markdown formatting.
            """;

    private final ChatClient chatClient;

    public InsightNarrationService(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    public List<String> narrate(AnalysisRequest request,
                                WeatherSnapshot weather,
                                CropRecommendationResponse cropResponse,
                                List<SelectedCropAnalysisDto> selectedAnalysis,
                                ProfitabilityLevel profitability,
                                RiskLevel riskLevel) {
        try {
            String userPrompt = buildUserPrompt(request, weather, cropResponse, selectedAnalysis, profitability, riskLevel);
            String response = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(userPrompt)
                    .call()
                    .content();

            List<String> parsed = parseInsights(response);
            if (parsed.isEmpty()) {
                log.warn("LLM returned no usable insight lines, falling back to templated insights");
                return generateFallbackInsights(request, weather, cropResponse, selectedAnalysis, profitability, riskLevel);
            }
            return parsed;
        } catch (Exception e) {
            log.warn("LLM insight narration unavailable, falling back to templated insights: {}", e.getMessage());
            return generateFallbackInsights(request, weather, cropResponse, selectedAnalysis, profitability, riskLevel);
        }
    }

    private String buildUserPrompt(AnalysisRequest request,
                                   WeatherSnapshot weather,
                                   CropRecommendationResponse cropResponse,
                                   List<SelectedCropAnalysisDto> selectedAnalysis,
                                   ProfitabilityLevel profitability,
                                   RiskLevel riskLevel) {
        StringBuilder sb = new StringBuilder();
        sb.append("Location: ").append(request.city()).append(", soil type: ").append(request.soilType()).append("\n");
        if (weather != null) {
            sb.append("Weather: temperature ").append(weather.temperature())
                    .append("C, humidity ").append(weather.humidity())
                    .append("%, rainfall ").append(weather.rainfall()).append(" mm\n");
        }

        if (cropResponse != null && cropResponse.recommendedCrops() != null && !cropResponse.recommendedCrops().isEmpty()) {
            sb.append("\nAgronomic suitability scores:\n");
            for (RankedCropDto crop : cropResponse.recommendedCrops()) {
                sb.append("- ").append(crop.crop())
                        .append(": suitability score ").append(crop.score());
                if (crop.riskLevel() != null) {
                    sb.append(", risk ").append(crop.riskLevel());
                }
                if (crop.reason() != null && !crop.reason().isBlank()) {
                    sb.append(", reason: ").append(crop.reason());
                }
                if (crop.limitation() != null && !crop.limitation().isBlank()) {
                    sb.append(", limitation: ").append(crop.limitation());
                }
                sb.append("\n");
            }
        }

        sb.append("\nSelected crops for this analysis:\n");
        for (SelectedCropAnalysisDto item : selectedAnalysis) {
            sb.append("- ").append(item.crop())
                    .append(": predicted price ").append(item.predictedPrice())
                    .append(", average market price ").append(item.averageMarketPrice())
                    .append(", spread ").append(item.spread())
                    .append(", profitability ").append(item.profitability())
                    .append(", risk ").append(item.riskLevel())
                    .append(", ").append(item.recommendationFit())
                    .append("\n");
        }

        if (request.discountFactor() != null && request.discountFactor().compareTo(BigDecimal.ZERO) > 0) {
            sb.append("\nA conservative discount factor of ").append(request.discountFactor())
                    .append(" was applied to profitability assumptions.\n");
        }

        sb.append("\nOverall computed profitability: ").append(profitability)
                .append(", overall computed risk: ").append(riskLevel).append("\n");

        return sb.toString();
    }

    private List<String> parseInsights(String response) {
        if (response == null || response.isBlank()) {
            return List.of();
        }
        List<String> lines = new ArrayList<>();
        for (String line : response.split("\\R")) {
            String trimmed = line.strip().replaceFirst("^[-*\\d.\\s]+", "").strip();
            if (!trimmed.isBlank()) {
                lines.add(trimmed);
            }
        }
        return lines;
    }

    private List<String> generateFallbackInsights(AnalysisRequest request,
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
}
