package com.agriintel.price.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "crop_base_prices")
public class CropBasePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String cropName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCropName() {
        return cropName;
    }

    public void setCropName(String cropName) {
        this.cropName = cropName;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }
}
