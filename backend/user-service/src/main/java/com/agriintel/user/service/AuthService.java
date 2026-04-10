package com.agriintel.user.service;

import com.agriintel.user.dto.AuthResponse;
import com.agriintel.user.dto.LoginRequest;
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
        AppUser savedUser = appUserRepository.save(user);

        String token = jwtService.generateToken(User.withUsername(savedUser.getEmail())
                .password(savedUser.getPassword())
                .roles(savedUser.getRole().name())
                .build());

        return new AuthResponse(token, savedUser.getEmail(), savedUser.getRole());
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

        return new AuthResponse(token, user.getEmail(), user.getRole());
    }
}
