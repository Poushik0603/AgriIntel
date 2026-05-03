package com.agriintel.price.service;

import com.agriintel.price.dto.PricePredictionResponse;
import com.agriintel.price.entity.CropBasePrice;
import com.agriintel.price.exception.ResourceNotFoundException;
import com.agriintel.price.repository.CropBasePriceRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Service
public class PricePredictionService {

    private final CropBasePriceRepository repository;

    public PricePredictionService(CropBasePriceRepository repository) {
        this.repository = repository;
    }

    public List<PricePredictionResponse> predictPrices(String crop, String crops) {
        String source = (crops != null && !crops.isBlank()) ? crops : crop;
        if (source == null || source.isBlank()) {
            throw new ResourceNotFoundException("At least one crop must be provided");
        }

        return Arrays.stream(source.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .map(this::predictPrice)
                .toList();
    }

    public PricePredictionResponse predictPrice(String crop) {
        CropBasePrice basePrice = repository.findByCropNameIgnoreCase(crop)
                .orElseThrow(() -> new ResourceNotFoundException("Base price not found for crop: " + crop));

        String season = determineSeason(LocalDate.now().getMonthValue());
        BigDecimal multiplier = switch (season) {
            case "Summer" -> new BigDecimal("1.10");
            case "Winter" -> new BigDecimal("0.95");
            default -> BigDecimal.ONE;
        };

        BigDecimal yieldEstimate = estimateYield(basePrice.getCropName(), season);
        BigDecimal yieldAdjustment = yieldEstimate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal predictedPrice = basePrice.getBasePrice()
                .multiply(multiplier)
                .multiply(BigDecimal.ONE.add(yieldAdjustment))
                .setScale(2, RoundingMode.HALF_UP);
        int confidence = confidenceFor(basePrice.getCropName(), season);
        List<String> drivers = List.of(
                season + " seasonal multiplier",
                "Historical base price for " + basePrice.getCropName(),
                "Projected yield adjustment " + yieldEstimate + "%"
        );
        return new PricePredictionResponse(basePrice.getCropName(), season, basePrice.getBasePrice(), predictedPrice, yieldEstimate, confidence, drivers);
    }

    private String determineSeason(int month) {
        if (month >= 3 && month <= 6) {
            return "Summer";
        }
        if (month >= 11 || month <= 2) {
            return "Winter";
        }
        return "Monsoon";
    }

    private BigDecimal estimateYield(String crop, String season) {
        BigDecimal baseline = switch (crop.toLowerCase()) {
            case "rice" -> new BigDecimal("7.5");
            case "wheat" -> new BigDecimal("5.8");
            case "millet" -> new BigDecimal("4.4");
            case "cotton" -> new BigDecimal("6.2");
            case "maize" -> new BigDecimal("8.0");
            case "sorghum" -> new BigDecimal("4.9");
            case "groundnut" -> new BigDecimal("5.1");
            default -> new BigDecimal("5.0");
        };
        BigDecimal seasonalBias = switch (season) {
            case "Summer" -> new BigDecimal("1.6");
            case "Winter" -> new BigDecimal("-0.8");
            default -> new BigDecimal("0.6");
        };
        return baseline.add(seasonalBias).setScale(1, RoundingMode.HALF_UP);
    }

    private int confidenceFor(String crop, String season) {
        int base = switch (crop.toLowerCase()) {
            case "rice", "wheat", "maize" -> 91;
            case "cotton", "groundnut" -> 87;
            default -> 84;
        };
        return "Monsoon".equals(season) ? base - 4 : base;
    }
}
