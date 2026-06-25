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

                // 3. Asegurar tabla lote_proceso
                try {
                    stmt.execute("CREATE TABLE IF NOT EXISTS lote_proceso (" +
                                 "  id_proceso BIGSERIAL PRIMARY KEY, " +
                                 "  id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE, " +
                                 "  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario), " +
                                 "  id_maquina BIGINT REFERENCES maquina(id_maquina), " +
                                 "  operacion VARCHAR(150) NOT NULL, " +
                                 "  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()" +
                                 ")");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar la tabla lote_proceso: " + ex.getMessage());
                }

                // 4. Asegurar tabla venta
                try {
                    stmt.execute("CREATE TABLE IF NOT EXISTS venta (" +
                                 "  id_venta BIGSERIAL PRIMARY KEY, " +
                                 "  id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE, " +
                                 "  id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente), " +
                                 "  cantidad_vendida INT NOT NULL CHECK (cantidad_vendida > 0), " +
                                 "  token_qr UUID NOT NULL UNIQUE, " +
                                 "  fecha_venta TIMESTAMPTZ NOT NULL DEFAULT now()" +
                                 ")");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar la tabla venta: " + ex.getMessage());
                }

                // 5. Asegurar columna id_venta en evaluacion_nps
                try {
                    stmt.execute("ALTER TABLE evaluacion_nps ADD COLUMN IF NOT EXISTS id_venta BIGINT REFERENCES venta(id_venta) ON DELETE SET NULL");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar la columna id_venta en evaluacion_nps: " + ex.getMessage());
                }

                // 6. Asegurar columna id_venta_uso en cupon_fidelizacion
                try {
                    stmt.execute("ALTER TABLE cupon_fidelizacion ADD COLUMN IF NOT EXISTS id_venta_uso BIGINT REFERENCES venta(id_venta) ON DELETE SET NULL");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar la columna id_venta_uso en cupon_fidelizacion: " + ex.getMessage());
                }

                // 7. Asegurar columnas de precio en venta (POS con docenas y precio libre)
                try {
                    stmt.execute("ALTER TABLE venta ADD COLUMN IF NOT EXISTS precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0");
                    stmt.execute("ALTER TABLE venta ADD COLUMN IF NOT EXISTS unidad_venta VARCHAR(10) NOT NULL DEFAULT 'UNIDAD'");
                    stmt.execute("ALTER TABLE venta ADD COLUMN IF NOT EXISTS descuento_porcentaje INT NOT NULL DEFAULT 0");
                    stmt.execute("ALTER TABLE venta ADD COLUMN IF NOT EXISTS monto_total DECIMAL(10,2) NOT NULL DEFAULT 0");
                } catch (Exception ex) {
                    LOG.warn("No se pudo asegurar las columnas de precio en venta: " + ex.getMessage());
                }

                // 7. Ejecutar esquema general (con seeds e índices)
                stmt.execute(sql);
                LOG.info("Database schema initialized/verified successfully.");
            }
        } catch (Exception e) {
            LOG.error("Failed to initialize database schema", e);
        }
    }
}
