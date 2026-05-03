package com.agriintel.price.dto;

import java.math.BigDecimal;
import java.util.List;

public record PricePredictionResponse(String crop,
                                      String season,
                                      BigDecimal basePrice,
                                      BigDecimal predictedPrice,
                                      BigDecimal yieldEstimate,
                                      int confidence,
                                      List<String> drivers) {
}
