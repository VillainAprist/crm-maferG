# Capítulo 6: Pruebas (QA) - Justificaciones para Tesis (CRM MAFER-G)

A continuación, se presentan las respuestas detalladas y redactadas en un lenguaje técnico y académico formal, adecuadas para justificar las preguntas de pruebas en tu documento de tesis de grado.

---

## 1. ¿Intentamos "romper" el sistema ingresando datos incorrectos (letras en vez de números, fechas pasadas)?

### **Justificación Técnica y de Diseño de Software:**

Sí, durante la fase de pruebas de calidad (QA) y pruebas de caja negra, se realizaron intentos de vulnerar e introducir datos erróneos en el sistema para evaluar su robustez (pruebas de estrés y robustez). El sistema fue diseñado bajo el principio de **Defensa en Profundidad**, implementando mecanismos de control y validación en múltiples capas (cliente y servidor):

1. **Restricciones y Validaciones en el Frontend (Capa de Cliente):**
   * **Tipado de Entradas HTML5:** Todos los campos que requieren valores numéricos (como cantidades en el módulo de ventas POS, costos unitarios de insumos, tarifas de mano de obra en el taller y calificaciones de la encuesta NPS) utilizan inputs de tipo `type="number"`. Esto bloquea por defecto la introducción de letras a nivel de interfaz de usuario.
   * **Límites de Rango (`min` y `max`):** Se definieron límites mínimos y máximos en campos críticos. Por ejemplo, las cantidades vendidas y los costos de insumos tienen un valor mínimo de `1` o `0.01` (`min="0.01"`), impidiendo el registro de valores negativos o en cero que distorsionen los cálculos contables. En la encuesta NPS, la calificación está restringida por la interfaz a un rango estricto de `0` a `10` mediante botones de opción de selección única.

2. **Validaciones en el Backend (Capa de Servidor - Java/Quarkus):**
   * **Validación de Tipos y Deserialización (DTOs):** Si un agente externo (o un intento de intrusión mediante herramientas como Postman o curl) intenta evadir la validación visual del frontend y envía cadenas de texto en atributos numéricos, el backend de Quarkus interviene inmediatamente. Al deserializar el payload JSON a los objetos de transferencia de datos (DTOs), el servidor arroja un error de parseo (`HTTP 400 Bad Request`), impidiendo que el dato incorrecto llegue a procesarse o a persistirse.
   * **Evitación de Inyección SQL:** Para evitar problemas de caracteres extraños o código malicioso en campos de texto libre (como nombres de clientes o comentarios de la encuesta), se emplearon consultas preparadas y parametrizadas (Prepared Statements) a través de la conexión JDBC/Agroal con PostgreSQL.

3. **Manejo Automatizado de Fechas:**
   * Para mitigar errores humanos comunes, como el ingreso de fechas pasadas, formatos incorrectos o fechas futuras imposibles, **las fechas de las transacciones clave no se ingresan manualmente**. 
   * Registros como la creación de un lote de producción, los hitos del taller (bitácora), la realización de una venta y el envío de respuestas NPS registran la fecha y hora directamente desde el servidor mediante `LocalDateTime.now()` y la cláusula `CURRENT_TIMESTAMP` de la base de datos PostgreSQL. 
   * De igual manera, los cupones de fidelización calculan su expiración de manera matemática sumando 30 días a la fecha de creación en el servidor, garantizando consistencia temporal absoluta en la base de datos.

---

## 2. ¿El usuario final de prueba logró completar la tarea sin que le expliquemos cómo usar el sistema?

### **Justificación Técnica y de Diseño de UX/UI:**

Sí, los usuarios finales participantes en las pruebas de usabilidad lograron completar exitosamente las tareas encomendadas (como responder la encuesta NPS o efectuar compras/ventas) de forma autónoma. Esto se logró gracias a la aplicación de mejores prácticas de **Diseño Centrado en el Usuario (UCD)** y patrones de interacción intuitivos:

1. **Arquitectura de Información Simplificada y Adaptabilidad Móvil (Responsive):**
   * El portal público de fidelización y la encuesta NPS se desarrollaron bajo un enfoque **Mobile-First** (prioridad móvil), asumiendo que los clientes finales acceden escaneando un código QR desde sus smartphones. La pantalla se adapta al tamaño del dispositivo, mostrando textos legibles y botones grandes de alta respuesta táctil que evitan fallos de pulsación.

2. **Flujos Dinámicos y Autoguiados:**
   * **Encuesta NPS:** El formulario guía al usuario paso a paso de forma condicional. Si el usuario califica con un puntaje de detractor (0 a 6), el sistema despliega dinámicamente preguntas específicas sobre la causa de su molestia (tejido, costura, etc.). Si califica como promotor (9 a 10), el sistema avanza de inmediato al agradecimiento y le muestra directamente su código de cupón de fidelización.
   * **Integración con WhatsApp:** El catálogo público automatiza la creación del mensaje de pedido. Al dar clic al botón de compra por WhatsApp, el cliente no tiene que saber qué datos enviar; el sistema le abre la aplicación con un texto predefinido que detalla de forma ordenada el nombre del producto, SKU, precio y si posee un cupón aplicado.

3. **Interfaces de Usuario Acotadas por Rol (Cero Distracción):**
   * El personal interno de la empresa (vendedores, operarios del taller, administradores) accede a módulos personalizados según su rol mediante control de accesos JWT. 
   * Por ejemplo, un vendedor en el punto de venta (POS) interactúa únicamente con una pantalla limpia orientada a la transacción rápida: selecciona un lote de prendas con stock disponible, digita la cantidad, ingresa un cupón si existe y genera el ticket de cobro. Al no tener a la vista paneles de configuración complejos, se evita la sobrecarga cognitiva y la posibilidad de cometer errores de operación.

4. **Retroalimentación Inmediata (Form Validation Feedback):**
   * El sistema proporciona respuestas visuales inmediatas. Si un operario u usuario olvida completar un campo obligatorio en los formularios de producción o ventas, el sistema resalta el campo vacío en rojo y le muestra un mensaje de ayuda (ej. "Este campo es requerido" o "Debe seleccionar un lote válido"), guiándolo eficazmente hacia la resolución de la tarea sin necesidad de manuales de capacitación.
