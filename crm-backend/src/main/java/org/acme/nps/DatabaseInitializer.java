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
        LOG.info("Initializing 28-table PostgreSQL database schema from schema_maferg.sql...");
        try (Connection conn = dataSource.getConnection();
             InputStream is = getClass().getResourceAsStream("/db/schema_maferg.sql")) {
            
            if (is == null) {
                LOG.error("schema_maferg.sql not found in resources!");
                return;
            }
            
            String sql = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(sql);
                LOG.info("Database schema initialized and seeded successfully (28 tables in 3FN).");
            }
        } catch (Exception e) {
            LOG.error("Failed to initialize database schema", e);
        }
    }
}
