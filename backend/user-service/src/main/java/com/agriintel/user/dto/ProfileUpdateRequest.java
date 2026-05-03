package com.agriintel.user.dto;

import jakarta.validation.constraints.NotBlank;

public record ProfileUpdateRequest(
        @NotBlank String fullName,
        String organization,
        String workAddress
) {
}
