import { Suspense } from 'react';
import Link from 'next/link';
import { getDocuments, getCategories, getStats, initDatabase } from '@/lib/actions';
import { StatsCard } from '@/components/StatsCard';
import { DocumentTable } from '@/components/DocumentTable';
import { AddDocumentModal } from '@/components/AddDocumentModal';
import { 
  BarChart3, 
  BookOpen, 
  FileText, 
  Filter, 
  LayoutDashboard, 
  Search,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  // Initialize DB if needed (optional, but good for first run)
  await initDatabase();

  const currentType = typeof resolvedSearchParams.tipo === 'string' ? resolvedSearchParams.tipo : undefined;
  const currentCatId = typeof resolvedSearchParams.categoria === 'string' ? parseInt(resolvedSearchParams.categoria) : undefined;

  const [documents, categories, stats] = await Promise.all([
    getDocuments({ tipo: currentType, categoria_id: currentCatId }),
    getCategories(),
    getStats(),
  ]);

  const totalGoal = stats.antecedentesGoal + stats.articulosGoal;
  const totalProgress = Math.min(Math.round((stats.totalDocs / totalGoal) * 100), 100);

  const completedCategoryIds = stats.byCategory
    .filter(cat => cat.count >= cat.goal)
    .map(cat => cat.categoria_id);
    
  const availableCategoriesForNew = categories.filter(
    cat => !completedCategoryIds.includes(cat.id)
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-900 flex flex-col sticky top-0 h-screen bg-slate-950/50 backdrop-blur-xl">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-sky-600 p-2.5 rounded-xl shadow-lg shadow-sky-600/20">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">DocThesis <span className="text-sky-500 text-xs font-mono uppercase bg-sky-500/10 px-1.5 py-0.5 rounded ml-1">v1.0</span></h1>
          </div>

          <nav className="space-y-8">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Filtros por Tipo</p>
              <div className="space-y-1">
                <FilterLink
                  href="/"
                  active={!currentType}
                  icon={BarChart3}
                >
                  Todos los registros
                </FilterLink>
                <FilterLink
                  href="/?tipo=antecedente"
                  active={currentType === 'antecedente'}
                  icon={FileText}
                >
                  Antecedentes
                </FilterLink>
                <FilterLink
                  href="/?tipo=articulo"
                  active={currentType === 'articulo'}
                  icon={BookOpen}
                >
                  Artículos
                </FilterLink>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Módulos</p>
              <div className="space-y-1">
                <FilterLink
                  href="/"
                  active={true}
                  icon={LayoutDashboard}
                >
                  Dashboard General
                </FilterLink>
                <FilterLink
                  href="/impacto"
                  active={false}
                  icon={CheckCircle2}
                >
                  Matriz de Impacto
                </FilterLink>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Filtros por Tipo</p>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <FilterLink
                    key={cat.id}
                    href={`/?categoria=${cat.id}${currentType ? `&tipo=${currentType}` : ''}`}
                    active={currentCatId === cat.id}
                    icon={ArrowRight}
                  >
                    {cat.nombre.replace(/^Categoría \d+:\s*/, '')}
                  </FilterLink>
                ))}
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-900">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-400">Progreso General</span>
              <span className="text-xs font-bold text-sky-400">{stats.totalDocs} / {totalGoal}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div 
                className="bg-sky-500 h-full rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" 
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <p className="text-sky-400 font-medium text-sm mb-1">Bienvenido, Investigador</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">Dashboard Documental</h2>
          </div>
          <AddDocumentModal categories={availableCategoriesForNew} />
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatsCard 
            title="Antecedentes" 
            value={stats.totalAntecedentes} 
            goal={stats.antecedentesGoal} 
            icon={FileText}
            color="bg-amber-500 shadow-amber-500/20"
          />
          <StatsCard 
            title="Artículos Totales" 
            value={stats.totalArticulos} 
            goal={stats.articulosGoal} 
            icon={BookOpen}
            color="bg-blue-600 shadow-blue-600/20"
          />
          <StatsCard 
            title="Sincronización" 
            value={stats.totalDocs} 
            goal={totalGoal} 
            icon={CheckCircle2}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard 
            title="Pendientes" 
            value={Math.max(0, totalGoal - stats.totalDocs)} 
            goal={totalGoal} 
            icon={Clock}
            color="bg-rose-500 shadow-rose-500/20"
          />
        </div>

        {/* Per Category Stats (Horizontal) */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Estado por Categoría (Artículos)</h3>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {stats.byCategory.map((cat, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-900 rounded-lg p-3">
                <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-1" title={cat.categoria_nombre}>
                  {cat.categoria_nombre?.replace(/^Categoría \d+:\s*/, '')}
                </p>
                <div className="flex items-end justify-between">
                  <span className="text-lg font-bold text-white leading-none">{cat.count} <span className="text-[10px] text-slate-600">/ {cat.goal}</span></span>
                  <div className="w-12 bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all shadow-sm",
                        cat.count >= cat.goal ? "bg-emerald-500 shadow-emerald-500/50" : 
                        cat.count >= (cat.goal / 2) ? "bg-amber-500 shadow-amber-500/50" : 
                        "bg-rose-500 shadow-rose-500/50"
                      )} 
                      style={{ width: `${Math.min(100, (cat.count/cat.goal)*100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table Section */}
        <section className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Listado de Documentos
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{documents.length}</span>
            </h3>
          </div>
          
          <Suspense fallback={<div className="p-20 text-center text-slate-500">Cargando documentos...</div>}>
            <DocumentTable documents={documents} categories={categories} />
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
  icon: Icon 
}: { 
  href: string; 
  active: boolean; 
  children: React.ReactNode;
  icon: any;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
        active 
          ? "bg-sky-600/10 text-sky-400 border border-sky-500/20" 
          : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 transition-transform group-hover:scale-110",
        active ? "text-sky-400" : "text-slate-500"
      )} />
      {children}
    </Link>
  );
}
