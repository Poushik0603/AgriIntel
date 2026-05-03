package com.agriintel.scenario.controller;

import com.agriintel.scenario.dto.ScenarioRequest;
import com.agriintel.scenario.dto.ScenarioResponse;
import com.agriintel.scenario.service.ScenarioDashboardService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/scenarios")
public class ScenarioController {

    private final ScenarioDashboardService scenarioDashboardService;

    public ScenarioController(ScenarioDashboardService scenarioDashboardService) {
        this.scenarioDashboardService = scenarioDashboardService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScenarioResponse create(@Valid @RequestBody ScenarioRequest request) {
        return scenarioDashboardService.create(request);
    }

    @GetMapping
    public List<ScenarioResponse> findAll(@RequestParam Long userId) {
        return scenarioDashboardService.findAll(userId);
    }

    @GetMapping("/{id}")
    public ScenarioResponse findById(@PathVariable Long id) {
        return scenarioDashboardService.findById(id);
    }

    @PutMapping("/{id}")
    public ScenarioResponse update(@PathVariable Long id, @Valid @RequestBody ScenarioRequest request) {
        return scenarioDashboardService.update(id, request);
    }
}
