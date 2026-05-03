package com.agriintel.scenario.service;

import com.agriintel.scenario.dto.ScenarioRequest;
import com.agriintel.scenario.dto.ScenarioResponse;
import com.agriintel.scenario.entity.ScenarioDashboard;
import com.agriintel.scenario.exception.ResourceNotFoundException;
import com.agriintel.scenario.repository.ScenarioDashboardRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ScenarioDashboardService {

    private final ScenarioDashboardRepository repository;

    public ScenarioDashboardService(ScenarioDashboardRepository repository) {
        this.repository = repository;
    }

    public ScenarioResponse create(ScenarioRequest request) {
        ScenarioDashboard entity = new ScenarioDashboard();
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(entity.getCreatedAt());
        applyRequest(entity, request);
        return toResponse(repository.save(entity));
    }

    public ScenarioResponse update(Long id, ScenarioRequest request) {
        ScenarioDashboard entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scenario not found"));
        applyRequest(entity, request);
        entity.setUpdatedAt(LocalDateTime.now());
        return toResponse(repository.save(entity));
    }

    public List<ScenarioResponse> findAll(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public ScenarioResponse findById(Long id) {
        return repository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Scenario not found"));
    }

    private ScenarioResponse toResponse(ScenarioDashboard entity) {
        return new ScenarioResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getLocation(),
                entity.getTitle(),
                entity.getStatus(),
                entity.getRiskSnapshot(),
                entity.getSelectedCrops(),
                entity.getRecommendedCrops(),
                entity.getInsights(),
                entity.getReportNotes(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private void applyRequest(ScenarioDashboard entity, ScenarioRequest request) {
        entity.setUserId(request.userId());
        entity.setLocation(request.location());
        entity.setTitle(hasText(request.title()) ? request.title() : request.location() + " Analysis");
        entity.setStatus(hasText(request.status()) ? request.status() : "Review");
        entity.setRiskSnapshot(hasText(request.riskSnapshot()) ? request.riskSnapshot() : "Pending");
        entity.setSelectedCrops(request.selectedCrops() == null ? List.of() : request.selectedCrops());
        entity.setRecommendedCrops(request.recommendedCrops() == null ? List.of() : request.recommendedCrops());
        entity.setInsights(request.insights() == null ? List.of() : request.insights());
        entity.setReportNotes(request.reportNotes());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
