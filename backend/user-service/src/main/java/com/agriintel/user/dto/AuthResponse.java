package com.agriintel.user.dto;

import com.agriintel.user.entity.Role;

public record AuthResponse(String token, String email, Role role) {
}
