'use client';

import { useState } from 'react';
import { Document, Category } from '@/types';
import { ExternalLink, FileText, BookOpen, Globe, MapPin, Tag, Search, BarChart2, Eye } from 'lucide-react';
import { cn, formatUrl } from '@/lib/utils';
import { EditDocumentModal } from './EditDocumentModal';

interface DocumentTableProps {
  documents: Document[];
  categories: Category[];
}

export function DocumentTable({ documents, categories }: DocumentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const filteredDocuments = documents.filter(doc => 
    doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.autores && doc.autores.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.doi_link && doc.doi_link.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (documents.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
        <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-white font-medium">No se encontraron documentos</h3>
        <p className="text-slate-500 text-sm mt-1">Comienza agregando un antecedente o artículo.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input 
          type="text"
          placeholder="Buscar por título, autor o enlace DOI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all shadow-sm"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Documento</th>
              <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Detalles</th>
              <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Categoría / Cuartil</th>
              <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 p-1.5 rounded-md",
                      doc.tipo === 'antecedente' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {doc.tipo === 'antecedente' ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-white font-medium line-clamp-2 leading-tight">{doc.titulo}</h4>
                      {doc.autores && (
                        <p className="text-slate-400 text-xs mt-1 truncate max-w-sm">
                          {doc.autores}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {doc.lugar} ({doc.año})
                        </span>
                        {doc.tipo === 'antecedente' && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border leading-none font-bold uppercase",
                            doc.region === 'Nacional' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : "border-indigo-500/30 text-indigo-400 bg-indigo-500/5"
                          )}>
                            {doc.region}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1.5">
                    <p className="text-slate-300 text-xs font-medium italic">{doc.revista_institucion}</p>
                    {doc.base_datos && (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded leading-none w-fit tracking-wider">
                        {doc.base_datos}
                      </span>
                    )}
                    <p className="text-slate-500 text-[11px] line-clamp-1">
                      <strong>Pregunta:</strong> {doc.pregunta_clave}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2">
                    {doc.categoria_nombre ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-md border border-slate-700 w-fit">
                        <Tag className="w-3 h-3 text-sky-400" />
                        {doc.categoria_nombre.replace(/^Categoría \d+:\s*/, '')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50 w-fit opacity-80">
                        <Tag className="w-3 h-3 text-slate-600" />
                        Sin Categoría Especificada
                      </span>
                    )}
                    {doc.cuartil !== 'N/A' && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border leading-none font-bold w-fit",
                        doc.cuartil === 'Q1' ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" :
                        doc.cuartil === 'Q2' ? "border-blue-500 text-blue-400 bg-blue-500/10" :
                        doc.cuartil === 'Q3' ? "border-amber-500 text-amber-400 bg-amber-500/10" :
                        "border-rose-500 text-rose-400 bg-rose-500/10"
                      )}>
                        {doc.cuartil}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    {doc.doi_link && (
                      <a 
                        href={formatUrl(doc.doi_link)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-sky-400 transition-colors tooltip-wrapper"
                        title="Abrir DOI"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {doc.link && (
                      <a 
                        href={formatUrl(doc.link)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-emerald-400 transition-colors tooltip-wrapper"
                        title="Abrir Enlace Externo"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    {doc.tipo === 'articulo' && doc.scimango && (
                      <a 
                        href={formatUrl(doc.scimango)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-amber-400 transition-colors tooltip-wrapper"
                        title="Abrir URL Scimango"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setEditingDoc(doc)}
                      className="text-slate-400 hover:text-white transition-colors tooltip-wrapper flex items-center justify-center p-1 rounded-md hover:bg-slate-800"
                      title="Ver y Editar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDocuments.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No se encontraron documentos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    
    {editingDoc && (
      <EditDocumentModal 
        document={editingDoc} 
        categories={categories} 
        onClose={() => setEditingDoc(null)} 
      />
    )}
    </>
  );
}
