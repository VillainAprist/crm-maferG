package org.acme.nps;

public record LoteCrearRequest(
    String codigoLote,
    long idProducto,
    int cantidad,
    Long idMaquina
) {}
