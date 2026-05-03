package com.agriintel.price.controller;

import com.agriintel.price.dto.PricePredictionResponse;
import com.agriintel.price.service.PricePredictionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/price")
public class PriceController {

    private final PricePredictionService pricePredictionService;

    public PriceController(PricePredictionService pricePredictionService) {
        this.pricePredictionService = pricePredictionService;
    }

    @GetMapping("/predict")
    public List<PricePredictionResponse> predict(@RequestParam(required = false) String crop,
                                                 @RequestParam(required = false) String crops) {
        return pricePredictionService.predictPrices(crop, crops);
    }
}
