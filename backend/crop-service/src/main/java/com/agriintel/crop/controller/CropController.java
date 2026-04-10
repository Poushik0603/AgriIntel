package com.agriintel.crop.controller;

import com.agriintel.crop.dto.CropRecommendationRequest;
import com.agriintel.crop.dto.CropRecommendationResponse;
import com.agriintel.crop.service.CropRecommendationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/crop")
public class CropController {

    private final CropRecommendationService cropRecommendationService;

    public CropController(CropRecommendationService cropRecommendationService) {
        this.cropRecommendationService = cropRecommendationService;
    }

    @PostMapping("/recommend")
    public CropRecommendationResponse recommend(@Valid @RequestBody CropRecommendationRequest request) {
        return cropRecommendationService.recommend(request);
    }
}
