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

            if (schemaExists) {
                LOG.info("Database schema is already initialized. Skipping execution of schema_maferg.sql to preserve existing data.");
                // Ensure new cost-tracking tables exist even if the schema was previously initialized
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
                    LOG.info("Cost tracking tables and columns checked/created successfully.");
                }
                return;
            }

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
        } catch (Exception e) {
            LOG.error("Failed to initialize database schema", e);
        }
    }
}

