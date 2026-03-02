'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ImpactDocument, Category } from '@/types';
import { Edit3, Download, Copy, CheckCircle2, X, Loader2, Search, FileText, AlertTriangle, ChevronDown, Plus } from 'lucide-react';
import { saveImpactAnalysis } from '@/lib/actions';

interface ImpactTableProps {
  documents: ImpactDocument[];
  categories: Category[];
}

export function ImpactTable({ documents, categories }: ImpactTableProps) {
  const [editingDoc, setEditingDoc] = useState<ImpactDocument | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('todos');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.autores && doc.autores.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'todos' || doc.tipo === selectedType;
    const matchesCategory = selectedType === 'articulo' && selectedCategory !== 'todas' 
      ? doc.categoria_nombre === selectedCategory 
      : true;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const handleExport = (doc: ImpactDocument) => {
    const text = `(${doc.autores || 'Autores'}, ${doc.año}) en su trabajo titulado "${doc.titulo}" abordan la problemática de ${doc.problematica || '...'}. Como principal aporte, proponen ${doc.aporte || '...'}, utilizando ${doc.herramientas || '...'} y el dataset ${doc.dataset || '...'}. Sus resultados demostraron ${doc.metricas_resultados || '...'}. Sin embargo, este enfoque presenta limitaciones, ya que ${doc.analisis_critico || '...'}. Para esta investigación, este trabajo resulta fundamental porque ${doc.utilidad_proyecto || '...'}.`;
    
    navigator.clipboard.writeText(text);
    setCopiedId(doc.id || null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            placeholder="Buscar por título o autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            if (e.target.value !== 'articulo') setSelectedCategory('todas');
          }}
          className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm w-full md:w-56 appearance-none cursor-pointer hover:bg-slate-800/80"
        >
          <option value="todos" className="bg-slate-900 text-slate-200">Todos los Tipos</option>
          <option value="antecedente" className="bg-slate-900 text-slate-200">Solo Antecedentes</option>
          <option value="articulo" className="bg-slate-900 text-slate-200">Solo Artículos</option>
        </select>
        
        {selectedType === 'articulo' && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-sm w-full md:w-80 appearance-none cursor-pointer hover:bg-slate-800/80 animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <option value="todas" className="bg-slate-900 text-slate-200">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.nombre} className="bg-slate-900 text-slate-200">
                {cat.nombre.replace(/^Categoría \d+:\s*/, '')}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-4">
        {filteredDocuments.map((doc) => {
          const isExpanded = expandedIds.has(doc.id);
          
          return (
          <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 transition-all">
            {/* Header de la Fila Expandible */}
            <div 
              className="p-5 flex flex-col md:flex-row justify-between items-center gap-4 cursor-pointer hover:bg-slate-800/20 transition-colors"
              onClick={() => toggleExpand(doc.id)}
            >
              <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
                <button className={`shrink-0 p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-all ${isExpanded ? 'rotate-180 text-sky-400' : ''}`}>
                  <ChevronDown className="w-5 h-5" />
                </button>
                <div className="w-full">
                  <h4 className="text-white font-medium text-base mb-2 leading-snug pr-4">{doc.titulo}</h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                      doc.tipo === 'antecedente' 
                        ? 'bg-amber-950/30 text-amber-500 border-amber-500/30' 
                        : 'bg-blue-950/30 text-blue-400 border-blue-500/30'
                    }`}>
                      {doc.tipo}
                    </span>
                    <span className="inline-block px-2.5 py-0.5 rounded bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                      {doc.categoria_nombre ? doc.categoria_nombre.replace(/^Categoría \d+:\s*/, '') : 'Sin Categoría'}
                    </span>
                    {!doc.impact_id && (
                      <span className="text-[10px] text-rose-500/80 font-medium italic ml-1">Sin análisis registrado</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div 
                className="flex flex-row gap-2 shrink-0 w-full md:w-auto"
                onClick={(e) => e.stopPropagation()} // Para no expandir al tocar botones
              >
                <button 
                  onClick={() => setEditingDoc(doc)}
                  className="flex justify-center items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold rounded-lg border border-slate-700 transition flex-1 md:flex-none"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button 
                  onClick={() => handleExport(doc)}
                  disabled={!doc.impact_id}
                  className="flex justify-center items-center gap-2 px-4 py-2 bg-sky-900/20 hover:bg-sky-900/40 disabled:opacity-50 disabled:cursor-not-allowed text-sky-400 text-[11px] font-semibold rounded-lg border border-sky-500/20 transition flex-1 md:flex-none"
                >
                  {copiedId === doc.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} 
                  Exportar
                </button>
              </div>
            </div>

            {/* Contenido Expandido (Ancho Completo, 2 columnas informativas) */}
            {isExpanded && (
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 border-t border-slate-800 bg-slate-900/50 animate-in slide-in-from-top-2 duration-200">
                <div className="p-6">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Análisis Crítico</h5>
                  <FormattedText text={doc.analisis_critico || ''} type="warning" />
                </div>
                <div className="p-6">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Utilidad (Tesis)</h5>
                  <FormattedText text={doc.utilidad_proyecto || ''} type="check" />
                </div>
              </div>
            )}
          </div>
        )})}
        {filteredDocuments.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No hay documentos para analizar con estos filtros.
          </div>
        )}
      </div>

      {editingDoc && <EditAnalysisModal doc={editingDoc} onClose={() => setEditingDoc(null)} />}
    </>
  );
}

function EditAnalysisModal({ doc, onClose }: { doc: ImpactDocument, onClose: () => void }) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    formData.append('documento_id', doc.id.toString());
    
    await saveImpactAnalysis(formData);
    setIsPending(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Editar Análisis de Impacto</h2>
            <p className="text-slate-500 text-sm mt-1 line-clamp-1">{doc.titulo}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-8">
            
            {/* Seccion 1: Resumen del Paper */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="w-5 h-5 text-sky-400" />
                Resumen del Documento
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Problemática que aborda</label>
                <AutoResizeTextarea 
                  name="problematica" 
                  defaultValue={doc.problematica}
                  placeholder="Ej: Altos costos de mantenimiento por fallas inesperadas..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Principal Aporte</label>
                <AutoResizeTextarea 
                  name="aporte" 
                  defaultValue={doc.aporte}
                  placeholder="Ej: Un nuevo marco multimodal que integra..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Herramientas / Algoritmos</label>
                <AutoResizeTextarea 
                  name="herramientas" 
                  defaultValue={doc.herramientas}
                  placeholder="Ej: Modelos de IA: LLM basado en BERT..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Dataset utilizado</label>
                <AutoResizeTextarea 
                  name="dataset" 
                  defaultValue={doc.dataset}
                  placeholder="Ej: 50,000 registros de vibración en 6 meses..."
                />
                <p className="text-xs text-slate-500 mt-1">Especifica volumen, frecuencia, o tipo de señales recogidas.</p>
              </div>
            </div>

            {/* Seccion 2: Análisis Propio */}
            <div className="space-y-6 pt-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                Análisis y Utilidad
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Métricas y Resultados Clave</label>
                <AutoResizeTextarea 
                  name="metricas_resultados" 
                  defaultValue={doc.metricas_resultados}
                  placeholder="Ej: 95% de precisión (F1-Score), reduce el RMSE a 0.02..."
                />
                <p className="text-xs text-slate-500 mt-1">Indica qué métricas demostraron el éxito de su solución.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-rose-400">Análisis Crítico (Limitaciones)</label>
                <AutoResizeTextarea 
                  name="analisis_critico" 
                  defaultValue={doc.analisis_critico}
                  className="!border-rose-500/30 focus:!ring-rose-500/50 bg-rose-950/5"
                  placeholder="Ej: Su modelo requiere mucha capacidad computacional y no es aplicable en tiempo real..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-emerald-400">Utilidad para nuestro Proyecto</label>
                <AutoResizeTextarea 
                  name="utilidad_proyecto" 
                  defaultValue={doc.utilidad_proyecto}
                  className="!bg-emerald-900/10 !border-emerald-500/30 focus:!ring-emerald-500/50"
                  placeholder="Ej: Usaremos su técnica de extracción de características de vibración pero con un modelo más ligero..."
                />
              </div>
            </div>

          </div>
          
          <div className="flex justify-end gap-3 p-6 border-t border-slate-800 bg-slate-950/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-slate-400 font-semibold hover:text-white transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/20 shrink-0 text-sm"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Guardando...' : 'Guardar Análisis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AutoResizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [props.defaultValue]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
        if (props.onInput) props.onInput(e);
      }}
      className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-sky-500/50 text-sm overflow-hidden min-h-[50px] resize-none ${props.className || ''}`}
    />
  );
}

function FormattedText({ text, type }: { text: string, type: 'warning' | 'check' }) {
  if (!text) return (
    <div className="flex items-center gap-2 opacity-30 mt-2">
      <Plus className="w-4 h-4 text-slate-600" />
      <span className="text-slate-600 italic text-xs">Sin especificar</span>
    </div>
  );

  const lines = text.split('\n').filter(l => l.trim() !== '');

  return (
    <ul className="space-y-4">
      {lines.map((line, idx) => {
        // Regex para atrapar "Concepto Principal: descripción..."
        // También maneja casos donde empiece con un emoji (lo ignora o lo guarda).
        const match = line.match(/^([^\:]+)\:(.*)$/);
        
        return (
          <li key={idx} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800 shadow-sm">
              {type === 'warning' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </span>
            <span className="text-slate-300 text-[13px] leading-relaxed pt-0.5">
              {match ? (
                <>
                  <strong className={type === 'warning' ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                    {match[1].replace(/^[^\w]*/, '')}: 
                  </strong>
                  {match[2]}
                </>
              ) : (
                line
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
