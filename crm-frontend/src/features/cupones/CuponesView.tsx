import { KpiCard } from '../../components/ui/KpiCard'
import { API_BASE } from '../../config' // add your API base constant
import type { Cupon } from '../../types'

export function CuponesView({
  cupones,
  fetchCupones
}: {
  cupones: Cupon[]
  fetchCupones: () => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#173c34]">Cupones de fidelización</h2>

      {cupones.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-3">No hay cupones</p>
          <button
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold text-sm cursor-pointer"
            onClick={fetchCupones}
          >
            Recargar
          </button>
        </div>
      )}

      {cupones.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Disponibles" value={cupones.filter((c) => c.estado === 'DISPONIBLE').length} />
            <KpiCard label="Total" value={cupones.length} />
          </div>

          <div className="overflow-x-auto border border-[#d8e6e1] rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d8e6e1] bg-[#f8fcfa] text-left">
                  <th className="py-3 px-4 font-bold text-[#1e4a40]">Código</th>
                  <th className="py-3 px-4 font-bold text-[#1e4a40]">Cliente</th>
                  <th className="py-3 px-4 font-bold text-[#1e4a40]">Estado</th>
                  <th className="py-3 px-4 font-bold text-[#1e4a40]">Vence</th>
                  <th className="py-3 px-4 font-bold text-[#1e4a40]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cupones.map((item, idx) => (
                  <tr key={item.codigo} className={`border-b border-[#eef4f1] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfdfd]'}`}>
                     <td className="py-3 px-4 font-mono text-sm font-bold text-[#1e4a40]">
                       {item.codigo}
                     </td>
                     <td className="py-3 px-4 text-[#628076]">{item.cliente}</td>
                     <td className="py-3 px-4">
                       <span
                         className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                           item.estado === 'DISPONIBLE'
                             ? 'border-[#93d3be] bg-[#edfdf7] text-[#1f735d]'
                             : item.estado === 'USADO'
                             ? 'border-gray-300 bg-gray-100 text-gray-500'
                             : 'border-[#edc57a] bg-[#fff8e9] text-[#8a6316]'
                         }`}
                       >
                         {item.estado}
                       </span>
                     </td>
                     <td className="py-3 px-4 text-[#628076]">{item.vence}</td>
                     <td className="py-3 px-4 flex gap-2 items-center">
                       <img src={`${API_BASE}/api/nps/admin/cupon/${item.codigo}/qr`} alt="QR" className="w-12 h-12 border rounded" />
                       {item.estado === 'DISPONIBLE' && (
                         <button
                           className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                           onClick={async () => {
                             await fetch(`${API_BASE}/api/nps/admin/cupon/${item.codigo}/desactivar`, {method: 'POST'});
                             fetchCupones();
                           }}
                         >
                           Desactivar
                         </button>
                       )}
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
