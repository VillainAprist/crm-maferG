# Análisis Detallado del Sistema: CRM MAFER-G + Calidad Textil

Este documento proporciona una radiografía técnica exhaustiva del sistema desarrollado para **MAFER-G**, diseñado para servir como fuente de verdad y base de justificación para la tesis y la sustentación del proyecto.

---

## 1. Ficha Técnica y Stack Tecnológico

El sistema implementa una arquitectura desacoplada de tipo **Cliente-Servidor (Client-Server)** con interfaces web responsivas y APIs REST eficientes.

| Capa / Componente | Tecnología Seleccionada | Justificación Técnica para la Tesis |
| :--- | :--- | :--- |
| **Frontend (Cliente)** | React (v18+) + TypeScript | React ofrece una interfaz ágil (Virtual DOM) y reactiva. TypeScript añade tipado estático, reduciendo errores en tiempo de compilación. |
| **Estilos (CSS)** | Tailwind CSS | Framework de utilidades CSS que permite un diseño visual responsivo y premium rápido sin sobrecargar los archivos de estilos del cliente. |
| **Backend (Servidor)** | Java 17 + Quarkus | Quarkus (Supersonic Subatomic Java) está diseñado para microservicios y contenedorización. Tiene tiempos de arranque casi instantáneos y bajo consumo de memoria. |
| **Base de Datos** | PostgreSQL | Motor de base de datos relacional robusto, con soporte para consultas complejas, índices eficientes y transaccionalidad ACID. |
| **Pool de Conexiones** | Agroal DataSource (Quarkus) | Gestor optimizado de conexiones a base de datos que reduce la latencia de apertura/cierre de sockets JDBC. |
| **Seguridad JWT** | HMAC-SHA256 (Propio) | Generación y validación de tokens JSON Web Tokens hecha a medida sin librerías pesadas, permitiendo compilación nativa en Quarkus. |
| **Hash de Contraseñas** | PBKDF2 con HMAC-SHA256 | Algoritmo estándar de derivación de claves criptográficas altamente seguro contra ataques de fuerza bruta y diccionario. |
| **Generador de QR** | ZXing Library | Generador dinámico de códigos QR (guardados como imágenes base64 o transmitidos directamente) para tickets y etiquetas. |
| **Gestor de Imágenes** | Cloudinary API | Servicio en la nube para el almacenamiento, optimización y entrega rápida de imágenes de prendas en el catálogo. |
| **Envío de Correos** | Brevo HTTP API (ex Sendinblue) | Empleo del cliente HTTP nativo de Java para comunicarse con la API REST de Brevo, evitando el overhead de SMTP clásico. |

---

## 2. Estructura de la Base de Datos (28 Tablas en 3FN)

El diseño relacional está optimizado para garantizar la integridad referencial y evitar redundancias mediante la **Tercera Forma Normal (3FN)**.

### Clasificación de Tablas:

1. **Seguridad y Accesos (4 tablas):**
   * `rol`: Roles del sistema (`OPERADOR`, `ATENCION_CLIENTE`, `ADMINISTRADOR`, `VENTAS`).
   * `usuario`: Credenciales de operarios con sistema de bloqueo por intentos fallidos.
   * `sesion_usuario`: Registro histórico de sesiones de usuario con sus tokens JWT.
   * `log_sistema`: Bitácora de auditoría transaccional para registrar qué usuario ejecutó qué acción (ej. `LOGIN`, `CREAR_LOTE`).

2. **Catálogo y Producción Textil (5 tablas):**
   * `categoria_producto`: Clasificación de prendas (ej. *Conjuntos, Vestidos, Pantalones*).
   * `producto`: Ficha técnica de cada prenda (SKU, nombre, descripción, precio sugerido, composición de materiales, cuidados e imagen).
   * `tipo_operacion`: Catálogo maestro de procesos del taller textil (ej. *Corte, Costura, Remalle, Planchado*) con tiempos estándar.
   * `tipo_maquina`: Clasificación de maquinaria de costura.
   * `maquina`: Inventario físico de máquinas industriales en el taller con estado de actividad.

3. **Operaciones del Taller y Costeo (5 tablas):**
   * `lote_produccion`: Cabecera de lotes de confección textil con código de lote único, fecha de confección, cantidad proyectada y token QR UUID único.
   * `lote_proceso`: Historial del lote en el taller (Timeline) donde se asocian operarios, máquinas, tipo de operación y el costo real de mano de obra.
   * `tarifa_operacion`: Precios preestablecidos de mano de obra por operación y producto (ej. pago por docena de costura del Producto X).
   * `insumo_textil`: Catálogo de materia prima (telas por metros, botones por unidades, hilos por conos).
   * `lote_insumo_consumido`: Registro de insumos consumidos específicamente en un lote de prendas para costear el material.

4. **Logística y Compras (2 tablas):**
   * `proveedor`: Proveedores de insumos textiles (RUC, nombre comercial, contacto).
   * `lote_insumo`: Compras de materia prima ingresadas al taller, asociadas al proveedor y opcionalmente a un lote específico.

5. **Clientes y Herencia Relacional (5 tablas):**
   * `departamento`, `provincia`, `distrito`: Tablas de Ubigeo del Perú para segmentación geográfica de los clientes.
   * `cliente`: Tabla base que unifica la información común de clientes (nombre comercial, email, teléfono, ciudad, distrito). Posee la restricción de que al menos el email o teléfono no sean nulos (`cliente_email_or_phone_chk`).
   * `cliente_b2b` (Herencia 1:1 con `cliente`): Registra mayoristas agregando RUC, nombre de contacto y rubro.
   * `cliente_b2c` (Herencia 1:1 con `cliente`): Registra minoristas agregando DNI, apellido paterno y apellido materno.

6. **Transacciones y CRM Fidelización (7 tablas):**
   * `venta`: Registro de transacciones en el POS, asociando lote, cliente, cantidad vendida, precio cobrado, unidad de venta (UNIDAD/DOCENA), descuento aplicado, monto total y token QR transaccional.
   * `detalle_venta`: Detalles de ítems específicos de una venta.
   * `evaluacion_nps`: Encuestas de satisfacción completadas por los clientes mediante QR, registrando puntaje (0-10), clasificación (Promotor, Pasivo, Detractor) y comentarios.
   * `alerta_calidad`: Alertas disparadas automáticamente cuando una evaluación califica como Detractor (0-6).
   * `historial_alerta`: Bitácora de seguimiento de atención al cliente para resolver incidencias de calidad.
   * `cupon_fidelizacion`: Cupones automáticos del 5% generados para promover recompras.
   * `historial_reconocimiento`: Registro de incentivos otorgados a clientes leales.

---

## 3. Lógica de Negocio Crítica y Flujos de Información

### A. Módulo POS (Punto de Venta) y Control de Stock
* **Validación de Disponibilidad:** Al registrar una venta (`NpsAdminService.registrarVenta`), el sistema recupera la cantidad inicial confeccionada en el lote y resta las unidades vendidas acumuladas para obtener el `stockDisponible`. Si el vendedor intenta vender una cantidad mayor a la disponible, el backend arroja una excepción (`IllegalArgumentException`), bloqueando la venta.
* **Conversión de Unidades:** El POS permite vender por **Unidades** o **Docenas**. Si se selecciona Docena, el sistema multiplica la cantidad por 12 para validar contra el stock real de unidades y calcular el monto final de forma automática.
* **Aplicación de Cupones:** Al ingresar un cupón (`CUPON-XXXX`), el sistema busca su registro en `cupon_fidelizacion`, valida que su estado sea `DISPONIBLE` y que la fecha de expiración no haya pasado. Si es válido, reduce un 5% al monto total de la venta, marca el cupón como `USADO` y lo asocia al ID de venta generado.

### B. Módulo del Taller (Trazabilidad y Costeo Real)
* **Timeline de Producción:** El operario añade registros a la tabla `lote_proceso` indicando la fase del lote (corte, costura, remalle, acabado).
* **Cálculo del Costo Unitario Real:** 
  $$\text{Costo Unitario Real} = \frac{\sum(\text{Costo de Insumos Consumidos}) + \sum(\text{Costo de Mano de Obra en Procesos})}{\text{Cantidad de Prendas Confeccionadas en el Lote}}$$
  Este cálculo matemático es devuelto dinámicamente en el endpoint de lotes, permitiendo al administrador contrastarlo con el precio sugerido de venta y ver el margen de ganancia real obtenido.

### C. Módulo CRM y Encuestas NPS Autoguiadas
* **Branching NPS:** Al ingresar una evaluación (`NpsPublicService.registrarEvaluacion`), el backend clasifica la puntuación (0-10):
  * **0 - 6:** Clasificado como `DETRACTOR`. Se genera automáticamente un registro en `alerta_calidad` en estado `PENDIENTE` y se crea un cupón del 5% como incentivo de compensación por molestias.
  * **7 - 8:** Clasificado como `PASIVO`. Se registra con fines estadísticos.
  * **9 - 10:** Clasificado como `PROMOTOR`. Genera un cupón de recompensa automática y envía un correo electrónico de agradecimiento con el código.
* **Alertas Activas:** Las alertas creadas notifican al dashboard administrativo y proveen un enlace directo para que el cliente final envíe los detalles de su lote directamente al WhatsApp de soporte de MAFER-G.

---

## 4. Arquitectura de Seguridad Implementada

La seguridad está diseñada para evitar vulnerabilidades comunes descritas por OWASP:

1. **Criptografía de Contraseñas (PBKDF2):**
   * En lugar de algoritmos obsoletos como MD5 o SHA-1, se utiliza `PBKDF2WithHmacSHA256` con un salt aleatorio de 16 bytes y **10,000 iteraciones**.
   * Al verificar contraseñas, se compara el hash de prueba con el almacenado mediante un **bucle XOR de tiempo constante** (`PasswordHasher.checkPassword`). Esto mitiga ataques de canal lateral basados en tiempo (Timing Attacks).

2. **Mitigación de Fuerza Bruta:**
   * La tabla `usuario` cuenta con columnas `intentos_fallidos` (entero) y `bloqueado_hasta` (timestamp).
   * Al fallar un intento de login, el contador incrementa. Al llegar a 3 intentos fallidos consecutivos, el usuario se bloquea temporalmente por 15 minutos (`bloqueado_hasta = now() + 15 mins`). El sistema rechaza cualquier login durante este periodo antes de verificar la contraseña.

3. **Filtro de Seguridad HTTP y Firma JWT:**
   * El sistema genera JWTs firmados con una clave secreta del servidor usando **HMAC-SHA256**.
   * `SecurityFilter.java` actúa como un interceptor global de peticiones. Analiza el header `Authorization: Bearer <token>`, valida la firma y vigencia, y extrae los claims (username y rol) inyectándolos en el contexto de la petición. Si el token falta o expira, retorna `401 Unauthorized` de forma inmediata.
