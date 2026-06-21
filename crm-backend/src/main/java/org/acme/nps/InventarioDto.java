package org.acme.nps;

public record InventarioDto(
    long idProducto,
    String nombrePrenda,
    String sku,
    String categoriaInfantil,
    int totalProducido,
    int totalVendido,
    int stockDisponible
) {}
