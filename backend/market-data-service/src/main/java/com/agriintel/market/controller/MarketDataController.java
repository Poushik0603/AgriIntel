package com.agriintel.market.controller;

import com.agriintel.market.dto.CropPriceHistoryRequest;
import com.agriintel.market.dto.CropPriceHistoryResponse;
import com.agriintel.market.service.MarketDataService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/market-data")
public class MarketDataController {

    private final MarketDataService marketDataService;

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CropPriceHistoryResponse create(@Valid @RequestBody CropPriceHistoryRequest request) {
        return marketDataService.create(request);
    }

    @GetMapping
    public List<CropPriceHistoryResponse> findAll() {
        return marketDataService.findAll();
    }

    @GetMapping("/{id}")
    public CropPriceHistoryResponse findById(@PathVariable Long id) {
        return marketDataService.findById(id);
    }

    @PutMapping("/{id}")
    public CropPriceHistoryResponse update(@PathVariable Long id, @Valid @RequestBody CropPriceHistoryRequest request) {
        return marketDataService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        marketDataService.delete(id);
    }
}
