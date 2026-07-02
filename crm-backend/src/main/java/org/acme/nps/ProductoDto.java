package org.acme.nps;

public record ProductoDto(
    long id,
    String sku,
    String nombrePrenda,
    String categoriaInfantil,
    String descripcion,
    double precio,
    String material,
    String cuidados,
    String imagenUrl
) {}

