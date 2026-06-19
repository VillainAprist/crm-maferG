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
import java.sql.Statement;

@ApplicationScoped
public class DatabaseInitializer {

    private static final Logger LOG = Logger.getLogger(DatabaseInitializer.class);

    @Inject
    AgroalDataSource dataSource;

    void onStart(@Observes StartupEvent ev) {
        LOG.info("Initializing database schema if needed...");
        try (Connection conn = dataSource.getConnection();
             InputStream is = getClass().getResourceAsStream("/db/schema_maferg.sql")) {
            
            if (is == null) {
                LOG.error("schema_maferg.sql not found in resources!");
                return;
            }
            
            String sql = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            try (Statement stmt = conn.createStatement()) {
                // 1. Asegurar tabla maquina primero
                try {
                    stmt.execute("CREATE TABLE IF NOT EXISTS maquina (" +
                                 "  id_maquina BIGSERIAL PRIMARY KEY, " +
                                 "  codigo_maquina VARCHAR(80) NOT NULL UNIQUE, " +
                                 "  nombre_maquina VARCHAR(150) NOT NULL, " +
                                 "  tipo_maquina VARCHAR(100), " +
                                 "  activo BOOLEAN NOT NULL DEFAULT TRUE" +
                                 ")");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar la tabla maquina: " + ex.getMessage());
                }

                // 2. Asegurar columnas en lote_produccion si la BD ya existía
                try {
                    stmt.execute("ALTER TABLE lote_produccion ADD COLUMN IF NOT EXISTS cantidad INT NOT NULL DEFAULT 1");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar la columna cantidad en lote_produccion: " + ex.getMessage());
                }
                
                try {
                    stmt.execute("ALTER TABLE lote_produccion ADD COLUMN IF NOT EXISTS id_maquina BIGINT REFERENCES maquina(id_maquina)");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar la columna id_maquina en lote_produccion: " + ex.getMessage());
                }

                // 3. Ejecutar esquema general (con seeds e índices)
                stmt.execute(sql);
                LOG.info("Database schema initialized/verified successfully.");
            }
        } catch (Exception e) {
            LOG.error("Failed to initialize database schema", e);
        }
    }
}
