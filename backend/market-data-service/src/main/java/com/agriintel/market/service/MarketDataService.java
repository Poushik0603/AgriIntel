package com.agriintel.market.service;

import com.agriintel.market.dto.CropPriceHistoryRequest;
import com.agriintel.market.dto.CropPriceHistoryResponse;
import com.agriintel.market.entity.CropPriceHistory;
import com.agriintel.market.exception.ResourceNotFoundException;
import com.agriintel.market.repository.CropPriceHistoryRepository;
import org.springframework.stereotype.Service;

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

    public List<CropPriceHistoryResponse> findAll() {
        return repository.findAll().stream().map(this::mapResponse).toList();
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
