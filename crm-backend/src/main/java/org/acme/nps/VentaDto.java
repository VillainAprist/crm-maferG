package org.acme.nps;

public record VentaDto(
    long idVenta,
    long idLote,
    String codigoLote,
    String nombrePrenda,
    long idCliente,
    String nombreCliente,
    int cantidadVendida,
    String unidadVenta,
    double precioUnitario,
    int descuentoPorcentaje,
    double montoTotal,
    String tokenQr,
    String fechaVenta,
    double costoUnitarioLote
) {}

