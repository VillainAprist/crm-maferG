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

export type AdminTab = 'resumen' | 'alertas' | 'lotes'

export type PantallaPublica = 'token-invalido' | 'bienvenida' | 'encuesta' | 'promotor' | 'detractor'

export type Producto = {
  id: number
  sku: string
  nombrePrenda: string
  categoriaInfantil: string
}

export type Lote = {
  idLote: number
  codigoLote: string
  tokenQr: string
  fechaConfeccion: string
  nombrePrenda: string
  sku: string
  cantidad: number
}

export type LoteResumen = {
  codigoLote: string
  nombrePrenda: string
  sku: string
  categoriaInfantil: string
  fechaConfeccion: string
  yaRespondido: boolean
  cantidad: number
}
