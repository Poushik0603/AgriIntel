package com.agriintel.scenario.repository;

import com.agriintel.scenario.entity.ScenarioDashboard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScenarioDashboardRepository extends JpaRepository<ScenarioDashboard, Long> {
    List<ScenarioDashboard> findByUserIdOrderByCreatedAtDesc(Long userId);
}
