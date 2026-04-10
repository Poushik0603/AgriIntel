package com.agriintel.price.controller;

import com.agriintel.price.dto.PricePredictionResponse;
import com.agriintel.price.service.PricePredictionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/price")
public class PriceController {

    private final PricePredictionService pricePredictionService;

    public PriceController(PricePredictionService pricePredictionService) {
        this.pricePredictionService = pricePredictionService;
    }

    @GetMapping("/predict")
    public PricePredictionResponse predict(@RequestParam String crop) {
        return pricePredictionService.predictPrice(crop);
    }
}
