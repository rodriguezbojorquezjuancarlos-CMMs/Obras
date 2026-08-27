"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Building2, MapPin, ChevronRight, Activity, Wallet, X, Pencil, Trash2 } from "lucide-react"

export default function DashboardPro() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  
  // Estados para el Modal
  const [mostrarModal, setMostrarModal] = useState(false)
  const [proyectoEditando, setProyectoEditando] = useState<string | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoCliente, setNuevoCliente] = useState("")
  const [nuevaUbicacion, setNuevaUbicacion] = useState("")
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState("")
  const [nuevoEstatus, setNuevoEstatus] = useState("Activo")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarProyectos()
  }, [])

  async function cargarProyectos() {
    setCargando(true)
    // Se elimina el .order("created_at") para evitar errores si la columna no existe
    const { data, error } = await supabase
      .from("proyectos")
      .select("*")

    if (error) {
      console.error("Detalle del error de Supabase:", error)
      alert("Fallo al leer proyectos: " + error.message)
    }

    if (data) {
      setProyectos(data)
    }
    setCargando(false)
  }

  // ABRIR MODAL NUEVO
  const abrirModalNuevo = () => {
    setProyectoEditando(null)
    setNuevoNombre("")
    setNuevoCliente("")
    setNuevaUbicacion("")
    setNuevoPresupuesto("")
    setNuevoEstatus("Activo")
    setMostrarModal(true)
  }

  // ABRIR MODAL EDITAR
  const abrirModalEditar = (p: any, e: React.MouseEvent) => {
    e.preventDefault() 
    setProyectoEditando(p.id)
    setNuevoNombre(p.nombre)
    setNuevoCliente(p.cliente || "")
    setNuevaUbicacion(p.ubicacion || "")
    setNuevoPresupuesto(p.presupuesto_estimado?.toString() || "")
    setNuevoEstatus(p.estatus || "Activo")
    setMostrarModal(true)
  }

  // CAMBIAR ESTATUS DIRECTO DESDE LA TARJETA
  const cambiarEstatusDirecto = async (id: string, estatusNuevo: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    setProyectos(proyectos.map(p => p.id === id ? { ...p, estatus: estatusNuevo } : p))
    
    const { error } = await supabase.from("proyectos").update({ estatus: estatusNuevo }).eq("id", id)
    if (error) {
      alert("Error al actualizar estatus: " + error.message)
      cargarProyectos()
    }
  }

  // ELIMINAR PROYECTO
  const eliminarProyecto = async (id: string, e: React.MouseEvent) => {
    e.preventDefault() 
    const confirmar = window.confirm("¿Estás seguro de eliminar este proyecto y todos sus datos?")
    if (!confirmar) return

    try {
      const { error } = await supabase.from("proyectos").delete().eq("id", id)
      if (error) throw error
      cargarProyectos()
    } catch (err: any) {
      alert("Error al eliminar obra: " + err.message)
    }
  }

  // GUARDAR O ACTUALIZAR PROYECTO
  const guardarProyecto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoNombre) return
    setGuardando(true)

    try {
      const datosProyecto = {
        nombre: nuevoNombre,
        cliente: nuevoCliente,
        ubicacion: nuevaUbicacion,
        presupuesto_estimado: parseFloat(nuevoPresupuesto) || 0,
        estatus: nuevoEstatus
      }

      if (proyectoEditando) {
        const { error } = await supabase
          .from("proyectos")
          .update(datosProyecto)
          .eq("id", proyectoEditando)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("proyectos")
          .insert([datosProyecto])
        if (error) throw error
      }

      setMostrarModal(false)
      cargarProyectos()
    } catch (err: any) {
      alert("Error al guardar obra: " + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      
      {/* BARRA DE NAVEGACIÓN SUPERIOR */}
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-12 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <Building2 size={24} className="text-[#030712]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">CMMS <span className="font-light text-slate-400">Obras</span></h1>
          </div>
        </div>

        <button onClick={abrirModalNuevo} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all backdrop-blur-md cursor-pointer">
          <Plus size={18} className="text-emerald-400" /> Nuevo Proyecto
        </button>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-2">Portafolio de Proyectos</h2>
          <p className="text-slate-400">Supervisión y control financiero en tiempo real.</p>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500/50"></div>
          </div>
        ) : proyectos.length === 0 ? (
          
          <div className="text-center py-24 glass-card rounded-3xl border-dashed border-2 border-white/10 flex flex-col items-center justify-center">
             <div className="bg-white/5 p-4 rounded-full mb-4">
                <Building2 size={40} className="text-slate-500" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Aún no hay proyectos registrados</h3>
             <p className="text-slate-400 mb-6 max-w-md">Comienza agregando tu primera obra para llevar el control financiero y supervisión de gastos.</p>
             <button onClick={abrirModalNuevo} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer">
               <Plus size={20} /> Crear mi primer proyecto
             </button>
          </div>

        ) : (
          
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proyectos.map((p) => {
              const currentStatus = p.estatus || 'Activo'
              return (
                <Link href={`/obras/${p.id}`} key={p.id}>
                  <div className="glass-card rounded-2xl p-6 hover:border-emerald-500/30 transition-all group cursor-pointer relative overflow-hidden h-full flex flex-col justify-between">
                    
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>

                    <div className="flex justify-between items-center mb-6 relative z-10">
                      <div onClick={(e) => e.preventDefault()} className="inline-block">
                        <select
                          value={currentStatus}
                          onChange={(e) => cambiarEstatusDirecto(p.id, e.target.value, e)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer transition-colors ${
                            currentStatus === 'En Pausa' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' :
                            currentStatus === 'Terminado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          <option value="Activo" className="bg-[#0B1221] text-emerald-400">🟢 Activo</option>
                          <option value="En Pausa" className="bg-[#0B1221] text-amber-400">🟡 En Pausa</option>
                          <option value="Terminado" className="bg-[#0B1221] text-blue-400">🔵 Terminado</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => abrirModalEditar(p, e)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/30 cursor-pointer">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => eliminarProyecto(p.id, e)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30 cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight className="text-slate-600 group-hover:text-emerald-400 transition-colors ml-1" size={20} />
                      </div>
                    </div>

                    <div className="relative">
                      <h3 className="text-xl font-black text-white mb-1">{p.nombre}</h3>
                      <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-6">
                        <MapPin size={14} className="text-emerald-500" /> {p.ubicacion || 'Sin ubicación'}
                      </p>

                      <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Cliente</p>
                          <p className="text-sm font-medium text-slate-300">{p.cliente || 'General'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Presupuesto</p>
                          <p className="text-lg font-black text-white flex items-center gap-1">
                            <Wallet size={14} className="text-emerald-500" />
                            ${Number(p.presupuesto_estimado || 0).toLocaleString('es-MX')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* MODAL NUEVO / EDITAR PROYECTO */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B1221]/90 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative glass-card">
            <button onClick={() => setMostrarModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black text-white mb-6">
              {proyectoEditando ? "Editar Obra" : "Registrar Obra"}
            </h2>
            
            <form onSubmit={guardarProyecto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre de la Obra</label>
                <input required type="text" placeholder="Ej. Casa Tijuana" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-emerald-500 outline-none transition-colors text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cliente / Propietario</label>
                <input type="text" placeholder="Ej. Familia Pérez" value={nuevoCliente} onChange={(e) => setNuevoCliente(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-emerald-500 outline-none transition-colors text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ubicación</label>
                <input type="text" placeholder="Ej. Tijuana, B.C." value={nuevaUbicacion} onChange={(e) => setNuevaUbicacion(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-emerald-500 outline-none transition-colors text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Presupuesto ($)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold">$</span>
                    <input required type="number" step="0.01" placeholder="0.00" value={nuevoPresupuesto} onChange={(e) => setNuevoPresupuesto(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 pl-7 rounded-xl text-emerald-400 font-black focus:border-emerald-500 outline-none transition-colors text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Estatus</label>
                  <select value={nuevoEstatus} onChange={(e) => setNuevoEstatus(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 focus:border-emerald-500 outline-none transition-colors text-sm font-bold bg-[#0B1221] cursor-pointer">
                    <option value="Activo">Activo</option>
                    <option value="En Pausa">En Pausa</option>
                    <option value="Terminado">Terminado</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={guardando} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 rounded-xl mt-6 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer">
                {guardando ? "GUARDANDO..." : (proyectoEditando ? "ACTUALIZAR PROYECTO" : "CREAR PROYECTO")}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}