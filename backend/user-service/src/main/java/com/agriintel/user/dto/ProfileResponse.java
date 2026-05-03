package com.agriintel.user.dto;

import com.agriintel.user.entity.Role;

public record ProfileResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        String organization,
        String workAddress,
        int profileCompletion
) {
}
