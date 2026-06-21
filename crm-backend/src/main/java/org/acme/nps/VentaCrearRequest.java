package org.acme.nps;

public record VentaCrearRequest(
    long idLote,
    Long idCliente,
    String clienteNombre,
    String clienteTipo,
    String clienteEmail,
    String clienteTelefono,
    String clienteCiudad,
    int cantidadVendida,
    String codigoCupon
) {}
