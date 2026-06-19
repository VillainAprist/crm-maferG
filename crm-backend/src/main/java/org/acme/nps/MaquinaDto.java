package org.acme.nps;

public record MaquinaDto(
    long idMaquina,
    String codigoMaquina,
    String nombreMaquina,
    String tipoMaquina,
    boolean activo
) {}
