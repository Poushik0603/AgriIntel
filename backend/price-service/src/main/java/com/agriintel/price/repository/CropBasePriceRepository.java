package com.agriintel.price.repository;

import com.agriintel.price.entity.CropBasePrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CropBasePriceRepository extends JpaRepository<CropBasePrice, Long> {
    Optional<CropBasePrice> findByCropNameIgnoreCase(String cropName);
}
