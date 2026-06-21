-- MAFER-G Intelligent Connect: esquema inicial PostgreSQL

CREATE TABLE IF NOT EXISTS rol (
    id_rol BIGSERIAL PRIMARY KEY,
    nombre_rol VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGSERIAL PRIMARY KEY,
    id_rol BIGINT NOT NULL REFERENCES rol(id_rol),
    nombres VARCHAR(150) NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS producto (
    id_producto BIGSERIAL PRIMARY KEY,
    sku VARCHAR(80) NOT NULL UNIQUE,
    nombre_prenda VARCHAR(150) NOT NULL,
    categoria_infantil VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS maquina (
    id_maquina BIGSERIAL PRIMARY KEY,
    codigo_maquina VARCHAR(80) NOT NULL UNIQUE,
    nombre_maquina VARCHAR(150) NOT NULL,
    tipo_maquina VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS lote_produccion (
    id_lote BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto),
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_maquina BIGINT REFERENCES maquina(id_maquina),
    codigo_lote VARCHAR(80) NOT NULL UNIQUE,
    token_qr UUID NOT NULL UNIQUE,
    fecha_confeccion TIMESTAMPTZ NOT NULL,
    cantidad INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lote_proceso (
    id_proceso BIGSERIAL PRIMARY KEY,
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_maquina BIGINT REFERENCES maquina(id_maquina),
    operacion VARCHAR(150) NOT NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cliente (
    id_cliente BIGSERIAL PRIMARY KEY,
    tipo_cliente VARCHAR(3) NOT NULL CHECK (tipo_cliente IN ('B2B', 'B2C')),
    nombre_razon_social VARCHAR(180) NOT NULL,
    email VARCHAR(180) UNIQUE,
    telefono VARCHAR(40),
    ciudad VARCHAR(120),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cliente_email_or_phone_chk CHECK (email IS NOT NULL OR telefono IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS venta (
    id_venta BIGSERIAL PRIMARY KEY,
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote) ON DELETE CASCADE,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente),
    cantidad_vendida INT NOT NULL CHECK (cantidad_vendida > 0),
    token_qr UUID NOT NULL UNIQUE,
    fecha_venta TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluacion_nps (
    id_evaluacion BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente),
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote),
    id_venta BIGINT REFERENCES venta(id_venta) ON DELETE SET NULL,
    puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 0 AND 10),
    clasificacion VARCHAR(20) NOT NULL,
    comentario_calidad TEXT,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerta_calidad (
    id_alerta BIGSERIAL PRIMARY KEY,
    id_evaluacion BIGINT NOT NULL REFERENCES evaluacion_nps(id_evaluacion),
    id_usuario_atencion BIGINT REFERENCES usuario(id_usuario),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE', 'RESUELTA')),
    comentario_resolucion TEXT,
    fecha_disparo TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cupon_fidelizacion (
    id_cupon BIGSERIAL PRIMARY KEY,
    id_evaluacion BIGINT NOT NULL REFERENCES evaluacion_nps(id_evaluacion),
    codigo_hash VARCHAR(80) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('DISPONIBLE', 'USADO', 'EXPIRADO')),
    fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_expiracion TIMESTAMPTZ,
    fecha_uso TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lote_token_qr ON lote_produccion(token_qr);
CREATE INDEX IF NOT EXISTS idx_evaluacion_lote ON evaluacion_nps(id_lote);
CREATE INDEX IF NOT EXISTS idx_evaluacion_cliente ON evaluacion_nps(id_cliente);
CREATE INDEX IF NOT EXISTS idx_alerta_estado ON alerta_calidad(estado);
CREATE INDEX IF NOT EXISTS idx_cupon_estado ON cupon_fidelizacion(estado);
CREATE INDEX IF NOT EXISTS idx_venta_token_qr ON venta(token_qr);
CREATE INDEX IF NOT EXISTS idx_lote_proceso_lote ON lote_proceso(id_lote);

-- Seed basico para pruebas
INSERT INTO rol (nombre_rol)
VALUES ('OPERADOR'), ('ATENCION_CLIENTE'), ('ADMINISTRADOR')
ON CONFLICT (nombre_rol) DO NOTHING;

INSERT INTO usuario (id_rol, nombres, username, password_hash, activo)
SELECT r.id_rol, 'Operador Demo', 'operador.demo', 'demo-hash', TRUE
FROM rol r
WHERE r.nombre_rol = 'OPERADOR'
ON CONFLICT (username) DO NOTHING;

INSERT INTO usuario (id_rol, nombres, username, password_hash, activo)
SELECT r.id_rol, 'Soporte Demo', 'soporte.demo', 'soporte-hash', TRUE
FROM rol r
WHERE r.nombre_rol = 'ATENCION_CLIENTE'
ON CONFLICT (username) DO NOTHING;

INSERT INTO usuario (id_rol, nombres, username, password_hash, activo)
SELECT r.id_rol, 'Admin Demo', 'admin.demo', 'admin-hash', TRUE
FROM rol r
WHERE r.nombre_rol = 'ADMINISTRADOR'
ON CONFLICT (username) DO NOTHING;

INSERT INTO usuario (id_rol, nombres, username, password_hash, activo)
SELECT r.id_rol, 'Lucas Arevalo Salazar', 'lucas.arevalo', 'lucas-hash', TRUE
FROM rol r
WHERE r.nombre_rol = 'OPERADOR'
ON CONFLICT (username) DO NOTHING;

INSERT INTO usuario (id_rol, nombres, username, password_hash, activo)
SELECT r.id_rol, 'Dennis Jun Pyo', 'dennis.jun', 'dennis-hash', TRUE
FROM rol r
WHERE r.nombre_rol = 'OPERADOR'
ON CONFLICT (username) DO NOTHING;

INSERT INTO usuario (id_rol, nombres, username, password_hash, activo)
SELECT r.id_rol, 'Diego Topuria McGregor', 'diego.topuria', 'diego-hash', TRUE
FROM rol r
WHERE r.nombre_rol = 'OPERADOR'
ON CONFLICT (username) DO NOTHING;

-- Seed de Máquinas
INSERT INTO maquina (codigo_maquina, nombre_maquina, tipo_maquina, activo)
VALUES 
('MAQ-REC-01', 'Recta Industrial Juki', 'Recta', TRUE),
('MAQ-REM-02', 'Remalladora Brother', 'Remalladora', TRUE),
('MAQ-COL-03', 'Recubridora/Collaretera Singer', 'Recubridora', TRUE)
ON CONFLICT (codigo_maquina) DO NOTHING;

INSERT INTO producto (sku, nombre_prenda, categoria_infantil)
VALUES 
('SKU-SET-001', 'Conjunto Infantil Rayas', 'Conjuntos'),
('SKU-VEST-002', 'Vestido Algodón Flores', 'Vestidos'),
('SKU-PANT-003', 'Pantalón Jean Bebé', 'Pantalones')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO lote_produccion (id_producto, id_usuario, id_maquina, codigo_lote, token_qr, fecha_confeccion)
SELECT p.id_producto, u.id_usuario, m.id_maquina, 'LOTE-2026-024', '3fa85f64-5717-4562-b3fc-2c963f66afa6', now() - interval '20 day'
FROM producto p
CROSS JOIN usuario u
CROSS JOIN maquina m
WHERE p.sku = 'SKU-SET-001' AND u.username = 'operador.demo' AND m.codigo_maquina = 'MAQ-REC-01'
ON CONFLICT (codigo_lote) DO NOTHING;

INSERT INTO lote_produccion (id_producto, id_usuario, id_maquina, codigo_lote, token_qr, fecha_confeccion)
SELECT p.id_producto, u.id_usuario, m.id_maquina, 'LOTE-2026-025', '8c983d5a-cf2a-43d9-95ab-5489fcd2db98', now() - interval '15 day'
FROM producto p
CROSS JOIN usuario u
CROSS JOIN maquina m
WHERE p.sku = 'SKU-VEST-002' AND u.username = 'operador.demo' AND m.codigo_maquina = 'MAQ-REM-02'
ON CONFLICT (codigo_lote) DO NOTHING;

INSERT INTO lote_produccion (id_producto, id_usuario, id_maquina, codigo_lote, token_qr, fecha_confeccion)
SELECT p.id_producto, u.id_usuario, m.id_maquina, 'LOTE-2026-026', 'a76b8c9d-1234-5678-abcd-ef1234567890', now() - interval '5 day'
FROM producto p
CROSS JOIN usuario u
CROSS JOIN maquina m
WHERE p.sku = 'SKU-PANT-003' AND u.username = 'operador.demo' AND m.codigo_maquina = 'MAQ-COL-03'
ON CONFLICT (codigo_lote) DO NOTHING;

-- Seed de Clientes
INSERT INTO cliente (tipo_cliente, nombre_razon_social, email, telefono, ciudad)
VALUES 
('B2C', 'María Pérez', 'maria.perez@example.com', '987654321', 'Lima'),
('B2B', 'Boutique Hilos y Colores', 'contacto@hilosycolores.com', '014455667', 'Arequipa'),
('B2C', 'Juan Gómez', 'juan.gomez@example.com', '912345678', 'Trujillo')
ON CONFLICT (email) DO NOTHING;

-- Seed de Evaluaciones NPS
-- 1. Evaluacion promotora (10) para LOTE-2026-024
INSERT INTO evaluacion_nps (id_cliente, id_lote, puntuacion, clasificacion, comentario_calidad, fecha_registro)
SELECT c.id_cliente, l.id_lote, 10, 'PROMOTOR', 'Excelente calidad de tela y costuras, muy suave.', now() - interval '10 day'
FROM cliente c, lote_produccion l
WHERE c.email = 'maria.perez@example.com' AND l.codigo_lote = 'LOTE-2026-024'
  AND NOT EXISTS (
      SELECT 1 FROM evaluacion_nps e 
      WHERE e.id_cliente = c.id_cliente AND e.id_lote = l.id_lote
  );

-- 2. Evaluacion detractora (4) para LOTE-2026-025 (debería detonar alerta)
INSERT INTO evaluacion_nps (id_cliente, id_lote, puntuacion, clasificacion, comentario_calidad, fecha_registro)
SELECT c.id_cliente, l.id_lote, 4, 'DETRACTOR', 'Llegó con un botón suelto y la costura del dobladillo deshilachada.', now() - interval '8 day'
FROM cliente c, lote_produccion l
WHERE c.email = 'contacto@hilosycolores.com' AND l.codigo_lote = 'LOTE-2026-025'
  AND NOT EXISTS (
      SELECT 1 FROM evaluacion_nps e 
      WHERE e.id_cliente = c.id_cliente AND e.id_lote = l.id_lote
  );

-- 3. Evaluacion pasiva (8) para LOTE-2026-026
INSERT INTO evaluacion_nps (id_cliente, id_lote, puntuacion, clasificacion, comentario_calidad, fecha_registro)
SELECT c.id_cliente, l.id_lote, 8, 'PASIVO', 'Buen producto en general, pero tardó más de lo esperado.', now() - interval '2 day'
FROM cliente c, lote_produccion l
WHERE c.email = 'juan.gomez@example.com' AND l.codigo_lote = 'LOTE-2026-026'
  AND NOT EXISTS (
      SELECT 1 FROM evaluacion_nps e 
      WHERE e.id_cliente = c.id_cliente AND e.id_lote = l.id_lote
  );

-- Seed de Alertas de Calidad
-- Alerta pendiente para la evaluación detractora
INSERT INTO alerta_calidad (id_evaluacion, estado, comentario_resolucion, fecha_disparo)
SELECT e.id_evaluacion, 'PENDIENTE', NULL, now() - interval '8 day'
FROM evaluacion_nps e
JOIN cliente c ON e.id_cliente = c.id_cliente
WHERE c.email = 'contacto@hilosycolores.com' AND e.puntuacion = 4
  AND NOT EXISTS (
      SELECT 1 FROM alerta_calidad a 
      WHERE a.id_evaluacion = e.id_evaluacion
  );

-- Seed de Cupones de Fidelización
-- Cupón generado para el cliente promotor
INSERT INTO cupon_fidelizacion (id_evaluacion, codigo_hash, estado, fecha_generacion, fecha_expiracion)
SELECT e.id_evaluacion, 'CUPON-MARIA-2026', 'DISPONIBLE', now() - interval '10 day', now() + interval '50 day'
FROM evaluacion_nps e
JOIN cliente c ON e.id_cliente = c.id_cliente
WHERE c.email = 'maria.perez@example.com' AND e.puntuacion = 10
  AND NOT EXISTS (
      SELECT 1 FROM cupon_fidelizacion cp 
      WHERE cp.id_evaluacion = e.id_evaluacion
  );
