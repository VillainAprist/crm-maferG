package org.acme.nps;

public record NpsIngestaResponse(
        long idCliente,
        long idEvaluacion,
        String clasificacion,
        boolean alertaCreada,
        boolean cuponCreado,
        String codigoCupon,
        String mensaje) {
}
