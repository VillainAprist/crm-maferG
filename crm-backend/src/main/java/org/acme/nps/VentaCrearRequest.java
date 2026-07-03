package org.acme.nps;

public record VentaCrearRequest(
    long idLote,
    Long idCliente,
    String clienteNombre,
    String clienteTipo,
    String clienteEmail,
    String clienteTelefono,
    String clienteCiudad,
    int cantidadVendida,       // siempre en unidades (el frontend convierte docenas)
    double precioUnitario,     // precio por unidad o por docena, según unidadVenta (el backend divide por 12 en caso de docenas)
    String unidadVenta,        // "UNIDAD" | "DOCENA"
    String codigoCupon
) {}
