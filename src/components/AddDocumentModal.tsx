'use client';

import { useState, useRef } from 'react';
import { Plus, X, Loader2, Search, Info } from 'lucide-react';
import { Category } from '@/types';
import { addDocument } from '@/lib/actions';
import { cn } from '@/lib/utils';

interface AddDocumentModalProps {
  categories: Category[];
}

export function AddDocumentModal({ categories }: AddDocumentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [docType, setDocType] = useState<'antecedente' | 'articulo'>('articulo');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [lugar, setLugar] = useState('');
  const [cuartil, setCuartil] = useState('N/A');

  const isFormValid = titulo.trim() !== '' && lugar.trim() !== '' && 
    (docType === 'antecedente' || (docType === 'articulo' && selectedCatId !== ''));

  const autoPreguntas: Record<string, string> = {
    'Categoría 1: Arquitecturas de Sistemas Multi-Agente (MAS) en Diagnóstico': '¿Cómo mejora un enfoque de múltiples agentes especializados la precisión del diagnóstico de fallas en comparación con un solo modelo?',
    'Categoría 2: Modelos de Lenguaje (LLMs) y RAG Avanzado en Mantenimiento': '¿Cuáles son las mejores prácticas para estructurar manuales técnicos complejos (como los de ascensores) usando Generación Aumentada por Recuperación (RAG) para evitar alucinaciones?',
    'Categoría 3: Procesamiento Multimodal en Entornos Industriales': '¿Cómo se procesan e integran de manera efectiva inputs multimodales (audio en entornos ruidosos, imágenes de componentes, texto) para la asistencia técnica en tiempo real?',
    'Categoría 4: Interacción Humano-Computadora (HCI) para Técnicos de Campo': '¿Cuáles son los requerimientos de interfaz y latencia óptimos para asistentes de IA utilizados por técnicos de campo (ej. operando en el foso de un ascensor)?',
    'Categoría 5: Diagnóstico Predictivo y Reactivo en Transporte Vertical': '¿Cuál es el estado del arte actual en la aplicación de algoritmos e inteligencia artificial específicamente para el mantenimiento y diagnóstico de ascensores?'
  };

  const selectedCategory = categories.find(c => c.id.toString() === selectedCatId);
  const derivedPregunta = selectedCategory ? autoPreguntas[selectedCategory.nombre] : '';

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    const result = await addDocument(formData);
    setIsPending(false);

    if (result.success) {
      setIsOpen(false);
      formRef.current?.reset();
      setTitulo('');
      setLugar('');
      setCuartil('N/A');
    } else {
      setError(result.error || 'Ocurrió un error inesperado');
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/20 active:scale-95"
      >
        <Plus className="w-5 h-5" />
        Nuevo Documento
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950/50">
              <div>
                <h2 className="text-xl font-bold text-white">Agregar Documento</h2>
                <p className="text-slate-500 text-sm">Organiza tu estado del arte de la tesis</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6">
                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex gap-3">
                    <Info className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* SECCIÓN 1: Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Información Básica</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">Tipo de Documento</label>
                      <select 
                        name="tipo" 
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all font-medium"
                      >
                        <option value="articulo" className="bg-slate-800 text-slate-200">Artículo Científico</option>
                        <option value="antecedente" className="bg-slate-800 text-slate-200">Antecedente (Tesis/Proyecto)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">Categoría</label>
                      <select 
                        name="categoria_id" 
                        value={selectedCatId}
                        onChange={(e) => setSelectedCatId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        required={docType === 'articulo'}
                        disabled={docType === 'antecedente'}
                      >
                        <option value="" className="bg-slate-800 text-slate-200">Selecciona una categoría...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id} className="bg-slate-800 text-slate-200">
                            {cat.nombre.replace(/^Categoría \d+:\s*/, '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-slate-400">Título del Documento *</label>
                    <textarea 
                      name="titulo" 
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all font-medium resize-none shadow-sm"
                      placeholder="Ej: Análisis de vibraciones en ascensores usando Redes Neuronales..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-slate-400">Autor / Autores</label>
                    <input 
                      name="autores" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                      placeholder="Ej: John Doe, Jane Smith..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">Año *</label>
                      <input 
                        name="año" 
                        type="number" 
                        defaultValue={new Date().getFullYear()}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">País / Lugar *</label>
                      <input 
                        name="lugar" 
                        value={lugar}
                        onChange={(e) => setLugar(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                        placeholder="Ej: España"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">Región</label>
                      <select 
                        name="region" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                      >
                        <option value="N/A" className="bg-slate-800 text-slate-200">N/A</option>
                        <option value="Nacional" className="bg-slate-800 text-slate-200">Nacional</option>
                        <option value="Internacional" className="bg-slate-800 text-slate-200">Internacional</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: Metadatos */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Metadatos y Enlaces</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">Base de Datos / Fuente</label>
                      <select 
                        name="base_datos" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all font-medium"
                      >
                        <option value="" className="bg-slate-500">Seleccione Base de Datos...</option>
                        <option value="IEEE Xplore" className="bg-slate-800 text-slate-200">IEEE Xplore</option>
                        <option value="Scopus" className="bg-slate-800 text-slate-200">Scopus</option>
                        <option value="Web of Science" className="bg-slate-800 text-slate-200">Web of Science</option>
                        <option value="Semantic Scholar" className="bg-slate-800 text-slate-200">Semantic Scholar</option>
                        <option value="Otra" className="bg-slate-800 text-slate-200">Otra / Repositorio Local</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">Revista / Institución</label>
                      <input 
                        name="revista_institucion" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                        placeholder="Ej: IEEE Explorer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-slate-400 block mb-1">Cuartil</label>
                    <input type="hidden" name="cuartil" value={cuartil} />
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full hover:border-slate-600 transition-colors">
                      {['N/A', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setCuartil(q)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            cuartil === q 
                              ? 'bg-sky-500/20 text-sky-400 shadow-sm' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">DOI</label>
                      <input 
                        name="doi_link" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                        placeholder="https://doi.org/10.1109/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">Enlace Externo (Link)</label>
                      <input 
                        name="link" 
                        type="url"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                        placeholder="https://ejemplo.com/doc..."
                      />
                    </div>
                  </div>

                  {docType === 'articulo' && (
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-400">URL Scimango</label>
                      <input 
                        name="scimango" 
                        type="url"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                        placeholder="https://www.scimagojr.com/..."
                      />
                    </div>
                  )}
                </div>

                {/* SECCIÓN 3: Contenido Principal */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Contenido Principal</h3>
                  
                  <div className="space-y-2 relative">
                    <label className="text-[13px] font-medium flex items-center gap-2 text-sky-400/80">
                      Pregunta Clave {docType === 'articulo' && '(Generada Automáticamente)'}
                    </label>
                    <textarea 
                      name="pregunta_clave" 
                      value={docType === 'antecedente' ? "No aplica para antecedentes" : derivedPregunta || ''}
                      readOnly
                      rows={2}
                      className="w-full bg-sky-950/20 border-2 border-dashed border-sky-500/30 rounded-xl px-4 py-3 text-sky-200/90 outline-none transition-all cursor-not-allowed resize-none text-sm leading-relaxed pb-3"
                      placeholder={docType === 'antecedente' ? 'No aplica para antecedentes' : '← Selecciona una categoría arriba para generar tu pregunta'}
                      required={docType === 'articulo'}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-slate-400">Abstract / Resumen</label>
                    <textarea 
                      name="abstract" 
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all resize-none shadow-sm leading-relaxed"
                      placeholder="Resumen del contenido..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-slate-800 bg-slate-950/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 text-slate-400 font-semibold hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !isFormValid}
                  className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold transition-all shadow-lg shrink-0 ${
                    isFormValid 
                      ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 cursor-pointer' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {isPending ? 'Guardando...' : 'Guardar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
