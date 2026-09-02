"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Plus, Trash2, Pencil, FileText, Building2, X } from "lucide-react"

export default function Home() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  // Estados Modal Nuevo / Editar Proyecto
  const [mostrarModal, setMostrarModal] = useState(false)
  const [proyectoEditando, setProyectoEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [cliente, setCliente] = useState("")
  const [presupuestoEstimado, setPresupuestoEstimado] = useState("")
  const [estatus, setEstatus] = useState("ACTIVO")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarProyectos()
  }, [])

  async function cargarProyectos() {
    setCargando(true)
    const { data, error } = await supabase.from("proyectos").select("*")
    if (!error) setProyectos(data || [])
    setCargando(false)
  }

  const abrirModalCrear = () => {
    setProyectoEditando(null)
    setNombre("")
    setUbicacion("")
    setCliente("")
    setPresupuestoEstimado("")
    setEstatus("ACTIVO")
    setMostrarModal(true)
  }

  const abrirModalEditar = (proj: any, e: React.MouseEvent) => {
    e.preventDefault()
    setProyectoEditando(proj.id)
    setNombre(proj.nombre || "")
    setUbicacion(proj.ubicacion || "")
    setCliente(proj.cliente || "")
    setPresupuestoEstimado(proj.presupuesto_estimado?.toString() || "")
    setEstatus(proj.estatus || "ACTIVO")
    setMostrarModal(true)
  }

  const guardarProyecto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre) return
    setGuardando(true)
    try {
      const datos = {
        nombre,
        ubicacion,
        cliente,
        presupuesto_estimado: parseFloat(presupuestoEstimado || "0"),
        estatus
      }

      if (proyectoEditando) {
        const { error } = await supabase.from("proyectos").update(datos).eq("id", proyectoEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from("proyectos").insert([datos])
        if (error) throw error
      }

      setMostrarModal(false)
      cargarProyectos()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstatusRapido = async (id: string, nuevoEstatus: string, e: React.MouseEvent) => {
    e.preventDefault()
    await supabase.from("proyectos").update({ estatus: nuevoEstatus }).eq("id", id)
    cargarProyectos()
  }

  const eliminarProyecto = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!window.confirm("¿Estás seguro de eliminar este proyecto y todos sus registros asociados?")) return
    await supabase.from("proyectos").delete().eq("id", id)
    cargarProyectos()
  }

  if (cargando) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* NAVBAR SUPERIOR */}
        <div className="glass-card px-6 py-4 rounded-3xl mb-12 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl text-emerald-400">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">CMMS <span className="text-emerald-400">Obras</span></h1>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Sistema de Gestión & Finanzas</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/cotizaciones" className="flex items-center gap-2 bg-blue-600/25 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 px-4 py-2.5 rounded-2xl font-bold transition-all text-sm cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <FileText size={16} /> Cotizaciones & Invoices
            </Link>

            <button onClick={abrirModalCrear} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-2xl font-black transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer text-sm">
              <Plus size={18} /> Nuevo Proyecto
            </button>
          </div>
        </div>

        {/* HEADER SECCIÓN */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white tracking-tight">Portafolio de Proyectos</h2>
          <p className="text-slate-400 mt-1">Supervisión y control financiero en tiempo real.</p>
        </div>

        {/* GRID DE PROYECTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proyectos.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 glass-card rounded-3xl border border-white/5">
              No hay proyectos registrados. Haz clic en "Nuevo Proyecto" para comenzar.
            </div>
          ) : (
            proyectos.map(proj => (
              <Link href={`/obras/${proj.id}`} key={proj.id} className="group">
                <div className="glass-card p-6 rounded-3xl border border-white/10 hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-72 bg-gradient-to-b from-white/[0.03] to-transparent">
                  
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <select 
                        value={proj.estatus || 'ACTIVO'} 
                        onChange={(e) => {}} 
                        onClick={(e) => e.stopPropagation()}
                        onChangeCapture={(e: any) => cambiarEstatusRapido(proj.id, e.target.value, e)}
                        className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border outline-none cursor-pointer ${
                          proj.estatus === 'TERMINADO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          proj.estatus === 'EN PAUSA' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        <option value="ACTIVO" className="bg-[#0B1221] text-emerald-400">ACTIVO</option>
                        <option value="EN PAUSA" className="bg-[#0B1221] text-amber-400">EN PAUSA</option>
                        <option value="TERMINADO" className="bg-[#0B1221] text-blue-400">TERMINADO</option>
                      </select>

                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => abrirModalEditar(proj, e)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl cursor-pointer" title="Editar proyecto">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => eliminarProyecto(proj.id, e)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl cursor-pointer" title="Eliminar proyecto">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                      {proj.nombre}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{proj.ubicacion || 'Sin ubicación especificada'}</p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cliente</p>
                      <p className="text-sm font-bold text-slate-300">{proj.cliente || 'General'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Presupuesto</p>
                      <p className="text-base font-black text-white">
                        ${Number(proj.presupuesto_estimado || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500">USD</span>
                      </p>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Link>
            ))
          )}
        </div>

      </div>

      {/* MODAL CREAR / EDITAR PROYECTO */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B1221] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative glass-card">
            <button onClick={() => setMostrarModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white mb-6">{proyectoEditando ? "Editar Proyecto" : "Crear Nuevo Proyecto"}</h2>
            
            <form onSubmit={guardarProyecto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Proyecto / Obra</label>
                <input required type="text" placeholder="Ej. Casa Tijuana..." value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ubicación</label>
                <input type="text" placeholder="Ej. Tijuana, B.C." value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cliente</label>
                  <input type="text" placeholder="Ej. El Tío" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Presupuesto (USD)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={presupuestoEstimado} onChange={(e) => setPresupuestoEstimado(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-emerald-400 font-black outline-none text-sm focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Estatus</label>
                <select value={estatus} onChange={(e) => setEstatus(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm font-bold bg-[#0B1221] cursor-pointer">
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="EN PAUSA">EN PAUSA</option>
                  <option value="TERMINADO">TERMINADO</option>
                </select>
              </div>

              <button type="submit" disabled={guardando} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl mt-6 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer">
                {guardando ? "GUARDANDO..." : proyectoEditando ? "ACTUALIZAR PROYECTO" : "GUARDAR PROYECTO"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}