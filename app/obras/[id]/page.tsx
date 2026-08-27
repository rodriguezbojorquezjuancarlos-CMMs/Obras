"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Wallet, Hammer, Pickaxe, Receipt, Plus, CheckCircle, Clock, Pencil, Trash2, X, FileSpreadsheet, FileText, ExternalLink, Upload, Image as ImageIcon } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function DetalleObra() {
  const params = useParams()
  const idObra = params.id

  const [obra, setObra] = useState<any>(null)
  const [gastos, setGastos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [metricas, setMetricas] = useState({ total: 0, materiales: 0, albanil: 0, miscelaneas: 0, pendientes: 0 })

  // Estados del Modal y Formulario
  const [mostrarModal, setMostrarModal] = useState(false)
  const [gastoEditando, setGastoEditando] = useState<string | null>(null)
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [categoria, setCategoria] = useState("Materiales")
  const [archivoTicket, setArchivoTicket] = useState<File | null>(null)
  const [ticketActualUrl, setTicketActualUrl] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (idObra) cargarDatos()
  }, [idObra])

  async function cargarDatos() {
    setCargando(true)
    
    // 1. Cargar datos del proyecto
    const { data: dataObra, error: errObra } = await supabase.from("proyectos").select("*").eq("id", idObra).single()
    if (errObra) console.error("Error al cargar obra:", errObra.message)
    if (dataObra) setObra(dataObra)

    // 2. Cargar gastos de este proyecto específico
    const { data: dataGastos, error: errGastos } = await supabase
      .from("gastos_obra")
      .select("*")
      .eq("proyecto_id", idObra)

    if (errGastos) {
      console.error("Error al cargar gastos:", errGastos.message)
    }

    if (dataGastos) {
      setGastos(dataGastos)
      calcularMetricas(dataGastos)
    }
    setCargando(false)
  }

  function calcularMetricas(datos: any[]) {
    let tot = 0, mat = 0, alb = 0, misc = 0, pend = 0;
    datos.forEach(g => {
      const m = Number(g.monto) || 0
      tot += m
      if (g.categoria === 'Materiales') mat += m
      if (g.categoria === 'Albañil') alb += m
      if (g.categoria === 'Misceláneas') misc += m
      if (g.estatus === 'Pendiente') pend++
    })
    setMetricas({ total: tot, materiales: mat, albanil: alb, miscelaneas: misc, pendientes: pend })
  }

  // EXPORTAR A EXCEL
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(gastos.map(g => ({
      Concepto: g.concepto,
      Categoría: g.categoria,
      Monto: g.monto,
      Estatus: g.estatus,
      Ticket: g.ticket_url ? 'Sí' : 'No'
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Gastos")
    XLSX.writeFile(wb, `Reporte_Gastos_${obra?.nombre || 'Obra'}.xlsx`)
  }

  // EXPORTAR A PDF
  const exportarPDF = () => {
    const doc = new jsPDF()
    doc.text(`Control Financiero - ${obra?.nombre}`, 14, 15)
    autoTable(doc, {
      head: [['Concepto', 'Categoría', 'Monto', 'Estatus']],
      body: gastos.map(g => [g.concepto, g.categoria, `$${Number(g.monto).toLocaleString('es-MX')}`, g.estatus]),
      startY: 20,
    })
    doc.save(`Reporte_Gastos_${obra?.nombre || 'Obra'}.pdf`)
  }

  // ABRIR MODAL
  const abrirModalNuevo = () => {
    setGastoEditando(null)
    setConcepto("")
    setMonto("")
    setCategoria("Materiales")
    setArchivoTicket(null)
    setTicketActualUrl("")
    setMostrarModal(true)
  }

  const abrirModalEditar = (g: any) => {
    setGastoEditando(g.id)
    setConcepto(g.concepto)
    setMonto(g.monto.toString())
    setCategoria(g.categoria)
    setArchivoTicket(null)
    setTicketActualUrl(g.ticket_url || "")
    setMostrarModal(true)
  }

  // ELIMINAR GASTO
  const eliminarGasto = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este comprobante?")) return
    try {
      const { error } = await supabase.from("gastos_obra").delete().eq("id", id)
      if (error) throw error
      cargarDatos()
    } catch (err: any) { alert("Error al borrar: " + err.message) }
  }

  // GUARDAR O ACTUALIZAR GASTO CON FOTO
  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!concepto || !monto) return
    setGuardando(true)

    try {
      let finalTicketUrl = ticketActualUrl

      // Subir archivo a Supabase Storage usando el bucket correcto "tickets"
      if (archivoTicket) {
        const nombreArchivo = `${Date.now()}-${archivoTicket.name}`
        const { error: errorSubida } = await supabase.storage
          .from("tickets")
          .upload(nombreArchivo, archivoTicket)

        if (errorSubida) throw errorSubida

        const { data: urlData } = supabase.storage
          .from("tickets")
          .getPublicUrl(nombreArchivo)

        finalTicketUrl = urlData.publicUrl
      }

      const datosGasto = {
        proyecto_id: idObra,
        concepto: concepto,
        monto: parseFloat(monto),
        categoria: categoria,
        ticket_url: finalTicketUrl,
        estatus: "Aprobado"
      }

      if (gastoEditando) {
        const { error } = await supabase.from("gastos_obra").update(datosGasto).eq("id", gastoEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from("gastos_obra").insert([datosGasto])
        if (error) throw error
      }

      setMostrarModal(false)
      cargarDatos()
    } catch (err: any) {
      alert("Error al guardar: " + err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>
  if (!obra) return <div className="min-h-screen bg-[#030712] text-white p-12 text-center">Obra no encontrada</div>

  const pctAlbanil = metricas.total > 0 ? (metricas.albanil / metricas.total) * 100 : 0
  const pctMateriales = metricas.total > 0 ? (metricas.materiales / metricas.total) * 100 : 0
  const pctMisc = metricas.total > 0 ? (metricas.miscelaneas / metricas.total) * 100 : 0

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 mb-8 transition-colors font-bold text-sm">
          <ArrowLeft size={16} /> Volver a mis proyectos
        </Link>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                PROYECTO {obra.estatus || 'ACTIVO'}
              </span>
              <span className="text-slate-500 text-sm font-bold">{obra.ubicacion}</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Control Financiero</h1>
            <p className="text-slate-400 mt-1">Supervisión de gastos, facturas y flujo de capital.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={abrirModalNuevo} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer">
              <Plus size={18} /> Nuevo Gasto
            </button>
            <button onClick={exportarExcel} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer">
              <FileSpreadsheet size={18} /> Exportar Excel
            </button>
            <button onClick={exportarPDF} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer">
              <FileText size={18} /> Generar PDF
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">Gasto Total Acumulado</p>
            <h3 className="text-3xl font-black text-white">${metricas.total.toLocaleString('es-MX')}</h3>
          </div>
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest mb-1">Mano de Obra (Albañil)</p>
            <h3 className="text-2xl font-black text-white">${metricas.albanil.toLocaleString('es-MX')}</h3>
          </div>
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-amber-400 font-bold text-[10px] uppercase tracking-widest mb-1">Materiales e Insumos</p>
            <h3 className="text-2xl font-black text-white">${metricas.materiales.toLocaleString('es-MX')}</h3>
          </div>
          <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl">
            <p className="text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-1">Tickets por Revisar</p>
            <h3 className="text-3xl font-black text-white flex items-center gap-3">
              {metricas.pendientes} <span className="text-sm font-medium text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full">Pendientes</span>
            </h3>
          </div>
        </div>

        {/* BARRA DE DISTRIBUCIÓN */}
        <div className="glass-card rounded-3xl p-6 mb-8">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Receipt size={18} /> Distribución del Presupuesto
          </h3>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex mb-4">
            <div style={{ width: `${pctAlbanil}%` }} className="bg-emerald-500 h-full transition-all duration-500"></div>
            <div style={{ width: `${pctMateriales}%` }} className="bg-amber-500 h-full transition-all duration-500"></div>
            <div style={{ width: `${pctMisc}%` }} className="bg-purple-500 h-full transition-all duration-500"></div>
          </div>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-wrap">
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Albañil ({pctAlbanil.toFixed(1)}%)</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Materiales ({pctMateriales.toFixed(1)}%)</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Misceláneas ({pctMisc.toFixed(1)}%)</div>
          </div>
        </div>

        {/* TABLA DE GASTOS */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-lg font-black text-white">Historial de Gastos y Comprobantes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/20 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-5">Concepto</th>
                  <th className="px-6 py-5">Categoría</th>
                  <th className="px-6 py-5">Monto</th>
                  <th className="px-6 py-5 text-center">Ticket / Foto</th>
                  <th className="px-6 py-5 text-center">Estatus</th>
                  <th className="px-6 py-5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {gastos.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">No hay gastos registrados en este proyecto.</td></tr>
                ) : (
                  gastos.map(g => (
                    <tr key={g.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5 font-bold text-white">{g.concepto}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          g.categoria === 'Albañil' ? 'bg-emerald-500/10 text-emerald-400' :
                          g.categoria === 'Materiales' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-purple-500/10 text-purple-400'
                        }`}>
                          {g.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-black text-white">${Number(g.monto).toLocaleString('es-MX')}</td>
                      <td className="px-6 py-5 text-center">
                        {g.ticket_url ? (
                          <a href={g.ticket_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                            <ImageIcon size={14} /> Ver Foto
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 uppercase">Sin ticket</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                          <CheckCircle size={14} /> Aprobado
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => abrirModalEditar(g)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg cursor-pointer"><Pencil size={16} /></button>
                          <button onClick={() => eliminarGasto(g.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL GASTO */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B1221]/90 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative glass-card">
            <button onClick={() => setMostrarModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white mb-6">{gastoEditando ? "Editar Comprobante" : "Registrar Comprobante"}</h2>
            <form onSubmit={guardarGasto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Concepto del Gasto</label>
                <input required type="text" placeholder="Ej. Cemento o Pago" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-emerald-500 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Monto ($)</label>
                  <input required type="number" step="0.01" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-emerald-400 font-black focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Categoría</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-emerald-500 outline-none text-sm font-bold bg-[#0B1221] cursor-pointer">
                    <option value="Materiales">Materiales</option>
                    <option value="Albañil">Albañil</option>
                    <option value="Misceláneas">Misceláneas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subir Foto de Ticket / Factura</label>
                <div className="flex items-center gap-3 bg-black/30 border border-white/10 p-3 rounded-xl">
                  <Upload size={18} className="text-emerald-400 shrink-0" />
                  <input type="file" accept="image/*" onChange={(e) => setArchivoTicket(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer" />
                </div>
                {ticketActualUrl && !archivoTicket && (
                  <p className="text-[10px] text-blue-400 mt-1">Ya tiene una foto guardada. Si subes otra, se reemplazará.</p>
                )}
              </div>
              <button type="submit" disabled={guardando} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl mt-6 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer">
                {guardando ? "GUARDANDO..." : "GUARDAR GASTO"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}