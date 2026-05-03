package com.agriintel.user.service;

import com.agriintel.user.dto.AuthResponse;
import com.agriintel.user.dto.LoginRequest;
import com.agriintel.user.dto.ProfileResponse;
import com.agriintel.user.dto.ProfileUpdateRequest;
import com.agriintel.user.dto.RegisterRequest;
import com.agriintel.user.entity.AppUser;
import com.agriintel.user.exception.AuthenticationException;
import com.agriintel.user.exception.ResourceConflictException;
import com.agriintel.user.repository.AppUserRepository;
import com.agriintel.user.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AppUserRepository appUserRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (appUserRepository.existsByEmail(request.email())) {
            throw new ResourceConflictException("Email already registered");
        }

        AppUser user = new AppUser();
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setOrganization(request.organization());
        user.setWorkAddress(request.workAddress());
        AppUser savedUser = appUserRepository.save(user);

        String token = jwtService.generateToken(User.withUsername(savedUser.getEmail())
                .password(savedUser.getPassword())
                .roles(savedUser.getRole().name())
                .build());

        return toAuthResponse(savedUser, token);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (Exception ex) {
            throw new AuthenticationException("Invalid credentials");
        }

        AppUser user = appUserRepository.findByEmail(request.email())
                .orElseThrow(() -> new AuthenticationException("Invalid credentials"));

        String token = jwtService.generateToken(User.withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .build());

        return toAuthResponse(user, token);
    }

    public ProfileResponse getProfile(String email) {
        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new AuthenticationException("User not found"));
        return toProfileResponse(user);
    }

    public ProfileResponse updateProfile(String email, ProfileUpdateRequest request) {
        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new AuthenticationException("User not found"));

        user.setFullName(request.fullName());
        user.setOrganization(request.organization());
        user.setWorkAddress(request.workAddress());

        return toProfileResponse(appUserRepository.save(user));
    }

    private AuthResponse toAuthResponse(AppUser user, String token) {
        return new AuthResponse(
                user.getId(),
                token,
                user.getEmail(),
                user.getRole(),
                user.getFullName(),
                user.getOrganization(),
                user.getWorkAddress(),
                calculateProfileCompletion(user)
        );
    }

    private ProfileResponse toProfileResponse(AppUser user) {
        return new ProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getOrganization(),
                user.getWorkAddress(),
                calculateProfileCompletion(user)
        );
    }

    private int calculateProfileCompletion(AppUser user) {
        int completed = 0;
        if (hasText(user.getFullName())) {
            completed++;
        }
        if (hasText(user.getEmail())) {
            completed++;
        }
        if (hasText(user.getOrganization())) {
            completed++;
        }
        if (hasText(user.getWorkAddress())) {
            completed++;
        }
        return completed * 25;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
