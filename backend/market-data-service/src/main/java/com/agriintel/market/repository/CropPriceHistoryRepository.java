package com.agriintel.market.repository;

import com.agriintel.market.entity.CropPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CropPriceHistoryRepository extends JpaRepository<CropPriceHistory, Long> {
}
