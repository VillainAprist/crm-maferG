package org.acme.nps;

import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class NpsAdminService {

    @Inject
    AgroalDataSource dataSource;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault());
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.systemDefault());

    public record Alerta(
            String id, 
            String cliente, 
            String lote, 
            int puntuacion, 
            String ciudad, 
            String estado,
            String email,
            String telefono,
            String comentario
    ) {}
    public record Cupon(String codigo, String cliente, String estado, String vence) {}
    public record Evento(String hora, String titulo, String meta) {}
    public record Resumen(
            int npsEstimado,
            int totalEncuestas,
            int respuestasHoy,
            int detractores,
            int pasivos,
            int promotores,
            int alertasPendientes,
            List<Evento> ultimosEventos
    ) {}
    public record EvaluacionDetalle(
            long id,
            String cliente,
            String tipoCliente,
            String email,
            String telefono,
            String lote,
            int puntuacion,
            String clasificacion,
            String comentario,
            String fecha,
            String ciudad
    ) {}

    public List<Alerta> obtenerAlertas() {
        List<Alerta> alertas = new ArrayList<>();
        String sql = "SELECT ac.id_alerta, c.nombre_razon_social, lp.codigo_lote, e.puntuacion, c.ciudad, ac.estado, c.email, c.telefono, e.comentario_calidad " +
                     "FROM alerta_calidad ac " +
                     "JOIN evaluacion_nps e ON ac.id_evaluacion = e.id_evaluacion " +
                     "JOIN cliente c ON e.id_cliente = c.id_cliente " +
                     "JOIN lote_produccion lp ON e.id_lote = lp.id_lote " +
                     "ORDER BY ac.id_alerta DESC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                long idAlerta = rs.getLong("id_alerta");
                String formattedId = "ALT-" + String.format("%04d", idAlerta);
                alertas.add(new Alerta(
                        formattedId,
                        rs.getString("nombre_razon_social"),
                        rs.getString("codigo_lote"),
                        rs.getInt("puntuacion"),
                        rs.getString("ciudad"),
                        rs.getString("estado"),
                        rs.getString("email"),
                        rs.getString("telefono"),
                        rs.getString("comentario_calidad")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar alertas: " + e.getMessage(), e);
        }
        return alertas;
    }

    public List<EvaluacionDetalle> obtenerEvaluaciones() {
        List<EvaluacionDetalle> evaluaciones = new ArrayList<>();
        String sql = "SELECT e.id_evaluacion, c.nombre_razon_social, c.tipo_cliente, c.email, c.telefono, lp.codigo_lote, " +
                     "e.puntuacion, e.clasificacion, e.comentario_calidad, e.fecha_registro, c.ciudad " +
                     "FROM evaluacion_nps e " +
                     "JOIN cliente c ON e.id_cliente = c.id_cliente " +
                     "JOIN lote_produccion lp ON e.id_lote = lp.id_lote " +
                     "ORDER BY e.id_evaluacion DESC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                java.sql.Timestamp fechaTs = rs.getTimestamp("fecha_registro");
                String fecha = fechaTs != null ? DATE_FORMATTER.format(fechaTs.toInstant()) : "";
                evaluaciones.add(new EvaluacionDetalle(
                        rs.getLong("id_evaluacion"),
                        rs.getString("nombre_razon_social"),
                        rs.getString("tipo_cliente"),
                        rs.getString("email"),
                        rs.getString("telefono"),
                        rs.getString("codigo_lote"),
                        rs.getInt("puntuacion"),
                        rs.getString("clasificacion"),
                        rs.getString("comentario_calidad"),
                        fecha,
                        rs.getString("ciudad")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar evaluaciones: " + e.getMessage(), e);
        }
        return evaluaciones;
    }

    @Transactional
    public void resolverAlerta(String idStr, String comentario) {
        long idAlerta;
        try {
            if (idStr.startsWith("ALT-")) {
                idAlerta = Long.parseLong(idStr.substring(4));
            } else {
                idAlerta = Long.parseLong(idStr);
            }
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Formato de ID de alerta invalido: " + idStr);
        }

        String comment = (comentario == null || comentario.trim().isBlank()) 
                ? "Atendido por el equipo de calidad." 
                : comentario.trim();

        String sql = "UPDATE alerta_calidad SET estado = 'RESUELTA', comentario_resolucion = ?, fecha_resolucion = now() WHERE id_alerta = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, comment);
            ps.setLong(2, idAlerta);
            int rows = ps.executeUpdate();
            if (rows == 0) {
                throw new NpsException("No se encontro la alerta con ID: " + idStr);
            }
        } catch (Exception e) {
            if (e instanceof NpsException) throw (NpsException) e;
            throw new RuntimeException("Error al resolver alerta: " + e.getMessage(), e);
        }
    }

    public void desactivarCupon(String codigo) {
        String sql = "UPDATE cupon_fidelizacion SET estado = 'EXPIRADO' WHERE codigo_hash = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, codigo);
            int rows = ps.executeUpdate();
            if (rows == 0) {
                throw new IllegalArgumentException("Código de cupón no encontrado: " + codigo);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al desactivar cupón: " + e.getMessage(), e);
        }
    }

    public List<Cupon> obtenerCupones() {
        List<Cupon> cupones = new ArrayList<>();
        String sql = "SELECT cf.codigo_hash, c.nombre_razon_social, cf.estado, cf.fecha_expiracion " +
                     "FROM cupon_fidelizacion cf " +
                     "JOIN evaluacion_nps e ON cf.id_evaluacion = e.id_evaluacion " +
                     "JOIN cliente c ON e.id_cliente = c.id_cliente " +
                     "ORDER BY cf.id_cupon DESC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                java.sql.Timestamp venceTs = rs.getTimestamp("fecha_expiracion");
                String vence = venceTs != null ? DATE_FORMATTER.format(venceTs.toInstant()) : "";
                cupones.add(new Cupon(
                        rs.getString("codigo_hash"),
                        rs.getString("nombre_razon_social"),
                        rs.getString("estado"),
                        vence
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar cupones: " + e.getMessage(), e);
        }
        return cupones;
    }

    public Resumen obtenerResumen() {
        int promotores = 0;
        int detractores = 0;
        int total = 0;
        int respuestasHoy = 0;
        int alertasPendientes = 0;

        String npsSql = "SELECT " +
                        "  COUNT(*) FILTER (WHERE puntuacion >= 9) as prom, " +
                        "  COUNT(*) FILTER (WHERE puntuacion <= 6) as detr, " +
                        "  COUNT(*) as tot " +
                        "FROM evaluacion_nps";

        String hoySql = "SELECT COUNT(*) FROM evaluacion_nps WHERE fecha_registro >= CURRENT_DATE";
        
        String alertasPendientesSql = "SELECT COUNT(*) FROM alerta_calidad WHERE estado = 'PENDIENTE'";

        try (Connection conn = dataSource.getConnection()) {
            
            // NPS & Totales
            try (PreparedStatement ps = conn.prepareStatement(npsSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    promotores = rs.getInt("prom");
                    detractores = rs.getInt("detr");
                    total = rs.getInt("tot");
                }
            }

            // Hoy
            try (PreparedStatement ps = conn.prepareStatement(hoySql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    respuestasHoy = rs.getInt(1);
                }
            }

            // Alertas Pendientes
            try (PreparedStatement ps = conn.prepareStatement(alertasPendientesSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    alertasPendientes = rs.getInt(1);
                }
            }

            // Calcular NPS Estimado
            int npsEstimado = 0;
            if (total > 0) {
                double pctPromotores = (promotores * 100.0) / total;
                double pctDetractores = (detractores * 100.0) / total;
                npsEstimado = (int) Math.round(pctPromotores - pctDetractores);
            }

            // Construir línea de tiempo de últimos eventos
            List<Evento> eventos = obtenerUltimosEventos(conn);

            int pasivos = total - (promotores + detractores);
            return new Resumen(
                    npsEstimado,
                    total,
                    respuestasHoy,
                    detractores,
                    pasivos,
                    promotores,
                    alertasPendientes,
                    eventos
            );

        } catch (Exception e) {
            throw new RuntimeException("Error al obtener resumen: " + e.getMessage(), e);
        }
    }

    private List<Evento> obtenerUltimosEventos(Connection conn) throws Exception {
        List<Evento> eventos = new ArrayList<>();
        
        // Alertas recientes
        String sqlAlertas = "SELECT ac.id_alerta, c.ciudad, ac.fecha_disparo " +
                            "FROM alerta_calidad ac " +
                            "JOIN evaluacion_nps e ON ac.id_evaluacion = e.id_evaluacion " +
                            "JOIN cliente c ON e.id_cliente = c.id_cliente " +
                            "ORDER BY ac.fecha_disparo DESC LIMIT 3";
        
        try (PreparedStatement ps = conn.prepareStatement(sqlAlertas);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                long idAlerta = rs.getLong("id_alerta");
                String idStr = "ALT-" + String.format("%04d", idAlerta);
                String hora = TIME_FORMATTER.format(rs.getTimestamp("fecha_disparo").toInstant());
                eventos.add(new Evento(
                        hora,
                        "Nueva alerta " + idStr,
                        "(" + rs.getString("ciudad") + ")"
                ));
            }
        }

        // Cupones recientes
        String sqlCupones = "SELECT cf.codigo_hash, cf.fecha_generacion " +
                            "FROM cupon_fidelizacion cf " +
                            "ORDER BY cf.fecha_generacion DESC LIMIT 3";
        
        try (PreparedStatement ps = conn.prepareStatement(sqlCupones);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String hora = TIME_FORMATTER.format(rs.getTimestamp("fecha_generacion").toInstant());
                eventos.add(new Evento(
                        hora,
                        "Cupon " + rs.getString("codigo_hash") + " generado",
                        ""
                ));
            }
        }

        // Combinar y ordenar por hora descendente (en un entorno real usaríamos un timestamp completo para ordenar)
        eventos.sort((e1, e2) -> e2.hora().compareTo(e1.hora()));
        
        // Limitar a los 5 más recientes
        if (eventos.size() > 5) {
            return eventos.subList(0, 5);
        }
        return eventos;
    }

    public List<ProductoDto> obtenerProductos() {
        List<ProductoDto> productos = new ArrayList<>();
        String sql = "SELECT id_producto, sku, nombre_prenda, categoria_infantil FROM producto ORDER BY nombre_prenda ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                productos.add(new ProductoDto(
                        rs.getLong("id_producto"),
                        rs.getString("sku"),
                        rs.getString("nombre_prenda"),
                        rs.getString("categoria_infantil")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar productos: " + e.getMessage(), e);
        }
        return productos;
    }

    public List<LoteDto> obtenerLotes() {
        List<LoteDto> lotes = new ArrayList<>();
        String sql = "SELECT l.id_lote, l.codigo_lote, l.token_qr, l.fecha_confeccion, l.cantidad, p.nombre_prenda, p.sku, " +
                     "l.id_maquina, m.codigo_maquina, m.nombre_maquina " +
                     "FROM lote_produccion l " +
                     "JOIN producto p ON l.id_producto = p.id_producto " +
                     "LEFT JOIN maquina m ON l.id_maquina = m.id_maquina " +
                     "ORDER BY l.id_lote DESC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                java.sql.Timestamp confeccionTs = rs.getTimestamp("fecha_confeccion");
                String fecha = confeccionTs != null ? DATE_FORMATTER.format(confeccionTs.toInstant()) : "";
                
                Long idMaquina = rs.getObject("id_maquina") != null ? rs.getLong("id_maquina") : null;
                String codigoMaquina = rs.getString("codigo_maquina");
                String nombreMaquina = rs.getString("nombre_maquina");
                
                lotes.add(new LoteDto(
                        rs.getLong("id_lote"),
                        rs.getString("codigo_lote"),
                        rs.getObject("token_qr").toString(),
                        fecha,
                        rs.getString("nombre_prenda"),
                        rs.getString("sku"),
                        rs.getInt("cantidad"),
                        idMaquina,
                        codigoMaquina,
                        nombreMaquina
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar lotes: " + e.getMessage(), e);
        }
        return lotes;
    }

    @Transactional
    public LoteDto registrarLote(LoteCrearRequest request) {
        if (request.codigoLote() == null || request.codigoLote().isBlank()) {
            throw new IllegalArgumentException("El código de lote es obligatorio.");
        }
        
        UUID tokenQr = UUID.randomUUID();
        
        try (Connection conn = dataSource.getConnection()) {
            // Obtener un operador ID
            long idUsuario = -1;
            try (PreparedStatement ps = conn.prepareStatement("SELECT id_usuario FROM usuario WHERE username = 'operador.demo' LIMIT 1")) {
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        idUsuario = rs.getLong("id_usuario");
                    }
                }
            }
            if (idUsuario == -1) {
                // Si no se encuentra operador.demo, tomar el primer usuario
                try (PreparedStatement ps = conn.prepareStatement("SELECT id_usuario FROM usuario LIMIT 1")) {
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            idUsuario = rs.getLong("id_usuario");
                        } else {
                            throw new NpsException("No hay usuarios en base de datos para asignar al lote.");
                        }
                    }
                }
            }

            // Insertar Lote
            long idLote;
            String sqlInsert = "INSERT INTO lote_produccion (id_producto, id_usuario, id_maquina, codigo_lote, token_qr, fecha_confeccion, cantidad) VALUES (?, ?, ?, ?, ?, now(), ?)";
            try (PreparedStatement ps = conn.prepareStatement(sqlInsert, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, request.idProducto());
                ps.setLong(2, idUsuario);
                if (request.idMaquina() != null) {
                    ps.setLong(3, request.idMaquina());
                } else {
                    ps.setNull(3, java.sql.Types.BIGINT);
                }
                ps.setString(4, request.codigoLote().trim());
                ps.setObject(5, tokenQr);
                ps.setInt(6, request.cantidad() > 0 ? request.cantidad() : 1);
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        idLote = rs.getLong(1);
                    } else {
                        throw new NpsException("Error al generar ID para el lote.");
                    }
                }
            }

            // Devolver Lote creado
            String sqlSelect = "SELECT l.codigo_lote, l.fecha_confeccion, l.cantidad, p.nombre_prenda, p.sku, " +
                               "l.id_maquina, m.codigo_maquina, m.nombre_maquina " +
                               "FROM lote_produccion l " +
                               "JOIN producto p ON l.id_producto = p.id_producto " +
                               "LEFT JOIN maquina m ON l.id_maquina = m.id_maquina " +
                               "WHERE l.id_lote = ?";
            try (PreparedStatement ps = conn.prepareStatement(sqlSelect)) {
                ps.setLong(1, idLote);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        java.sql.Timestamp confeccionTs = rs.getTimestamp("fecha_confeccion");
                        String fecha = confeccionTs != null ? DATE_FORMATTER.format(confeccionTs.toInstant()) : "";
                        
                        Long idMaquina = rs.getObject("id_maquina") != null ? rs.getLong("id_maquina") : null;
                        String codigoMaquina = rs.getString("codigo_maquina");
                        String nombreMaquina = rs.getString("nombre_maquina");
                        
                        return new LoteDto(
                                idLote,
                                rs.getString("codigo_lote"),
                                tokenQr.toString(),
                                fecha,
                                rs.getString("nombre_prenda"),
                                rs.getString("sku"),
                                rs.getInt("cantidad"),
                                idMaquina,
                                codigoMaquina,
                                nombreMaquina
                        );
                    } else {
                        throw new NpsException("Lote creado no encontrado.");
                    }
                }
            }
        } catch (Exception e) {
            if (e instanceof NpsException || e instanceof IllegalArgumentException) {
                throw new RuntimeException(e.getMessage(), e);
            }
            throw new RuntimeException("Error al registrar lote en base de datos: " + e.getMessage(), e);
        }
    }

    public List<MaquinaDto> obtenerMaquinas() {
        List<MaquinaDto> maquinas = new ArrayList<>();
        String sql = "SELECT id_maquina, codigo_maquina, nombre_maquina, tipo_maquina, activo FROM maquina ORDER BY id_maquina DESC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                maquinas.add(new MaquinaDto(
                        rs.getLong("id_maquina"),
                        rs.getString("codigo_maquina"),
                        rs.getString("nombre_maquina"),
                        rs.getString("tipo_maquina"),
                        rs.getBoolean("activo")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar maquinas: " + e.getMessage(), e);
        }
        return maquinas;
    }

    @Transactional
    public MaquinaDto registrarMaquina(MaquinaDto request) {
        if (request.codigoMaquina() == null || request.codigoMaquina().isBlank()) {
            throw new IllegalArgumentException("El código de máquina es obligatorio.");
        }
        if (request.nombreMaquina() == null || request.nombreMaquina().isBlank()) {
            throw new IllegalArgumentException("El nombre de máquina es obligatorio.");
        }
        
        String sql = "INSERT INTO maquina (codigo_maquina, nombre_maquina, tipo_maquina, activo) VALUES (?, ?, ?, ?) RETURNING id_maquina";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, request.codigoMaquina().trim().toUpperCase());
            ps.setString(2, request.nombreMaquina().trim());
            ps.setString(3, request.tipoMaquina() != null ? request.tipoMaquina().trim() : null);
            ps.setBoolean(4, request.activo());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    long id = rs.getLong(1);
                    return new MaquinaDto(id, request.codigoMaquina().trim().toUpperCase(), request.nombreMaquina().trim(), request.tipoMaquina(), request.activo());
                } else {
                    throw new NpsException("Error al generar ID para la máquina.");
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al registrar máquina: " + e.getMessage(), e);
        }
    }
}
