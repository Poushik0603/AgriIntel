package com.agriintel.market.controller;

import com.agriintel.market.dto.CropPriceHistoryRequest;
import com.agriintel.market.dto.CropPriceHistoryResponse;
import com.agriintel.market.dto.IngestResponse;
import com.agriintel.market.dto.MarketTrendSummaryResponse;
import com.agriintel.market.service.MarketDataService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/market-data")
@Validated
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

    @PostMapping("/ingest")
    @ResponseStatus(HttpStatus.CREATED)
    public IngestResponse ingest(@Valid @RequestBody List<CropPriceHistoryRequest> requests) {
        return new IngestResponse(marketDataService.ingest(requests));
    }

    @GetMapping
    public List<CropPriceHistoryResponse> findAll(@RequestParam(required = false) String crop,
                                                  @RequestParam(required = false) LocalDate fromDate,
                                                  @RequestParam(required = false) LocalDate toDate) {
        return marketDataService.findAll(crop, fromDate, toDate);
    }

    @GetMapping("/trends/summary")
    public MarketTrendSummaryResponse getTrendSummary(@RequestParam(required = false) String crop,
                                                      @RequestParam(required = false) LocalDate fromDate,
                                                      @RequestParam(required = false) LocalDate toDate) {
        return marketDataService.getTrendSummary(crop, fromDate, toDate);
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
