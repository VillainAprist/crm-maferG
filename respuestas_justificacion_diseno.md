# Capítulo 3 y 4: Requerimientos y Diseño del Sistema - CRM MAFER-G

Este documento contiene las respuestas redactadas en un lenguaje técnico-académico formal, adecuadas para justificar las preguntas de requerimientos y diseño de tu tesis en Microsoft Word.

---

## CAPÍTULO 3: REQUERIMIENTOS

### 1. ¿Estamos usando el formato correcto de Historia de Usuario para que el desarrollador entienda qué programar?

**Respuesta para la Tesis:**
Sí, se emplea el formato ágil estándar de la industria para las Historias de Usuario (HU):
> *"Como **[Rol o Perfil de Usuario]**, quiero **[Funcionalidad o Acción]** para **[Beneficio o Valor de Negocio que aporta]**".*

Para que el desarrollador entienda exactamente qué programar y evitar ambigüedades, a cada Historia de Usuario se le asocian **Criterios de Aceptación** detallados bajo la metodología **BDD (Behavior-Driven Development)** utilizando la sintaxis formal **Dado / Cuando / Entonces (Given / When / Then)**. Esto funciona como el contrato de QA para la aprobación de la funcionalidad.

* **Ejemplo Práctico en el Sistema MAFER-G:**
  * **HU-12: Aplicación de Cupones en el Punto de Venta (POS).**
  * **Como:** Vendedor de MAFER-G en el módulo POS.
  * **Quiero:** Digitar el código de un cupón de descuento en la ventana de cobro.
  * **Para:** Aplicar un 5% de descuento al monto total de la venta si el cupón está activo y es válido.
  * **Criterios de Aceptación:**
    * **Dado** que un cliente posee un cupón de fidelización registrado en el sistema en estado `DISPONIBLE` y con fecha de expiración vigente.
    * **Cuando** el vendedor digite el código del cupón y pulse en "Validar".
    * **Entonces** el sistema debe aplicar el 5% de descuento al monto final de la venta, asociar el cupón al registro de la venta, cambiar su estado a `USADO` y actualizar los totales reflejados en el ticket a imprimir.

---

### 2. ¿Qué pasa si el sistema se cae o si entra un usuario no autorizado? (Requerimientos No Funcionales)

**Respuesta para la Tesis:**
Los Requerimientos No Funcionales (RNF) de confiabilidad y seguridad se atienden de la siguiente manera:

* **Escenario de Caída del Sistema (Alta Disponibilidad y Resiliencia):**
  * **Capa de Servidor (Backend):** El servidor REST está construido con **Java y Quarkus**. Quarkus está diseñado para empaquetarse en contenedores ultra-ligeros con tiempos de arranque en milisegundos (compilación nativa con GraalVM). Ante una caída accidental, los contenedores son auto-recuperables en frío por el orquestador en menos de un segundo.
  * **Capa de Datos (Base de Datos):** PostgreSQL implementa transacciones con propiedades **ACID** (Atomicidad, Consistencia, Aislamiento y Durabilidad). Si ocurre un corte abrupto de energía durante una transacción crítica (ej. al guardar una venta), el motor de base de datos utiliza el registro de escritura anticipada (**WAL - Write-Ahead Logging**) para revertir automáticamente transacciones incompletas en el arranque, garantizando que nunca queden datos corruptos o a medias.
* **Escenario de Usuario No Autorizado (Seguridad y Control de Accesos):**
  * **Filtro HTTP Global (`SecurityFilter.java`):** Todas las peticiones HTTP que ingresan a los endpoints administrativos y de negocio bajo la ruta `/api/nps/admin/*` son interceptadas a nivel de red por un filtro de Quarkus. Este filtro verifica que el encabezado `Authorization: Bearer <token>` esté presente y contenga un JSON Web Token (JWT) válido firmado con la clave privada del servidor (HMAC-SHA256). Si no hay token o es inválido/expirado, el sistema interrumpe la ejecución arrojando una respuesta de error `HTTP 401 Unauthorized`.
  * **Protección contra Fuerza Bruta:** En la base de datos se manejan los campos `intentos_fallidos` y `bloqueado_hasta` en la tabla `usuario`. Si se intentan ingresar contraseñas incorrectas tres veces seguidas, la cuenta se bloquea automáticamente por 15 minutos en el servidor.
  * **Criptografía robusta**: Las claves de usuario se encriptan con sal aleatoria mediante el algoritmo `PBKDF2WithHmacSHA256` (10,000 iteraciones) y se validan mediante bucles en tiempo constante, anulando ataques de canal lateral por análisis de tiempo (Timing Attacks).

---

## CAPÍTULO 4: DISEÑO DEL SISTEMA

### 3. En el proceso "To-Be", ¿cómo el sistema automatiza o elimina los cuellos de botella identificados en el As-Is?

**Respuesta para la Tesis:**
El sistema rediseña los procesos del taller y atención de MAFER-G de la siguiente manera:

| Cuello de Botella en el Proceso Actual (**As-Is**) | Solución Automatizada en el Proceso Rediseñado (**To-Be**) |
| :--- | :--- |
| **Control de Calidad Lento y Sin Datos:** La retroalimentación de calidad dependía de llamadas telefónicas manuales a clientes o quejas informales no registradas. El taller continuaba produciendo lotes sin saber que tenían fallas de costura o tela. | **Bucle de Calidad NPS vía QR:** Se colocan códigos QR únicos en los tickets y etiquetas. Al escanearlos, el cliente realiza una encuesta en 45 segundos. Si califica con 0-6 (Detractor), el backend dispara inmediatamente una `alerta_calidad` en estado `PENDIENTE` al administrador del taller. Esto permite pausar o corregir la producción en curso del lote afectado en tiempo real. |
| **Costeo Unitario de Producción Impreciso:** Los costos reales de mano de obra (pago a costureras) y de insumos (metros de tela, avíos) se sumaban manualmente al final del mes, lo que impedía conocer la rentabilidad por prenda de forma oportuna. | **Bitácora y Costeo Dinámico:** Cada lote tiene un timeline operativo (`lote_proceso`) donde los operarios registran los insumos y la mano de obra conforme avanza la prenda. El sistema calcula y muestra instantáneamente el costo real de fabricación de cada lote y su margen de ganancia unitario. |
| **Fidelización Manual y Errores en POS:** Los cupones se anotaban en papel o se daban de palabra, lo que propiciaba su pérdida, duplicidad o aplicación de descuentos arbitrarios sin control de stock. | **Motor de Cupones Automatizado:** Los cupones se generan automáticamente en el backend tras registrar respuestas NPS (Promotores/Detractores) y se envían por correo. En el POS, el cupón es validado en milisegundos contra la base de datos (estado, vigencia) y se descuenta el 5% de forma electrónica y transparente. |

---

### 4. ¿El modelo de Base de Datos soporta todas las Historias de Usuario planteadas?

**Respuesta para la Tesis:**
Sí, el diseño relacional cuenta con **28 tablas normalizadas en 3FN** estructuradas específicamente para brindar cobertura completa al alcance funcional del sistema.

* **Ejemplos de correspondencia entre HUs y Tablas:**
  * **HU de "Vender y Facturar en el POS":** Soportada directamente por las tablas `venta` (totales, cantidades, QR transaccional) y `detalle_venta` (detalle de productos, cantidades y precios cobrados).
  * **HU de "Registrar Feedback NPS del Cliente":** Soportada por la tabla `evaluacion_nps` que almacena la puntuación, clasificación (`PROMOTOR`, `PASIVO`, `DETRACTOR`) y comentarios del cliente.
  * **HU de "Monitorear y Resolver Alertas de Calidad":** Soportada por `alerta_calidad` (vinculada a la evaluación del detractor) e `historial_alerta` (bitácora de las gestiones que hace el personal de soporte).
  * **HU de "Fidelización mediante Cupones":** Soportada por la tabla `cupon_fidelizacion`, la cual rastrea el estado del cupón (`DISPONIBLE`, `USADO`, `EXPIRADO`), su código único, su fecha de expiración y su vinculación con la venta final donde fue cobrado.
  * **HU de "Registrar Procesos en el Taller":** Soportada por `lote_produccion` (cabecera), `lote_proceso` (etapas y pagos de mano de obra) y `lote_insumo_consumido` (costo detallado de materia prima).

---

### 5. ¿Qué módulos o componentes tendrá el sistema?

**Respuesta para la Tesis:**
El sistema está compuesto por los siguientes 5 módulos principales integrados:

1. **Módulo de Catálogo Público y Ventas:** Muestra los productos infantiles, calcula de forma dinámica los precios rebajados si se ingresa un cupón de descuento activo, y permite canalizar compras directas formateando de manera automática un mensaje de pedido a WhatsApp con la ficha técnica del producto.
2. **Módulo POS (Punto de Venta de Caja):** Formulario rápido para el registro de ventas a minoristas (B2C) y mayoristas (B2B) con control automático de stock por lote. Al confirmar la venta, aplica los descuentos correspondientes y despliega una plantilla lista para impresión de ticket térmico de 80mm que incluye un código QR dinámico.
3. **Módulo de Producción y Taller (Trazabilidad y Costeo):** Creación de lotes de confección, visualización interactiva de un timeline con las etapas de taller (corte, costura, remalle, etc.), asignación de trabajadores/máquinas y cuantificación de insumos consumidos.
4. **Módulo CRM de Fidelización y Calidad:** Ingesta de encuestas NPS móviles escaneadas desde el QR, disparo automático de alertas de insatisfacción y generación automática de cupones con envío mediante la API transaccional de Brevo.
5. **Módulo Administrativo y de Reportes:** Dashboard con KPIs gerenciales (Net Promoter Score general de la empresa, reportes mensuales de ventas por prenda, inventario de lotes disponibles y rentabilidad), bitácora de logs de auditoría transaccionales (`log_sistema`) y gestión de catálogos maestros (tarifas, productos, operarios y máquinas).

---

### 6. ¿Cómo se relacionarán los datos dentro de la base de datos?

**Respuesta para la Tesis:**
Los datos se relacionan utilizando el modelo entidad-relación clásico con restricciones de integridad de claves foráneas (Foreign Keys - FK) y relaciones de multiplicidad estándar:

* **Relaciones Uno a Muchos (1:N):**
  * Un `producto` puede fabricarse en múltiples lotes (`lote_produccion`).
  * Un `lote_produccion` puede registrar múltiples actividades en su bitácora (`lote_proceso`).
  * Un `cliente` puede realizar múltiples compras (`venta`) y registrar múltiples encuestas (`evaluacion_nps`).
* **Relaciones Uno a Uno (1:1 - Patrón Herencia):**
  * Para segmentar la información de clientes sin duplicar columnas vacías, se utiliza el patrón de herencia relacional en tablas de la base de datos: la tabla base `cliente` comparte una relación 1:1 con las tablas especializadas `cliente_b2b` (mayoristas con RUC) y `cliente_b2c` (minoristas con DNI). La clave primaria de las tablas hijas sirve a su vez de clave foránea hacia la tabla padre.
* **Integridad Referencial en Cascada (ON DELETE CASCADE / ON DELETE SET NULL):**
  * Para evitar registros huérfanos, la eliminación de una `venta` elimina en cascada sus registros en `detalle_venta` (`ON DELETE CASCADE`). La eliminación de un registro de usuario asignado no borra los registros históricos de auditoría, sino que los setea en nulo (`ON DELETE SET NULL`) para mantener los reportes contables intactos.

---

### 7. ¿Qué información deberá ingresar, consultar, modificar y eliminar cada usuario? (Funcionalidades por perfil)

**Respuesta para la Tesis:**
Se definen cuatro perfiles principales mediante la tabla `rol`:

| Rol / Perfil | Ingresar | Consultar | Modificar | Eliminar |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador (`ADMINISTRADOR`)** | Usuarios, productos, tarifas de costo, lotes de producción, operarios y máquinas. | Todo el sistema: Logs de auditoría, KPIs financieros, NPS detallado, rentabilidad de lotes. | Parámetros del catálogo, contraseñas de usuarios, estados del taller y cierre de alertas. | Actividades erróneas de producción, insumos mal registrados. |
| **Operario del Taller (`OPERADOR`)** | Hitos de confección (`lote_proceso`) e insumos consumidos en el lote a su cargo. | Listado de lotes asignados, estados de las máquinas industriales. | Estado de la confección asignada (ej. de EN_PROCESO a TERMINADO). | *No tiene permisos de eliminación.* |
| **Vendedor (`VENTAS`)** | Ventas en el POS (`venta`), registrar nuevos clientes (DNI/RUC) al facturar. | Stock disponible de lotes de prendas, estado de validez de cupones de clientes. | Datos de contacto de clientes registrados en el momento. | *No tiene permisos de eliminación.* |
| **Atención al Cliente (`ATENCION_CLIENTE`)** | Bitácoras de seguimiento a clientes insatisfechos (`historial_alerta`). | Respuestas de encuestas NPS, listado de alertas de calidad activas. | Comentario de resolución y estado de alertas (`alerta_calidad`) de PENDIENTE a RESUELTA. | *No tiene permisos de eliminación.* |

---

### 8. ¿Qué tipo de interfaces o pantallas facilitarán el trabajo de los usuarios?

**Respuesta para la Tesis:**
Las pantallas se diseñaron a medida buscando eficiencia operativa y simplicidad visual:

1. **Catálogo Web Público responsivo:** Vista de cuadrícula minimalista que carga de forma optimizada los productos de la base de datos, con enlaces directos a WhatsApp formateados dinámicamente según la prenda seleccionada.
2. **Encuesta de Satisfacción NPS móvil:** Pantalla autoguiada diseñada para smartphones con botones numéricos grandes (del 0 al 10) y colores del semáforo (rojo/amarillo/verde) para agilizar la entrada táctil del cliente en tiendas.
3. **Formulario POS optimizado de caja:** Vista de escritorio de facturación rápida con campos autocompletados para clientes B2B/B2C, visor en tiempo real del descuento por cupón y previsualización de impresión en hoja térmica de 80mm con código QR renderizado en base64.
4. **Timeline interactivo de producción:** Línea de tiempo interactiva en el panel del lote que visualiza de forma gráfica el recorrido físico de la prenda por el taller, reduciendo la necesidad de leer tablas extensas de bases de datos.
5. **Dashboard Administrativo:** Panel de control con gráficos de dona para la visualización de proporciones NPS y flujos de logs de auditoría en tiempo real.

---

### 10. ¿Cómo será el flujo de información entre los diferentes módulos del sistema?

**Respuesta para la Tesis:**
El flujo de información sigue una secuencia circular que vincula la cadena de producción con la satisfacción del cliente final:

```
[ Módulo de Insumos/Logística ]
        │ (Provee materia prima y costos de compra)
        ▼
[ Módulo de Producción y Taller ] ──(Genera stock costeado de prendas)──► [ Módulo POS / Ventas ]
                                                                                   │
                                                                       (Registra venta, descuenta stock
                                                                        e imprime ticket térmico con QR)
                                                                                   │
                                                                                   ▼
[ Módulo Administrativo / Dashboard ] ◄──(Recopila KPIs, Alertas e NPS)── [ Cliente Final (QR NPS) ]
                                                                                   │
                                                                       (Dispara cupón de recompensa)
                                                                                   │
                                                                                   ▼
                                                                       [ Módulo POS / Catálogo ]
                                                                       (Aplica 5% en próxima compra)
```

---

### 11. ¿Qué reglas de negocio deben implementarse en el sistema?

**Respuesta para la Tesis:**
Las reglas de negocio críticas implementadas por código a nivel de base de datos y backend son:

1. **Validación de Stock en POS:** No se permite guardar una venta si la cantidad solicitada excede el stock actual disponible del lote de confección seleccionado. El cálculo es verificado en el backend REST: `stockDisponible = cantidad_lote - sum(cantidad_vendida)`.
2. **Contacto Mandatorio de Cliente:** Para prevenir bases de datos anónimas sin canal de fidelización, la tabla `cliente` tiene un check de integridad que exige que al menos el correo electrónico o el teléfono celular no sean nulos (`cliente_email_or_phone_chk`).
3. **Unicidad de la Encuesta NPS:** Un ticket o venta (`id_venta`) solo puede ser calificado una única vez. Al intentar realizar una evaluación, el backend verifica que no exista previamente el ID de venta en la tabla `evaluacion_nps`.
4. **Ciclo de Vida del Cupón:** Un cupón solo puede ser aplicado si su fecha de vigencia es válida y su estado es `DISPONIBLE`. Al aplicarlo exitosamente en el POS, el estado cambia automáticamente a `USADO` y se almacena la relación con la venta de cobro para evitar doble uso.
5. **Costo Unitario de Producción dinámico:** El costo unitario de un lote de producción se recalcula dinámicamente cada vez que se añade un nuevo insumo consumido o una operación de mano de obra en el taller.

---

### 12. ¿Qué reportes e indicadores gerenciales debe generar el sistema?

**Respuesta para la Tesis:**
El dashboard administrativo genera los siguientes reportes gerenciales en tiempo real:

1. **Net Promoter Score (NPS) Corporativo:** Indicador clave de fidelidad medido de -100 a +100 que clasifica a los usuarios en Promotores (9-10), Pasivos (7-8) y Detractores (0-6).
   $$\text{NPS} = \left( \frac{\text{Cant. Promotores}}{\text{Total Respuestas}} - \frac{\text{Cant. Detractores}}{\text{Total Respuestas}} \right) \times 100$$
2. **Reporte Mensual de Ventas por Producto:** Cantidad de unidades vendidas y volumen total de ingresos desglosados por SKU de prenda de vestir infantil.
3. **Indicador de Alertas de Calidad Activas:** Reporte con la cantidad de quejas pendientes por subsanar del taller.
4. **Rentabilidad Real por Lote:** Reporte financiero que resta del total cobrado en las ventas de un lote, la sumatoria del costo real de fabricación (mano de obra acumulada en `lote_proceso` y costo de materias primas consumidas en `lote_insumo_consumido`), graficando la utilidad neta de cada orden de trabajo.

---

### 13. ¿Qué mecanismos de seguridad y respaldo de información se implementarán?

**Respuesta para la Tesis:**
* **Autenticación (Quién eres):** Identificación mediante credenciales administradas por Quarkus. Cifrado de contraseñas mediante derivación de claves robustas `PBKDF2WithHmacSHA256` (10,000 iteraciones) y salt criptográfico seguro de 16 bytes.
* **Autorización (Qué puedes hacer):** Los endpoints administrativos REST inyectan e inspeccionan el rol de usuario (`ADMINISTRADOR`, `VENTAS`, etc.) usando interceptores de tokens JWT firmados con el algoritmo seguro HMAC-SHA256 en la capa de transporte HTTPS.
* **Respaldo de Base de Datos (Backups):** Se programa un script automatizado diario con la herramienta estándar `pg_dump` de PostgreSQL para empaquetar la base de datos de 28 tablas en caliente (sin desconectar a los usuarios), almacenándolo en un bucket remoto en la nube y manteniendo un histórico de los últimos 30 días para recuperación ante desastres.

---

### 14. ¿Qué tecnologías y herramientas serán utilizadas para el diseño y posterior desarrollo?

**Respuesta para la Tesis:**
* **Herramientas de Diseño y Modelado:**
  * **Figma:** Para el diseño visual (UI/UX) responsivo de los paneles de administración y las interfaces móviles de las encuestas NPS.
  * **Bizagi Modeler:** Modelado de los flujos operacionales en notación estándar BPMN (Business Process Model and Notation).
  * **Diagramas UML (Enterprise Architect / Lucidchart):** Modelado de diagramas de secuencia y del modelo relacional físico de base de datos.
* **Tecnologías de Desarrollo:**
  * **Java 17 (Quarkus Framework):** Para el desarrollo del backend RESTful de alta velocidad de arranque.
  * **PostgreSQL:** Para el motor de base de datos transaccional relacional robusto.
  * **React + TypeScript + Tailwind CSS:** Para la construcción interactiva del cliente web.

---

### 15. ¿La interfaz de usuario está pensada para el nivel técnico del usuario final?

**Respuesta para la Tesis:**
Sí, se aplicaron prácticas de **Diseño Inclusivo y Usabilidad** diferenciadas por perfil de usuario final:

* **Cliente Final (Encuesta NPS Móvil):** Diseñada bajo un enfoque minimalista e intuitivo. Dado que acceden escaneando un código QR en un entorno físico de tienda, la pantalla presenta botones numéricos de gran tamaño fáciles de pulsar con un dedo en una pantalla móvil pequeña. Se evitan formularios complejos y menús distractores.
* **Operario de Taller (Timeline y Bitácora):** Los trabajadores del taller textil pueden interactuar con el sistema a través de pantallas simplificadas en tablets industriales o celulares. El registro del progreso se hace pulsando hitos gráficos predefinidos en una línea de tiempo (Corte -> Costura -> Acabado) en lugar de tipear textos complicados, evitando errores de transcripción y facilitando un uso rápido y natural durante sus labores físicas.
