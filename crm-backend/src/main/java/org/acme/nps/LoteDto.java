package org.acme.nps;

public record LoteDto(
    long idLote,
    String codigoLote,
    String tokenQr,
    String fechaConfeccion,
    String nombrePrenda,
    String sku,
    int cantidad
) {}
