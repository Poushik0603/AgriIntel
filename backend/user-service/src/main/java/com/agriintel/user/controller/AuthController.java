package com.agriintel.user.controller;

import com.agriintel.user.dto.AuthResponse;
import com.agriintel.user.dto.LoginRequest;
import com.agriintel.user.dto.ProfileResponse;
import com.agriintel.user.dto.ProfileUpdateRequest;
import com.agriintel.user.dto.RegisterRequest;
import com.agriintel.user.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/user/profile")
    public ProfileResponse getProfile(Authentication authentication) {
        return authService.getProfile(authentication.getName());
    }

    @PutMapping("/user/profile")
    public ProfileResponse updateProfile(Authentication authentication, @Valid @RequestBody ProfileUpdateRequest request) {
        return authService.updateProfile(authentication.getName(), request);
    }
}
