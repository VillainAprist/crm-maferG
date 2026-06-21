package org.acme.nps;

public record ClienteDto(
    long idCliente,
    String tipoCliente,
    String nombreRazonSocial,
    String email,
    String telefono,
    String ciudad
) {}
