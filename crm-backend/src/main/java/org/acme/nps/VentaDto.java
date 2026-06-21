package org.acme.nps;

public record VentaDto(
    long idVenta,
    long idLote,
    String codigoLote,
    String nombrePrenda,
    long idCliente,
    String nombreCliente,
    int cantidadVendida,
    String tokenQr,
    String fechaVenta
) {}
