package com.agriintel.market.service;

import com.agriintel.market.dto.CropPriceHistoryRequest;
import com.agriintel.market.dto.CropPriceHistoryResponse;
import com.agriintel.market.dto.MarketTrendSummaryResponse;
import com.agriintel.market.entity.CropPriceHistory;
import com.agriintel.market.exception.ResourceNotFoundException;
import com.agriintel.market.repository.CropPriceHistoryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
public class MarketDataService {

    private final CropPriceHistoryRepository repository;

    public MarketDataService(CropPriceHistoryRepository repository) {
        this.repository = repository;
    }

    public CropPriceHistoryResponse create(CropPriceHistoryRequest request) {
        CropPriceHistory entity = mapRequest(request, new CropPriceHistory());
        return mapResponse(repository.save(entity));
    }

    public List<CropPriceHistoryResponse> findAll(String crop, LocalDate fromDate, LocalDate toDate) {
        return repository.findByFilters(crop, fromDate, toDate).stream().map(this::mapResponse).toList();
    }

    public CropPriceHistoryResponse findById(Long id) {
        return mapResponse(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Market data not found")));
    }

    public CropPriceHistoryResponse update(Long id, CropPriceHistoryRequest request) {
        CropPriceHistory entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Market data not found"));
        return mapResponse(repository.save(mapRequest(request, entity)));
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Market data not found");
        }
        repository.deleteById(id);
    }

    public MarketTrendSummaryResponse getTrendSummary(String crop, LocalDate fromDate, LocalDate toDate) {
        List<CropPriceHistory> records = repository.findByFilters(crop, fromDate, toDate);
        if (records.isEmpty()) {
            throw new ResourceNotFoundException("No market data found for the provided filters");
        }

        BigDecimal averagePrice = records.stream()
                .map(CropPriceHistory::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(records.size()), 2, RoundingMode.HALF_UP);

        BigDecimal minPrice = records.stream().map(CropPriceHistory::getPrice).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal maxPrice = records.stream().map(CropPriceHistory::getPrice).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal latestPrice = records.stream()
                .max(Comparator.comparing(CropPriceHistory::getRecordDate).thenComparing(CropPriceHistory::getId))
                .map(CropPriceHistory::getPrice)
                .orElse(BigDecimal.ZERO);

        LocalDate effectiveFromDate = fromDate != null ? fromDate : records.stream().map(CropPriceHistory::getRecordDate).min(LocalDate::compareTo).orElse(null);
        LocalDate effectiveToDate = toDate != null ? toDate : records.stream().map(CropPriceHistory::getRecordDate).max(LocalDate::compareTo).orElse(null);

        return new MarketTrendSummaryResponse(crop, effectiveFromDate, effectiveToDate, records.size(), averagePrice, minPrice, maxPrice, latestPrice);
    }

    private CropPriceHistory mapRequest(CropPriceHistoryRequest request, CropPriceHistory entity) {
        entity.setCropName(request.cropName());
        entity.setPrice(request.price());
        entity.setMarketName(request.marketName());
        entity.setRecordDate(request.recordDate());
        return entity;
    }

    private CropPriceHistoryResponse mapResponse(CropPriceHistory entity) {
        return new CropPriceHistoryResponse(
                entity.getId(),
                entity.getCropName(),
                entity.getPrice(),
                entity.getMarketName(),
                entity.getRecordDate()
        );
    }
}
