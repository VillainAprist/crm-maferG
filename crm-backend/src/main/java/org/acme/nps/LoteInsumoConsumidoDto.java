package org.acme.nps;

import java.math.BigDecimal;

public record LoteInsumoConsumidoDto(
    Long idInsumoConsumido,
    long idLote,
    String nombreMaterial,
    BigDecimal cantidad,
    String unidadMedida,
    BigDecimal costoTotal
) {}
