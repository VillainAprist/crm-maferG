package org.acme.nps;

import java.math.BigDecimal;

public record TarifaOperacionDto(
    Long idTarifa,
    long idProducto,
    String operacion,
    String unidadMedida,
    BigDecimal tarifa
) {}
