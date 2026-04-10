package com.agriintel.price.service;

import com.agriintel.price.dto.PricePredictionResponse;
import com.agriintel.price.entity.CropBasePrice;
import com.agriintel.price.exception.ResourceNotFoundException;
import com.agriintel.price.repository.CropBasePriceRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Service
public class PricePredictionService {

    private final CropBasePriceRepository repository;

    public PricePredictionService(CropBasePriceRepository repository) {
        this.repository = repository;
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

        BigDecimal predictedPrice = basePrice.getBasePrice().multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
        return new PricePredictionResponse(basePrice.getCropName(), season, basePrice.getBasePrice(), predictedPrice);
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
}
