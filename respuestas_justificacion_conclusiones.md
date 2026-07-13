# Capítulo 8: Conclusiones - CRM MAFER-G

Este documento contiene las respuestas a las preguntas de conclusiones de tu tesis, redactadas de manera formal y académica para tu documento de Word de grado.

---

### 1. ¿El sistema resolvió el problema central planteado en el Capítulo 1?

**Respuesta para la Tesis:**
**Sí.** El problema central planteado en el Capítulo 1 consistía en la falta de trazabilidad y desatención de la opinión de calidad del cliente final sobre las prendas premium infantiles de MAFER-G, agravado por la ineficiencia administrativa, la inexactitud en el costeo real de producción del taller de costura y la ausencia de control electrónico en la fidelización de clientes.

La implementación del sistema resolvió este problema de forma exitosa mediante la digitalización y el acoplamiento transaccional de tres procesos clave:

1. **Bucle de Calidad e NPS Activo:** El cliente final escanea el código QR del ticket de venta o etiqueta de la prenda, ingresando su calificación NPS en un portal responsivo. Si es un detractor (calificación de 0 a 6), el sistema inserta de inmediato una alerta en la tabla `alerta_calidad` para soporte y le provee un enlace directo a WhatsApp. Esto permite identificar fallas del taller vinculadas directamente a la costura o tela de un lote específico, agilizando el diagnóstico y corrección de la producción activa.
2. **Precisión del Costeo Unitario de Producción:** Al automatizar el timeline del taller en la tabla `lote_proceso` y la asignación detallada de materias primas en `lote_insumo_consumido`, el sistema calcula en tiempo real y de manera exacta el **Costo Unitario de Producción** del lote al dividir la suma de costos de insumos y mano de obra entre la cantidad total de prendas confeccionadas, eliminando por completo estimaciones manuales desfasadas en hojas de cálculo.
3. **Fidelización y Recompra Automatizada:** El motor de cupones automatizado genera incentivos digitales de descuento del 5% (`cupon_fidelizacion`) con vigencia y unicidad controlada electrónicamente desde el POS, eliminando descuentos arbitrarios aplicados por los vendedores y garantizando la lealtad y el retorno del cliente a la marca de manera controlada.

---

### 2. ¿Qué módulos quedaron fuera del alcance que podrían desarrollarse en una "Fase 2"?

**Respuesta para la Tesis:**
Para la fase de mantenimiento evolutivo del sistema (Fase 2), se contemplan los siguientes módulos que quedaron fuera del alcance del prototipo inicial pero aportarán un alto valor agregado:

1. **Módulo de Control de Inventarios Mínimos y Reabastecimiento Automático:**
   * Notificaciones visuales de alerta en el taller y envío de correos cuando la materia prima crítica (telas en metros, avíos, conos de hilo) caiga por debajo de los niveles mínimos de stock configurados, sugiriendo compras inmediatas a proveedores del catálogo (`proveedor`).
2. **Módulo de Carga Multimedia en Encuestas NPS (Cloudinary):**
   * Permitir a los clientes calificados como Detractores subir fotografías directas de la prenda defectuosa (manchas, costuras sueltas, botones rotos) desde sus celulares al completar la encuesta, facilitando una pre-evaluación visual al equipo de soporte de MAFER-G antes del retorno físico de la prenda.
3. **Módulo de Planificación de Capacidad de Taller (MRP Básico):**
   * Asignación y balanceo dinámico de costureros y maquinaria estimando fechas proyectadas de entrega del lote, basándose en los tiempos estándar por prenda (`tiempo_estandar_minutos` de la tabla `tipo_operacion`) y la operatividad de las máquinas industriales registradas (`activo` en `maquina`).
4. **Módulo de Facturación Electrónica SUNAT:**
   * Integración directa del módulo de Punto de Venta (POS) con un Proveedor de Servicios Electrónicos (PSE) o la SUNAT para la emisión automática de comprobantes electrónicos con validez tributaria (boletas y facturas electrónicas) integrando códigos hash y firmas digitales directamente al confirmarse la venta en caja.
