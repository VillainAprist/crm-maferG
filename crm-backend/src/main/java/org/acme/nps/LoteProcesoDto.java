package org.acme.nps;

public record LoteProcesoDto(
    long idProceso,
    long idLote,
    long idUsuario,
    String nombreOperador,
    Long idMaquina,
    String codigoMaquina,
    String nombreMaquina,
    String operacion,
    double costo,
    String fechaRegistro
) {}
