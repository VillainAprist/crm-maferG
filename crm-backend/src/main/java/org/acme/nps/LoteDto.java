package org.acme.nps;

public record LoteDto(
    long idLote,
    String codigoLote,
    String tokenQr,
    String fechaConfeccion,
    String nombrePrenda,
    String sku,
    int cantidad,
    Long idMaquina,
    String codigoMaquina,
    String nombreMaquina,
    int stock,
    double costoMateriales,
    double costoManoObra,
    double costoTotal,
    double costoUnitario
) {}
