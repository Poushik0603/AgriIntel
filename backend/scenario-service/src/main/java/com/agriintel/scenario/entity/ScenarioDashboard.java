package com.agriintel.scenario.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "scenario_dashboards")
public class ScenarioDashboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String location;

    private String title;

    private String status;

    private String riskSnapshot;

    @Column(length = 4000)
    private String reportNotes;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "scenario_selected_crops", joinColumns = @JoinColumn(name = "scenario_id"))
    @Column(name = "crop_name")
    private List<String> selectedCrops = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "scenario_recommended_crops", joinColumns = @JoinColumn(name = "scenario_id"))
    @Column(name = "crop_name")
    private List<String> recommendedCrops = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "scenario_insights", joinColumns = @JoinColumn(name = "scenario_id"))
    @Column(name = "insight_text", length = 1000)
    private List<String> insights = new ArrayList<>();

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRiskSnapshot() {
        return riskSnapshot;
    }

    public void setRiskSnapshot(String riskSnapshot) {
        this.riskSnapshot = riskSnapshot;
    }

    public String getReportNotes() {
        return reportNotes;
    }

    public void setReportNotes(String reportNotes) {
        this.reportNotes = reportNotes;
    }

    public List<String> getSelectedCrops() {
        return selectedCrops;
    }

    public void setSelectedCrops(List<String> selectedCrops) {
        this.selectedCrops = selectedCrops;
    }

    public List<String> getRecommendedCrops() {
        return recommendedCrops;
    }

    public void setRecommendedCrops(List<String> recommendedCrops) {
        this.recommendedCrops = recommendedCrops;
    }

    public List<String> getInsights() {
        return insights;
    }

    public void setInsights(List<String> insights) {
        this.insights = insights;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
