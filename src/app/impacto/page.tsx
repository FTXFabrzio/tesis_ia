import { Suspense } from 'react';
import { getCategories, getImpactDocuments, initDatabase } from '@/lib/actions';
import { ImpactTable } from '@/components/ImpactTable';
import { 
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default async function ImpactoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentCatId = typeof resolvedSearchParams.categoria === 'string' ? parseInt(resolvedSearchParams.categoria) : undefined;

  await initDatabase();

  const [documents, categories] = await Promise.all([
    getImpactDocuments({ categoria_id: currentCatId }),
    getCategories(),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-900 flex flex-col sticky top-0 h-screen bg-slate-950/50 backdrop-blur-xl shrink-0">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-600/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Análisis <span className="text-emerald-500 text-xs font-mono uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1">Pro</span></h1>
          </div>

          <nav className="space-y-8">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Módulos</p>
              <div className="space-y-1">
                <FilterLink
                  href="/"
                  active={false}
                  icon={LayoutDashboard}
                  color="sky"
                >
                  Dashboard General
                </FilterLink>
                <FilterLink
                  href="/impacto"
                  active={true}
                  icon={CheckCircle2}
                  color="emerald"
                >
                  Matriz de Impacto
                </FilterLink>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Filtrar Matriz por Categoría</p>
              <div className="space-y-1">
                <FilterLink
                  href="/impacto"
                  active={!currentCatId}
                  icon={ArrowRight}
                  color="emerald"
                >
                  Todas las categorías
                </FilterLink>
                {categories.map((cat) => (
                  <FilterLink
                    key={cat.id}
                    href={`/impacto?categoria=${cat.id}`}
                    active={currentCatId === cat.id}
                    icon={ArrowRight}
                    color="emerald"
                  >
                    {cat.nombre}
                  </FilterLink>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto w-full max-w-[calc(100vw-18rem)]">
        <header className="flex justify-between items-end mb-10">
          <div>
            <p className="text-emerald-400 font-medium text-sm mb-1">Módulo de Análisis Crítico</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">Matriz de Impacto</h2>
          </div>
        </header>

        {/* Info Banner */}
        <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-6 mb-10 flex gap-4 items-start shadow-sm">
          <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-emerald-50 font-semibold mb-1">¿Para qué sirve esta matriz?</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-4xl">
              Esta sección lista todos los <strong className="text-emerald-200/70 font-medium">Documentos (Antecedentes y Artículos)</strong> de tu dashboard para que puedas realizar un análisis profundo.
              Te permite disgregar los aportes, el dataset y generar una evaluación crítica que sirva de puente para redactar tu tesis. 
              Usa el botón <strong className="text-slate-300 font-medium">Exportar Tesis</strong> para obtener un bloque de texto narrativo listo para pegar en tu documento final.
            </p>
          </div>
        </div>

        {/* Table Section */}
        <section className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Evaluación Crítica de Documentos
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{documents.length}</span>
            </h3>
          </div>
          
          <Suspense fallback={<div className="p-20 text-center text-slate-500">Cargando matriz...</div>}>
            <ImpactTable documents={documents} categories={categories} />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

function FilterLink({ 
  href, 
  active, 
  children, 
  icon: Icon,
  color = 'sky'
}: { 
  href: string; 
  active: boolean; 
  children: React.ReactNode;
  icon: any;
  color?: 'sky' | 'emerald';
}) {
  const isSky = color === 'sky';
  const bgClass = isSky ? "bg-sky-600/10 text-sky-400 border border-sky-500/20" : "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20";
  const hoverClass = isSky ? "group-hover:text-sky-400" : "group-hover:text-emerald-400";
  const activeIconClass = isSky ? "text-sky-400" : "text-emerald-400";

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
        active 
          ? bgClass 
          : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 transition-transform group-hover:scale-110",
        active ? activeIconClass : `text-slate-500 ${hoverClass}`
      )} />
      {children}
    </Link>
  );
}
