package org.acme.nps;

public record LoteResumenDto(
    String codigoLote,
    String nombrePrenda,
    String sku,
    String categoriaInfantil,
    String fechaConfeccion,
    boolean yaRespondido,
    int cantidad,
    Long idMaquina,
    String codigoMaquina,
    String nombreMaquina,
    String clienteNombre,
    String clienteEmail,
    String clienteTelefono,
    String clienteCiudad,
    String clienteTipo
) {}
