package org.acme.nps;

import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Types;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class NpsPublicService {

    private static final String HASH_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom secureRandom = new SecureRandom();

    @Inject
    AgroalDataSource dataSource;

    @Inject
    NpsAdminService npsAdminService;

    @Transactional
    public NpsIngestaResponse registrarEvaluacion(NpsIngestaRequest request) {
        boolean isAnonimo = (request.email() == null || request.email().isBlank())
                && (request.telefono() == null || request.telefono().isBlank());

        validarPayload(request, isAnonimo);

        UUID tokenQr = parsearToken(request.tokenQr());
        
        try (Connection conn = dataSource.getConnection()) {
            
            // 1. Obtener Lote y Venta
            long idLote = -1;
            Long idVenta = null;
            long idCliente = -1;
            
            // Primero buscar en venta
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT id_venta, id_lote, id_cliente FROM venta WHERE token_qr = ?")) {
                ps.setObject(1, tokenQr);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        idVenta = rs.getLong("id_venta");
                        idLote = rs.getLong("id_lote");
                        idCliente = rs.getLong("id_cliente");
                    }
                }
            }
            
            if (idVenta == null) {
                // Legacy lot token
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT id_lote FROM lote_produccion WHERE token_qr = ?")) {
                    ps.setObject(1, tokenQr);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            idLote = rs.getLong("id_lote");
                        } else {
                            throw new NpsException("El token_qr no existe o no pertenece a un lote o venta valido.");
                        }
                    }
                }
            }

            // 2. Obtener o crear Cliente (solo si idCliente no ha sido resuelto por la venta)
            if (idCliente == -1) {
                String email;
                String telefono;
                String nombre;
                if (isAnonimo) {
                    email = request.mayorista() ? "anonimo.b2b@maferg.com" : "anonimo.b2c@maferg.com";
                    telefono = null;
                    nombre = request.mayorista() ? "Cliente Anonimo B2B" : "Cliente Anonimo B2C";
                } else {
                    email = request.email() != null ? request.email().trim().toLowerCase() : null;
                    telefono = request.telefono() != null ? request.telefono().trim() : null;
                    nombre = request.nombre() != null && !request.nombre().isBlank() ? request.nombre().trim() : "Cliente Anonimo";
                }

                // Buscar por email o por telefono
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
                    // Registrar nuevo cliente
                    String tipoCliente = request.mayorista() ? "B2B" : "B2C";
                    String ciudad = request.ciudad() != null ? request.ciudad().trim() : null;
                    
                    try (PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO cliente (tipo_cliente, nombre_razon_social, email, telefono, ciudad) VALUES (?, ?, ?, ?, ?)",
                            Statement.RETURN_GENERATED_KEYS)) {
                        ps.setString(1, tipoCliente);
                        ps.setString(2, nombre);
                        if (email != null) ps.setString(3, email); else ps.setNull(3, Types.VARCHAR);
                        if (telefono != null) ps.setString(4, telefono); else ps.setNull(4, Types.VARCHAR);
                        if (ciudad != null) ps.setString(5, ciudad); else ps.setNull(5, Types.VARCHAR);
                        
                        ps.executeUpdate();
                        try (ResultSet rs = ps.getGeneratedKeys()) {
                            if (rs.next()) {
                                idCliente = rs.getLong(1);
                            } else {
                                throw new NpsException("Error al registrar cliente.");
                            }
                        }
                    }
                }
            } else {
                // Opción C: Actualizar datos del cliente pre-identificado si ingresa/confirma datos de contacto
                if (!isAnonimo) {
                    String email = request.email() != null ? request.email().trim().toLowerCase() : null;
                    String telefono = request.telefono() != null ? request.telefono().trim() : null;
                    String nombre = request.nombre() != null && !request.nombre().isBlank() ? request.nombre().trim() : "Cliente Anonimo";
                    String tipoCliente = request.mayorista() ? "B2B" : "B2C";
                    String ciudad = request.ciudad() != null ? request.ciudad().trim() : null;

                    try (PreparedStatement ps = conn.prepareStatement(
                            "UPDATE cliente SET nombre_razon_social = ?, email = ?, telefono = ?, ciudad = ?, tipo_cliente = ? WHERE id_cliente = ?")) {
                        ps.setString(1, nombre);
                        if (email != null) ps.setString(2, email); else ps.setNull(2, Types.VARCHAR);
                        if (telefono != null) ps.setString(3, telefono); else ps.setNull(3, Types.VARCHAR);
                        if (ciudad != null) ps.setString(4, ciudad); else ps.setNull(4, Types.VARCHAR);
                        ps.setString(5, tipoCliente);
                        ps.setLong(6, idCliente);
                        ps.executeUpdate();
                    }
                }
            }

            // 3. Crear Evaluación NPS
            String clasificacion = clasificar(request.puntuacion());
            String comentario = request.comentario() != null ? request.comentario().trim() : null;
            long idEvaluacion;
            
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO evaluacion_nps (id_cliente, id_lote, id_venta, puntuacion, clasificacion, comentario_calidad) VALUES (?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, idCliente);
                ps.setLong(2, idLote);
                if (idVenta != null) {
                    ps.setLong(3, idVenta);
                } else {
                    ps.setNull(3, Types.BIGINT);
                }
                ps.setInt(4, request.puntuacion());
                ps.setString(5, clasificacion);
                if (comentario != null) ps.setString(6, comentario); else ps.setNull(6, Types.VARCHAR);
                
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        idEvaluacion = rs.getLong(1);
                    } else {
                        throw new NpsException("Error al registrar evaluacion.");
                    }
                }
            }

            boolean alertaCreada = false;
            boolean cuponCreado = false;
            String codigoCupon = null;

            // 4. Crear Alerta de Calidad si es Detractor
            if ("DETRACTOR".equals(clasificacion)) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO alerta_calidad (id_evaluacion, estado) VALUES (?, 'PENDIENTE')")) {
                    ps.setLong(1, idEvaluacion);
                    ps.executeUpdate();
                    alertaCreada = true;
                }
            }

            // 5. Crear Cupón de Fidelización si no es anónimo
            if (!isAnonimo) {
                codigoCupon = generarCodigoCuponUnico();
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO cupon_fidelizacion (id_evaluacion, codigo_hash, estado, fecha_expiracion) VALUES (?, ?, 'DISPONIBLE', now() + interval '30 day')")) {
                    ps.setLong(1, idEvaluacion);
                    ps.setString(2, codigoCupon);
                    ps.executeUpdate();
                    cuponCreado = true;
                }
            }

            return new NpsIngestaResponse(
                    idCliente,
                    idEvaluacion,
                    clasificacion,
                    alertaCreada,
                    cuponCreado,
                    codigoCupon,
                    construirMensaje(clasificacion, isAnonimo, cuponCreado));

        } catch (Exception ex) {
            if (ex instanceof NpsException) {
                throw (NpsException) ex;
            }
            throw new NpsException("Error en base de datos al procesar la evaluacion: " + ex.getMessage());
        }
    }

    public String obtenerTokenDemo() {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT token_qr FROM lote_produccion LIMIT 1");
             ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                return rs.getObject("token_qr").toString();
            }
            return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        } catch (Exception ex) {
            return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        }
    }

    public LoteResumenDto obtenerResumenLote(String tokenQrStr) {
        UUID tokenQr = parsearToken(tokenQrStr);
        try (Connection conn = dataSource.getConnection()) {
            long idLote = -1;
            Long idVenta = null;
            String codigoLote = null;
            String nombrePrenda = null;
            String sku = null;
            String categoriaInfantil = null;
            String fechaConfeccion = null;
            int cantidad = 1;
            Long idMaquina = null;
            String codigoMaquina = null;
            String nombreMaquina = null;
            String clienteNombre = null;
            String clienteEmail = null;
            String clienteTelefono = null;
            String clienteCiudad = null;
            String clienteTipo = null;

            // 1. Buscar en venta primero
            String sqlVenta = "SELECT v.id_venta, v.cantidad_vendida, l.id_lote, l.codigo_lote, l.fecha_confeccion, p.nombre_prenda, p.sku, p.categoria_infantil, " +
                              "c.nombre_razon_social, c.email, c.telefono, c.ciudad, c.tipo_cliente " +
                              "FROM venta v " +
                              "JOIN lote_produccion l ON v.id_lote = l.id_lote " +
                              "JOIN producto p ON l.id_producto = p.id_producto " +
                              "LEFT JOIN cliente c ON v.id_cliente = c.id_cliente " +
                              "WHERE v.token_qr = ?";
            try (PreparedStatement ps = conn.prepareStatement(sqlVenta)) {
                ps.setObject(1, tokenQr);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        idVenta = rs.getLong("id_venta");
                        idLote = rs.getLong("id_lote");
                        codigoLote = rs.getString("codigo_lote");
                        nombrePrenda = rs.getString("nombre_prenda");
                        sku = rs.getString("sku");
                        categoriaInfantil = rs.getString("categoria_infantil");
                        var confeccionTs = rs.getTimestamp("fecha_confeccion");
                        fechaConfeccion = confeccionTs != null ? confeccionTs.toInstant().toString().substring(0, 10) : "";
                        cantidad = rs.getInt("cantidad_vendida");
                        clienteNombre = rs.getString("nombre_razon_social");
                        clienteEmail = rs.getString("email");
                        clienteTelefono = rs.getString("telefono");
                        clienteCiudad = rs.getString("ciudad");
                        clienteTipo = rs.getString("tipo_cliente");
                    }
                }
            }

            if (idVenta != null) {
                // Si es venta, obtener las máquinas concatenadas de la bitácora
                List<String> maquinasInvolucradas = new ArrayList<>();
                String sqlMaq = "SELECT DISTINCT m.nombre_maquina " +
                                "FROM lote_proceso lp " +
                                "JOIN maquina m ON lp.id_maquina = m.id_maquina " +
                                "WHERE lp.id_lote = ?";
                try (PreparedStatement ps = conn.prepareStatement(sqlMaq)) {
                    ps.setLong(1, idLote);
                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) {
                            maquinasInvolucradas.add(rs.getString("nombre_maquina"));
                        }
                    }
                }
                if (!maquinasInvolucradas.isEmpty()) {
                    nombreMaquina = String.join(", ", maquinasInvolucradas);
                } else {
                    nombreMaquina = "Operación manual";
                }
            } else {
                // Fallback a lote (legacy)
                String sql = "SELECT l.id_lote, l.codigo_lote, l.fecha_confeccion, l.cantidad, p.nombre_prenda, p.sku, p.categoria_infantil, " +
                             "l.id_maquina, m.codigo_maquina, m.nombre_maquina " +
                             "FROM lote_produccion l " +
                             "JOIN producto p ON l.id_producto = p.id_producto " +
                             "LEFT JOIN maquina m ON l.id_maquina = m.id_maquina " +
                             "WHERE l.token_qr = ?";
                             
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setObject(1, tokenQr);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            idLote = rs.getLong("id_lote");
                            codigoLote = rs.getString("codigo_lote");
                            nombrePrenda = rs.getString("nombre_prenda");
                            sku = rs.getString("sku");
                            categoriaInfantil = rs.getString("categoria_infantil");
                            var confeccionTs = rs.getTimestamp("fecha_confeccion");
                            fechaConfeccion = confeccionTs != null ? confeccionTs.toInstant().toString().substring(0, 10) : "";
                            cantidad = rs.getInt("cantidad");
                            idMaquina = rs.getObject("id_maquina") != null ? rs.getLong("id_maquina") : null;
                            codigoMaquina = rs.getString("codigo_maquina");
                            nombreMaquina = rs.getString("nombre_maquina");
                        } else {
                            return null; // Token no encontrado
                        }
                    }
                }
            }

            // Verificar si ya tiene respuestas (para el control de única respuesta)
            boolean yaRespondido = false;
            if (idVenta != null) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT COUNT(*) FROM evaluacion_nps WHERE id_venta = ?")) {
                    ps.setLong(1, idVenta);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            yaRespondido = rs.getInt(1) > 0;
                        }
                    }
                }
            } else {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT COUNT(*) FROM evaluacion_nps WHERE id_lote = ? AND id_venta IS NULL")) {
                    ps.setLong(1, idLote);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            yaRespondido = rs.getInt(1) > 0;
                        }
                    }
                }
            }
            List<LoteProcesoDto> procesos = (idLote != -1)
                    ? npsAdminService.obtenerProcesosPorLote(idLote)
                    : List.of();

            return new LoteResumenDto(codigoLote, nombrePrenda, sku, categoriaInfantil, fechaConfeccion, yaRespondido, cantidad, idMaquina, codigoMaquina, nombreMaquina,
                                      clienteNombre, clienteEmail, clienteTelefono, clienteCiudad, clienteTipo, procesos);
        } catch (Exception ex) {
            if (ex instanceof NpsException) {
                throw (NpsException) ex;
            }
            throw new NpsException("Error en base de datos al obtener resumen de lote: " + ex.getMessage());
        }
    }

    private void validarPayload(NpsIngestaRequest request, boolean isAnonimo) {
        if (request == null) {
            throw new NpsException("Payload vacio.");
        }
        if (request.tokenQr() == null || request.tokenQr().isBlank()) {
            throw new NpsException("token_qr es obligatorio.");
        }
        if (request.puntuacion() < 0 || request.puntuacion() > 10) {
            throw new NpsException("puntuacion debe estar entre 0 y 10.");
        }

        if (!isAnonimo) {
            boolean tieneEmail = request.email() != null && !request.email().isBlank();
            boolean tieneTelefono = request.telefono() != null && !request.telefono().isBlank();
            if (!tieneEmail && !tieneTelefono) {
                throw new NpsException("Debes enviar email o telefono para registrar al cliente.");
            }
        }
    }

    private UUID parsearToken(String tokenQr) {
        try {
            return UUID.fromString(tokenQr.trim());
        } catch (IllegalArgumentException ex) {
            throw new NpsException("token_qr no tiene formato UUID valido.");
        }
    }

    private String clasificar(int puntuacion) {
        if (puntuacion <= 6) {
            return "DETRACTOR";
        }
        if (puntuacion <= 8) {
            return "PASIVO";
        }
        return "PROMOTOR";
    }

    private String generarCodigoCuponUnico() {
        String prefijo = "MAFERG-";
        StringBuilder randomPart = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            int index = secureRandom.nextInt(HASH_CHARS.length());
            randomPart.append(HASH_CHARS.charAt(index));
        }
        return prefijo + randomPart;
    }

    private String construirMensaje(String clasificacion, boolean isAnonimo, boolean cuponCreado) {
        if (cuponCreado) {
            if ("DETRACTOR".equals(clasificacion)) {
                return "Gracias por tu feedback. Abrimos una alerta para atender tu caso y te regalamos un cupón por las molestias.";
            }
            return "Gracias por tu feedback. Generamos tu cupón de fidelización.";
        }
        return switch (clasificacion) {
            case "DETRACTOR" -> "Gracias por tu feedback. Abrimos una alerta de calidad para atender tu caso.";
            case "PROMOTOR" -> isAnonimo
                    ? "Gracias por recomendarnos. Tu opinion nos ayuda a seguir mejorando."
                    : "Gracias por recomendarnos. Generamos tu cupon de fidelizacion.";
            default -> "Gracias por tu evaluacion. Seguimos mejorando nuestros productos.";
        };
    }

    public List<ProductoDto> obtenerProductosPublicos() {
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
            throw new RuntimeException("Error al consultar productos publicos: " + e.getMessage(), e);
        }
        return productos;
    }
}
