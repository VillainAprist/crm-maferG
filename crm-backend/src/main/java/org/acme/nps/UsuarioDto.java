package org.acme.nps;

public record UsuarioDto(
    long idUsuario,
    String nombres,
    String username,
    boolean activo
) {}
