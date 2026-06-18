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

CREATE TABLE IF NOT EXISTS lote_produccion (
    id_lote BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES producto(id_producto),
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    codigo_lote VARCHAR(80) NOT NULL UNIQUE,
    token_qr UUID NOT NULL UNIQUE,
    fecha_confeccion TIMESTAMPTZ NOT NULL,
    cantidad INT NOT NULL DEFAULT 1
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

CREATE TABLE IF NOT EXISTS evaluacion_nps (
    id_evaluacion BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente),
    id_lote BIGINT NOT NULL REFERENCES lote_produccion(id_lote),
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

-- Seed basico para pruebas
INSERT INTO rol (nombre_rol)
VALUES ('OPERADOR')
ON CONFLICT (nombre_rol) DO NOTHING;

INSERT INTO usuario (id_rol, nombres, username, password_hash, activo)
SELECT r.id_rol, 'Operador Demo', 'operador.demo', 'demo-hash', TRUE
FROM rol r
WHERE r.nombre_rol = 'OPERADOR'
ON CONFLICT (username) DO NOTHING;

INSERT INTO producto (sku, nombre_prenda, categoria_infantil)
VALUES ('SKU-SET-001', 'Conjunto Infantil Rayas', 'Conjuntos')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO lote_produccion (id_producto, id_usuario, codigo_lote, token_qr, fecha_confeccion)
SELECT p.id_producto, u.id_usuario, 'LOTE-2026-024', '3fa85f64-5717-4562-b3fc-2c963f66afa6', now() - interval '20 day'
FROM producto p
JOIN usuario u ON u.username = 'operador.demo'
WHERE p.sku = 'SKU-SET-001'
ON CONFLICT (codigo_lote) DO NOTHING;
