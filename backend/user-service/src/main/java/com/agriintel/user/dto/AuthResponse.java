package com.agriintel.user.dto;

import com.agriintel.user.entity.Role;

public record AuthResponse(Long id,
                           String token,
                           String email,
                           Role role,
                           String fullName,
                           String organization,
                           String workAddress,
                           int profileCompletion) {
}
