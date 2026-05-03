package com.agriintel.market.repository;

import com.agriintel.market.entity.CropPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CropPriceHistoryRepository extends JpaRepository<CropPriceHistory, Long> {
    @Query("""
            select c from CropPriceHistory c
            where (:crop is null or lower(c.cropName) = lower(:crop))
              and (:fromDate is null or c.recordDate >= :fromDate)
              and (:toDate is null or c.recordDate <= :toDate)
            order by c.recordDate desc, c.id desc
            """)
    List<CropPriceHistory> findByFilters(@Param("crop") String crop,
                                         @Param("fromDate") LocalDate fromDate,
                                         @Param("toDate") LocalDate toDate);
}
