package org.acme.nps;

public record LoteResumenDto(
    String codigoLote,
    String nombrePrenda,
    String sku,
    String categoriaInfantil,
    String fechaConfeccion,
    boolean yaRespondido,
    int cantidad
) {}
