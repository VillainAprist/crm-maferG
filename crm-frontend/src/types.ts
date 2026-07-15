export type NpsClasificacion = 'DETRACTOR' | 'PASIVO' | 'PROMOTOR'

export type ApiResponse = {
  idCliente: number
  idEvaluacion: number
  clasificacion: NpsClasificacion
  alertaCreada: boolean
  cuponCreado: boolean
  codigoCupon: string | null
  mensaje: string
}

export type Alerta = {
  id: string
  cliente: string
  lote: string
  puntuacion: number
  ciudad: string
  estado: 'PENDIENTE' | 'RESUELTA'
  email?: string
  telefono?: string
  comentario?: string
  idLote: number
  comentarioResolucion?: string | null
}

export type Cupon = {
  codigo: string
  cliente: string
  estado: 'DISPONIBLE' | 'USADO' | 'EXPIRADO'
  vence: string
}

export type Evento = {
  hora: string
  titulo: string
  meta: string
}

export type Evaluacion = {
  id: number
  cliente: string
  tipoCliente: 'B2B' | 'B2C'
  email: string | null
  telefono: string | null
  lote: string
  puntuacion: number
  clasificacion: NpsClasificacion
  comentario: string | null
  fecha: string
  ciudad: string | null
}

export type ResumenData = {
  npsEstimado: number
  totalEncuestas: number
  respuestasHoy: number
  detractores: number
  pasivos: number
  promotores: number
  alertasPendientes: number
  ultimosEventos: Evento[]
}

export type AdminTab = 'resumen' | 'alertas' | 'lotes' | 'maquinas' | 'ventas' | 'inventario' | 'trabajadores' | 'catalogo' | 'recursos'

export type PantallaPublica = 'token-invalido' | 'bienvenida' | 'encuesta' | 'promotor' | 'detractor' | 'pasivo'

export type Producto = {
  id: number
  sku: string
  nombrePrenda: string
  categoriaInfantil: string
  descripcion?: string | null
  precio?: number
  material?: string | null
  cuidados?: string | null
  imagenUrl?: string | null
}

export type Maquina = {
  idMaquina: number
  codigoMaquina: string
  nombreMaquina: string
  tipoMaquina: string
  activo: boolean
}

export type Usuario = {
  idUsuario: number
  nombres: string
  username: string
  activo: boolean
}

export type LoteProceso = {
  idProceso: number
  idLote: number
  idUsuario: number
  nombreOperador: string
  idMaquina: number | null
  codigoMaquina: string | null
  nombreMaquina: string | null
  operacion: string
  costo: number
  fechaRegistro: string
}

export type Venta = {
  idVenta: number
  idLote: number
  codigoLote: string
  nombrePrenda: string
  idCliente: number
  nombreCliente: string
  cantidadVendida: number
  unidadVenta: 'UNIDAD' | 'DOCENA'
  precioUnitario: number
  descuentoPorcentaje: number
  montoTotal: number
  tokenQr: string
  fechaVenta: string
  costoUnitarioLote: number
}

export type Lote = {
  idLote: number
  codigoLote: string
  tokenQr: string
  fechaConfeccion: string
  nombrePrenda: string
  sku: string
  cantidad: number
  idMaquina?: number | null
  codigoMaquina?: string | null
  nombreMaquina?: string | null
  stock: number
  costoMateriales: number
  costoManoObra: number
  costoTotal: number
  costoUnitario: number
  precioReferencia: number
}

export interface LoteInsumoConsumido {
  idInsumoConsumido?: number
  idLote: number
  nombreMaterial: string
  cantidad: number
  unidadMedida: string
  costoTotal: number
}

export interface TarifaOperacion {
  idTarifa?: number
  idProducto: number
  operacion: string
  unidadMedida: 'UNIDAD' | 'DOCENA'
  tarifa: number
}

export type LoteResumen = {
  codigoLote: string
  nombrePrenda: string
  sku: string
  categoriaInfantil: string
  fechaConfeccion: string
  yaRespondido: boolean
  cantidad: number
  idMaquina?: number | null
  codigoMaquina?: string | null
  nombreMaquina?: string | null
  clienteNombre?: string | null
  clienteEmail?: string | null
  clienteTelefono?: string | null
  clienteCiudad?: string | null
  clienteTipo?: string | null
  procesos: LoteProceso[]
}

export type Cliente = {
  idCliente: number
  tipoCliente: 'B2B' | 'B2C'
  nombreRazonSocial: string
  email?: string | null
  telefono?: string | null
  ciudad?: string | null
}

export type Inventario = {
  idProducto: number
  nombrePrenda: string
  sku: string
  categoriaInfantil: string
  totalProducido: number
  totalVendido: number
  stockDisponible: number
}

export type ResumenVentas = {
  totalFacturado: number
  totalUnidadesVendidas: number
  totalVentas: number
  promedioVenta: number
  porProducto: { nombrePrenda: string; unidades: number; monto: number }[]
  porMes: { mes: string; unidades: number; monto: number }[]
}

export type LogAuditoria = {
  idLog: number
  usuario: string
  accion: string
  detalle: string
  fechaRegistro: string
}
