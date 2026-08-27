"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Wallet, Hammer, Pickaxe, Receipt, Plus, CheckCircle, Clock, Pencil, Trash2, X, FileSpreadsheet, FileText, ExternalLink, Upload, Image as ImageIcon, Users, DollarSign } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function DetalleObra() {
  const params = useParams()
  const idObra = params.id as string

  const [obra, setObra] = useState<any>(null)
  const [gastos, setGastos] = useState<any[]>([])
  const [nomina, setNomina] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [metricas, setMetricas] = useState({ total: 0, materiales: 0, albanil: 0, miscelaneas: 0, pendientes: 0, totalNomina: 0 })

  // Estados Modal Gastos
  const [mostrarModalGasto, setMostrarModalGasto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState<string | null>(null)
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [categoria, setCategoria] = useState("Materiales")
  const [archivoTicket, setArchivoTicket] = useState<File | null>(null)
  const [ticketActualUrl, setTicketActualUrl] = useState("")

  // Estados Modal Nómina
  const [mostrarModalNomina, setMostrarModalNomina] = useState(false)
  const [nominaEditando, setNominaEditando] = useState<string | null>(null)
  const [empleado, setEmpleado] = useState("")
  const [dias, setDias] = useState("")
  const [pagoTotal, setPagoTotal] = useState("")
  const [semanaFechas, setSemanaFechas] = useState("")
  const [estatusNomina, setEstatusNomina] = useState("Paid")

  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (idObra) {
      cargarTodo()
    }
  }, [idObra])

  async function cargarTodo() {
    setCargando(true)
    
    // 1. Cargar la información de este proyecto en específico
    const { data: dataObra } = await supabase.from("proyectos").select("*").eq("id", idObra).single()
    if (dataObra) {
      setObra(dataObra)
    } else {
      setObra({ nombre: "Proyecto Activo", ubicacion: "TjBC", estatus: "ACTIVO" })
    }

    // 2. Cargar ÚNICAMENTE los gastos de este proyecto mediante proyecto_id
    const { data: dataGastos, error: errG } = await supabase.from("gastos_obra").select("*").eq("proyecto_id", idObra)
    if (errG) console.error("Error gastos:", errG.message)
    const listaGastos = dataGastos || []
    setGastos(listaGastos)

    // 3. Cargar ÚNICAMENTE la nómina de este proyecto mediante proyecto_id
    const { data: dataNomina, error: errN } = await supabase.from("nomina_obreros").select("*").eq("proyecto_id", idObra)
    if (errN) console.error("Error nomina:", errN.message)
    const listaNomina = dataNomina || []
    setNomina(listaNomina)

    // 4. Calcular Métricas de este proyecto
    calcularMetricas(listaGastos, listaNomina)
    setCargando(false)
  }

  function calcularMetricas(datosGastos: any[], datosNomina: any[]) {
    let tot = 0, mat = 0, alb = 0, misc = 0, pend = 0, totNom = 0;
    
    datosGastos.forEach(g => {
      const m = Number(g.monto) || 0
      tot += m
      if (g.categoria === 'Materiales') mat += m
      if (g.categoria === 'Albañil') alb += m
      if (g.categoria === 'Misceláneas') misc += m
      if (g.estatus === 'Pendiente') pend++
    })

    datosNomina.forEach(n => {
      const m = Number(n.monto_total) || 0
      totNom += m
      tot += m
    })

    setMetricas({ total: tot, materiales: mat, albanil: alb, miscelaneas: misc, pendientes: pend, totalNomina: totNom })
  }

  const exportarExcel = () => {
    const wsGastos = XLSX.utils.json_to_sheet(gastos.map(g => ({ Concepto: g.concepto, Categoría: g.categoria, Monto: g.monto, Estatus: g.estatus })))
    const wsNomina = XLSX.utils.json_to_sheet(nomina.map(n => ({ Empleado: n.nombre_empleado, Días: n.dias_trabajados, Periodo: n.semana_fechas, Total: n.monto_total, Estatus: n.estatus })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsGastos, "Gastos")
    XLSX.utils.book_append_sheet(wb, wsNomina, "Nómina")
    XLSX.writeFile(wb, `Reporte_${obra?.nombre || 'Obra'}.xlsx`)
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    doc.text(`Reporte - ${obra?.nombre || 'Obra'}`, 14, 15)
    autoTable(doc, {
      head: [['Concepto / Empleado', 'Categoría / Período', 'Monto', 'Estatus']],
      body: [
        ...gastos.map(g => [g.concepto, g.categoria, `$${Number(g.monto).toLocaleString('es-MX')}`, g.estatus]),
        ...nomina.map(n => [n.nombre_empleado, `Nómina (${n.semana_fechas || 'S/F'})`, `$${Number(n.monto_total).toLocaleString('es-MX')}`, n.estatus])
      ],
      startY: 20,
    })
    doc.save(`Reporte_${obra?.nombre || 'Obra'}.pdf`)
  }

  // GUARDAR GASTO ENLAZADO AL PROYECTO ACTUAL
  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!concepto || !monto) return
    setGuardando(true)
    try {
      let finalTicketUrl = ticketActualUrl
      if (archivoTicket) {
        const nombreArchivo = `${Date.now()}-${archivoTicket.name}`
        await supabase.storage.from("tickets").upload(nombreArchivo, archivoTicket)
        const { data: urlData } = supabase.storage.from("tickets").getPublicUrl(nombreArchivo)
        finalTicketUrl = urlData.publicUrl
      }
      const datos = { 
        proyecto_id: idObra, 
        concepto, 
        monto: parseFloat(monto), 
        categoria, 
        ticket_url: finalTicketUrl, 
        estatus: "Aprobado" 
      }
      
      if (gastoEditando) {
        await supabase.from("gastos_obra").update(datos).eq("id", gastoEditando)
      } else {
        await supabase.from("gastos_obra").insert([datos])
      }
      
      setMostrarModalGasto(false)
      setConcepto("")
      setMonto("")
      setArchivoTicket(null)
      setGastoEditando(null)
      cargarTodo()
    } catch (err: any) { alert("Error: " + err.message) }
    finally { setGuardando(false) }
  }

  // GUARDAR / EDITAR NÓMINA ENLAZADA AL PROYECTO ACTUAL
  const guardarNomina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empleado || !pagoTotal) return
    setGuardando(true)
    try {
      const datos = {
        proyecto_id: idObra,
        nombre_empleado: empleado,
        dias_trabajados: parseFloat(dias || "0"),
        monto_total: parseFloat(pagoTotal),
        semana_fechas: semanaFechas,
        estatus: estatusNomina
      }

      if (nominaEditando) {
        await supabase.from("nomina_obreros").update(datos).eq("id", nominaEditando)
      } else {
        await supabase.from("nomina_obreros").insert([datos])
      }

      setMostrarModalNomina(false)
      setNominaEditando(null)
      setEmpleado("")
      setDias("")
      setPagoTotal("")
      setSemanaFechas("")
      cargarTodo()
    } catch (err: any) { alert("Error: " + err.message) }
    finally { setGuardando(false) }
  }

  const eliminarGasto = async (id: string) => {
    if (!window.confirm("¿Borrar gasto?")) return
    await supabase.from("gastos_obra").delete().eq("id", id)
    cargarTodo()
  }

  const eliminarNomina = async (id: string) => {
    if (!window.confirm("¿Borrar registro de nómina?")) return
    await supabase.from("nomina_obreros").delete().eq("id", id)
    cargarTodo()
  }

  if (cargando) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>
  if (!obra) return <div className="min-h-screen bg-[#030712] text-white p-12 text-center">Obra no encontrada</div>

  const totalGral = metricas.total || 1
  const pctMateriales = (metricas.materiales / totalGral) * 100
  const pctAlbanil = (metricas.albanil / totalGral) * 100
  const pctMisc = (metricas.miscelaneas / totalGral) * 100
  const pctNomina = (metricas.totalNomina / totalGral) * 100

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
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Control Financiero & Nómina
              </span>
              <span className="text-slate-500 text-xs font-bold uppercase">{obra.estatus || 'ACTIVO'}</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">{obra.nombre}</h1>
            <p className="text-slate-400 mt-1">{obra.ubicacion || 'Supervisión de gastos y pagos a trabajadores.'}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => { setGastoEditando(null); setConcepto(""); setMonto(""); setTicketActualUrl(""); setArchivoTicket(null); setMostrarModalGasto(true); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer text-sm">
              <Plus size={16} /> Nuevo Gasto
            </button>
            <button onClick={() => { setNominaEditando(null); setEmpleado(""); setDias(""); setPagoTotal(""); setSemanaFechas(""); setMostrarModalNomina(true); }} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] cursor-pointer text-sm">
              <Users size={16} /> Registrar Nómina
            </button>
            <button onClick={exportarExcel} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-sm">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button onClick={exportarPDF} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-sm">
              <FileText size={16} /> PDF
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
            <p className="text-purple-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Nómina Obreros</p>
            <h3 className="text-2xl font-black text-white">${metricas.totalNomina.toLocaleString('es-MX')}</h3>
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
            <Receipt size={18} /> Distribución General del Presupuesto
          </h3>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex mb-4">
            <div style={{ width: `${pctNomina}%` }} className="bg-purple-500 h-full"></div>
            <div style={{ width: `${pctMateriales}%` }} className="bg-amber-500 h-full"></div>
            <div style={{ width: `${pctAlbanil}%` }} className="bg-emerald-500 h-full"></div>
            <div style={{ width: `${pctMisc}%` }} className="bg-blue-500 h-full"></div>
          </div>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-wrap">
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Nómina / Obreros ({pctNomina.toFixed(1)}%)</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Materiales ({pctMateriales.toFixed(1)}%)</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Albañil ({pctAlbanil.toFixed(1)}%)</div>
             <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Misceláneas ({pctMisc.toFixed(1)}%)</div>
          </div>
        </div>

        {/* 1. TABLA DE GASTOS */}
        <div className="glass-card rounded-3xl overflow-hidden mb-8">
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
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {g.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-black text-white">${Number(g.monto).toLocaleString('es-MX')}</td>
                      <td className="px-6 py-5 text-center">
                        {g.ticket_url ? (
                          <a href={g.ticket_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold">
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
                          <button onClick={() => { setGastoEditando(g.id); setConcepto(g.concepto); setMonto(g.monto.toString()); setCategoria(g.categoria); setTicketActualUrl(g.ticket_url || ""); setMostrarModalGasto(true); }} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg cursor-pointer"><Pencil size={16} /></button>
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

        {/* 2. TABLA DE NÓMINA DE OBREROS */}
        <div className="glass-card rounded-3xl overflow-hidden mb-8">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users size={20} className="text-purple-400" /> Control de Nómina y Días Trabajados (Obreros)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/20 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-5">Trabajador</th>
                  <th className="px-6 py-5">Días / Período</th>
                  <th className="px-6 py-5">Monto Pagado</th>
                  <th className="px-6 py-5 text-center">Estatus</th>
                  <th className="px-6 py-5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {nomina.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">No hay registros de nómina en este proyecto.</td></tr>
                ) : (
                  nomina.map(n => (
                    <tr key={n.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5 font-bold text-white">{n.nombre_empleado}</td>
                      <td className="px-6 py-5 text-slate-400 font-medium">
                        {n.dias_trabajados} días <span className="text-xs text-slate-500">({n.semana_fechas || 'Sin fecha'})</span>
                      </td>
                      <td className="px-6 py-5 font-black text-purple-400">${Number(n.monto_total).toLocaleString('es-MX')}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          n.estatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {n.estatus === 'Paid' ? 'Paid (Pagado)' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setNominaEditando(n.id); setEmpleado(n.nombre_empleado); setDias(n.dias_trabajados?.toString() || ""); setPagoTotal(n.monto_total?.toString() || ""); setSemanaFechas(n.semana_fechas || ""); setEstatusNomina(n.estatus || "Paid"); setMostrarModalNomina(true); }} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg cursor-pointer"><Pencil size={16} /></button>
                          <button onClick={() => eliminarNomina(n.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"><Trash2 size={16} /></button>
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

      {/* MODAL NUEVO/EDITAR GASTO */}
      {mostrarModalGasto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B1221]/90 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative glass-card">
            <button onClick={() => setMostrarModalGasto(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white mb-6">{gastoEditando ? "Editar Gasto" : "Registrar Gasto"}</h2>
            <form onSubmit={guardarGasto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Concepto</label>
                <input required type="text" placeholder="Ej. Cemento, Arena..." value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-emerald-500 outline-none text-sm" />
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
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Foto de Ticket (Opcional)</label>
                <div className="flex items-center gap-3 bg-black/30 border border-white/10 p-3 rounded-xl">
                  <Upload size={18} className="text-emerald-400 shrink-0" />
                  <input type="file" accept="image/*" onChange={(e) => setArchivoTicket(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer" />
                </div>
              </div>
              <button type="submit" disabled={guardando} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl mt-6 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer">
                {guardando ? "GUARDANDO..." : "GUARDAR GASTO"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO/EDITAR NÓMINA */}
      {mostrarModalNomina && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B1221]/90 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative glass-card">
            <button onClick={() => setMostrarModalNomina(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white mb-6">{nominaEditando ? "Editar Pago de Nómina" : "Registrar Pago a Trabajador (Obrero)"}</h2>
            <form onSubmit={guardarNomina} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Trabajador</label>
                <input required type="text" placeholder="Ej. Miguel, Aaron, Tío, Berna..." value={empleado} onChange={(e) => setEmpleado(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-purple-500 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Días Trabajados</label>
                  <input type="number" step="0.5" placeholder="Ej. 11" value={dias} onChange={(e) => setDias(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-purple-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Monto Total ($)</label>
                  <input required type="number" step="0.01" placeholder="0.00" value={pagoTotal} onChange={(e) => setPagoTotal(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-purple-400 font-black focus:border-purple-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Período / Fechas</label>
                <input type="text" placeholder="Ej. 26-31 Ene o Feb 7-8" value={semanaFechas} onChange={(e) => setSemanaFechas(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-purple-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Estatus de Pago</label>
                <select value={estatusNomina} onChange={(e) => setEstatusNomina(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-purple-500 outline-none text-sm font-bold bg-[#0B1221] cursor-pointer">
                  <option value="Paid">Paid (Pagado)</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>
              <button type="submit" disabled={guardando} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-xl mt-6 transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] cursor-pointer">
                {guardando ? "GUARDANDO..." : "GUARDAR NÓMINA"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}