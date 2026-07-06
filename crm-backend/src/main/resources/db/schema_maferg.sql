-- MAFER-G Intelligent Connect: esquema PostgreSQL completo de 28 Tablas en 3FN

-- ==========================================
-- 0. LIMPIEZA DE TABLAS PREVIAS (RESET COMPLETAMENTE SEGURO)
-- ==========================================
DROP TABLE IF EXISTS historial_reconocimiento CASCADE;
DROP TABLE IF EXISTS cupon_fidelizacion CASCADE;
DROP TABLE IF EXISTS historial_alerta CASCADE;
DROP TABLE IF EXISTS alerta_calidad CASCADE;
DROP TABLE IF EXISTS evaluacion_nps CASCADE;
DROP TABLE IF EXISTS detalle_venta CASCADE;
DROP TABLE IF EXISTS venta CASCADE;
DROP TABLE IF EXISTS campana_marketing CASCADE;
DROP TABLE IF EXISTS cliente_b2c CASCADE;
DROP TABLE IF EXISTS cliente_b2b CASCADE;
DROP TABLE IF EXISTS cliente CASCADE;
DROP TABLE IF EXISTS distrito CASCADE;
DROP TABLE IF EXISTS provincia CASCADE;
DROP TABLE IF EXISTS departamento CASCADE;
DROP TABLE IF EXISTS lote_insumo CASCADE;
DROP TABLE IF EXISTS proveedor CASCADE;
DROP TABLE IF EXISTS maquina CASCADE;
DROP TABLE IF EXISTS tipo_maquina CASCADE;
DROP TABLE IF EXISTS insumo_textil CASCADE;
DROP TABLE IF EXISTS lote_proceso CASCADE;
DROP TABLE IF EXISTS lote_produccion CASCADE;
DROP TABLE IF EXISTS tipo_operacion CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS categoria_producto CASCADE;
DROP TABLE IF EXISTS log_sistema CASCADE;
DROP TABLE IF EXISTS sesion_usuario CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS rol CASCADE;

-- ==========================================
-- 1. SEGURIDAD Y AUDITORÍA
-- ==========================================

CREATE TABLE rol (
    id_rol BIGSERIAL PRIMARY KEY,
    nombre_rol VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE usuario (
    id_usuario BIGSERIAL PRIMARY KEY,
    id_rol BIGINT NOT NULL REFERENCES rol(id_rol),
    nombres VARCHAR(150) NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sesion_usuario (
    id_sesion BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_fin TIMESTAMPTZ,
    token VARCHAR(255)
);

CREATE TABLE log_sistema (
    id_log BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. CATÁLOGO Y OPERACIONES DE PRODUCCIÓN
-- ==========================================

CREATE TABLE categoria_producto (
    id_categoria BIGSERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE producto (
    id_producto BIGSERIAL PRIMARY KEY,
    id_categoria BIGINT REFERENCES categoria_producto(id_categoria) ON DELETE SET NULL,
    sku VARCHAR(80) NOT NULL UNIQUE,
    nombre_prenda VARCHAR(150) NOT NULL,
    categoria_infantil VARCHAR(120), -- Mantener por compatibilidad con consultas anteriores
    descripcion TEXT,
    precio NUMERIC(10,2) DEFAULT 0.00,
    material VARCHAR(150),
    cuidados VARCHAR(255),
    imagen_url VARCHAR(255)
);

CREATE TABLE tipo_operacion (
    id_tipo_operacion BIGSERIAL PRIMARY KEY,
    codigo_operacion VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tiempo_estandar_minutos INT NOT NULL DEFAULT 10
);

CREATE TABLE tipo_maquina (
    id_tipo_maquina BIGSERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE maquina (
    id_maquina BIGSERIAL PRIMARY KEY,
    id_tipo_maquina BIGINT REFERENCES tipo_maquina(id_tipo_maquina) ON DELETE SET NULL,
    codigo_maquina VARCHAR(80) NOT NULL UNIQUE,
    nombre_maquina VARCHAR(150) NOT NULL,
    tipo_maquina VARCHAR(100), -- Mantener por compatibilidad con consultas anteriores
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE lote_produccion (
    id_lote BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto),
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_maquina BIGINT REFERENCES maquina(id_maquina),
    codigo_lote VARCHAR(80) NOT NULL UNIQUE,
    token_qr UUID NOT NULL UNIQUE,
    fecha_confeccion TIMESTAMPTZ NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    estado VARCHAR(30) NOT NULL DEFAULT 'REGISTRADO'
);

CREATE TABLE lote_proceso (
    id_proceso BIGSERIAL PRIMARY KEY,
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_maquina BIGINT REFERENCES maquina(id_maquina),
    id_tipo_operacion BIGINT NOT NULL REFERENCES tipo_operacion(id_tipo_operacion),
    operacion VARCHAR(150) NOT NULL, -- Mantener por compatibilidad con consultas anteriores
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. TRAZABILIDAD FÍSICA E INSUMOS (LOGÍSTICA)
-- ==========================================

CREATE TABLE proveedor (
    id_proveedor BIGSERIAL PRIMARY KEY,
    ruc VARCHAR(20) NOT NULL UNIQUE,
    nombre_proveedor VARCHAR(180) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(40)
);

CREATE TABLE insumo_textil (
    id_insumo BIGSERIAL PRIMARY KEY,
    codigo_insumo VARCHAR(80) NOT NULL UNIQUE,
    nombre_insumo VARCHAR(150) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'Metros'
);

CREATE TABLE lote_insumo (
    id_lote_insumo BIGSERIAL PRIMARY KEY,
    id_insumo BIGINT NOT NULL REFERENCES insumo_textil(id_insumo) ON DELETE CASCADE,
    id_proveedor BIGINT REFERENCES proveedor(id_proveedor) ON DELETE SET NULL,
    id_lote_produccion BIGINT REFERENCES lote_produccion(id_lote) ON DELETE SET NULL,
    cantidad_insumo NUMERIC(10,2) NOT NULL,
    fecha_adquisicion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. UBICACIÓN Y CLIENTES (PATRÓN HERENCIA)
-- ==========================================

CREATE TABLE departamento (
    id_departamento VARCHAR(2) PRIMARY KEY,
    nombre_departamento VARCHAR(100) NOT NULL
);

CREATE TABLE provincia (
    id_provincia VARCHAR(4) PRIMARY KEY,
    id_departamento VARCHAR(2) NOT NULL REFERENCES departamento(id_departamento),
    nombre_provincia VARCHAR(100) NOT NULL
);

CREATE TABLE distrito (
    id_distrito VARCHAR(6) PRIMARY KEY,
    id_provincia VARCHAR(4) NOT NULL REFERENCES provincia(id_provincia),
    nombre_distrito VARCHAR(100) NOT NULL
);

CREATE TABLE cliente (
    id_cliente BIGSERIAL PRIMARY KEY,
    tipo_cliente VARCHAR(3) NOT NULL CHECK (tipo_cliente IN ('B2B', 'B2C')),
    nombre_razon_social VARCHAR(180) NOT NULL,
    email VARCHAR(180) UNIQUE,
    telefono VARCHAR(40),
    ciudad VARCHAR(120),
    id_distrito VARCHAR(6) REFERENCES distrito(id_distrito) ON DELETE SET NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cliente_email_or_phone_chk CHECK (email IS NOT NULL OR telefono IS NOT NULL)
);

CREATE TABLE cliente_b2b (
    id_cliente BIGINT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    ruc VARCHAR(20) NOT NULL UNIQUE,
    contacto_nombre VARCHAR(150),
    rubro VARCHAR(100)
);

CREATE TABLE cliente_b2c (
    id_cliente BIGINT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    dni VARCHAR(8) NOT NULL UNIQUE,
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100)
);

-- ==========================================
-- 5. TRANSACCIONES Y FIDELIZACIÓN (CRM)
-- ==========================================

CREATE TABLE campana_marketing (
    id_campana BIGSERIAL PRIMARY KEY,
    nombre_campana VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_fin TIMESTAMPTZ,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE venta (
    id_venta BIGSERIAL PRIMARY KEY,
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente),
    cantidad_vendida INT NOT NULL CHECK (cantidad_vendida > 0),
    token_qr UUID NOT NULL UNIQUE,
    fecha_venta TIMESTAMPTZ NOT NULL DEFAULT now(),
    precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unidad_venta VARCHAR(10) NOT NULL DEFAULT 'UNIDAD',
    descuento_porcentaje INT NOT NULL DEFAULT 0,
    monto_total NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE detalle_venta (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_venta BIGINT NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL
);

CREATE TABLE evaluacion_nps (
    id_evaluacion BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente),
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote),
    id_venta BIGINT REFERENCES venta(id_venta) ON DELETE SET NULL,
    puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 0 AND 10),
    clasificacion VARCHAR(20) NOT NULL,
    comentario_calidad TEXT,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alerta_calidad (
    id_alerta BIGSERIAL PRIMARY KEY,
    id_evaluacion BIGINT NOT NULL REFERENCES evaluacion_nps(id_evaluacion),
    id_usuario_atencion BIGINT REFERENCES usuario(id_usuario),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE', 'RESUELTA')),
    comentario_resolucion TEXT,
    fecha_disparo TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion TIMESTAMPTZ
);

CREATE TABLE historial_alerta (
    id_historial BIGSERIAL PRIMARY KEY,
    id_alerta BIGINT NOT NULL REFERENCES alerta_calidad(id_alerta) ON DELETE CASCADE,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    comentario_bitacora TEXT NOT NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cupon_fidelizacion (
    id_cupon BIGSERIAL PRIMARY KEY,
    id_evaluacion BIGINT NOT NULL REFERENCES evaluacion_nps(id_evaluacion),
    id_campana BIGINT REFERENCES campana_marketing(id_campana) ON DELETE SET NULL,
    codigo_hash VARCHAR(80) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('DISPONIBLE', 'USADO', 'EXPIRADO')),
    fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_expiracion TIMESTAMPTZ,
    fecha_uso TIMESTAMPTZ,
    id_venta_uso BIGINT REFERENCES venta(id_venta) ON DELETE SET NULL
);

CREATE TABLE historial_reconocimiento (
    id_reconocimiento BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    tipo_reconocimiento VARCHAR(100) NOT NULL,
    detalle TEXT,
    fecha_otorgado TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- ÍNDICES PARA OPTIMIZAR RENDIMIENTO
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_lote_token_qr ON lote_produccion(token_qr);
CREATE INDEX IF NOT EXISTS idx_evaluacion_lote ON evaluacion_nps(id_lote);
CREATE INDEX IF NOT EXISTS idx_evaluacion_cliente ON evaluacion_nps(id_cliente);
CREATE INDEX IF NOT EXISTS idx_alerta_estado ON alerta_calidad(estado);
CREATE INDEX IF NOT EXISTS idx_cupon_estado ON cupon_fidelizacion(estado);
CREATE INDEX IF NOT EXISTS idx_venta_token_qr ON venta(token_qr);
CREATE INDEX IF NOT EXISTS idx_lote_proceso_lote ON lote_proceso(id_lote);

-- ==========================================
-- SEED DATA (DATOS SEMILLA COMPLETOS Y COHERENTES)
-- ==========================================

-- 1. Roles de Usuario
INSERT INTO rol (nombre_rol) VALUES 
('OPERADOR'), 
('ATENCION_CLIENTE'), 
('ADMINISTRADOR');

-- 2. Usuarios
INSERT INTO usuario (id_rol, nombres, username, password_hash, activo) VALUES
(1, 'Operador Demo', 'operador.demo', 'demo-hash', TRUE),
(2, 'Soporte Demo', 'soporte.demo', 'soporte-hash', TRUE),
(3, 'Admin Demo', 'admin.demo', 'admin-hash', TRUE),
(1, 'Lucas Arevalo Salazar', 'lucas.arevalo', 'lucas-hash', TRUE),
(1, 'Dennis Jun Pyo', 'dennis.jun', 'dennis-hash', TRUE),
(1, 'Diego Topuria McGregor', 'diego.topuria', 'diego-hash', TRUE);

-- 3. Categorías de Producto
INSERT INTO categoria_producto (nombre_categoria) VALUES
('Conjuntos'),
('Vestidos'),
('Pantalones'),
('Casacas'),
('Polos');

-- 4. Productos
INSERT INTO producto (id_categoria, sku, nombre_prenda, categoria_infantil, descripcion, precio, material, cuidados, imagen_url) VALUES
(1, 'SKU-SET-001', 'Conjunto Infantil Rayas', 'Conjuntos', 'Un tierno conjunto de dos piezas confeccionado en algodón orgánico de tacto ultrasuave. Diseñado con un clásico patrón de rayas finas y broches hipoalergénicos.', 89.00, '100% Algodón Pima Orgánico', 'Lavar a máquina con agua fría, ciclo delicado. Secar a la sombra.', 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&w=600&q=80&fit=crop'),
(2, 'SKU-VEST-002', 'Vestido Algodón Flores', 'Vestidos', 'Vestido fresco y ligero con un delicado estampado floral. Perfecto para celebraciones de primavera, con mangas englobadas y un forro interior suave.', 120.00, '92% Algodón, 8% Lino natural', 'Lavado a mano preferentemente. Planchar a temperatura baja.', 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&w=600&q=80&fit=crop'),
(3, 'SKU-PANT-003', 'Pantalón Jean Bebé', 'Pantalones', 'Jean elástico con pretina rib y cordón ajustable para la máxima comodidad de tu bebé. Tela resistente al juego diario y de tacto amigable.', 75.00, '78% Algodón, 20% Poliéster reciclado, 2% Elastano', 'Lavar al revés. No usar blanqueador.', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&w=600&q=80&fit=crop');

-- 5. Tipos de Operación
INSERT INTO tipo_operacion (codigo_operacion, nombre, tiempo_estandar_minutos) VALUES
('OP-CORTE', 'Corte', 15),
('OP-COSTURA', 'Costura', 45),
('OP-REMALLE', 'Remalle', 30),
('OP-RECUBIERTO', 'Recubierto/Collareta', 25),
('OP-OJAL_BOTON', 'Ojal y Botón', 20),
('OP-ACABADO', 'Acabado/Limpieza', 20),
('OP-PLANCHADO', 'Planchado', 15),
('OP-CALIDAD', 'Control de Calidad', 15),
('OP-EMPAQUE', 'Empaque', 10);


-- 6. Tipos de Máquina
INSERT INTO tipo_maquina (nombre_tipo) VALUES
('Recta'),
('Remalladora'),
('Recubridora');

-- 7. Máquinas
INSERT INTO maquina (id_tipo_maquina, codigo_maquina, nombre_maquina, tipo_maquina, activo) VALUES
(1, 'MAQ-REC-01', 'Recta Industrial Juki', 'Recta', TRUE),
(2, 'MAQ-REM-02', 'Remalladora Brother', 'Remalladora', TRUE),
(3, 'MAQ-COL-03', 'Recubridora/Collaretera Singer', 'Recubridora', TRUE);

-- 8. Lotes de Producción
INSERT INTO lote_produccion (id_producto, id_usuario, id_maquina, codigo_lote, token_qr, fecha_confeccion, cantidad, estado) VALUES
(1, 1, 1, 'LOTE-2026-024', '3fa85f64-5717-4562-b3fc-2c963f66afa6', now() - interval '20 day', 50, 'TERMINADO'),
(2, 1, 2, 'LOTE-2026-025', '8c983d5a-cf2a-43d9-95ab-5489fcd2db98', now() - interval '15 day', 35, 'TERMINADO'),
(3, 1, 3, 'LOTE-2026-026', 'a76b8c9d-1234-5678-abcd-ef1234567890', now() - interval '5 day', 40, 'EN_PROCESO');

-- 9. Lotes de Proceso (Bitácora de taller conectada a tipo_operacion)
INSERT INTO lote_proceso (id_lote, id_usuario, id_maquina, id_tipo_operacion, operacion, fecha_registro) VALUES
(1, 4, 1, 1, 'Corte', now() - interval '20 day' + interval '2 hour'),
(1, 4, 1, 2, 'Costura', now() - interval '20 day' + interval '4 hour'),
(1, 5, 2, 3, 'Remalle', now() - interval '20 day' + interval '6 hour'),
(1, 6, NULL, 4, 'Acabado', now() - interval '20 day' + interval '8 hour'),

(2, 4, 2, 1, 'Corte', now() - interval '15 day' + interval '1 hour'),
(2, 5, 2, 2, 'Costura', now() - interval '15 day' + interval '3 hour'),
(2, 6, NULL, 4, 'Acabado', now() - interval '15 day' + interval '5 hour'),

(3, 6, 3, 1, 'Corte', now() - interval '5 day' + interval '2 hour'),
(3, 6, 3, 2, 'Costura', now() - interval '5 day' + interval '5 hour');

-- 10. Ubicación (Ubigeo Básico de Lima)
INSERT INTO departamento (id_departamento, nombre_departamento) VALUES ('15', 'Lima');
INSERT INTO provincia (id_provincia, id_departamento, nombre_provincia) VALUES ('1501', '15', 'Lima');
INSERT INTO distrito (id_distrito, id_provincia, nombre_distrito) VALUES 
('150101', '1501', 'Lima Cercado'),
('150122', '1501', 'Miraflores'),
('150131', '1501', 'San Isidro'),
('150140', '1501', 'Santiago de Surco');

-- 11. Clientes
INSERT INTO cliente (tipo_cliente, nombre_razon_social, email, telefono, ciudad, id_distrito) VALUES
('B2C', 'María Pérez', 'maria.perez@example.com', '987654321', 'Lima', '150122'),
('B2B', 'Boutique Hilos y Colores', 'contacto@hilosycolores.com', '014455667', 'Lima', '150131'),
('B2C', 'Juan Gómez', 'juan.gomez@example.com', '912345678', 'Surco', '150140');

-- 12. Extensión de Clientes (Herencia)
INSERT INTO cliente_b2c (id_cliente, dni, apellido_paterno, apellido_materno) VALUES
(1, '47281938', 'Pérez', 'García'),
(3, '72635481', 'Gómez', 'Alva');

INSERT INTO cliente_b2b (id_cliente, ruc, contacto_nombre, rubro) VALUES
(2, '20601234567', 'Ana María Torres', 'Retail Textil Infantil');

-- 13. Campañas de Marketing
INSERT INTO campana_marketing (nombre_campana, descripcion, fecha_inicio, fecha_fin, activo) VALUES
('Campaña Invierno Promotores 2026', 'Descuentos exclusivos a clientes promotores que califiquen con NPS alto.', now() - interval '30 day', now() + interval '60 day', TRUE);

-- 14. Ventas
INSERT INTO venta (id_lote, id_cliente, cantidad_vendida, token_qr, fecha_venta, precio_unitario, unidad_venta, descuento_porcentaje, monto_total) VALUES
(1, 1, 5, '3fa85f64-5717-4562-b3fc-2c963f66afa6', now() - interval '10 day', 50.00, 'UNIDAD', 0, 250.00),
(2, 2, 20, '8c983d5a-cf2a-43d9-95ab-5489fcd2db98', now() - interval '8 day', 45.00, 'UNIDAD', 0, 900.00),
(3, 3, 2, 'a76b8c9d-1234-5678-abcd-ef1234567890', now() - interval '2 day', 55.00, 'UNIDAD', 0, 110.00);

-- 15. Detalle de Ventas
INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES
(1, 1, 5, 50.00),
(2, 2, 20, 45.00),
(3, 3, 2, 55.00);

-- 16. Evaluaciones NPS
INSERT INTO evaluacion_nps (id_cliente, id_lote, id_venta, puntuacion, clasificacion, comentario_calidad, fecha_registro) VALUES
(1, 1, 1, 10, 'PROMOTOR', 'Excelente calidad de tela y costuras, muy suave.', now() - interval '10 day'),
(2, 2, 2, 4, 'DETRACTOR', 'Llegó con un botón suelto y la costura del dobladillo deshilachada.', now() - interval '8 day'),
(3, 3, 3, 8, 'PASIVO', 'Buen producto en general, pero tardó más de lo esperado.', now() - interval '2 day');

-- 17. Alertas de Calidad
INSERT INTO alerta_calidad (id_evaluacion, id_usuario_atencion, estado, comentario_resolucion, fecha_disparo, fecha_resolucion) VALUES
(2, NULL, 'PENDIENTE', NULL, now() - interval '8 day', NULL);

-- 18. Historial de Alertas (Bitácora de Soporte)
INSERT INTO historial_alerta (id_alerta, id_usuario, comentario_bitacora, fecha_registro) VALUES
(1, 2, 'Alerta creada automáticamente al recibir calificación NPS = 4. Lote afectado: LOTE-2026-025.', now() - interval '8 day');

-- 19. Cupones de Fidelización
INSERT INTO cupon_fidelizacion (id_evaluacion, id_campana, codigo_hash, estado, fecha_generacion, fecha_expiracion, id_venta_uso) VALUES
(1, 1, 'CUPON-MARIA-2026', 'DISPONIBLE', now() - interval '10 day', now() + interval '50 day', NULL);

-- 20. Historial de Reconocimientos
INSERT INTO historial_reconocimiento (id_cliente, tipo_reconocimiento, detalle, fecha_otorgado) VALUES
(1, 'Cupón Fidelidad Promotor', 'Se otorgó un cupón del 15% de descuento para su próxima compra por ser cliente Promotor.', now() - interval '10 day');

-- 21. Sesión Usuario (Prueba)
INSERT INTO sesion_usuario (id_usuario, token) VALUES 
(3, 'admin-token-xyz-123');

-- 22. Log de Sistema (Auditoría)
INSERT INTO log_sistema (id_usuario, accion, detalle) VALUES
(3, 'LOGIN', 'Admin Demo inició sesión en la plataforma.'),
(1, 'CREAR_LOTE', 'Lote LOTE-2026-026 registrado con éxito por operario.demo.');

-- 23. Proveedores
INSERT INTO proveedor (ruc, nombre_proveedor, email, telefono) VALUES
('20100987654', 'Corporación Textil del Sur S.A.C.', 'ventas@textilsur.pe', '01-345-6789'),
('20300456123', 'Avíos y Botones del Perú', 'contacto@aviosperu.com', '999-888-777');

-- 24. Insumos Textiles
INSERT INTO insumo_textil (codigo_insumo, nombre_insumo, unidad_medida) VALUES
('INS-TELA-01', 'Algodón Pima 30/1', 'Metros'),
('INS-BOTON-02', 'Botón Plástico 10mm Celeste', 'Unidades'),
('INS-HILO-03', 'Hilo Poliéster Blanco 40/2', 'Conos');

-- 25. Lotes de Insumos (Asociados a producción)
INSERT INTO lote_insumo (id_insumo, id_proveedor, id_lote_produccion, cantidad_insumo) VALUES
(1, 1, 1, 150.00),
(2, 2, 1, 500.00),
(3, 1, 2, 10.00);

-- ==========================================
-- 26. TRACCIÓN Y COSTOS DE PRODUCCIÓN
-- ==========================================

CREATE TABLE IF NOT EXISTS lote_insumo_consumido (
    id_insumo_consumido BIGSERIAL PRIMARY KEY,
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE,
    nombre_material VARCHAR(100) NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL,
    costo_total NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS tarifa_operacion (
    id_tarifa BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    operacion VARCHAR(80) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'DOCENA',
    tarifa NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    CONSTRAINT uq_producto_operacion UNIQUE (id_producto, operacion)
);

