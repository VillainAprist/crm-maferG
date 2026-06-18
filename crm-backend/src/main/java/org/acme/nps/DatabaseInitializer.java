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
                stmt.execute(sql);
                // Asegurar columna cantidad si la BD ya existía
                try {
                    stmt.execute("ALTER TABLE lote_produccion ADD COLUMN IF NOT EXISTS cantidad INT NOT NULL DEFAULT 1");
                } catch (Exception ex) {
                    LOG.warn("No se pudo agregar la columna cantidad a lote_produccion: " + ex.getMessage());
                }
                LOG.info("Database schema initialized/verified successfully.");
            }
        } catch (Exception e) {
            LOG.error("Failed to initialize database schema", e);
        }
    }
}
