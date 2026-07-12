package org.acme.nps;

import io.agroal.api.AgroalDataSource;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@ApplicationScoped
public class DatabaseInitializer {

    private static final Logger LOG = Logger.getLogger(DatabaseInitializer.class);

    @Inject
    AgroalDataSource dataSource;

    void onStart(@Observes StartupEvent ev) {
        try (Connection conn = dataSource.getConnection()) {
            boolean schemaExists = false;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'producto')")) {
                if (rs.next() && rs.getBoolean(1)) {
                    schemaExists = true;
                }
            }

            if (!schemaExists) {
                LOG.info("Initializing 28-table PostgreSQL database schema from schema_maferg.sql...");
                try (InputStream is = getClass().getResourceAsStream("/db/schema_maferg.sql")) {
                    if (is == null) {
                        LOG.error("schema_maferg.sql not found in resources!");
                        return;
                    }
                    
                    String sql = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute(sql);
                        LOG.info("Database schema initialized and seeded successfully (28 tables in 3FN).");
                    }
                }
            } else {
                LOG.info("Database schema is already initialized. Skipping execution of schema_maferg.sql to preserve existing data.");
            }

            // Always check tables and convert password hashes
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("CREATE TABLE IF NOT EXISTS lote_insumo_consumido (" +
                             "    id_insumo_consumido BIGSERIAL PRIMARY KEY," +
                             "    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE," +
                             "    nombre_material VARCHAR(100) NOT NULL," +
                             "    cantidad NUMERIC(10, 2) NOT NULL," +
                             "    unidad_medida VARCHAR(20) NOT NULL," +
                             "    costo_total NUMERIC(10, 2) NOT NULL" +
                             ")");
                stmt.execute("CREATE TABLE IF NOT EXISTS tarifa_operacion (" +
                             "    id_tarifa BIGSERIAL PRIMARY KEY," +
                             "    id_producto BIGINT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE," +
                             "    operacion VARCHAR(80) NOT NULL," +
                             "    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'DOCENA'," +
                             "    tarifa NUMERIC(10, 4) NOT NULL DEFAULT 0.0000," +
                             "    CONSTRAINT uq_producto_operacion UNIQUE (id_producto, operacion)" +
                             ")");
                stmt.execute("ALTER TABLE lote_proceso ADD COLUMN IF NOT EXISTS costo NUMERIC(10, 2) DEFAULT 0.00");
                
                // Nuevas columnas de seguridad
                stmt.execute("ALTER TABLE usuario ADD COLUMN IF NOT EXISTS intentos_fallidos INT DEFAULT 0");
                stmt.execute("ALTER TABLE usuario ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMPTZ");
                
                // Renombrar usuarios legacy de .demo a nombres limpios
                stmt.execute("UPDATE usuario SET username = 'admin' WHERE username = 'admin.demo'");
                stmt.execute("UPDATE usuario SET username = 'operador' WHERE username = 'operador.demo'");
                stmt.execute("UPDATE usuario SET username = 'soporte' WHERE username = 'soporte.demo'");
                stmt.execute("UPDATE usuario SET username = 'ventas' WHERE username = 'ventas.demo'");

                stmt.execute("UPDATE usuario SET activo = TRUE WHERE username IN ('admin', 'operador', 'soporte')");

                // Asegurar que el rol VENTAS exista
                long idRolVentas = -1;
                try (ResultSet rs = stmt.executeQuery("SELECT id_rol FROM rol WHERE nombre_rol = 'VENTAS'")) {
                    if (rs.next()) {
                        idRolVentas = rs.getLong(1);
                    }
                }
                if (idRolVentas == -1) {
                    try (java.sql.PreparedStatement ps = conn.prepareStatement("INSERT INTO rol (nombre_rol) VALUES ('VENTAS') RETURNING id_rol", java.sql.Statement.RETURN_GENERATED_KEYS)) {
                        ps.executeUpdate();
                        try (ResultSet rs = ps.getGeneratedKeys()) {
                            if (rs.next()) {
                                idRolVentas = rs.getLong(1);
                            }
                        }
                    }
                }

                // Asegurar que el usuario ventas exista
                boolean ventasUserExists = false;
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM usuario WHERE username = 'ventas'")) {
                    if (rs.next() && rs.getInt(1) > 0) {
                        ventasUserExists = true;
                    }
                }
                if (!ventasUserExists && idRolVentas != -1) {
                    try (java.sql.PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO usuario (id_rol, nombres, username, password_hash, activo) VALUES (?, 'Ventas Demo', 'ventas', 'ventas-hash', TRUE)")) {
                        ps.setLong(1, idRolVentas);
                        ps.executeUpdate();
                    }
                }

                stmt.execute("UPDATE usuario SET activo = TRUE WHERE username IN ('admin', 'operador', 'soporte', 'ventas')");
                LOG.info("Cost tracking and security tables and columns checked/created successfully.");

                // 1. Limpieza de datos de prueba erróneos (Jairo)
                stmt.execute("DELETE FROM cupon_fidelizacion WHERE id_evaluacion IN (" +
                             "  SELECT id_evaluacion FROM evaluacion_nps e " +
                             "  JOIN cliente c ON e.id_cliente = c.id_cliente " +
                             "  WHERE c.email = 'jairopequeñin@gmail.com' OR c.nombre_razon_social = 'Jairo chiquita bellaca'" +
                             ")");
                stmt.execute("DELETE FROM alerta_calidad WHERE id_evaluacion IN (" +
                             "  SELECT id_evaluacion FROM evaluacion_nps e " +
                             "  JOIN cliente c ON e.id_cliente = c.id_cliente " +
                             "  WHERE c.email = 'jairopequeñin@gmail.com' OR c.nombre_razon_social = 'Jairo chiquita bellaca'" +
                             ")");
                stmt.execute("DELETE FROM evaluacion_nps WHERE id_cliente IN (" +
                             "  SELECT id_cliente FROM cliente " +
                             "  WHERE email = 'jairopequeñin@gmail.com' OR nombre_razon_social = 'Jairo chiquita bellaca'" +
                             ")");
                stmt.execute("DELETE FROM venta WHERE id_cliente IN (" +
                             "  SELECT id_cliente FROM cliente " +
                             "  WHERE email = 'jairopequeñin@gmail.com' OR nombre_razon_social = 'Jairo chiquita bellaca'" +
                             ")");
                stmt.execute("DELETE FROM historial_reconocimiento WHERE id_cliente IN (" +
                             "  SELECT id_cliente FROM cliente " +
                             "  WHERE email = 'jairopequeñin@gmail.com' OR nombre_razon_social = 'Jairo chiquita bellaca'" +
                             ")");
                stmt.execute("DELETE FROM cliente_b2c WHERE id_cliente IN (" +
                             "  SELECT id_cliente FROM cliente " +
                             "  WHERE email = 'jairopequeñin@gmail.com' OR nombre_razon_social = 'Jairo chiquita bellaca'" +
                             ")");
                stmt.execute("DELETE FROM cliente WHERE email = 'jairopequeñin@gmail.com' OR nombre_razon_social = 'Jairo chiquita bellaca'");
                LOG.info("Test/joke data for 'Jairo chiquita bellaca' cleaned up successfully.");

                // 2. Crear restricción única sobre id_venta en evaluacion_nps si no existe
                boolean constraintExists = false;
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_evaluacion_venta')")) {
                    if (rs.next()) {
                        constraintExists = rs.getBoolean(1);
                    }
                }
                if (!constraintExists) {
                    stmt.execute("ALTER TABLE evaluacion_nps ADD CONSTRAINT uq_evaluacion_venta UNIQUE (id_venta)");
                    LOG.info("Unique constraint uq_evaluacion_venta created successfully on table evaluacion_nps.");
                }

                // Convertir contraseñas legacy a BCrypt hashes
                try (ResultSet rs = stmt.executeQuery("SELECT id_usuario, username, password_hash FROM usuario")) {
                    java.util.List<Object[]> usersToUpdate = new java.util.ArrayList<>();
                    while (rs.next()) {
                        long id = rs.getLong("id_usuario");
                        String username = rs.getString("username");
                        String hash = rs.getString("password_hash");
                        if (hash == null || !hash.contains(":")) {
                            String rawPassword;
                            if (username.contains("admin")) rawPassword = "admin123";
                            else if (username.contains("operador")) rawPassword = "operador123";
                            else if (username.contains("soporte")) rawPassword = "soporte123";
                            else if (username.contains("ventas")) rawPassword = "ventas123";
                            else if (username.contains("lucas")) rawPassword = "lucas123";
                            else if (username.contains("dennis")) rawPassword = "dennis123";
                            else if (username.contains("diego")) rawPassword = "diego123";
                            else rawPassword = username.replace(".", "") + "123";
                            
                            String pbkdf2Hash = PasswordHasher.hashPassword(rawPassword);
                            usersToUpdate.add(new Object[]{id, pbkdf2Hash});
                        }
                    }
                    for (Object[] user : usersToUpdate) {
                        try (java.sql.PreparedStatement ps = conn.prepareStatement("UPDATE usuario SET password_hash = ? WHERE id_usuario = ?")) {
                            ps.setString(1, (String) user[1]);
                            ps.setLong(2, (Long) user[0]);
                            ps.executeUpdate();
                        }
                    }
                    LOG.info("BCrypt password migration checked/applied successfully.");
                }
            }
        } catch (Exception e) {
            LOG.error("Failed to initialize database schema", e);
        }
    }
}

