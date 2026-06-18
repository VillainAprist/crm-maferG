package org.acme.nps;

public record ProductoDto(
    long id,
    String sku,
    String nombrePrenda,
    String categoriaInfantil
) {}
