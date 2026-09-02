"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { ArrowLeft, FileText, Plus, Trash2, Printer, X } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const TIPO_CAMBIO = 18.00;

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  // Estados Modal Nueva Cotización
  const [mostrarModal, setMostrarModal] = useState(false)
  const [proyectoId, setProyectoId] = useState("")
  const [cliente, setCliente] = useState("")
  const [folio, setFolio] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [validez, setValidez] = useState("15 Days")
  
  // Items de la cotización
  const [items, setItems] = useState<{ descripcion: string; cantidad: number; precio: number }[]>([
    { descripcion: "Installation and labor", cantidad: 1, precio: 0 }
  ])

  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const { data: dataC } = await supabase.from("cotizaciones").select("*").order("created_at", { ascending: false })
    setCotizaciones(dataC || [])

    const { data: dataP } = await supabase.from("proyectos").select("*")
    setProyectos(dataP || [])
    setCargando(false)
  }

  const agregarItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, precio: 0 }])
  }

  const actualizarItem = (index: number, campo: string, valor: any) => {
    const nuevosItems = [...items]
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor }
    setItems(nuevosItems)
  }

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Cálculos
  const subtotal = items.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.precio)), 0)
  const iva = subtotal * 0.16 // 16% Tax / IVA
  const total = subtotal + iva

  const guardarCotizacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente || items.length === 0) return
    setGuardando(true)

    try {
      const datos = {
        proyecto_id: proyectoId || null,
        folio,
        cliente,
        fecha,
        validez,
        items,
        subtotal,
        iva,
        total,
        estatus: "Pending"
      }

      await supabase.from("cotizaciones").insert([datos])
      setMostrarModal(false)
      setCliente("")
      setItems([{ descripcion: "", cantidad: 1, precio: 0 }])
      setFolio(`INV-${Math.floor(1000 + Math.random() * 9000)}`)
      cargarDatos()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminarCotizacion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return
    await supabase.from("cotizaciones").delete().eq("id", id)
    cargarDatos()
  }

  // Generar PDF Profesional en Inglés (Invoice)
  const descargarPDF = (cot: any) => {
    const doc = new jsPDF()
    
    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(16, 185, 129) // Emerald
    doc.text("INVOICE / ESTIMATE", 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Invoice No: ${cot.folio}`, 14, 28)
    doc.text(`Date: ${cot.fecha}`, 14, 34)
    doc.text(`Valid Until: ${cot.validez || '15 Days'}`, 14, 40)

    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("BILLED TO:", 14, 52)
    doc.setFont("helvetica", "normal")
    doc.text(cot.cliente, 14, 58)

    // Items Table (English Headers)
    const cuerpoTabla = cot.items.map((i: any) => [
      i.descripcion,
      i.cantidad,
      `$${Number(i.precio).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`,
      `$${(Number(i.cantidad) * Number(i.precio)).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
    ])

    autoTable(doc, {
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: cuerpoTabla,
      startY: 65,
      headStyles: { fillColor: [16, 185, 129] }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10

    // Totals
    doc.setFont("helvetica", "bold")
    doc.text(`Subtotal: $${Number(cot.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 130, finalY)
    doc.text(`Tax (16%): $${Number(cot.iva).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 130, finalY + 6)
    doc.setFontSize(12)
    doc.text(`TOTAL: $${Number(cot.total).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 130, finalY + 14)
    
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Approx. MXN equivalent (Ex. Rate ${TIPO_CAMBIO}): $${(Number(cot.total) * TIPO_CAMBIO).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 130, finalY + 22)

    doc.save(`${cot.folio}_${cot.cliente.replace(/\s+/g, '_')}.pdf`)
  }

  if (cargando) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 mb-8 transition-colors font-bold text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Commercial Module
            </span>
            <h1 className="text-4xl font-black text-white tracking-tight mt-2">Invoices & Estimates</h1>
            <p className="text-slate-400 mt-1">Generate professional USD quotes with automated tax calculations.</p>
          </div>

          <button onClick={() => setMostrarModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-3 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer text-sm">
            <Plus size={18} /> New Invoice
          </button>
        </div>

        {/* LISTA DE COTIZACIONES */}
        <div className="glass-card rounded-3xl overflow-hidden border border-white/10">
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-lg font-black text-white">Issued Invoices History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/20 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-5">Folio</th>
                  <th className="px-6 py-5">Client</th>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Total (USD / MXN)</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-6 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {cotizaciones.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">No invoices found. Create your first one.</td></tr>
                ) : (
                  cotizaciones.map(cot => (
                    <tr key={cot.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5 font-bold text-emerald-400">{cot.folio}</td>
                      <td className="px-6 py-5 font-bold text-white">{cot.cliente}</td>
                      <td className="px-6 py-5 text-slate-400">{cot.fecha}</td>
                      <td className="px-6 py-5">
                        <div className="font-black text-white">${Number(cot.total).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">≈ ${(Number(cot.total) * TIPO_CAMBIO).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                          {cot.estatus}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => descargarPDF(cot)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg cursor-pointer" title="Download PDF"><Printer size={16} /></button>
                          <button onClick={() => eliminarCotizacion(cot.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer" title="Delete"><Trash2 size={16} /></button>
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

      {/* MODAL CREAR COTIZACIÓN */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0B1221] border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative my-8">
            <button onClick={() => setMostrarModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white mb-6">New Invoice / Estimate</h2>
            
            <form onSubmit={guardarCotizacion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Client / Company</label>
                  <input required type="text" placeholder="Client name" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Link to Project (Optional)</label>
                  <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm font-bold bg-[#0B1221] cursor-pointer">
                    <option value="">-- No specific project --</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Invoice No.</label>
                  <input required type="text" value={folio} onChange={(e) => setFolio(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-emerald-400 font-bold outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date</label>
                  <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Valid Until</label>
                  <input type="text" value={validez} onChange={(e) => setValidez(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3.5 rounded-xl text-slate-200 outline-none text-sm" />
                </div>
              </div>

              {/* CONCEPTOS / ITEMS */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-sm uppercase">Items & Services (USD)</h3>
                  <button type="button" onClick={agregarItem} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500/20 cursor-pointer">
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-center bg-black/20 p-3 rounded-xl border border-white/5">
                      <input 
                        type="text" 
                        placeholder="Service or material description" 
                        value={item.descripcion} 
                        onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)} 
                        className="w-full bg-transparent border-b border-white/10 pb-1 text-sm text-slate-200 outline-none" 
                        required 
                      />
                      <input 
                        type="number" 
                        placeholder="Qty" 
                        value={item.cantidad} 
                        onChange={(e) => actualizarItem(index, 'cantidad', parseFloat(e.target.value) || 0)} 
                        className="w-16 bg-transparent border-b border-white/10 pb-1 text-sm text-slate-200 outline-none text-center" 
                        required 
                      />
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Price USD" 
                        value={item.precio} 
                        onChange={(e) => actualizarItem(index, 'precio', parseFloat(e.target.value) || 0)} 
                        className="w-28 bg-transparent border-b border-white/10 pb-1 text-sm text-emerald-400 font-bold outline-none text-right" 
                        required 
                      />
                      {items.length > 1 && (
                        <button type="button" onClick={() => eliminarItem(index)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTALES */}
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-end space-y-1 text-sm">
                <div className="text-slate-400">Subtotal: <span className="text-white font-bold">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span></div>
                <div className="text-slate-400">Tax (16%): <span className="text-white font-bold">${iva.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span></div>
                <div className="text-lg font-black text-emerald-400 pt-2 border-t border-white/10 w-full text-right">
                  Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD 
                  <span className="block text-xs font-normal text-slate-400 mt-0.5">≈ ${(total * TIPO_CAMBIO).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                </div>
              </div>

              <button type="submit" disabled={guardando} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer">
                {guardando ? "SAVING..." : "SAVE & GENERATE INVOICE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}