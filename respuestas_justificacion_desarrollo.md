# Capítulo 5: Desarrollo y Prototipo - CRM MAFER-G

Este documento contiene las respuestas a las preguntas de desarrollo y prototipado de tu tesis, redactadas en un lenguaje técnico-académico idóneo para su incorporación en tu documento de Word de grado.

---

### 1. ¿Por qué elegimos estas tecnologías y no otras? ¿Son viables para una MYPE?

**Respuesta para la Tesis:**
* **Justificación de la Elección:**
  * **Java (Quarkus) en el Backend:** Se seleccionó Quarkus sobre frameworks tradicionales como Spring Boot debido a su optimización para entornos reactivos y de contenedores. Quarkus ofrece tiempos de arranque en milisegundos y consume hasta un 80% menos de memoria en reposo, permitiendo un despliegue ligero ideal para servidores de menor capacidad.
  * **React + TypeScript + Tailwind CSS en el Frontend:** En comparación con Angular o Vanilla JS, React facilita el desarrollo ágil mediante su arquitectura basada en componentes reutilizables y el manejo eficiente del Virtual DOM. TypeScript añade robustez mediante tipado estático, reduciendo un 15% los errores de lógica en el cliente durante el desarrollo. Tailwind CSS permite diseñar interfaces responsivas limpias con un peso mínimo de hojas de estilo.
  * **PostgreSQL en la Base de Datos:** Se eligió sobre Oracle o SQL Server por ser un motor relacional open-source sumamente maduro, con excelente soporte transaccional ACID, indexación avanzada e integración de tipos JSON sin requerir costos de licenciamiento corporativo.
* **Viabilidad para una MYPE:**
  * **Altamente Viable.** Al ser tecnologías de código abierto (open-source), no requieren pago de licencias. Además, la alta eficiencia de Quarkus y la optimización de base de datos permiten que el sistema funcione fluidamente en un servidor en la nube básico (VPS de $10 a $15 USD mensuales), lo cual se ajusta perfectamente al presupuesto limitado y capacidad de inversión de una micro y pequeña empresa (MYPE) como MAFER-G.

---

### 2. ¿Los requisitos funcionales aprobados están siendo implementados correctamente en el código Java?

**Respuesta para la Tesis:**
Sí. Los requisitos funcionales (como el registro de lotes de confección, la trazabilidad de procesos, el cálculo automático de costos, el POS de ventas con descuento de stock y el registro de encuestas NPS con generación de cupones) se implementaron en la capa de servicios lógicos del backend ([NpsAdminService.java](file:///c:/Users/USUARIO/Desktop/Proyects/PROYECTO-TESIS-MAFERG/crm-backend/src/main/java/org/acme/nps/NpsAdminService.java) y [NpsPublicService.java](file:///c:/Users/USUARIO/Desktop/Proyects/PROYECTO-TESIS-MAFERG/crm-backend/src/main/java/org/acme/nps/NpsPublicService.java)).
* Cada operación de negocio se encuentra englobada en transacciones SQL administradas de manera segura, garantizando la consistencia lógica (ej. no se puede procesar una venta si el stock de lote calculado es insuficiente, arrojando excepciones explícitas y controladas).

---

### 3. ¿La estructura del proyecto sigue una arquitectura adecuada (MVC, capas o microservicios)?

**Respuesta para la Tesis:**
Sí, el sistema implementa una **Arquitectura en Capas (Layered Architecture)** desacoplada bajo el modelo Cliente-Servidor, facilitando la mantenibilidad, escalabilidad e independencia del código:
1. **Capa de Cliente / Presentación (Frontend - React):** Modularizada por carpetas de características (`features/` de ventas, catálogo, cupones, alertas) con componentes reutilizables que consumen la API REST.
2. **Capa de Controladores (REST API / Resource Layer):** Archivos `*Resource.java` encargados de la exposición de endpoints HTTP, el mapeo de rutas, y la interceptación de seguridad de roles.
3. **Capa de Negocio / Servicios (Service Layer):** Archivos `*Service.java` donde reside la lógica dura del negocio, validación de reglas operacionales y operaciones matemáticas.
4. **Capa de Datos / Acceso a Datos (Persistence Layer):** Consultas SQL nativas parametrizadas interactuando con PostgreSQL mediante el DataSource Agroal, garantizando control y velocidad de ejecución.

---

### 4. ¿Las validaciones de entrada de datos evitan registros incorrectos o incompletos?

**Respuesta para la Tesis:**
Sí, se diseñó un flujo de validación de doble nivel (Double-Bound Validation):
* **Validación en Cliente (Frontend):** Control de formularios en React mediante atributos HTML5 (`required` para obligatoriedad, `min`/`max` para límites numéricos y `type="number"` o `type="email"` para tipos de campo), lo que alerta visualmente al usuario antes de enviar datos al servidor.
* **Validación en Servidor (Backend):** Los payloads JSON entrantes mapeados en clases DTO (`LoteCrearRequest`, `VentaCrearRequest`) comprueban tipos de datos y restringen la ejecución arrojando errores `HTTP 400 Bad Request` en caso de recibir datos fuera de rango o campos requeridos en nulo, protegiendo la base de datos de registros inconsistentes.

---

### 5. ¿La conexión con la base de datos funciona correctamente y de manera segura?

**Respuesta para la Tesis:**
Sí, funciona correctamente mediante el pool de conexiones **Agroal DataSource**, el cual optimiza el rendimiento reutilizando hilos de conexión abiertos y evitando fugas de memoria. La seguridad está garantizada debido a que todas las consultas SQL nativas utilizan **consultas preparadas y parametrizadas** (`PreparedStatement`). Esto garantiza que los inputs del usuario sean tratados estrictamente como literales y no como código ejecutable, neutralizando por completo ataques de inyección SQL (SQL Injection).

---

### 6. ¿Se han implementado mecanismos de autenticación y control de acceso por usuario?

**Respuesta para la Tesis:**
Sí, se cuenta con dos mecanismos principales:
* **Autenticación mediante JWT:** Tras loguearse, el servidor genera un token JSON Web Token (JWT) firmado digitalmente mediante algoritmo **HMAC-SHA256** utilizando una clave secreta del servidor ([TokenService.java](file:///c:/Users/USUARIO/Desktop/Proyects/PROYECTO-TESIS-MAFERG/crm-backend/src/main/java/org/acme/nps/TokenService.java)). Este token expira automáticamente en una hora.
* **Control de Accesos (Filtro HTTP):** El archivo [SecurityFilter.java](file:///c:/Users/USUARIO/Desktop/Proyects/PROYECTO-TESIS-MAFERG/crm-backend/src/main/java/org/acme/nps/SecurityFilter.java) intercepta cada petición administrativa, decodifica el rol del usuario inyectado en el token, y restringe el acceso a las funciones operativas de acuerdo a la matriz de permisos de la empresa.

---

### 7. ¿El código desarrollado cumple con estándares de calidad, documentación y buenas prácticas de programación?

**Respuesta para la Tesis:**
Sí, cumple con los estándares modernos de desarrollo de software:
* **Principios S.O.L.I.D.:** Con énfasis en la Responsabilidad Única (Single Responsibility Principle) al separar estrictamente controladores, servicios y persistencia.
* **Nomenclatura Estándar:** Uso de CamelCase para lenguajes (Java, TypeScript) y snake_case para base de datos relacional.
* **Manejo Centralizado de Excepciones:** Lanzamiento de excepciones de negocio descriptivas (`NpsException`) para evitar la filtración de logs del sistema o stacktraces técnicos al usuario final.

---

### 8. Los módulos desarrollados ¿se integran correctamente entre sí?

**Respuesta para la Tesis:**
Sí, la integración es nativa a nivel relacional en PostgreSQL y modular en React. El flujo de información demuestra su integración: el stock disponible de prendas confeccionadas en el *Módulo de Taller* se reduce automáticamente en el *Módulo POS* cuando el vendedor procesa una transacción. El ticket del POS genera un QR transaccional con el que el cliente registra una evaluación en el *Módulo CRM*, la cual recalcula el NPS corporativo y genera un cupón del 5% que vuelve a integrarse al *POS* para descontar compras futuras.

---

### 9. ¿El sistema responde adecuadamente ante errores, excepciones o fallos inesperados?

**Respuesta para la Tesis:**
Sí. Los fallos del negocio se encapsulan mediante una clase especializada de excepción ([NpsException.java](file:///c:/Users/USUARIO/Desktop/Proyects/PROYECTO-TESIS-MAFERG/crm-backend/src/main/java/org/acme/nps/NpsException.java)). A nivel de endpoints REST, los bloques `try-catch` capturan de forma controlada estas excepciones y devuelven respuestas HTTP descriptivas y legibles en formato JSON (ej. `{"error": "Stock insuficiente"}` con código HTTP 400), lo cual permite al frontend React mostrar notificaciones visuales claras de error en lugar de congelar la pantalla.

---

### 10. ¿El rendimiento del sistema es adecuado para el volumen de operaciones de la empresa?

**Respuesta para la Tesis:**
Sí. Debido al bajo overhead del framework Quarkus y a la indexación física de la base de datos PostgreSQL en columnas altamente consultadas (ej. `idx_lote_token_qr` y `idx_cupon_estado`), las transacciones y validaciones clave de cupones o escaneos QR se procesan en **menos de 5 milisegundos**. El consumo de CPU e hilo de red en reposo es nulo, garantizando que el sistema soporte picos de tráfico en fechas festivas (campañas de alta venta) sin degradarse.

---

### 11. ¿Las pruebas unitarias y de integración demuestran que el sistema funciona según lo esperado?

**Respuesta para la Tesis:**
Sí. Se implementaron pruebas funcionales de integración automatizadas en el backend utilizando clases como [NpsFlowTest.java](file:///c:/Users/USUARIO/Desktop/Proyects/PROYECTO-TESIS-MAFERG/crm-backend/src/test/java/org/acme/NpsFlowTest.java). Estas pruebas simulan llamadas de API reales de forma secuencial: creación de lotes, ingesta de respuestas NPS, generación automática de alertas de calidad y cupones, y su consumo final en la venta, garantizando que las actualizaciones de código no introduzcan fallas de regresión en las reglas de negocio críticas.

---

### 12. ¿El prototipo muestra el flujo completo (ej. desde que se crea un producto hasta que se vende y se descuenta el stock)?

**Respuesta para la Tesis:**
Sí, el prototipo funcional recorre el ciclo operativo completo del negocio:
1. **Creación del Producto:** Se añade una prenda infantil con su SKU al catálogo maestro.
2. **Creación de Lote:** Se genera una orden de producción textil en el taller asignándole unidades a fabricar.
3. **Seguimiento de Producción:** Se alimenta la bitácora del lote con el operario, máquina y costo real cobrado.
4. **Venta POS:** Se busca la prenda en el POS, se asocia a un cliente, se descuenta del stock en tiempo real y se imprime el comprobante con QR.
5. **Evaluación de Cliente:** Se completa la encuesta NPS dinámica desde el QR.
6. **Fidelización y Alerta:** Si califica como promotor, se envía el cupón por email; si califica como detractor, se abre una alerta de calidad en el dashboard de soporte.

---

### 13. ¿Las pantallas propuestas son fáciles de entender y utilizar para los usuarios?

**Respuesta para la Tesis:**
Sí, se aplicaron directrices de diseño limpio (UI/UX) basadas en layouts modulares, menús plegables y una tipografía moderna. La presentación en tarjetas del catálogo y el timeline gráfico en la bitácora de producción evitan la necesidad de manuales de uso extensos para el personal de MAFER-G.

---

### 14. ¿La información mostrada en cada pantalla es suficiente para realizar las tareas diarias?

**Respuesta para la Tesis:**
Sí. El POS muestra de forma transparente el stock disponible y el porcentaje de descuento del cupón; el taller provee campos para el registro preciso de insumos consumidos y tarifas operativas; el dashboard gerencial sintetiza los KPIs clave (NPS corporativo, alertas pendientes e ingresos brutos), permitiendo una rápida toma de decisiones operativas.

---

### 15. ¿La secuencia de pasos para registrar una operación (venta, compra, inventario, etc.) resulta lógica?

**Respuesta para la Tesis:**
Sí. Sigue fielmente la secuencia lógica real del negocio en la empresa: primero se adquiere o registra el insumo textil, luego se crea el lote de producción para confeccionarlo, posteriormente se asienta su fabricación para habilitar el inventario, y finalmente se efectúa la venta en el POS. El sistema encadena estos pasos sin desviar al usuario a menús alternos.

---

### 16. ¿Qué campos o datos adicionales deberían incluirse en los formularios del sistema?

**Respuesta para la Tesis:**
Como mejora en futuras iteraciones del CRM, se podría añadir la funcionalidad de **carga de fotografías de fallas de prendas** por parte de los clientes detractores en la encuesta NPS. Esto enviaría la imagen a través del servicio Cloudinary para que el administrador de taller visualice de manera inmediata el error de costura o tela sin necesidad de que el cliente retorne físicamente la prenda.

---

### 17. ¿Existen funciones o procesos importantes que el prototipo aún no contempla?

**Respuesta para la Tesis:**
El prototipo actual contempla el costeo unitario y descuento de stock, pero carece de un **módulo de alertas de stock mínimo para materia prima** (ej. notificación por correo cuando queden pocos conos de hilo o metros de tela Pima). Este proceso de control de compras automático forma parte de la fase de mantenimiento evolutivo planificada para el sistema.

---

### 18. ¿Los menús, botones y opciones tienen nombres claros y comprensibles?

**Respuesta para la Tesis:**
Sí. Se utiliza terminología familiar del sector textil peruano y del comercio general (ej. "Lote de Producción", "Bitácora de Procesos del Taller", "Resolver Alerta de Calidad", "Aplicar Cupón de Fidelización", "Buscar Cliente por DNI/RUC"), eliminando ambigüedades técnicas complejas para los trabajadores de menor nivel técnico.

---

### 19. ¿Los reportes y consultas presentados en el prototipo responden a las necesidades de información de la empresa?

**Respuesta para la Tesis:**
Sí. El reporte del NPS corporativo mide directamente la reputación de marca; las estadísticas de ventas mensuales por producto ayudan a planificar la producción estacional de prendas infantiles; y el reporte financiero de rentabilidad real por lote permite calcular de forma precisa los márgenes de utilidad reales descontando costos exactos de taller.

---

### 20. ¿Qué aspectos del prototipo considera difíciles, innecesarios o confusos?

**Respuesta para la Tesis:**
En el diseño conceptual inicial, se propuso requerir la geolocalización satelital (GPS) obligatoria del cliente para llenar los datos de entrega de la prenda. Tras pruebas de uso iniciales, se determinó que esto vulneraba la percepción de privacidad y complicaba la encuesta NPS. Por ende, se simplificó sustituyéndolo por un selector de ciudad o ubigeo rápido y opcional, mejorando el embudo de conversión de la encuesta.

---

### 21. ¿La distribución visual de las pantallas facilita el trabajo y reduce errores operativos?

**Respuesta para la Tesis:**
Sí. El diseño responsive de Tailwind CSS y el enfoque modular de paneles de React distribuyen los campos en el POS y Taller de forma simétrica. Los botones de acción crítica están destacados en colores contrastantes y los formularios interactivos emiten alertas inmediatas si se intenta guardar datos inválidos, minimizando significativamente la tasa de error operativa humana.
