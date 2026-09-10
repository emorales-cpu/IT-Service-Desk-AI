import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Upload,
  Users,
  AlertTriangle,
  CheckCircle,
  Ticket,
  Layers,
  Filter,
  AlertOctagon,
  Sparkles,
  TrendingUp,
  BarChart3,
  List,
  Award,
  X,
} from 'lucide-react';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6366f1',
];

interface TicketData {
  [key: string]: string;
}

interface UserStat {
  name: string;
  dept: string;
  role: string;
  total: number;
  closed: number;
  backlog: number;
  violations: number;
  resolutionRate: string;
  slaCompliance: string;
  numericResolutionRate: number;
  numericSlaCompliance: number;
  incentiveStatus: string;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  text: string;
  data: any[]; // Datos para el gráfico modal
  title: string;
}

export default function App() {
  const [allTickets, setAllTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'raw'>(
    'dashboard'
  );

  const [selectedUser, setSelectedUser] = useState<string>('Todos');
  const [selectedDept, setSelectedDept] = useState<string>('Todos');

  // Estado para el Modal de Insights
  const [activeModal, setActiveModal] = useState<Insight | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        let headerIndex = -1;

        for (let i = 0; i < rows.length; i++) {
          const rowString = rows[i].join(',').toLowerCase();
          if (
            rowString.includes('ticket id') ||
            rowString.includes('ticket_id')
          ) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          alert(
            'Error: No se encontró la cabecera de datos. Asegúrate de subir el reporte correcto.'
          );
          setLoading(false);
          return;
        }

        const headers = rows[headerIndex].map((h) => h.trim());
        const rawData = rows.slice(headerIndex + 1);

        const tickets: TicketData[] = rawData
          .map((row) => {
            const obj: TicketData = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] ? row[idx].trim() : '';
            });
            return obj;
          })
          .filter((t) => t['Ticket Id'] || t['Ticket ID']);

        setAllTickets(tickets);
        setLoading(false);
      },
    });
  };

  const getVal = (
    ticket: TicketData,
    possibleKeys: string[],
    defaultValue: string
  ) => {
    for (const key of possibleKeys) {
      if (ticket[key] && ticket[key] !== '-' && ticket[key].trim() !== '') {
        return ticket[key];
      }
    }
    return defaultValue;
  };

  const { stats, uniqueUsers, uniqueDepts, filteredTickets, insights } =
    useMemo(() => {
      if (allTickets.length === 0)
        return {
          stats: null,
          uniqueUsers: [],
          uniqueDepts: [],
          filteredTickets: [],
          insights: [],
        };

      const usersSet = new Set<string>();
      const deptsSet = new Set<string>();

      allTickets.forEach((t) => {
        usersSet.add(
          getVal(
            t,
            ['Ticket Owner', 'Técnico Responsable', 'Técnico'],
            'Sin Asignar'
          )
        );
        deptsSet.add(
          getVal(
            t,
            [
              'Sub-departamento',
              'Sub-departament',
              'Sub-department',
              'Departamento',
              'Department Name',
            ],
            'Sin Depto'
          )
        );
      });

      const uniqueUsersList = Array.from(usersSet).sort();
      const uniqueDeptsList = Array.from(deptsSet).sort();

      const currentTickets = allTickets.filter((t) => {
        const owner = getVal(
          t,
          ['Ticket Owner', 'Técnico Responsable', 'Técnico'],
          'Sin Asignar'
        );
        const dept = getVal(
          t,
          [
            'Sub-departamento',
            'Sub-departament',
            'Sub-department',
            'Departamento',
            'Department Name',
          ],
          'Sin Depto'
        );
        return (
          (selectedUser === 'Todos' || owner === selectedUser) &&
          (selectedDept === 'Todos' || dept === selectedDept)
        );
      });

      let total = currentTickets.length;
      let closed = 0;
      let backlog = 0;
      let slaViolations = 0;

      const userStats: Record<string, UserStat> = {};
      const categoryStats: Record<string, { name: string; value: number }> = {};
      const statusStats: Record<string, { name: string; value: number }> = {};
      const priorityStats: Record<string, { name: string; value: number }> = {};

      currentTickets.forEach((t) => {
        const owner = getVal(
          t,
          ['Ticket Owner', 'Técnico Responsable', 'Técnico'],
          'Sin Asignar'
        );
        const dept = getVal(
          t,
          [
            'Sub-departamento',
            'Sub-departament',
            'Sub-department',
            'Departamento',
            'Department Name',
          ],
          'Sin Depto'
        );
        const status = getVal(
          t,
          ['Status (Ticket)', 'Estado', 'Status'],
          'Open'
        );
        const sla = getVal(
          t,
          ['SLA Violation Type', 'Tipo Violación SLA', 'Violación SLA'],
          'Not Violated'
        );
        const product = getVal(
          t,
          ['Product Name (Ticket)', 'Categoría / Producto', 'Product Name'],
          'Sin Categoría'
        );
        const role = getVal(t, ['Request Level', 'Rol', 'Nivel'], 'N/A');
        const priority = getVal(
          t,
          ['Priority (Ticket)', 'Prioridad'],
          'Normal'
        );

        const isClosed =
          status.toLowerCase().includes('closed') ||
          status.toLowerCase().includes('resolved');
        const isViolation =
          sla.toLowerCase().includes('violation') ||
          sla.toLowerCase().includes('violación');

        if (isClosed) closed++;
        else backlog++;
        if (isViolation) slaViolations++;

        if (!userStats[owner]) {
          userStats[owner] = {
            name: owner,
            dept,
            role,
            total: 0,
            closed: 0,
            backlog: 0,
            violations: 0,
            resolutionRate: '0',
            slaCompliance: '0',
            numericResolutionRate: 0,
            numericSlaCompliance: 0,
            incentiveStatus: '',
          };
        }
        userStats[owner].total++;
        if (isClosed) userStats[owner].closed++;
        else userStats[owner].backlog++;
        if (isViolation) userStats[owner].violations++;

        if (!categoryStats[product])
          categoryStats[product] = { name: product, value: 0 };
        categoryStats[product].value++;

        if (!statusStats[status])
          statusStats[status] = { name: status, value: 0 };
        statusStats[status].value++;

        if (!priorityStats[priority])
          priorityStats[priority] = { name: priority, value: 0 };
        priorityStats[priority].value++;
      });

      const processedUsers = Object.values(userStats)
        .map((u) => {
          const numResRate = u.total > 0 ? (u.closed / u.total) * 100 : 0;
          const numSlaComp =
            u.total > 0 ? ((u.total - u.violations) / u.total) * 100 : 0;
          return {
            ...u,
            numericResolutionRate: numResRate,
            numericSlaCompliance: numSlaComp,
            resolutionRate: numResRate.toFixed(1) + '%',
            slaCompliance: numSlaComp.toFixed(1) + '%',
            incentiveStatus: numSlaComp >= 85 ? 'Aprobado' : 'En Revisión',
          };
        })
        .sort((a, b) => b.total - a.total);

      const processedCategories = Object.values(categoryStats)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      const processedStatus = Object.values(statusStats).sort(
        (a, b) => b.value - a.value
      );

      const complianceRateGlobalNum =
        total === 0 ? 0 : ((total - slaViolations) / total) * 100;
      const complianceRateGlobal = complianceRateGlobalNum.toFixed(1) + '%';

      // ==========================================
      // GENERADOR DE INSIGHTS INTERACTIVOS (MODALES)
      // ==========================================
      let generatedInsights: Insight[] = [];

      // Insight 1: Salud Global
      if (complianceRateGlobalNum >= 85) {
        // Preparamos datos para la gráfica de tendencia simulada o comparación
        const slaData = processedUsers
          .map((u) => ({
            name: u.name.split(' ')[0],
            SLA: u.numericSlaCompliance,
            Meta: 85,
          }))
          .slice(0, 8);
        generatedInsights.push({
          id: 'global-sla',
          type: 'success',
          title: 'Cumplimiento SLA por Técnico',
          text: `Rendimiento Óptimo: El equipo mantiene un SLA global saludable de ${complianceRateGlobal}.`,
          data: slaData,
        });
      } else {
        const slaData = processedUsers
          .map((u) => ({
            name: u.name.split(' ')[0],
            SLA: u.numericSlaCompliance,
            Meta: 85,
          }))
          .slice(0, 8);
        generatedInsights.push({
          id: 'global-sla-warn',
          type: 'warning',
          title: 'Rendimiento Crítico de SLA',
          text: `Alerta: El SLA global (${complianceRateGlobal}) está por debajo de la meta del 85%.`,
          data: slaData,
        });
      }

      // Insight 2: Foco Operativo (El que más viola SLAs)
      const topViolator = processedUsers
        .slice()
        .sort((a, b) => b.violations - a.violations)[0];
      if (topViolator && topViolator.violations > 0) {
        // Datos: Comparación de violaciones del equipo
        const violatorData = processedUsers
          .filter((u) => u.violations > 0)
          .map((u) => ({
            name: u.name.split(' ')[0],
            Violaciones: u.violations,
          }))
          .sort((a, b) => b.Violaciones - a.Violaciones)
          .slice(0, 5);

        generatedInsights.push({
          id: 'foco-operativo',
          type: 'danger',
          title: 'Comparativa de Violaciones SLA',
          text: `Foco Operativo: ${topViolator.name} registra ${topViolator.violations} violaciones de SLA (Requiere revisión).`,
          data: violatorData,
        });
      }

      // Insight 3: Categoría Principal
      if (processedCategories.length > 0) {
        // Datos: Top 5 categorías
        const catData = processedCategories.slice(0, 5).map((c) => ({
          name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
          Volumen: c.value,
        }));
        generatedInsights.push({
          id: 'top-categoria',
          type: 'info',
          title: 'Distribución de Volumen por Categoría',
          text: `Categoría Principal: "${processedCategories[0].name}" representa el mayor volumen de tickets.`,
          data: catData,
        });
      }

      return {
        stats: {
          total,
          closed,
          backlog,
          slaViolations,
          resolutionRateGlobal:
            total === 0 ? '0.0%' : ((closed / total) * 100).toFixed(1) + '%',
          complianceRateGlobal: complianceRateGlobal,
          isApprovedGlobal: complianceRateGlobalNum >= 85,
          users: processedUsers,
          categories: processedCategories,
          status: processedStatus,
        },
        uniqueUsers: uniqueUsersList,
        uniqueDepts: uniqueDeptsList,
        filteredTickets: currentTickets,
        insights: generatedInsights,
      };
    }, [allTickets, selectedUser, selectedDept]);

  if (allTickets.length === 0) {
    return (
      <div className="min-h-screen bg-[#090e17] flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="bg-[#131b2c] p-10 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.1)] text-center max-w-lg w-full border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-emerald-400"></div>
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/20">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
            IT Service Desk AI
          </h1>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Plataforma analítica para evaluación operativa y dictamen de
            incentivos. Sube el ExportReport para comenzar.
          </p>
          <label className="cursor-pointer bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-3 text-sm shadow-lg shadow-blue-900/40 hover:scale-105 active:scale-95">
            {loading ? 'Procesando Motor de Datos...' : 'Cargar Reporte (CSV)'}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={loading}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090e17] text-slate-300 font-sans pb-12 flex flex-col items-center relative">
      {/* MODAL DE INSIGHTS */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#131b2c] w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                {activeModal.title}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-300 mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                {activeModal.text}
              </p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeModal.data}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#1e293b"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#1e293b', opacity: 0.4 }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />

                    {/* Renderizamos las barras dinámicamente según la data */}
                    {Object.keys(activeModal.data[0] || {})
                      .filter((k) => k !== 'name')
                      .map((key, index) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          fill={index === 0 ? '#3b82f6' : '#10b981'}
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                        />
                      ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARRA SUPERIOR (HEADER) */}
      <div className="bg-[#131b2c] border-b border-slate-800 sticky top-0 z-40 shadow-md w-full flex justify-center">
        <div className="w-full max-w-[1300px] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide leading-tight">
                Dashboard Ejecutivo IT
              </h1>
              <p className="text-slate-500 text-xs font-medium">
                Evaluación de Desempeño Operativo e Incentivos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-[#090e17] rounded-lg p-1 border border-slate-800">
              <Filter className="w-4 h-4 text-slate-500 ml-2 mt-2" />
              <select
                className="bg-transparent border-none text-slate-300 text-sm focus:ring-0 cursor-pointer py-1.5 pl-2 pr-6 outline-none appearance-none"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="Todos" className="bg-[#131b2c]">
                  Dpto: Todos
                </option>
                {uniqueDepts.map((dept) => (
                  <option key={dept} value={dept} className="bg-[#131b2c]">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex bg-[#090e17] rounded-lg p-1 border border-slate-800">
              <Users className="w-4 h-4 text-slate-500 ml-2 mt-2" />
              <select
                className="bg-transparent border-none text-slate-300 text-sm focus:ring-0 cursor-pointer py-1.5 pl-2 pr-6 outline-none appearance-none"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="Todos" className="bg-[#131b2c]">
                  Técnico: Todos
                </option>
                {uniqueUsers.map((user) => (
                  <option key={user} value={user} className="bg-[#131b2c]">
                    {user}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setAllTickets([]);
              }}
              className="text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-2.5 px-4 rounded-lg transition-colors border border-rose-500/20"
            >
              Cerrar Reporte
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1300px] px-6 mt-8 space-y-8">
        {/* INSIGHTS GENERADOS POR IA (AHORA SON BOTONES) */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/20 rounded-xl p-4 flex items-center justify-center gap-4 flex-shrink-0 w-full md:w-auto">
            <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">
                Smart Insights
              </p>
              <p className="text-xs text-blue-100">
                Haz clic para ver detalles.
              </p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight) => (
              <button
                key={insight.id}
                onClick={() => setActiveModal(insight)}
                className={`text-left rounded-xl p-4 border transition-all hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-lg ${
                  insight.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-900/50 hover:bg-emerald-900/40 text-emerald-200'
                    : insight.type === 'warning'
                    ? 'bg-amber-950/30 border-amber-900/50 hover:bg-amber-900/40 text-amber-200'
                    : insight.type === 'danger'
                    ? 'bg-rose-950/30 border-rose-900/50 hover:bg-rose-900/40 text-rose-200'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/60 text-slate-300'
                } flex items-start gap-3`}
              >
                <div className="mt-0.5">
                  {insight.type === 'success' && (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  {insight.type === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  {insight.type === 'danger' && (
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                  )}
                  {insight.type === 'info' && (
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">
                    Ver Gráfico Analítico
                  </p>
                  <p className="text-xs font-medium leading-relaxed">
                    {insight.text}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex space-x-1 bg-[#131b2c] p-1 rounded-xl border border-slate-800 w-fit">
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<BarChart3 />}
            text="Resumen Ejecutivo"
          />
          <TabButton
            active={activeTab === 'team'}
            onClick={() => setActiveTab('team')}
            icon={<Award />}
            text="Desempeño del Equipo"
          />
          <TabButton
            active={activeTab === 'raw'}
            onClick={() => setActiveTab('raw')}
            icon={<List />}
            text="Auditoría de Tickets"
          />
        </div>

        {/* PESTAÑA 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <KpiCard
                title="TOTAL TICKETS"
                value={stats.total}
                subtitle="Volumen procesado"
                icon={<Ticket />}
                color="slate"
              />
              <KpiCard
                title="% RESOLUCIÓN"
                value={stats.resolutionRateGlobal}
                subtitle="Tasa de Cierre"
                icon={<CheckCircle />}
                color="blue"
              />
              <KpiCard
                title="DENTRO DE SLA"
                value={stats.total - stats.slaViolations}
                subtitle="A tiempo"
                icon={<TrendingUp />}
                color="emerald"
              />
              <KpiCard
                title="VIOLACIONES SLA"
                value={stats.slaViolations}
                subtitle="Incumplimientos"
                icon={<AlertTriangle />}
                color={stats.slaViolations > 0 ? 'rose' : 'emerald'}
              />
              <KpiCard
                title="% CUMPLIMIENTO SLA"
                value={stats.complianceRateGlobal}
                subtitle="Tasa de efectividad"
                icon={<Layers />}
                color={stats.isApprovedGlobal ? 'emerald' : 'amber'}
                highlight
              />

              <div
                className={`p-4 rounded-2xl border flex flex-col justify-center items-center text-center relative overflow-hidden ${
                  stats.isApprovedGlobal
                    ? 'bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-500/30'
                    : 'bg-gradient-to-br from-amber-900/40 to-amber-800/20 border-amber-500/30'
                }`}
              >
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2 z-10">
                  Dictamen Incentivo
                </p>
                <p
                  className={`text-2xl font-extrabold z-10 ${
                    stats.isApprovedGlobal
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {stats.isApprovedGlobal ? 'APROBADO' : 'REVISIÓN'}
                </p>
                <p className="text-[10px] text-slate-400 mt-2 z-10">
                  Meta ≥ 85.0%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#131b2c] p-6 rounded-2xl border border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">
                  Distribución de Estatus
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.status}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.status.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090e17',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#131b2c] p-6 rounded-2xl border border-slate-800 shadow-sm col-span-1 lg:col-span-2">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
                  Top Categorías Operativas
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.categories}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#1e293b"
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={130}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                        contentStyle={{
                          backgroundColor: '#090e17',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      >
                        {stats.categories.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={`url(#colorGradient${index % 4})`}
                          />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient
                          id="colorGradient0"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#60a5fa" />
                        </linearGradient>
                        <linearGradient
                          id="colorGradient1"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                        <linearGradient
                          id="colorGradient2"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#0ea5e9" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                        <linearGradient
                          id="colorGradient3"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: EQUIPO */}
        {activeTab === 'team' && (
          <div className="bg-[#131b2c] rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-[#131b2c] border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" /> Rendimiento y
                  Bonos por Técnico
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400">
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest">
                      Técnico
                    </th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest">
                      Dpto / Rol
                    </th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest text-center">
                      Asignados
                    </th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest text-center">
                      Resueltos
                    </th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest text-center">
                      Viol. SLA
                    </th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest text-center">
                      % Res.
                    </th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest text-center">
                      Salud SLA
                    </th>
                    <th className="px-6 py-4 font-semibold uppercase text-[10px] tracking-widest text-center">
                      Incentivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {stats.users.map((user: UserStat, idx: number) => {
                    const isApproved = user.numericSlaCompliance >= 85;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 group-hover:border-blue-500 transition-colors">
                              {user.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-200">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-300">
                            {user.dept}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {user.role}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">
                          {user.total}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-400">
                          {user.closed}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user.violations > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {user.violations}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-slate-300">
                          {user.resolutionRate}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`font-bold font-mono ${
                                isApproved
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {user.slaCompliance}
                            </span>
                            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  isApproved ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: user.slaCompliance }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                              isApproved
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {user.incentiveStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: AUDITORÍA RAW */}
        {activeTab === 'raw' && (
          <div className="bg-[#131b2c] rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mb-10">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-[#131b2c] border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <List className="w-5 h-5 text-blue-500" /> Auditoría de
                  Tickets ({filteredTickets.length})
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-[12px] whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-900 text-slate-300 shadow-sm z-10">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase text-[10px] tracking-widest">
                      ID
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase text-[10px] tracking-widest">
                      Owner
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase text-[10px] tracking-widest">
                      Categoría
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase text-[10px] tracking-widest">
                      Prioridad
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase text-[10px] tracking-widest">
                      Estatus
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase text-[10px] tracking-widest">
                      SLA Status
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase text-[10px] tracking-widest">
                      Tiempo Res.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredTickets.map((t, idx) => {
                    const slaViolation = getVal(
                      t,
                      ['SLA Violation Type', 'Tipo Violación SLA'],
                      ''
                    );
                    const isViolation = slaViolation
                      .toLowerCase()
                      .includes('violation');
                    const priority = getVal(
                      t,
                      ['Priority (Ticket)', 'Prioridad'],
                      '-'
                    );

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isViolation ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="px-5 py-2.5 font-mono text-blue-400">
                          {getVal(t, ['Ticket Id', 'Ticket ID'], '-')}
                        </td>
                        <td className="px-5 py-2.5 text-slate-200 font-medium">
                          {getVal(t, ['Ticket Owner', 'Técnico'], '-')}
                        </td>
                        <td className="px-5 py-2.5 text-slate-400 truncate max-w-[200px]">
                          {getVal(
                            t,
                            ['Product Name (Ticket)', 'Categoría'],
                            '-'
                          )}
                        </td>
                        <td className="px-5 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                              priority.toLowerCase().includes('high')
                                ? 'bg-rose-500/20 text-rose-400'
                                : priority.toLowerCase().includes('medium')
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {priority}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-400">
                          {getVal(t, ['Status (Ticket)', 'Estado'], '-')}
                        </td>
                        <td className="px-5 py-2.5">
                          {isViolation ? (
                            <span className="text-rose-400 font-medium flex items-center gap-1">
                              <AlertOctagon className="w-3 h-3" /> Violación
                            </span>
                          ) : (
                            <span className="text-emerald-500/70 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> OK
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-slate-500 font-mono text-[11px]">
                          {getVal(
                            t,
                            [
                              'Resolution Time in Business Hours',
                              'Tiempo Resolución',
                            ],
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        active
          ? 'bg-slate-800 text-white shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      <div className={active ? 'text-blue-400' : 'text-slate-500'}>
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
      {text}
    </button>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color = 'slate',
  highlight = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color?: 'slate' | 'blue' | 'emerald' | 'rose' | 'amber';
  highlight?: boolean;
}) {
  const colorMap = {
    slate: 'from-slate-800 to-slate-900 border-slate-700 text-slate-400',
    blue: 'from-blue-900/40 to-slate-900 border-blue-500/30 text-blue-400',
    emerald:
      'from-emerald-900/40 to-slate-900 border-emerald-500/30 text-emerald-400',
    rose: 'from-rose-900/40 to-slate-900 border-rose-500/30 text-rose-400',
    amber: 'from-amber-900/40 to-slate-900 border-amber-500/30 text-amber-400',
  };

  return (
    <div
      className={`p-4 rounded-2xl border bg-gradient-to-br ${
        colorMap[color]
      } shadow-sm flex flex-col justify-between relative overflow-hidden group ${
        highlight
          ? 'shadow-[0_0_15px_rgba(255,255,255,0.05)] ring-1 ring-white/10'
          : ''
      }`}
    >
      <div
        className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-current opacity-[0.03] group-hover:scale-150 transition-transform duration-500`}
      ></div>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          {title}
        </span>
        <div className={`opacity-80`}>
          {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
      </div>
      <div>
        <span className="text-3xl font-extrabold text-white tracking-tight">
          {value}
        </span>
        <p className="text-[10px] text-slate-400 mt-1 font-medium">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
