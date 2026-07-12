package org.acme.nps;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import io.agroal.api.AgroalDataSource;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;

@Path("/api/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    AgroalDataSource dataSource;

    @Inject
    TokenService tokenService;

    public record LoginRequest(String username, String password) {}

    @POST
    @Path("/login")
    public Response login(LoginRequest request) {
        if (request == null || request.username() == null || request.password() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Usuario y contraseña son requeridos."))
                    .build();
        }

        String username = request.username().trim().toLowerCase();
        String password = request.password();

        try (Connection conn = dataSource.getConnection()) {
            // Buscar usuario y su rol
            String sql = "SELECT u.id_usuario, u.password_hash, u.activo, u.intentos_fallidos, u.bloqueado_hasta, u.nombres, r.nombre_rol " +
                         "FROM usuario u JOIN rol r ON u.id_rol = r.id_rol " +
                         "WHERE u.username = ?";
            
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, username);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        return Response.status(Response.Status.UNAUTHORIZED)
                                .entity(Map.of("error", "Usuario o contraseña incorrectos."))
                                .build();
                    }

                    long idUsuario = rs.getLong("id_usuario");
                    String dbHash = rs.getString("password_hash");
                    boolean activo = rs.getBoolean("activo");
                    int intentosFallidos = rs.getInt("intentos_fallidos");
                    Timestamp bloqueadoHasta = rs.getTimestamp("bloqueado_hasta");
                    String nombres = rs.getString("nombres");
                    String nombreRol = rs.getString("nombre_rol");

                    if (!activo) {
                        return Response.status(Response.Status.FORBIDDEN)
                                .entity(Map.of("error", "Esta cuenta está inactiva. Contacta al administrador."))
                                .build();
                    }

                    // Validar bloqueo temporal (10 minutos)
                    if (bloqueadoHasta != null) {
                        Instant limite = bloqueadoHasta.toInstant();
                        if (limite.isAfter(Instant.now())) {
                            long minutosRestantes = java.time.Duration.between(Instant.now(), limite).toMinutes() + 1;
                            return Response.status(Response.Status.FORBIDDEN)
                                    .entity(Map.of("error", "Cuenta bloqueada temporalmente. Intenta de nuevo en " + minutosRestantes + " minuto(s)."))
                                    .build();
                        }
                    }

                    // Verificar contraseña con PasswordHasher
                    boolean pwValida = PasswordHasher.checkPassword(password, dbHash);

                    if (pwValida) {
                        // Resetear intentos fallidos
                        try (PreparedStatement psReset = conn.prepareStatement(
                                "UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = ?")) {
                            psReset.setLong(1, idUsuario);
                            psReset.executeUpdate();
                        }

                        // Mapear rol de base de datos a los roles usados en el frontend
                        String frontendRole = "operador"; // default fallback
                        if ("ADMINISTRADOR".equalsIgnoreCase(nombreRol)) {
                            frontendRole = "admin";
                        } else if ("ATENCION_CLIENTE".equalsIgnoreCase(nombreRol)) {
                            frontendRole = "soporte";
                        } else if ("OPERADOR".equalsIgnoreCase(nombreRol)) {
                            frontendRole = "operador";
                        } else if ("VENTAS".equalsIgnoreCase(nombreRol)) {
                            frontendRole = "ventas";
                        }

                        // Generar Token JWT
                        String token = tokenService.generarToken(username, frontendRole, nombres);

                        return Response.ok(Map.of(
                                "token", token,
                                "username", username,
                                "role", frontendRole,
                                "nombres", nombres
                        )).build();

                    } else {
                        // Incrementar intentos fallidos
                        intentosFallidos++;
                        if (intentosFallidos >= 5) {
                            Instant desbloqueo = Instant.now().plusSeconds(600); // 10 minutos
                            try (PreparedStatement psLock = conn.prepareStatement(
                                    "UPDATE usuario SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id_usuario = ?")) {
                                psLock.setInt(1, intentosFallidos);
                                psLock.setTimestamp(2, Timestamp.from(desbloqueo));
                                psLock.setLong(3, idUsuario);
                                psLock.executeUpdate();
                            }
                            return Response.status(Response.Status.FORBIDDEN)
                                    .entity(Map.of("error", "Contraseña incorrecta. Has alcanzado el número máximo de intentos. Cuenta bloqueada por 10 minutos."))
                                    .build();
                        } else {
                            try (PreparedStatement psInc = conn.prepareStatement(
                                    "UPDATE usuario SET intentos_fallidos = ? WHERE id_usuario = ?")) {
                                psInc.setInt(1, intentosFallidos);
                                psInc.setLong(2, idUsuario);
                                psInc.executeUpdate();
                            }
                            return Response.status(Response.Status.UNAUTHORIZED)
                                    .entity(Map.of("error", "Usuario o contraseña incorrectos. Intentos fallidos: " + intentosFallidos + "/5."))
                                    .build();
                        }
                    }
                }
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Error interno en el servidor de autenticación: " + e.getMessage()))
                    .build();
        }
    }
}
