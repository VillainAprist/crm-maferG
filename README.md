# MAFER-G Intelligent Connect - Sistema CRM & Trazabilidad Física de Producción con Integración NPS

Este repositorio contiene el código fuente de **MAFER-G Intelligent Connect**, una solución tecnológica empresarial y proyecto de tesis enfocado en optimizar el control de calidad, la fidelización del cliente y la trazabilidad de la cadena de producción textil mediante códigos QR.

El sistema unifica las transacciones de venta, el seguimiento físico de la fabricación (lotes, operarios, maquinaria), la recolección de feedback de clientes usando la metodología **NPS (Net Promoter Score)**, la gestión automatizada de alertas de calidad y programas de fidelización comercial.

---

## 🚀 Arquitectura y Módulos del Sistema

El proyecto está diseñado bajo un enfoque modular y arquitectura desacoplada:

```mermaid
graph TD
    subgraph Cliente final (QR Físico)
        A[Escaneo QR de Prenda] --> B[Encuesta NPS Pública]
    end

    subgraph Plataforma Web (Roles de Usuario)
        C[Admin: Dashboard & Reportes]
        D[Operario: Registro de Lotes & Procesos]
        E[Vendedor: Terminal POS / Registrar Ventas]
        F[Soporte: Gestión de Alertas e Historial]
    end

    subgraph Backend & DB
        B & C & D & E & F --> G[API REST Quarkus]
        G --> H[Base de Datos PostgreSQL - Supabase]
    end
```

### 1. Módulo de Producción y Trazabilidad Física
*   **Registro de Lotes:** Permite agrupar las prendas confeccionadas y asignarles un identificador único enlazado a un código QR (`UUID`).
*   **Trazabilidad de Procesos:** Registro paso a paso de las operaciones de taller (ej. Corte, Costura, Acabado), guardando qué operario realizó la acción, en qué fecha y en qué máquina.
*   **Inventario General:** Consolidado dinámico del total producido, vendido y stock disponible para cada prenda con alertas de reabastecimiento.

### 2. Módulo de Ventas (Terminal POS)
*   **Facturación de Lotes:** Registro de ventas (B2B y B2C) asociando los lotes producidos y restando stock del inventario.
*   **Aplicación de Descuentos:** Integración con cupones de fidelización activos.
*   **Generador de QR Dinámico:** Emisión automática del QR de la venta para que el cliente califique su experiencia de compra.

### 3. Core NPS y Gestión de Calidad (Feedback)
*   **Encuesta Pública NPS:** Pantalla adaptada a dispositivos móviles para que el cliente califique la prenda (escala 0-10) y deje comentarios sobre la tela o las costuras.
*   **Clasificación Automática:** Clasifica al cliente como *Promotor* ($\ge 9$), *Pasivo* ($7 - 8$) o *Detractor* ($\le 6$).
*   **Alertas Automáticas:** Si el cliente es detractor, el sistema dispara en tiempo real una **Alerta de Calidad** y guarda su traza para investigación técnica.

### 4. Módulo de Atención al Cliente (Soporte)
*   **Trazabilidad de Calidad:** Permite a los agentes de atención expandir una alerta para visualizar la bitácora física de fabricación del lote (máquina y operarios involucrados).
*   **Resolución Auditada:** Bitácora de soluciones de incidencias que requiere ingresar un sustento técnico antes de cerrar la alerta.

### 5. Módulo de Fidelización y CRM
*   **Cupones Automatizados:** Generación y entrega automática de cupones de descuento vía hash únicos para clientes promotores.
*   **Campañas de Marketing:** Vinculación de cupones a campañas específicas para medir el Retorno de Inversión (ROI).

---

## 🛠️ Stack Tecnológico

*   **Frontend (Cliente Web):**
    *   React.js 18 + TypeScript
    *   Vite (Build Tool rápido)
    *   TailwindCSS & Vanilla CSS (Diseño Responsivo con estética de Micro-animaciones)
*   **Backend (Servicio REST):**
    *   Java (JDK 17)
    *   Quarkus Framework (Supersónico y Subatómico)
    *   Agroal DataSource & JDBC nativo (para máxima velocidad en consultas transaccionales)
*   **Base de Datos:**
    *   PostgreSQL (Alojado en la nube con Supabase)
    *   Esquema de **27 tablas estructuradas en 3FN (Tercera Forma Normal)** para garantizar integridad y evitar redundancias.

---

## 💾 Diseño de la Base de Datos (3FN)

El modelo de datos cumple rigurosamente con la **Tercera Forma Normal (3FN)**, eliminando dependencias transitivas y estructurándose en 5 módulos clave:

1.  **Seguridad y Auditoría:** `rol`, `usuario`, `sesion_usuario`, `log_sistema`.
2.  **Catálogo y Producción:** `categoria_producto`, `producto`, `lote_produccion`.
3.  **Trazabilidad Física e Insumos:** `tipo_maquina`, `maquina`, `lote_proceso`, `proveedor`, `tipo_insumo`, `insumo_textil`, `lote_insumo`.
4.  **Ubicación y Clientes (Patrón Herencia):** `departamento`, `provincia`, `distrito` (Ubigeo normalizado), `cliente`, `cliente_b2b`, `cliente_b2c`.
5.  **Transacciones y Fidelización (CRM):** `venta`, `detalle_venta`, `evaluacion_nps`, `alerta_calidad`, `historial_alerta`, `campana_marketing`, `cupon_fidelizacion`, `historial_reconocimiento`.

---

## 💻 Instalación y Configuración Local

### Prerrequisitos
*   Java JDK 17 o superior.
*   Node.js v18 o superior & npm.
*   Base de datos PostgreSQL (local o instancia de Supabase).

### 1. Configurar y Ejecutar el Backend (Quarkus)
1.  Navega al directorio del backend:
    ```bash
    cd crm-backend
    ```
2.  Crea tu archivo `.env` tomando como base el archivo `.env.example` y configura tus credenciales de PostgreSQL:
    ```env
    QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://<HOST_SUPABASE>:5432/postgres
    QUARKUS_DATASOURCE_USERNAME=postgres
    QUARKUS_DATASOURCE_PASSWORD=<TU_PASSWORD>
    ```
3.  Inicia el servidor en modo desarrollo (Live Reload habilitado):
    ```bash
    ./mvnw quarkus:dev
    ```
    *Nota: El backend inicializará las tablas y datos semilla automáticamente en tu base de datos mediante el inicializador integrado.*

### 2. Configurar y Ejecutar el Frontend (React)
1.  Navega al directorio del frontend:
    ```bash
    cd crm-frontend
    ```
2.  Instala las dependencias del proyecto:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo de Vite:
    ```bash
    npm run dev
    ```
4.  Abre la aplicación en tu navegador en `http://localhost:5173`.

---

## 🔑 Credenciales y PINs de Demostración

Para facilitar las pruebas de roles de usuario (RBAC), la plataforma incluye un panel de PINs rápidos en la pantalla de login:

| Rol de Usuario | Código PIN | Permisos y Pantallas |
| :--- | :---: | :--- |
| **Administrador** | `1234` | Panel general, KPI de NPS, Inventarios, Catálogo de prendas y maquinaria. |
| **Operario de Taller** | `4321` | Registro de lotes y bitácora de procesos físicos de confección. |
| **Vendedor (Terminal POS)** | `7777` | Venta de prendas de vestir y generación de boletas con QR. |
| **Atención al Cliente** | `9999` | Monitor de Alertas de Calidad y visualización del Timeline de Trazabilidad. |

---

## 📄 Licencia

Este proyecto es parte del trabajo de tesis de investigación de **Mafer G.** para optar al título profesional de Ingeniería de Sistemas. Todos los derechos reservados.
