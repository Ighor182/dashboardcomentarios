import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  LayoutDashboard, FileText, TrendingUp, AlertTriangle, Download, 
  ChevronLeft, Sparkles, Loader2, X, SlidersHorizontal
} from 'lucide-react';
import { generateInsights } from '../services/geminiService';
import type { ClassifiedComment } from '../services/geminiService';
import logoColor from '../assets/logo-color.png';

interface DashboardProps {
  data: ClassifiedComment[];
  onLogout: () => void;
  onBack: () => void;
}

const COLORS = ['#F26D21', '#4FC3F7', '#FF9800', '#03A9F4', '#FFB74D', '#81D4FA'];
const CRITICIDADE_COLORS: Record<string, string> = {
  '1 - Alto': '#F26D21',
  '2 - Médio': '#FFB74D',
  '3 - Baixo': '#4FC3F7',
  '4 - Interno TDV': '#90A4AE',
};

// Tipagem dos filtros
interface Filters {
  criticidade: string[];
  tipo: string[];
  processo_vinculado: string[];
  status: string[];
  empresa_autor: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ data, onLogout, onBack }) => {
  const [aiInsights, setAiInsights] = React.useState<string>("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<Filters>({
    criticidade: [],
    tipo: [],
    processo_vinculado: [],
    status: [],
    empresa_autor: [],
  });

  // Gerar insights na montagem
  React.useEffect(() => {
    if (data.length > 0) {
      setIsGenerating(true);
      generateInsights(data)
        .then(setAiInsights)
        .finally(() => setIsGenerating(false));
    }
  }, [data]);

  // Dados filtrados
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      if (filters.criticidade.length > 0 && !filters.criticidade.includes(item.criticidade)) return false;
      if (filters.tipo.length > 0 && !filters.tipo.includes(item.tipo)) return false;
      if (filters.processo_vinculado.length > 0 && !filters.processo_vinculado.includes(item.processo_vinculado)) return false;
      if (filters.status.length > 0 && !filters.status.includes(item.status)) return false;
      if (filters.empresa_autor.length > 0 && !filters.empresa_autor.includes(item.empresa_autor)) return false;
      return true;
    });
  }, [data, filters]);

  // Helper para contar ocorrências
  const getCounts = (key: keyof ClassifiedComment) => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      const val = String(item[key] || 'Não definido');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Valores únicos para os filtros
  const uniqueValues = (key: keyof ClassifiedComment): string[] => {
    const set = new Set<string>();
    data.forEach((item) => {
      const val = String(item[key] || '');
      if (val.trim()) set.add(val);
    });
    return Array.from(set).sort();
  };

  // Toggle de filtro
  const toggleFilter = (dimension: keyof Filters, value: string) => {
    setFilters((prev) => {
      const current = prev[dimension];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [dimension]: next };
    });
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({ criticidade: [], tipo: [], processo_vinculado: [], status: [], empresa_autor: [] });
  };

  const hasActiveFilters = Object.values(filters).some((f) => f.length > 0);

  // Stats
  const stats = {
    total: filteredData.length,
    open: filteredData.filter(item => item.status?.toLowerCase() === 'aberto').length,
    resolved: filteredData.filter(item => item.status?.toLowerCase() === 'resolvido').length,
  };

  // Dados para gráficos
  const statusData = getCounts('status');
  const tipoData = getCounts('tipo');
  const criticidadeData = getCounts('criticidade');
  const procedimentosData = getCounts('procedimento_nome').slice(0, 8);
  const processoVinculadoData = getCounts('processo_vinculado');
  const empresaData = getCounts('empresa_autor');

  // Componente de botão de filtro
  const FilterChips = ({ dimension, label }: { dimension: keyof Filters; label: string }) => {
    const values = uniqueValues(dimension);
    if (values.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">{label}</h4>
        <div className="flex flex-wrap gap-2">
          {values.map((val) => {
            const isActive = filters[dimension].includes(val);
            return (
              <button
                key={val}
                onClick={() => toggleFilter(dimension, val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  isActive
                    ? 'bg-linha-uni-orange text-white border-linha-uni-orange'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/30'
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-linha-uni-blue bg-opacity-100 text-white p-2 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 md:mb-8 gap-4 px-2">
        <div className="flex items-center gap-3 md:gap-4 w-full xl:w-auto">
          <div className="flex-shrink-0">
            <img src={logoColor} alt="Logo Linha Uni" className="h-8 md:h-12 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight">Comentários – POs</h1>
            <p className="text-gray-400 text-xs md:text-sm">Dashboard em Tempo Real</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 w-full xl:w-auto">
          <button 
            onClick={onBack}
            className="glass-card hover:bg-white/10 px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-xs md:text-sm font-medium"
          >
            <ChevronLeft size={16} /> Início
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-xs md:text-sm font-medium ${
              showFilters || hasActiveFilters 
                ? 'bg-linha-uni-orange text-white' 
                : 'glass-card hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal size={16} /> 
            Filtros
          </button>
          <button className="glass-card hover:bg-white/10 px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-xs md:text-sm">
            <Download size={16} /> Exportar
          </button>
          <button onClick={onLogout} className="bg-red-500/20 hover:bg-red-500/40 text-red-100 px-3 py-2 rounded-xl border border-red-500/30 transition-all flex items-center gap-2 text-xs md:text-sm">
            Sair
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {showFilters && (
        <div className="glass-card rounded-2xl p-4 md:p-6 mb-8 mx-2 animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Filtros Ativos</h3>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-sm text-linha-uni-orange hover:underline flex items-center gap-1"
              >
                <X size={14} /> Limpar tudo
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FilterChips dimension="criticidade" label="Criticidade" />
            <FilterChips dimension="tipo" label="Tipo de Documento" />
            <FilterChips dimension="status" label="Status" />
            <FilterChips dimension="processo_vinculado" label="Processo Vinculado" />
            <FilterChips dimension="empresa_autor" label="Empresa do Autor" />
          </div>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 px-2">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: '#F26D21' },
          { label: 'Abertos', value: stats.open, icon: AlertTriangle, color: '#F26D21' },
          { label: 'Resolvidos', value: stats.resolved || '--', icon: TrendingUp, color: '#4FC3F7' },
          { label: '% Resolvido', value: stats.total > 0 ? `${((stats.resolved/stats.total)*100).toFixed(0)}%` : '--', icon: LayoutDashboard, color: '#4FC3F7' },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="w-20 h-20 md:w-32 md:h-32 rounded-full border-4 md:border-8 border-white/5 flex items-center justify-center mb-2 md:mb-4 transition-transform group-hover:scale-105 duration-300">
              <div 
                className="w-16 h-16 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center shadow-inner"
                style={{ backgroundColor: kpi.color }}
              >
                <span className="text-xl md:text-3xl font-black text-white">{kpi.value}</span>
              </div>
            </div>
            <span className="text-gray-400 text-[10px] md:text-sm font-bold text-center tracking-wide uppercase">{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2">
        
        {/* Status Chart */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[300px] md:h-[350px]">
          <h3 className="font-bold text-md md:text-xl mb-4 md:mb-6">Status</h3>
          <div className="h-[200px] md:h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: -10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#fff" tick={{fontSize: 10}} width={80} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#002B49', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px'}} />
                <Bar dataKey="value" fill="#F26D21" radius={[0, 8, 8, 0]} label={{ position: 'right', fill: '#fff', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tipo Chart */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[300px] md:h-[350px]">
          <h3 className="font-bold text-md md:text-xl mb-4 md:mb-6 text-center">Tipo de Documento</h3>
          <div className="h-[200px] md:h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tipoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#fff" tick={{fontSize: 10}} />
                <YAxis stroke="#fff" tick={{fontSize: 10}} />
                <Tooltip contentStyle={{backgroundColor: '#002B49', borderRadius: '8px'}} />
                <Bar dataKey="value" fill="#F26D21" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Criticidade Chart */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[300px] md:h-[350px]">
          <h3 className="font-bold text-md md:text-xl mb-4 text-center">Criticidade</h3>
          <div className="h-[180px] md:h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={criticidadeData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {criticidadeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CRITICIDADE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#002B49', borderRadius: '8px'}} />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ color: '#fff', paddingTop: '10px' }} 
                  formatter={(value) => <span className="text-white text-[10px] md:text-sm font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Procedimentos Rank */}
        <div className="md:col-span-2 glass-card rounded-3xl p-4 md:p-6 h-[400px] md:h-[450px]">
          <h3 className="font-bold text-md md:text-xl mb-4 md:mb-6 text-center">Procedimentos (Ranking)</h3>
          <div className="h-[320px] md:h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={procedimentosData} layout="vertical" margin={{ left: -20, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} stroke="#fff" tick={{fontSize: 9}} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#002B49', borderRadius: '8px'}} />
                <Bar dataKey="value" fill="#F26D21" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#fff', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Processo Vinculado */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[400px] md:h-[450px]">
          <h3 className="font-bold text-md md:text-xl mb-4 md:mb-6 text-center">Processo Vinculado</h3>
          <div className="h-[300px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processoVinculadoData}
                  cx="50%"
                  cy="50%"
                  outerRadius={window.innerWidth < 768 ? 70 : 100}
                  dataKey="value"
                  label={window.innerWidth > 768 ? (props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%` : false}
                  labelLine={{ stroke: '#fff' }}
                >
                  {processoVinculadoData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#002B49', borderRadius: '8px'}} />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  iconSize={8}
                  formatter={(value) => <span className="text-white text-[10px]">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Empresa do Autor */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[300px] md:h-[350px]">
          <h3 className="font-bold text-md md:text-xl mb-4 md:mb-6 text-center">Empresa do Autor</h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empresaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#fff" tick={{fontSize: 10}} />
                <YAxis stroke="#fff" tick={{fontSize: 10}} />
                <Tooltip contentStyle={{backgroundColor: '#002B49', borderRadius: '8px'}} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {empresaData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classificação */}
        <div className="md:col-span-2 glass-card rounded-3xl p-4 md:p-6 h-[300px] md:h-[350px]">
          <h3 className="font-bold text-md md:text-xl mb-4 md:mb-6 text-center">Classificação</h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getCounts('classificacao')} layout="vertical" margin={{ left: -10, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} stroke="#fff" tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#002B49', borderRadius: '8px'}} />
                <Bar dataKey="value" fill="#4FC3F7" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#fff', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* AI Insights Card */}
      <div className="mt-8 px-2">
        <div className="glass-card rounded-3xl p-6 md:p-8 border-l-8 border-linha-uni-orange">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-linha-uni-orange/20 rounded-lg">
              {isGenerating ? (
                <Loader2 className="text-linha-uni-orange animate-spin w-5 h-5" />
              ) : (
                <Sparkles className="text-linha-uni-orange w-5 h-5" />
              )}
            </div>
            <h3 className="text-xl md:text-2xl font-bold">Insights da IA</h3>
          </div>
          <div className="text-gray-300 leading-relaxed text-sm md:text-lg min-h-[60px]">
            {isGenerating ? (
              <div className="flex items-center gap-3 italic text-gray-400">
                <Loader2 className="animate-spin w-4 h-4" />
                Processando dados com Inteligência Artificial...
              </div>
            ) : (
              <div className="whitespace-pre-line">{aiInsights}</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 md:mt-12 text-center text-gray-500 text-[10px] md:text-xs pb-4">
        © 2026 Linha Uni | Sistema de Gestão de Procedimentos Operacionais | Desenvolvido por Ighor Silva
      </div>
    </div>
  );
};

export default Dashboard;
