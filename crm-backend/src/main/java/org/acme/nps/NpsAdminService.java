package org.acme.nps;

import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
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
            String comentario,
            long idLote
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
    public record LogAuditoria(
            long idLog,
            String usuario,
            String accion,
            String detalle,
            String fechaRegistro
    ) {}

    public List<Alerta> obtenerAlertas() {
        List<Alerta> alertas = new ArrayList<>();
        String sql = "SELECT ac.id_alerta, c.nombre_razon_social, lp.codigo_lote, e.puntuacion, c.ciudad, ac.estado, c.email, c.telefono, e.comentario_calidad, lp.id_lote " +
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
                        rs.getString("comentario_calidad"),
                        rs.getLong("id_lote")
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
        String sql = "SELECT id_producto, sku, nombre_prenda, categoria_infantil, descripcion, precio, material, cuidados, imagen_url FROM producto ORDER BY nombre_prenda ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                productos.add(new ProductoDto(
                        rs.getLong("id_producto"),
                        rs.getString("sku"),
                        rs.getString("nombre_prenda"),
                        rs.getString("categoria_infantil"),
                        rs.getString("descripcion"),
                        rs.getDouble("precio"),
                        rs.getString("material"),
                        rs.getString("cuidados"),
                        rs.getString("imagen_url")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar productos: " + e.getMessage(), e);
        }
        return productos;
    }

    @Transactional
    public ProductoDto registrarProducto(ProductoDto request) {
        if (request.sku() == null || request.sku().trim().isEmpty()) {
            throw new IllegalArgumentException("El SKU es obligatorio.");
        }
        if (request.nombrePrenda() == null || request.nombrePrenda().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de la prenda es obligatorio.");
        }

        try (Connection conn = dataSource.getConnection()) {
            // Validar SKU único
            try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM producto WHERE sku = ?")) {
                ps.setString(1, request.sku().trim());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next() && rs.getInt(1) > 0) {
                        throw new IllegalArgumentException("El SKU '" + request.sku() + "' ya está registrado.");
                    }
                }
            }

            long idProducto;
            String sqlInsert = "INSERT INTO producto (sku, nombre_prenda, categoria_infantil, descripcion, precio, material, cuidados, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            try (PreparedStatement ps = conn.prepareStatement(sqlInsert, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, request.sku().trim());
                ps.setString(2, request.nombrePrenda().trim());
                ps.setString(3, request.categoriaInfantil() != null && !request.categoriaInfantil().trim().isEmpty() ? request.categoriaInfantil().trim() : null);
                ps.setString(4, request.descripcion() != null && !request.descripcion().trim().isEmpty() ? request.descripcion().trim() : null);
                ps.setDouble(5, request.precio());
                ps.setString(6, request.material() != null && !request.material().trim().isEmpty() ? request.material().trim() : null);
                ps.setString(7, request.cuidados() != null && !request.cuidados().trim().isEmpty() ? request.cuidados().trim() : null);
                ps.setString(8, request.imagenUrl() != null && !request.imagenUrl().trim().isEmpty() ? request.imagenUrl().trim() : null);
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        idProducto = rs.getLong(1);
                    } else {
                        throw new NpsException("Error al registrar el producto.");
                    }
                }
            }

            return new ProductoDto(idProducto, request.sku().trim(), request.nombrePrenda().trim(), request.categoriaInfantil(), request.descripcion(), request.precio(), request.material(), request.cuidados(), request.imagenUrl());
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) {
                throw (IllegalArgumentException) e;
            }
            throw new RuntimeException("Error al registrar producto: " + e.getMessage(), e);
        }
    }

    @Transactional
    public ProductoDto actualizarProducto(long id, ProductoDto request) {
        if (request.nombrePrenda() == null || request.nombrePrenda().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de la prenda es obligatorio.");
        }

        String sql = "UPDATE producto SET nombre_prenda = ?, categoria_infantil = ?, descripcion = ?, precio = ?, material = ?, cuidados = ?, imagen_url = ? WHERE id_producto = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, request.nombrePrenda().trim());
            ps.setString(2, request.categoriaInfantil() != null && !request.categoriaInfantil().trim().isEmpty() ? request.categoriaInfantil().trim() : null);
            ps.setString(3, request.descripcion() != null && !request.descripcion().trim().isEmpty() ? request.descripcion().trim() : null);
            ps.setDouble(4, request.precio());
            ps.setString(5, request.material() != null && !request.material().trim().isEmpty() ? request.material().trim() : null);
            ps.setString(6, request.cuidados() != null && !request.cuidados().trim().isEmpty() ? request.cuidados().trim() : null);
            ps.setString(7, request.imagenUrl() != null && !request.imagenUrl().trim().isEmpty() ? request.imagenUrl().trim() : null);
            ps.setLong(8, id);

            int affected = ps.executeUpdate();
            if (affected == 0) {
                throw new IllegalArgumentException("No se encontró el producto con ID " + id);
            }
            return new ProductoDto(id, request.sku(), request.nombrePrenda(), request.categoriaInfantil(), request.descripcion(), request.precio(), request.material(), request.cuidados(), request.imagenUrl());
        } catch (Exception e) {
            throw new RuntimeException("Error al actualizar producto: " + e.getMessage(), e);
        }
    }

    public List<LoteDto> obtenerLotes() {
        List<LoteDto> lotes = new ArrayList<>();
        String sql = "SELECT l.id_lote, l.codigo_lote, l.token_qr, l.fecha_confeccion, l.cantidad, p.nombre_prenda, p.sku, " +
                     "l.id_maquina, m.codigo_maquina, m.nombre_maquina, " +
                     "(l.cantidad - COALESCE((SELECT SUM(cantidad_vendida) FROM venta WHERE id_lote = l.id_lote), 0)) as stock, " +
                     "COALESCE((SELECT SUM(costo_total) FROM lote_insumo_consumido WHERE id_lote = l.id_lote), 0) as costo_materiales, " +
                     "COALESCE((SELECT SUM(costo) FROM lote_proceso WHERE id_lote = l.id_lote), 0) as costo_mano_obra " +
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
                int stock = rs.getInt("stock");
                
                double costoMat = rs.getDouble("costo_materiales");
                double costoMo = rs.getDouble("costo_mano_obra");
                double costoTot = costoMat + costoMo;
                int cantidad = rs.getInt("cantidad");
                double costoUnit = cantidad > 0 ? (costoTot / cantidad) : 0.0;

                lotes.add(new LoteDto(
                        rs.getLong("id_lote"),
                        rs.getString("codigo_lote"),
                        rs.getObject("token_qr").toString(),
                        fecha,
                        rs.getString("nombre_prenda"),
                        rs.getString("sku"),
                        cantidad,
                        idMaquina,
                        codigoMaquina,
                        nombreMaquina,
                        stock,
                        costoMat,
                        costoMo,
                        costoTot,
                        costoUnit
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
            try (PreparedStatement ps = conn.prepareStatement("SELECT id_usuario FROM usuario WHERE username = 'operador' LIMIT 1")) {
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
            String sqlInsert = "INSERT INTO lote_produccion (id_producto, id_usuario, id_maquina, codigo_lote, token_qr, fecha_confeccion, cantidad, estado) VALUES (?, ?, ?, ?, ?, now(), ?, 'REGISTRADO')";
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
                               "l.id_maquina, m.codigo_maquina, m.nombre_maquina, " +
                               "l.cantidad as stock " +
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
                        int stock = rs.getInt("stock");
                        
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
                                nombreMaquina,
                                stock,
                                0.0,
                                0.0,
                                0.0,
                                0.0
                        );
                    } else {
                        throw new NpsException("Lote creado no encontrado.");
                    }
                }
            }
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) {
                throw (IllegalArgumentException) e;
            }
            throw new RuntimeException("Error al registrar lote: " + e.getMessage(), e);
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

    public List<UsuarioDto> obtenerUsuarios() {
        List<UsuarioDto> usuarios = new ArrayList<>();
        String sql = "SELECT id_usuario, nombres, username, activo FROM usuario WHERE username NOT IN ('admin', 'operador', 'soporte', 'ventas') ORDER BY nombres ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                usuarios.add(new UsuarioDto(
                    rs.getLong("id_usuario"),
                    rs.getString("nombres"),
                    rs.getString("username"),
                    rs.getBoolean("activo")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar usuarios: " + e.getMessage(), e);
        }
        return usuarios;
    }

    public List<LoteProcesoDto> obtenerProcesosPorLote(long idLote) {
        List<LoteProcesoDto> procesos = new ArrayList<>();
        String sql = "SELECT lp.id_proceso, lp.id_lote, lp.id_usuario, u.nombres as nombre_operador, " +
                     "lp.id_maquina, m.codigo_maquina, m.nombre_maquina, lp.operacion as operacion, lp.costo, lp.fecha_registro " +
                     "FROM lote_proceso lp " +
                     "JOIN usuario u ON lp.id_usuario = u.id_usuario " +
                     "LEFT JOIN maquina m ON lp.id_maquina = m.id_maquina " +
                     "JOIN tipo_operacion t_op ON lp.id_tipo_operacion = t_op.id_tipo_operacion " +
                     "WHERE lp.id_lote = ? " +
                     "ORDER BY lp.id_proceso ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idLote);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    java.sql.Timestamp ts = rs.getTimestamp("fecha_registro");
                    String fecha = ts != null ? ts.toInstant().toString().substring(0, 16).replace("T", " ") : "";
                    procesos.add(new LoteProcesoDto(
                        rs.getLong("id_proceso"),
                        rs.getLong("id_lote"),
                        rs.getLong("id_usuario"),
                        rs.getString("nombre_operador"),
                        rs.getObject("id_maquina") != null ? rs.getLong("id_maquina") : null,
                        rs.getString("codigo_maquina"),
                        rs.getString("nombre_maquina"),
                        rs.getString("operacion"),
                        rs.getDouble("costo"),
                        fecha
                    ));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar procesos del lote: " + e.getMessage(), e);
        }
        return procesos;
    }

    @Transactional
    public void actualizarCostoProceso(long idProceso, double costo) {
        String sql = "UPDATE lote_proceso SET costo = ? WHERE id_proceso = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setDouble(1, costo);
            ps.setLong(2, idProceso);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("Error al actualizar costo del proceso: " + e.getMessage(), e);
        }
    }

    @Transactional
    public LoteProcesoDto registrarProceso(long idLote, LoteProcesoDto request) {
        // Buscar el id_tipo_operacion correspondiente
        long idTipoOperacion = 1; // Por defecto OP-CORTE
        String sqlFindOp = "SELECT id_tipo_operacion FROM tipo_operacion WHERE LOWER(nombre) = LOWER(?)";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement psFind = conn.prepareStatement(sqlFindOp)) {
            psFind.setString(1, request.operacion());
            try (ResultSet rsFind = psFind.executeQuery()) {
                if (rsFind.next()) {
                    idTipoOperacion = rsFind.getLong(1);
                }
            }
        } catch (Exception e) {
            System.err.println("No se pudo mapear la operacion " + request.operacion() + ": " + e.getMessage());
        }

        String sql = "INSERT INTO lote_proceso (id_lote, id_usuario, id_maquina, id_tipo_operacion, operacion, costo) VALUES (?, ?, ?, ?, ?, ?) RETURNING id_proceso, fecha_registro";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idLote);
            ps.setLong(2, request.idUsuario());
            if (request.idMaquina() != null) {
                ps.setLong(3, request.idMaquina());
            } else {
                ps.setNull(3, java.sql.Types.BIGINT);
            }
            ps.setLong(4, idTipoOperacion);
            ps.setString(5, request.operacion());
            ps.setDouble(6, request.costo());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    long id = rs.getLong(1);
                    java.sql.Timestamp ts = rs.getTimestamp(2);
                    String fecha = ts != null ? ts.toInstant().toString().substring(0, 16).replace("T", " ") : "";
                    return new LoteProcesoDto(id, idLote, request.idUsuario(), "", request.idMaquina(), "", "", request.operacion(), request.costo(), fecha);
                }
                throw new NpsException("No se pudo registrar la operación de confección.");
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al registrar proceso de lote: " + e.getMessage(), e);
        }
    }

    public List<VentaDto> obtenerVentas() {
        List<VentaDto> ventas = new ArrayList<>();
        String sql = "SELECT v.id_venta, v.id_lote, l.codigo_lote, p.nombre_prenda, " +
                     "v.id_cliente, c.nombre_razon_social as nombre_cliente, " +
                     "v.cantidad_vendida, v.unidad_venta, v.precio_unitario, v.descuento_porcentaje, v.monto_total, " +
                     "v.token_qr, v.fecha_venta, " +
                     "CAST((COALESCE((SELECT SUM(costo_total) FROM lote_insumo_consumido WHERE id_lote = l.id_lote), 0) + " +
                     "COALESCE((SELECT SUM(costo) FROM lote_proceso WHERE id_lote = l.id_lote), 0)) / NULLIF(l.cantidad, 0) AS double precision) as costo_unitario_lote " +
                     "FROM venta v " +
                     "JOIN lote_produccion l ON v.id_lote = l.id_lote " +
                     "JOIN producto p ON l.id_producto = p.id_producto " +
                     "JOIN cliente c ON v.id_cliente = c.id_cliente " +
                     "ORDER BY v.id_venta DESC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                java.sql.Timestamp ts = rs.getTimestamp("fecha_venta");
                String fecha = ts != null ? DATE_FORMATTER.format(ts.toInstant()) : "";
                ventas.add(new VentaDto(
                    rs.getLong("id_venta"),
                    rs.getLong("id_lote"),
                    rs.getString("codigo_lote"),
                    rs.getString("nombre_prenda"),
                    rs.getLong("id_cliente"),
                    rs.getString("nombre_cliente"),
                    rs.getInt("cantidad_vendida"),
                    rs.getString("unidad_venta"),
                    rs.getDouble("precio_unitario"),
                    rs.getInt("descuento_porcentaje"),
                    rs.getDouble("monto_total"),
                    rs.getObject("token_qr").toString(),
                    fecha,
                    rs.getDouble("costo_unitario_lote")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar ventas: " + e.getMessage(), e);
        }
        return ventas;
    }

    public record VentaPorProducto(String nombrePrenda, int unidades, double monto) {}
    public record VentaPorMes(String mes, int unidades, double monto) {}
    public record ResumenVentas(
            double totalFacturado,
            int totalUnidadesVendidas,
            int totalVentas,
            double promedioVenta,
            List<VentaPorProducto> porProducto,
            List<VentaPorMes> porMes
    ) {}

    public ResumenVentas obtenerResumenVentas() {
        double totalFacturado = 0;
        int totalUnidades = 0;
        int totalVentas = 0;
        double promedioVenta = 0;
        List<VentaPorProducto> porProducto = new ArrayList<>();
        List<VentaPorMes> porMes = new ArrayList<>();

        String sqlGlobal = "SELECT COUNT(*) as total_ventas, COALESCE(SUM(monto_total),0) as total_facturado, " +
                           "COALESCE(SUM(cantidad_vendida),0) as total_unidades, " +
                           "COALESCE(AVG(NULLIF(monto_total,0)),0) as promedio FROM venta";
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(sqlGlobal);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    totalVentas = rs.getInt("total_ventas");
                    totalFacturado = rs.getDouble("total_facturado");
                    totalUnidades = rs.getInt("total_unidades");
                    promedioVenta = rs.getDouble("promedio");
                }
            }

            String sqlPorProducto = "SELECT p.nombre_prenda, COALESCE(SUM(v.cantidad_vendida),0) as unidades, " +
                                    "COALESCE(SUM(v.monto_total),0) as monto " +
                                    "FROM venta v JOIN lote_produccion l ON v.id_lote = l.id_lote " +
                                    "JOIN producto p ON l.id_producto = p.id_producto " +
                                    "GROUP BY p.id_producto, p.nombre_prenda ORDER BY monto DESC LIMIT 10";
            try (PreparedStatement ps = conn.prepareStatement(sqlPorProducto);
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    porProducto.add(new VentaPorProducto(
                        rs.getString("nombre_prenda"),
                        rs.getInt("unidades"),
                        rs.getDouble("monto")
                    ));
                }
            }

            String sqlPorMes = "SELECT TO_CHAR(fecha_venta, 'YYYY-MM') as mes, " +
                               "COALESCE(SUM(cantidad_vendida),0) as unidades, " +
                               "COALESCE(SUM(monto_total),0) as monto " +
                               "FROM venta WHERE fecha_venta >= now() - interval '6 months' " +
                               "GROUP BY TO_CHAR(fecha_venta, 'YYYY-MM') ORDER BY mes ASC";
            try (PreparedStatement ps = conn.prepareStatement(sqlPorMes);
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    porMes.add(new VentaPorMes(
                        rs.getString("mes"),
                        rs.getInt("unidades"),
                        rs.getDouble("monto")
                    ));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al obtener resumen de ventas: " + e.getMessage(), e);
        }
        return new ResumenVentas(totalFacturado, totalUnidades, totalVentas, promedioVenta, porProducto, porMes);
    }

    @Transactional
    public VentaDto registrarVenta(VentaCrearRequest request) {
        if (request.cantidadVendida() <= 0) {
            throw new IllegalArgumentException("La cantidad vendida debe ser mayor a 0.");
        }

        UUID tokenQr = UUID.randomUUID();

        try (Connection conn = dataSource.getConnection()) {
            // 0. Validar Cupón si se ingresó
            long idCupon = -1;
            if (request.codigoCupon() != null && !request.codigoCupon().isBlank()) {
                String sqlCupon = "SELECT id_cupon, estado, fecha_expiracion FROM cupon_fidelizacion WHERE codigo_hash = ?";
                try (PreparedStatement ps = conn.prepareStatement(sqlCupon)) {
                    ps.setString(1, request.codigoCupon().trim());
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            idCupon = rs.getLong("id_cupon");
                            String estado = rs.getString("estado");
                            java.sql.Timestamp exp = rs.getTimestamp("fecha_expiracion");
                            if (!"DISPONIBLE".equals(estado)) {
                                throw new IllegalArgumentException("El cupón ingresado ya fue utilizado o no está disponible.");
                            }
                            if (exp != null && exp.before(new java.util.Date())) {
                                throw new IllegalArgumentException("El cupón ingresado ha expirado.");
                            }
                        } else {
                            throw new IllegalArgumentException("El código de cupón ingresado no existe.");
                        }
                    }
                }
            }

            // 1. Validar Stock disponible
            int stockDisponible = 0;
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT (l.cantidad - COALESCE((SELECT SUM(cantidad_vendida) FROM venta WHERE id_lote = l.id_lote), 0)) as stock " +
                    "FROM lote_produccion l WHERE l.id_lote = ?")) {
                ps.setLong(1, request.idLote());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        stockDisponible = rs.getInt("stock");
                    } else {
                        throw new IllegalArgumentException("El lote con ID " + request.idLote() + " no existe.");
                    }
                }
            }

            if (request.cantidadVendida() > stockDisponible) {
                throw new IllegalArgumentException("Stock insuficiente. Disponible: " + stockDisponible + " unidades.");
            }

            // 2. Obtener o crear Cliente
            long idCliente = -1;
            if (request.idCliente() != null && request.idCliente() > 0) {
                idCliente = request.idCliente();
            } else {
                // Crear cliente
                String email = request.clienteEmail() != null ? request.clienteEmail().trim().toLowerCase() : null;
                String telefono = request.clienteTelefono() != null ? request.clienteTelefono().trim() : null;
                String nombre = request.clienteNombre() != null ? request.clienteNombre().trim() : "Cliente Venta";
                String tipo = request.clienteTipo() != null ? request.clienteTipo().trim() : "B2C";
                String ciudad = request.clienteCiudad() != null ? request.clienteCiudad().trim() : null;

                if ((email == null || email.isEmpty()) && (telefono == null || telefono.isEmpty())) {
                    throw new IllegalArgumentException("Debe ingresar correo o teléfono para registrar el cliente.");
                }

                // Buscar cliente duplicado por email o teléfono
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT id_cliente FROM cliente WHERE (email = ? AND ? IS NOT NULL) OR (telefono = ? AND ? IS NOT NULL) LIMIT 1")) {
                    ps.setString(1, email);
                    ps.setString(2, email);
                    ps.setString(3, telefono);
                    ps.setString(4, telefono);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            idCliente = rs.getLong("id_cliente");
                        }
                    }
                }

                if (idCliente == -1) {
                    try (PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO cliente (tipo_cliente, nombre_razon_social, email, telefono, ciudad) VALUES (?, ?, ?, ?, ?)",
                            java.sql.Statement.RETURN_GENERATED_KEYS)) {
                        ps.setString(1, tipo);
                        ps.setString(2, nombre);
                        if (email != null && !email.isEmpty()) ps.setString(3, email); else ps.setNull(3, java.sql.Types.VARCHAR);
                        if (telefono != null && !telefono.isEmpty()) ps.setString(4, telefono); else ps.setNull(4, java.sql.Types.VARCHAR);
                        if (ciudad != null && !ciudad.isEmpty()) ps.setString(5, ciudad); else ps.setNull(5, java.sql.Types.VARCHAR);

                        ps.executeUpdate();
                        try (ResultSet rs = ps.getGeneratedKeys()) {
                            if (rs.next()) {
                                idCliente = rs.getLong(1);
                            } else {
                                throw new NpsException("No se pudo registrar el nuevo cliente para la venta.");
                            }
                        }
                    }
                }
            }

            // 3. Registrar venta con precio, unidad y descuento
            long idVenta;
            int descuentoPct = (idCupon != -1) ? 5 : 0;
            double precioUnitario = request.precioUnitario() > 0 ? request.precioUnitario() : 0.0;
            String unidadVenta = (request.unidadVenta() != null && request.unidadVenta().equalsIgnoreCase("DOCENA")) ? "DOCENA" : "UNIDAD";
            double cantidadParaMonto = unidadVenta.equals("DOCENA") ? (request.cantidadVendida() / 12.0) : request.cantidadVendida();
            double montoTotal = precioUnitario * cantidadParaMonto * (1.0 - descuentoPct / 100.0);
            String sqlInsert = "INSERT INTO venta (id_lote, id_cliente, cantidad_vendida, token_qr, fecha_venta, precio_unitario, unidad_venta, descuento_porcentaje, monto_total) VALUES (?, ?, ?, ?, now(), ?, ?, ?, ?)";
            try (PreparedStatement ps = conn.prepareStatement(sqlInsert, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, request.idLote());
                ps.setLong(2, idCliente);
                ps.setInt(3, request.cantidadVendida());
                ps.setObject(4, tokenQr);
                ps.setDouble(5, precioUnitario);
                ps.setString(6, unidadVenta);
                ps.setInt(7, descuentoPct);
                ps.setDouble(8, montoTotal);
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        idVenta = rs.getLong(1);
                    } else {
                        throw new NpsException("Error al generar ID para la venta.");
                    }
                }
            }

            // 3.5 Si hay un cupón válido, marcarlo como usado
            if (idCupon != -1) {
                String sqlUpdateCupon = "UPDATE cupon_fidelizacion SET estado = 'USADO', fecha_uso = now(), id_venta_uso = ? WHERE id_cupon = ?";
                try (PreparedStatement ps = conn.prepareStatement(sqlUpdateCupon)) {
                    ps.setLong(1, idVenta);
                    ps.setLong(2, idCupon);
                    ps.executeUpdate();
                }
            }

            // 4. Retornar DTO de Venta
            String sqlSelect = "SELECT v.id_venta, v.id_lote, l.codigo_lote, p.nombre_prenda, " +
                               "v.id_cliente, c.nombre_razon_social as nombre_cliente, " +
                               "v.cantidad_vendida, v.unidad_venta, v.precio_unitario, v.descuento_porcentaje, v.monto_total, " +
                               "v.token_qr, v.fecha_venta, " +
                               "CAST((COALESCE((SELECT SUM(costo_total) FROM lote_insumo_consumido WHERE id_lote = l.id_lote), 0) + " +
                               "COALESCE((SELECT SUM(costo) FROM lote_proceso WHERE id_lote = l.id_lote), 0)) / NULLIF(l.cantidad, 0) AS double precision) as costo_unitario_lote " +
                               "FROM venta v " +
                               "JOIN lote_produccion l ON v.id_lote = l.id_lote " +
                               "JOIN producto p ON l.id_producto = p.id_producto " +
                               "JOIN cliente c ON v.id_cliente = c.id_cliente " +
                               "WHERE v.id_venta = ?";
            try (PreparedStatement ps = conn.prepareStatement(sqlSelect)) {
                ps.setLong(1, idVenta);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        java.sql.Timestamp ts = rs.getTimestamp("fecha_venta");
                        String fecha = ts != null ? DATE_FORMATTER.format(ts.toInstant()) : "";
                        return new VentaDto(
                            idVenta,
                            rs.getLong("id_lote"),
                            rs.getString("codigo_lote"),
                            rs.getString("nombre_prenda"),
                            rs.getLong("id_cliente"),
                            rs.getString("nombre_cliente"),
                            rs.getInt("cantidad_vendida"),
                            rs.getString("unidad_venta"),
                            rs.getDouble("precio_unitario"),
                            rs.getInt("descuento_porcentaje"),
                            rs.getDouble("monto_total"),
                            tokenQr.toString(),
                            fecha,
                            rs.getDouble("costo_unitario_lote")
                        );
                    } else {
                        throw new NpsException("Venta creada no encontrada.");
                    }
                }
            }
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException || e instanceof NpsException) {
                throw new RuntimeException(e.getMessage(), e);
            }
            throw new RuntimeException("Error en base de datos al registrar venta: " + e.getMessage(), e);
        }
    }

    public List<ClienteDto> obtenerClientes() {
        List<ClienteDto> clientes = new ArrayList<>();
        String sql = "SELECT id_cliente, tipo_cliente, nombre_razon_social, email, telefono, ciudad FROM cliente ORDER BY nombre_razon_social ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                clientes.add(new ClienteDto(
                    rs.getLong("id_cliente"),
                    rs.getString("tipo_cliente"),
                    rs.getString("nombre_razon_social"),
                    rs.getString("email"),
                    rs.getString("telefono"),
                    rs.getString("ciudad")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar clientes: " + e.getMessage(), e);
        }
        return clientes;
    }

    public List<InventarioDto> obtenerInventario() {
        List<InventarioDto> inventario = new ArrayList<>();
        String sql = "SELECT p.id_producto, p.nombre_prenda, p.sku, p.categoria_infantil, " +
                     "  COALESCE(SUM(l.cantidad), 0) as total_producido, " +
                     "  COALESCE((SELECT SUM(v.cantidad_vendida) FROM venta v JOIN lote_produccion lp ON v.id_lote = lp.id_lote WHERE lp.id_producto = p.id_producto), 0) as total_vendido " +
                     "FROM producto p " +
                     "LEFT JOIN lote_produccion l ON p.id_producto = l.id_producto " +
                     "GROUP BY p.id_producto, p.nombre_prenda, p.sku, p.categoria_infantil " +
                     "ORDER BY p.nombre_prenda ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int totalProducido = rs.getInt("total_producido");
                int totalVendido = rs.getInt("total_vendido");
                int stockDisponible = totalProducido - totalVendido;
                inventario.add(new InventarioDto(
                    rs.getLong("id_producto"),
                    rs.getString("nombre_prenda"),
                    rs.getString("sku"),
                    rs.getString("categoria_infantil"),
                    totalProducido,
                    totalVendido,
                    stockDisponible
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar el inventario total: " + e.getMessage(), e);
        }
        return inventario;
    }

    @Transactional
    public UsuarioDto registrarUsuario(UsuarioDto request) {
        if (request.nombres() == null || request.nombres().isBlank()) {
            throw new IllegalArgumentException("El nombre del trabajador es obligatorio.");
        }
        if (request.username() == null || request.username().isBlank()) {
            throw new IllegalArgumentException("El nombre de usuario es obligatorio.");
        }

        try (Connection conn = dataSource.getConnection()) {
            long idRol = 1; // Default fallback
            try (PreparedStatement ps = conn.prepareStatement("SELECT id_rol FROM rol WHERE nombre_rol = 'OPERADOR' LIMIT 1")) {
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        idRol = rs.getLong("id_rol");
                    }
                }
            }

            String sql = "INSERT INTO usuario (id_rol, nombres, username, password_hash, activo) VALUES (?, ?, ?, ?, ?) RETURNING id_usuario";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setLong(1, idRol);
                ps.setString(2, request.nombres().trim());
                ps.setString(3, request.username().trim().toLowerCase());
                ps.setString(4, "operador-hash");
                ps.setBoolean(5, request.activo());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        long id = rs.getLong(1);
                        return new UsuarioDto(id, request.nombres().trim(), request.username().trim().toLowerCase(), request.activo());
                    } else {
                        throw new NpsException("Error al generar ID para el trabajador.");
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al registrar trabajador: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void toggleMaquinaActivo(long idMaquina) {
        String sql = "UPDATE maquina SET activo = NOT activo WHERE id_maquina = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idMaquina);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("Error al cambiar estado de la máquina: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void toggleUsuarioActivo(long idUsuario) {
        String sql = "UPDATE usuario SET activo = NOT activo WHERE id_usuario = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idUsuario);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("Error al cambiar estado del trabajador: " + e.getMessage(), e);
        }
    }

    public List<LoteInsumoConsumidoDto> obtenerInsumosLote(long idLote) {
        List<LoteInsumoConsumidoDto> insumos = new ArrayList<>();
        String sql = "SELECT id_insumo_consumido, id_lote, nombre_material, cantidad, unidad_medida, costo_total " +
                     "FROM lote_insumo_consumido WHERE id_lote = ? ORDER BY id_insumo_consumido ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idLote);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    insumos.add(new LoteInsumoConsumidoDto(
                            rs.getLong("id_insumo_consumido"),
                            rs.getLong("id_lote"),
                            rs.getString("nombre_material"),
                            rs.getBigDecimal("cantidad"),
                            rs.getString("unidad_medida"),
                            rs.getBigDecimal("costo_total")
                    ));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar insumos del lote: " + e.getMessage(), e);
        }
        return insumos;
    }

    @Transactional
    public LoteInsumoConsumidoDto registrarInsumoLote(LoteInsumoConsumidoDto request) {
        String sql = "INSERT INTO lote_insumo_consumido (id_lote, nombre_material, cantidad, unidad_medida, costo_total) " +
                     "VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, request.idLote());
            ps.setString(2, request.nombreMaterial());
            ps.setBigDecimal(3, request.cantidad());
            ps.setString(4, request.unidadMedida());
            ps.setBigDecimal(5, request.costoTotal());
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    long id = rs.getLong(1);
                    return new LoteInsumoConsumidoDto(
                            id,
                            request.idLote(),
                            request.nombreMaterial(),
                            request.cantidad(),
                            request.unidadMedida(),
                            request.costoTotal()
                    );
                } else {
                    throw new NpsException("Error al generar ID para el insumo.");
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al registrar insumo del lote: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void eliminarInsumoLote(long idInsumoConsumido) {
        String sql = "DELETE FROM lote_insumo_consumido WHERE id_insumo_consumido = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idInsumoConsumido);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("Error al eliminar insumo del lote: " + e.getMessage(), e);
        }
    }

    public List<TarifaOperacionDto> obtenerTarifasProducto(long idProducto) {
        List<TarifaOperacionDto> tarifas = new ArrayList<>();
        String sql = "SELECT id_tarifa, id_producto, operacion, unidad_medida, tarifa " +
                     "FROM tarifa_operacion WHERE id_producto = ? ORDER BY operacion ASC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idProducto);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tarifas.add(new TarifaOperacionDto(
                            rs.getLong("id_tarifa"),
                            rs.getLong("id_producto"),
                            rs.getString("operacion"),
                            rs.getString("unidad_medida"),
                            rs.getBigDecimal("tarifa")
                    ));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar tarifas del producto: " + e.getMessage(), e);
        }
        return tarifas;
    }

    @Transactional
    public TarifaOperacionDto guardarTarifaProducto(TarifaOperacionDto request) {
        String sql = "INSERT INTO tarifa_operacion (id_producto, operacion, unidad_medida, tarifa) VALUES (?, ?, ?, ?) " +
                     "ON CONFLICT (id_producto, operacion) DO UPDATE SET unidad_medida = EXCLUDED.unidad_medida, tarifa = EXCLUDED.tarifa";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, request.idProducto());
            ps.setString(2, request.operacion());
            ps.setString(3, request.unidadMedida());
            ps.setBigDecimal(4, request.tarifa());
            ps.executeUpdate();
            
            String sqlSelect = "SELECT id_tarifa FROM tarifa_operacion WHERE id_producto = ? AND operacion = ?";
            try (PreparedStatement psSel = conn.prepareStatement(sqlSelect)) {
                psSel.setLong(1, request.idProducto());
                psSel.setString(2, request.operacion());
                try (ResultSet rs = psSel.executeQuery()) {
                    if (rs.next()) {
                        long id = rs.getLong("id_tarifa");
                        return new TarifaOperacionDto(
                                id,
                                request.idProducto(),
                                request.operacion(),
                                request.unidadMedida(),
                                request.tarifa()
                        );
                    } else {
                        throw new NpsException("Error al recuperar tarifa guardada.");
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al guardar tarifa del producto: " + e.getMessage(), e);
        }
    }

    public List<LogAuditoria> obtenerLogsAuditoria() {
        List<LogAuditoria> logs = new ArrayList<>();
        String sql = "SELECT l.id_log, COALESCE(u.username, 'Sistema') as usuario, l.accion, l.detalle, l.fecha_registro " +
                     "FROM log_sistema l " +
                     "LEFT JOIN usuario u ON l.id_usuario = u.id_usuario " +
                     "ORDER BY l.id_log DESC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                java.sql.Timestamp ts = rs.getTimestamp("fecha_registro");
                String fecha = ts != null ? DATE_FORMATTER.format(ts.toInstant()) + " " + TIME_FORMATTER.format(ts.toInstant()) : "";
                logs.add(new LogAuditoria(
                        rs.getLong("id_log"),
                        rs.getString("usuario"),
                        rs.getString("accion"),
                        rs.getString("detalle"),
                        fecha
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al consultar logs de auditoría: " + e.getMessage(), e);
        }
        return logs;
    }

    @Transactional
    public void eliminarProceso(long idProceso) {
        try (Connection conn = dataSource.getConnection()) {
            String selectSql = "SELECT operacion, id_lote FROM lote_proceso WHERE id_proceso = ?";
            String operacion = "";
            long idLote = -1;
            try (PreparedStatement psSel = conn.prepareStatement(selectSql)) {
                psSel.setLong(1, idProceso);
                try (ResultSet rs = psSel.executeQuery()) {
                    if (rs.next()) {
                        operacion = rs.getString(1);
                        idLote = rs.getLong(2);
                    }
                }
            }

            if (idLote != -1) {
                String deleteSql = "DELETE FROM lote_proceso WHERE id_proceso = ?";
                try (PreparedStatement psDel = conn.prepareStatement(deleteSql)) {
                    psDel.setLong(1, idProceso);
                    psDel.executeUpdate();
                }
                
                // Buscar el codigo del lote
                String selectLoteSql = "SELECT codigo_lote FROM lote_produccion WHERE id_lote = ?";
                String codigoLote = "";
                try (PreparedStatement psLote = conn.prepareStatement(selectLoteSql)) {
                    psLote.setLong(1, idLote);
                    try (ResultSet rsLote = psLote.executeQuery()) {
                        if (rsLote.next()) {
                            codigoLote = rsLote.getString(1);
                        }
                    }
                }

                registrarLogSistema(conn, 1, "ELIMINAR_PROCESO", "Se elimino el proceso '" + operacion + "' del lote " + (codigoLote.isEmpty() ? idLote : codigoLote));
            }
        } catch (Exception e) {
            throw new RuntimeException("Error al eliminar proceso del lote: " + e.getMessage(), e);
        }
    }

    private void registrarLogSistema(Connection conn, long idUsuario, String accion, String detalle) {
        String sql = "INSERT INTO log_sistema (id_usuario, accion, detalle) VALUES (?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, idUsuario);
            ps.setString(2, accion);
            ps.setString(3, detalle);
            ps.executeUpdate();
        } catch (Exception e) {
            System.err.println("No se pudo registrar log de auditoria: " + e.getMessage());
        }
    }
}
