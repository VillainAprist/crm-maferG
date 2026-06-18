package org.acme.nps;

public record NpsIngestaRequest(
        String tokenQr,
        int puntuacion,
        String comentario,
        String email,
        String telefono,
        String nombre,
        String ciudad,
        boolean mayorista) {
}
