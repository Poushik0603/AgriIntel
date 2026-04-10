package com.agriintel.crop.repository;

import com.agriintel.crop.entity.CropRecommendationAudit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CropRecommendationAuditRepository extends JpaRepository<CropRecommendationAudit, Long> {
}
