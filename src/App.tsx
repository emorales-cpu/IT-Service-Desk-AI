import React, { useState, useMemo, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Upload, Users, AlertTriangle, CheckCircle, Ticket, Layers, Filter, AlertOctagon,
  Sparkles, TrendingUp, BarChart3, List, Award, X, Download, Maximize2, Smile,
  Calendar, Clock, Sliders, ChevronDown, Plus, RefreshCw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

const EQUIPO_IT: Record<string, { dept: string; role: string }> = {
  'Eriksson Morales': { dept: 'Helpdesk', role: 'Support' },
  'Henry Garcia': { dept: 'Helpdesk', role: 'Support' },
  'Henry García': { dept: 'Helpdesk', role: 'Support' },
  'Jean Nunez': { dept: 'Helpdesk', role: 'Support' },
  'Jean Nuñez': { dept: 'Helpdesk', role: 'Support' },
  'Joan Perez': { dept: 'Helpdesk', role: 'Support' },
  'Joan Pérez': { dept: 'Helpdesk', role: 'Support' },
  'Enmanuel Jerez': { dept: 'IT Operations', role: 'Operations' },
  'Firian Martinez': { dept: 'IT Operations', role: 'Operations' },
  'Firian Martínez': { dept: 'IT Operations', role: 'Operations' },
  'Saul Vanderhorst': { dept: 'IT Operations', role: 'Operations' },
  'Saúl Vanderhorst': { dept: 'IT Operations', role: 'Operations' },
  'Rodrigo Soriano': { dept: 'Salesforce developer', role: 'Developer' },
  'Jose Manuel Martinez': { dept: 'PDE', role: 'Engineer' },
  'Jose Martinez': { dept: 'PDE', role: 'Engineer' },
  'José Martínez': { dept: 'PDE', role: 'Engineer' },
  'José Manuel Martínez': { dept: 'PDE', role: 'Engineer' },
  'Jose David Sanchez': { dept: 'PDE', role: 'Engineer' },
  'José David Sánchez': { dept: 'PDE', role: 'Engineer' },
  'Jose Claudio Urena': { dept: 'PDE', role: 'Engineer' },
  'José Claudio Ureña': { dept: 'PDE', role: 'Engineer' },
  'Jose Claudio': { dept: 'PDE', role: 'Engineer' },
  'Yordi Moran': { dept: 'Sin Asignar', role: 'N/A' },
  'Yordi Morán': { dept: 'Sin Asignar', role: 'N/A' },
  'Joas Diaz Mena': { dept: 'Sin Asignar', role: 'N/A' },
  'Joas Díaz Mena': { dept: 'Sin Asignar', role: 'N/A' },
  'Unassigned': { dept: 'Sin Asignar', role: 'Cola General' },
  '-': { dept: 'Sin Asignar', role: 'Cola General' }
};

const OFFICIAL_DEPTS = ['Helpdesk', 'IT Operations', 'Salesforce developer', 'PDE', 'Sin Asignar'];

const DEMO_TICKETS = [
  { 'Ticket Id': 'TK-1001', 'Ticket Owner': 'Joan Perez', 'Sub-departamento': 'Helpdesk', 'Status (Ticket)': 'Closed', 'SLA Violation Type': 'Not Violated', 'Product Name (Ticket)': 'Hardware', 'Request Level': 'Support', 'Priority (Ticket)': 'High', 'Happiness Rating': '100%', 'Created Time (Ticket)': '01 Sep 2026 09:00 AM' },
  { 'Ticket Id': 'TK-1002', 'Ticket Owner': 'Jose Martinez', 'Sub-departamento': 'PDE', 'Status (Ticket)': 'Open', 'SLA Violation Type': 'Resolution Violation', 'Product Name (Ticket)': 'Salesforce Automation', 'Request Level': 'Engineer', 'Priority (Ticket)': 'Medium', 'Happiness Rating': '95%', 'Created Time (Ticket)': '08 Sep 2026 11:15 AM' },
  { 'Ticket Id': 'TK-1003', 'Ticket Owner': 'Saul Vanderhorst', 'Sub-departamento': 'IT Operations', 'Status (Ticket)': 'Closed', 'SLA Violation Type': 'Not Violated', 'Product Name (Ticket)': 'VPN / Firewall', 'Request Level': 'Operations', 'Priority (Ticket)': 'High', 'Happiness Rating': '98%', 'Created Time (Ticket)': '10 Sep 2026 02:20 PM' },
  { 'Ticket Id': 'TK-1004', 'Ticket Owner': 'José Claudio Ureña', 'Sub-departamento': 'PDE', 'Status (Ticket)': 'Closed', 'SLA Violation Type': 'Not Violated', 'Product Name (Ticket)': 'Database Engine', 'Request Level': 'Engineer', 'Priority (Ticket)': 'Medium', 'Happiness Rating': '90%', 'Created Time (Ticket)': '14 Sep 2026 10:05 AM' }
];

interface TicketData { [key: string]: string; }

interface UserStat {
  name: string; dept: string; role: string; total: number; closed: number; backlog: number;
  violations: number; csatScore: number | null; resolutionRate: string; slaCompliance: string;
  numericResolutionRate: number; numericSlaCompliance: number; finalComplianceWithBonus: number; incentiveStatus: string;
}

interface InsightModal {
  id: string; type: 'success' | 'warning' | 'danger' | 'info' | 'chart';
  title: string; text?: string; chartType: 'pie' | 'bar'; data: any[];
}

function parseToDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '-' || dateStr.trim() === '') return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  const parts = dateStr.split(/[-/ ]/);
  if (parts.length >= 3) {
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function isDateInRange(ticketDateStr: string, startStr: string, endStr: string): boolean {
  if (!ticketDateStr || ticketDateStr === '-' || ticketDateStr.trim() === '') return true;
  const tDate = parseToDate(ticketDateStr);
  if (!tDate) return true;

  if (startStr) {
    const sDate = new Date(startStr + 'T00:00:00');
    if (!isNaN(sDate.getTime()) && tDate < sDate) return false;
  }
  if (endStr) {
    const eDate = new Date(endStr + 'T23:59:59');
    if (!isNaN(eDate.getTime()) && tDate > eDate) return false;
  }
  return true;
}

export default function App() {
  useEffect(() => { document.title = "IT TICKETS & INCENTIVOS"; }, []);

  const [allTickets, setAllTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedFilesCount, setUploadedFilesCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'raw' | 'tool2'>('dashboard');

  const [selectedUser, setSelectedUser] = useState<string>('Todos');
  const [selectedDept, setSelectedDept] = useState<string>('Todos');

  const [d2Agent, setD2Agent] = useState<string>('Todos');
  const [d2Level, setD2Level] = useState<string>('Todos');
  const [d2Priority, setD2Priority] = useState<string>('Todas');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [activeModal, setActiveModal] = useState<InsightModal | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDept !== 'Todos' && selectedUser !== 'Todos') {
      const isUserInDept = EQUIPO_IT[selectedUser]?.dept === selectedDept;
      if (!isUserInDept) setSelectedUser('Todos');
    }
  }, [selectedDept, selectedUser]);

  const getVal = (ticket: TicketData, possibleKeys: string[], defaultValue: string = '') => {
    const ticketKeys = Object.keys(ticket);
    const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const pKey of possibleKeys) {
      const target = clean(pKey);
      const foundKey = ticketKeys.find((k) => clean(k) === target);
      if (foundKey && ticket[foundKey] && ticket[foundKey] !== '-' && ticket[foundKey].trim() !== '') {
        return String(ticket[foundKey]).trim();
      }
    }
    return defaultValue;
  };

  // 🔄 SINCRONIZACIÓN AUTOMÁTICA CON ZOHO DESK API
  const syncZohoTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/zoho/tickets');
      const result = await response.json();

      if (result.error) {
        alert(`Error desde servidor: ${result.error}`);
        return;
      }

      const ticketsList = result.data || result;
      if (Array.isArray(ticketsList)) {
        const formattedTickets: TicketData[] = ticketsList.map((t: any) => ({
          'Ticket Id': t.ticketNumber || t.id || '-',
          'Ticket Owner': t.assignee ? `${t.assignee.firstName || ''} ${t.assignee.lastName || ''}`.trim() : 'Sin Asignar',
          'Status (Ticket)': t.status || 'Open',
          'SLA Violation Type': t.isSlaViolated ? 'Resolution Violation' : 'Not Violated',
          'Priority (Ticket)': t.priority || '-',
          'Product Name (Ticket)': t.product ? t.product.productName : (t.department ? t.department.name : 'Soporte General'),
          'Created Time (Ticket)': t.createdTime || t.createdTimeFormatted || ''
        }));

        setAllTickets(formattedTickets);
        alert(`¡Sincronización exitosa! Se cargaron ${formattedTickets.length} tickets desde Zoho Desk.`);
      }
    } catch (error) {
      alert('No se pudo conectar con el servidor puente. Asegúrate de tener ejecutando "npm run server".');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);

    let pendingFiles = files.length;
    const accumulatedTickets: TicketData[] = [];

    Array.from(files).forEach((file) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          const keywords = ['ticket', 'owner', 'status', 'subject', 'priority', 'sla', 'created', 'agente', 'estado', 'id', 'reference', 'product', 'department'];

          let bestScore = -1;
          let headerIndex = 0;

          for (let i = 0; i < Math.min(rows.length, 25); i++) {
            const rowStr = rows[i].join(' ').toLowerCase();
            const score = keywords.reduce((acc, kw) => acc + (rowStr.includes(kw) ? 1 : 0), 0);
            if (score > bestScore && score >= 2) {
              bestScore = score;
              headerIndex = i;
            }
          }

          const headers = rows[headerIndex].map((h) => h.replace(/["\r\n]/g, '').trim());
          const rawData = rows.slice(headerIndex + 1);

          const tickets: TicketData[] = rawData
            .map((row) => {
              const obj: TicketData = {};
              headers.forEach((header, idx) => {
                obj[header] = row[idx] ? row[idx].toString().replace(/["\r\n]/g, '').trim() : '';
              });
              return obj;
            })
            .filter((t) => {
              const rowStr = Object.values(t).join(' ').toLowerCase();
              return !rowStr.includes('total records') && !rowStr.includes('report generated') && Object.values(t).some((v) => v.trim() !== '');
            });

          accumulatedTickets.push(...tickets);
          pendingFiles--;

          if (pendingFiles === 0) {
            setAllTickets((prev) => [...prev, ...accumulatedTickets]);
            setUploadedFilesCount((prev) => prev + files.length);
            setLoading(false);
          }
        },
      });
    });
  };

  const exportPDF = async () => {
    const element = pdfRef.current;
    if (!element) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a', logging: false, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const renderHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, renderHeight <= pdfHeight ? (pdfHeight - renderHeight) / 2 : 0, pdfWidth, renderHeight <= pdfHeight ? renderHeight : pdfHeight);
      pdf.save(`Reporte_IT_Tickets_${selectedUser.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      alert('Error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const getOfficialDept = (rawDeptString: string) => {
    const str = rawDeptString.toLowerCase();
    if (str.includes('helpdesk')) return 'Helpdesk';
    if (str.includes('operations') || str.includes('operaciones') || str.includes('it operations')) return 'IT Operations';
    if (str.includes('salesforce')) return 'Salesforce developer';
    if (str.includes('pde')) return 'PDE';
    return 'Sin Asignar';
  };

  const { stats, uniqueUsers, filteredTickets, insights, hasCsatData } = useMemo(() => {
    if (allTickets.length === 0) return { stats: null, uniqueUsers: [], filteredTickets: [], insights: [], hasCsatData: false };

    const usersSet = new Set<string>();
    allTickets.forEach((t) => {
      let rawOwner = getVal(t, ['Ticket Owner', 'Técnico Responsable', 'Técnico', 'Agent', 'Owner', 'Agente'], 'Sin Asignar');
      if (rawOwner.toLowerCase().includes('total records') || rawOwner.length > 35) rawOwner = 'Sin Asignar';
      usersSet.add(rawOwner.trim() === '' ? 'Sin Asignar' : rawOwner);
    });

    const uniqueUsersList = Array.from(usersSet).sort();
    const currentTickets = allTickets.filter((t) => {
      let rawOwner = getVal(t, ['Ticket Owner', 'Técnico Responsable', 'Técnico', 'Agent', 'Owner', 'Agente'], 'Sin Asignar');
      if (rawOwner.toLowerCase().includes('total records') || rawOwner.length > 35) rawOwner = 'Sin Asignar';
      const owner = rawOwner.trim() === '' ? 'Sin Asignar' : rawOwner;
      const officialMatch = EQUIPO_IT[owner];
      let dept = officialMatch ? officialMatch.dept : getOfficialDept(getVal(t, ['Sub-departamento', 'departamento', 'department', 'Department Name'], 'Sin Depto'));
      return (selectedUser === 'Todos' || owner === selectedUser) && (selectedDept === 'Todos' || dept === selectedDept);
    });

    let total = currentTickets.length, closed = 0, backlog = 0, slaViolations = 0, globalCsatSum = 0, globalCsatCount = 0;
    const userStats: Record<string, UserStat & { _csatSum: number; _csatCount: number }> = {};
    const categoryStats: Record<string, { name: string; value: number }> = {};
    const statusStats: Record<string, { name: string; value: number }> = {};

    currentTickets.forEach((t) => {
      let rawOwner = getVal(t, ['Ticket Owner', 'Técnico Responsable', 'Técnico', 'Agent', 'Owner', 'Agente'], 'Sin Asignar');
      if (rawOwner.toLowerCase().includes('total records') || rawOwner.length > 35) rawOwner = 'Sin Asignar';
      const owner = rawOwner.trim() === '' ? 'Sin Asignar' : rawOwner;
      const officialMatch = EQUIPO_IT[owner];
      const dept = officialMatch ? officialMatch.dept : 'Sin Asignar';
      const role = officialMatch ? officialMatch.role : getVal(t, ['Request Level', 'Rol'], 'N/A');
      const status = getVal(t, ['Status (Ticket)', 'Estado', 'Status'], 'Open');
      const sla = getVal(t, ['SLA Violation Type', 'Violación SLA', 'SLA Status'], 'Not Violated');
      
      let product = getVal(t, ['Product Name (Ticket)', 'Categoría', 'Product Name'], '');
      if (!product || product === '-') {
        const subject = getVal(t, ['Subject', 'Asunto'], '');
        const sLower = subject.toLowerCase();
        if (sLower.includes('salesforce') || sLower.includes('oppt') || sLower.includes('flow')) product = 'Salesforce';
        else if (sLower.includes('sms') || sLower.includes('email') || sLower.includes('reminder') || sLower.includes('time zone')) product = 'SMS & Emails';
        else if (sLower.includes('invoice') || sLower.includes('payment') || sLower.includes('billing')) product = 'Facturación';
        else if (sLower.includes('vpn') || sLower.includes('firewall') || sLower.includes('redes')) product = 'VPN & Redes';
        else if (sLower.includes('automation') || sLower.includes('bug')) product = 'Automatización';
        else if (subject) product = subject.split(' ').slice(0, 3).join(' ');
        else product = getVal(t, ['Sub-departamento', 'department'], 'Soporte General');
      }

      const rawCsat = getVal(t, ['CSAT', 'Happiness Rating', 'Happiness', 'Satisfaction', 'Satisfacción', 'Rating'], 'N/A');
      let ticketCsat = null;
      if (rawCsat !== 'N/A') {
        const parsed = parseFloat(rawCsat.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) {
          ticketCsat = parsed <= 5 && rawCsat.includes('5') ? (parsed / 5) * 100 : parsed;
          globalCsatSum += ticketCsat; globalCsatCount++;
        }
      }

      const isClosed = status.toLowerCase().includes('closed') || status.toLowerCase().includes('resolved');
      const isViolation = sla.toLowerCase().includes('violation') || sla.toLowerCase().includes('violación');

      if (isClosed) closed++; else backlog++;
      if (isViolation) slaViolations++;

      if (!userStats[owner]) {
        userStats[owner] = {
          name: owner, dept, role, total: 0, closed: 0, backlog: 0, violations: 0, csatScore: null, _csatSum: 0, _csatCount: 0,
          resolutionRate: '0', slaCompliance: '0', numericResolutionRate: 0, numericSlaCompliance: 0, finalComplianceWithBonus: 0, incentiveStatus: '',
        };
      }
      userStats[owner].total++;
      if (isClosed) userStats[owner].closed++; else userStats[owner].backlog++;
      if (isViolation) userStats[owner].violations++;
      if (ticketCsat !== null) { userStats[owner]._csatSum += ticketCsat; userStats[owner]._csatCount++; }

      categoryStats[product] = categoryStats[product] || { name: product, value: 0 };
      categoryStats[product].value++;
      statusStats[status] = statusStats[status] || { name: status, value: 0 };
      statusStats[status].value++;
    });

    const processedUsers = Object.values(userStats).map((u) => {
      const numResRate = u.total > 0 ? (u.closed / u.total) * 100 : 0;
      let numSlaComp = u.total > 0 ? ((u.total - u.violations) / u.total) * 100 : 0;
      const userCsat = u._csatCount > 0 ? (u._csatSum / u._csatCount) : null;
      let csatBonus = (userCsat !== null && userCsat >= 90) ? 2.5 : 0;
      const finalCompliance = numSlaComp + csatBonus;
      const isApproved = finalCompliance >= 85;

      return {
        ...u, csatScore: userCsat, numericResolutionRate: numResRate, numericSlaCompliance: numSlaComp, finalComplianceWithBonus: finalCompliance,
        resolutionRate: numResRate.toFixed(1) + '%', slaCompliance: numSlaComp.toFixed(1) + '%',
        incentiveStatus: isApproved ? (csatBonus > 0 && numSlaComp < 85 ? 'Salvado por CSAT' : 'Aprobado') : 'En Revisión',
      };
    }).sort((a, b) => b.total - a.total);

    const processedCategories = Object.values(categoryStats).sort((a, b) => b.value - a.value).slice(0, 10);
    const processedStatus = Object.values(statusStats).sort((a, b) => b.value - a.value);

    const complianceRateGlobalNum = total === 0 ? 0 : ((total - slaViolations) / total) * 100;
    const globalCsatAverage = globalCsatCount > 0 ? (globalCsatSum / globalCsatCount) : null;
    let globalBonus = (globalCsatAverage !== null && globalCsatAverage >= 90) ? 2.5 : 0;
    const finalGlobalCompliance = complianceRateGlobalNum + globalBonus;

    let generatedInsights: InsightModal[] = [];
    if (finalGlobalCompliance >= 85) {
      generatedInsights.push({ id: 'global-sla', type: 'success', title: 'Cumplimiento SLA por Especialista', text: `Rendimiento Óptimo: El equipo mantiene un SLA global saludable de ${finalGlobalCompliance.toFixed(1)}%.`, chartType: 'bar', data: processedUsers.map((u) => ({ name: u.name.split(' ')[0], SLA: u.finalComplianceWithBonus, Meta: 85 })).slice(0, 8) });
    } else {
      generatedInsights.push({ id: 'global-sla-warn', type: 'warning', title: 'Rendimiento Crítico de SLA', text: `Alerta: El SLA global (${finalGlobalCompliance.toFixed(1)}%) está por debajo de la meta del 85%.`, chartType: 'bar', data: processedUsers.map((u) => ({ name: u.name.split(' ')[0], SLA: u.finalComplianceWithBonus, Meta: 85 })).slice(0, 8) });
    }

    const topViolator = processedUsers.slice().sort((a, b) => b.violations - a.violations)[0];
    if (topViolator && topViolator.violations > 0) {
      generatedInsights.push({ id: 'foco-operativo', type: 'danger', title: 'Comparativa de Violaciones SLA', text: `Foco Operativo: ${topViolator.name} registra ${topViolator.violations} violaciones de SLA (Requiere revisión).`, chartType: 'bar', data: processedUsers.filter((u) => u.violations > 0).map((u) => ({ name: u.name.split(' ')[0], Violaciones: u.violations })).sort((a, b) => b.Violaciones - a.Violaciones).slice(0, 5) });
    }

    return {
      stats: { total, closed, backlog, slaViolations, resolutionRateGlobal: total === 0 ? '0.0%' : ((closed / total) * 100).toFixed(1) + '%', complianceRateGlobalNum, finalGlobalCompliance, globalCsatAverage, isApprovedGlobal: finalGlobalCompliance >= 85, users: processedUsers, categories: processedCategories, status: processedStatus },
      uniqueUsers: uniqueUsersList, filteredTickets: currentTickets, insights: generatedInsights, hasCsatData: globalCsatCount > 0
    };
  }, [allTickets, selectedUser, selectedDept]);

  const tool2Data = useMemo(() => {
    if (allTickets.length === 0) return null;
    const levelSet = new Set<string>();
    const prioritySet = new Set<string>();

    allTickets.forEach(t => {
      const level = getVal(t, ['Request Level', 'Rol', 'Nivel'], 'N/A');
      const priority = getVal(t, ['Priority (Ticket)', 'Prioridad'], 'Normal');
      if (level !== 'N/A') levelSet.add(level);
      if (priority !== '-') prioritySet.add(priority);
    });

    const filtered = allTickets.filter(t => {
      let owner = getVal(t, ['Ticket Owner', 'Técnico Responsable', 'Técnico', 'Agent', 'Owner', 'Agente'], 'Sin Asignar');
      if (owner.toLowerCase().includes('total records') || owner.length > 35) owner = 'Sin Asignar';
      const level = getVal(t, ['Request Level', 'Rol', 'Nivel'], 'N/A');
      const priority = getVal(t, ['Priority (Ticket)', 'Prioridad'], 'Normal');
      const createdDate = getVal(t, ['Created Time (Ticket)', 'Created Time', 'Fecha Creación', 'Created Date'], '');

      const matchAgent = d2Agent === 'Todos' || owner === d2Agent;
      const matchLevel = d2Level === 'Todos' || level === d2Level;
      const matchPriority = d2Priority === 'Todas' || priority === d2Priority;
      const matchDate = isDateInRange(createdDate, startDate, endDate);

      return matchAgent && matchLevel && matchPriority && matchDate;
    });

    let total = filtered.length, openCount = 0, closedCount = 0, slaViolatedCount = 0;
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = { 'High': 0, 'Medium': 0, 'Low': 0, '-': 0 };

    filtered.forEach(t => {
      const status = getVal(t, ['Status (Ticket)', 'Estado', 'Status'], 'Open');
      const sla = getVal(t, ['SLA Violation Type', 'Violación SLA', 'SLA Status'], 'Not Violated');
      const priority = getVal(t, ['Priority (Ticket)', 'Prioridad'], '-');

      const isClosed = status.toLowerCase().includes('closed') || status.toLowerCase().includes('resolved');
      const isViolation = sla.toLowerCase().includes('violation') || sla.toLowerCase().includes('violación');

      if (isClosed) closedCount++; else openCount++;
      if (isViolation) slaViolatedCount++;

      statusCounts[status] = (statusCounts[status] || 0) + 1;
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });

    return {
      total, openCount, closedCount, slaViolatedCount,
      statusPieData: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      priorityBarData: Object.entries(priorityCounts).filter(([_, value]) => value > 0 || total === 0).map(([name, value]) => ({ name, Tickets: value })),
      levels: Array.from(levelSet).sort(),
      priorities: Array.from(prioritySet).sort(),
    };
  }, [allTickets, d2Agent, d2Level, d2Priority, startDate, endDate]);

  const displayedUsers = selectedDept === 'Todos' ? uniqueUsers : uniqueUsers.filter(user => EQUIPO_IT[user]?.dept === selectedDept || (EQUIPO_IT[user] === undefined && selectedDept === 'Sin Asignar'));

  if (allTickets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="bg-[#1e293b] p-10 rounded-2xl shadow-2xl text-center max-w-lg w-full border border-slate-700/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400"></div>
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/30">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight">IT TICKETS & INCENTIVOS</h1>
          <div className="bg-[#0f172a]/80 p-5 rounded-xl border border-slate-700/80 mb-8 shadow-inner">
            <p className="text-slate-200 text-sm font-medium leading-relaxed">
              Plataforma analítica para evaluación operativa. Sincroniza en tiempo real con Zoho Desk o carga archivos CSV.
            </p>
          </div>
          <div className="flex flex-col gap-4 items-center w-full">
            <button onClick={syncZohoTickets} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-3 text-sm shadow-lg shadow-emerald-900/50 hover:scale-[1.02] active:scale-95">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Conectando con Zoho...' : 'Sincronizar con Zoho Desk API'}
            </button>
            <label className="w-full cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-3 text-sm shadow-lg shadow-blue-900/50 hover:scale-[1.02] active:scale-95">
              Cargar Reportes CSV
              <input type="file" accept=".csv" multiple className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
            <button onClick={() => setAllTickets(DEMO_TICKETS)} className="mt-2 text-xs font-extrabold text-slate-300 hover:text-blue-400 uppercase tracking-widest transition-colors border-b border-dashed border-slate-600 hover:border-blue-400 pb-0.5">
              VISUALIZAR CON DATOS DE DEMOSTRACIÓN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-slate-200 font-sans pb-12 flex flex-col items-center relative">
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1e293b] w-full max-w-5xl rounded-2xl border border-slate-600 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/90">
              <h2 className="text-base font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-400" />{activeModal.title}</h2>
              <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {activeModal.text && <p className="text-xs text-slate-200 mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 leading-relaxed">{activeModal.text}</p>}
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {activeModal.chartType === 'pie' ? (
                    <PieChart>
                      <Pie data={activeModal.data} cx="50%" cy="50%" innerRadius={80} outerRadius={130} paddingAngle={4} dataKey="value" stroke="none">
                        {activeModal.data.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '8px', color: '#ffffff' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  ) : (
                    <BarChart data={activeModal.data} layout="vertical" margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                      <XAxis type="number" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={200} tick={{ fill: '#cbd5e1', fontSize: 11 }} tickFormatter={(val: string) => val.length > 28 ? val.slice(0, 25) + '...' : val} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '8px', color: '#ffffff' }} />
                      <Legend />
                      {Object.keys(activeModal.data[0] || {}).filter((k) => k !== 'name').map((key, index) => (
                        <Bar key={key} dataKey={key} fill={index === 0 ? '#3b82f6' : '#10b981'} radius={[0, 6, 6, 0]} barSize={26} />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="bg-[#1e293b]/90 backdrop-blur-md border-b border-slate-700/80 sticky top-0 z-40 shadow-lg w-full flex justify-center">
        <div className="w-full max-w-[1400px] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide leading-tight">Dashboard Ejecutivo IT</h1>
              <p className="text-slate-400 text-xs font-medium">Evaluación Operativa, CSAT e Incentivos</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={syncZohoTickets} disabled={loading} className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold py-2 px-3.5 rounded-lg border border-emerald-500/30 transition-all active:scale-95">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Zoho
            </button>
            <label className="cursor-pointer flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold py-2 px-3 rounded-lg border border-blue-500/30 transition-all">
              <Plus className="w-4 h-4" /> Agregar CSV
              <input type="file" accept=".csv" multiple className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
            <button onClick={exportPDF} disabled={isExporting} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3.5 rounded-lg transition-colors border border-slate-600 active:scale-95">
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
            <div className="w-44">
              <CustomSelect value={selectedDept} onChange={setSelectedDept} options={[{ value: 'Todos', label: 'Dpto: Todos' }, ...OFFICIAL_DEPTS.map(d => ({ value: d, label: d }))]} />
            </div>
            <div className="w-52">
              <CustomSelect value={selectedUser} onChange={setSelectedUser} options={[{ value: 'Todos', label: 'Especialista: Todos' }, ...displayedUsers.map(u => ({ value: u, label: u }))]} />
            </div>
            <button onClick={() => { setAllTickets([]); setSelectedDept('Todos'); setSelectedUser('Todos'); }} className="text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 py-2 px-3 rounded-lg transition-colors border border-rose-500/30">
              Cerrar Reporte
            </button>
          </div>
        </div>
      </div>

      <div ref={pdfRef} className="w-full max-w-[1400px] px-6 mt-8 space-y-8 pb-4">
        <div className="flex flex-col md:flex-row gap-4" data-html2canvas-ignore="true">
          <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/30 rounded-xl p-4 flex items-center justify-center gap-4 flex-shrink-0 w-full md:w-auto shadow-sm">
            <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
            <div>
              <p className="text-xs font-extrabold text-blue-300 uppercase tracking-widest mb-1">Smart Insights</p>
              <p className="text-xs text-blue-100 font-medium">Haz clic para ver detalles.</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight) => (
              <button key={insight.id} onClick={() => setActiveModal(insight)} className={`text-left rounded-xl p-4 border transition-all hover:scale-[1.02] shadow-sm ${insight.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' : insight.type === 'warning' ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : insight.type === 'danger' ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' : 'bg-[#1e293b] border-slate-700 text-slate-200'} flex items-start gap-3`}>
                <div className="mt-0.5">
                  {insight.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {insight.type === 'danger' && <AlertOctagon className="w-4 h-4 text-rose-400" />}
                  {insight.type === 'info' && <TrendingUp className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1 opacity-80">Ver Gráfico Analítico</p>
                  <p className="text-xs font-semibold leading-relaxed">{insight.text}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="flex space-x-1 bg-[#1e293b] p-1.5 rounded-xl border border-slate-700 shadow-md w-fit" data-html2canvas-ignore="true">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 />} text="Resumen Ejecutivo" />
          <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<Award />} text="Desempeño del Equipo" />
          <TabButton active={activeTab === 'raw'} onClick={() => setActiveTab('raw')} icon={<List />} text="Auditoría de Tickets" />
          <TabButton active={activeTab === 'tool2'} onClick={() => setActiveTab('tool2')} icon={<Layers />} text="IT TICKETS" />
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className={`grid grid-cols-2 ${hasCsatData ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-4`}>
              <KpiCard title="TOTAL TICKETS" value={stats.total} subtitle="Volumen procesado" icon={<Ticket />} color="slate" onClick={() => setActiveModal({ id: 'modal-total', type: 'chart', title: 'Distribución de Volumen por Especialista', chartType: 'bar', data: stats.users.slice(0, 8).map((u) => ({ name: u.name.split(' ')[0], Tickets: u.total })) })} />
              <KpiCard title="% RESOLUCIÓN" value={stats.resolutionRateGlobal} subtitle="Tasa de Cierre" icon={<CheckCircle />} color="blue" onClick={() => setActiveModal({ id: 'modal-status-pie', type: 'chart', title: 'Porcentaje y Estatus de Cierre', chartType: 'pie', data: stats.status })} />
              <KpiCard title="DENTRO DE SLA" value={stats.total - stats.slaViolations} subtitle="A tiempo" icon={<TrendingUp />} color="emerald" />
              <KpiCard title="VIOLACIONES SLA" value={stats.slaViolations} subtitle="Incumplimientos" icon={<AlertTriangle />} color={stats.slaViolations > 0 ? 'rose' : 'emerald'} onClick={() => setActiveModal({ id: 'modal-violaciones', type: 'chart', title: 'Violaciones de SLA por Integrante', chartType: 'bar', data: stats.users.filter((u) => u.violations > 0).map((u) => ({ name: u.name.split(' ')[0], Violaciones: u.violations })) })} />
              
              {hasCsatData && (
                <KpiCard title="HAPPINESS RATING" value={stats.globalCsatAverage !== null ? `${stats.globalCsatAverage.toFixed(1)}%` : '0%'} subtitle="Satisfacción del Cliente" icon={<Smile />} color={stats.globalCsatAverage !== null && stats.globalCsatAverage >= 90 ? "emerald" : "amber"} />
              )}

              <KpiCard title="% CUMPLIMIENTO SLA" value={`${stats.complianceRateGlobalNum.toFixed(1)}%`} subtitle="SLA Operativo" icon={<Layers />} color={stats.complianceRateGlobalNum >= 85 ? 'emerald' : 'amber'} highlight />

              <div className={`p-4 rounded-2xl border flex flex-col justify-center items-center text-center relative overflow-hidden ${stats.isApprovedGlobal ? 'bg-gradient-to-br from-emerald-900/50 to-slate-900 border-emerald-500/40' : 'bg-gradient-to-br from-amber-900/50 to-slate-900 border-amber-500/40'}`}>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2 z-10">Dictamen Final</p>
                <p className={`text-2xl font-extrabold z-10 ${stats.isApprovedGlobal ? 'text-emerald-400' : 'text-amber-400'}`}>{stats.isApprovedGlobal ? 'APROBADO' : 'REVISIÓN'}</p>
                <p className="text-[9px] text-slate-400 mt-1 z-10 font-semibold">Meta ≥ 85.0%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div 
                onClick={() => setActiveModal({ id: 'modal-status', type: 'chart', title: 'Desglose Detallado de Estatus', chartType: 'pie', data: stats.status })} 
                className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-md cursor-pointer hover:border-blue-500/50 transition-all group relative flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Distribución de Estatus</h3>
                  <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="h-[290px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.status} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                        {stats.status.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '8px', color: '#ffffff' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div 
                onClick={() => setActiveModal({ id: 'modal-categories', type: 'chart', title: 'Top Categorías Operativas Ampliado', chartType: 'bar', data: stats.categories.map((c) => ({ name: c.name, Tickets: c.value })) })} 
                className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-md col-span-1 lg:col-span-2 cursor-pointer hover:border-blue-500/50 transition-all group relative flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Top Categorías Operativas</h3>
                  <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="h-[290px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.categories} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11, fill: '#cbd5e1' }} tickFormatter={(val: string) => val.length > 25 ? val.slice(0, 22) + '...' : val} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '8px', color: '#ffffff' }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="px-6 py-5 bg-[#0f172a] border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2"><Award className="w-5 h-5 text-purple-400" /> Rendimiento y Bonos por Especialista</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-300">
                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Especialista</th>
                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Dpto / Rol</th>
                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Asignados</th>
                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Resueltos</th>
                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Viol. SLA</th>
                    {hasCsatData && <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">CSAT</th>}
                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Salud SLA</th>
                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Incentivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {stats.users.map((user: UserStat, idx: number) => {
                    const isApproved = user.finalComplianceWithBonus >= 85;
                    return (
                      <tr key={idx} className="hover:bg-slate-700/40 transition-colors">
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-extrabold text-slate-200">{user.name.charAt(0)}</div><span className="font-semibold text-slate-100">{user.name}</span></div></td>
                        <td className="px-6 py-4"><div className="text-xs font-medium text-slate-200">{user.dept}</div><div className="text-[10px] text-slate-400">{user.role}</div></td>
                        <td className="px-6 py-4 text-center font-bold text-slate-200">{user.total}</td>
                        <td className="px-6 py-4 text-center text-slate-300 font-medium">{user.closed}</td>
                        <td className="px-6 py-4 text-center">{user.violations > 0 ? <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">{user.violations}</span> : <span className="text-slate-500">-</span>}</td>
                        {hasCsatData && <td className="px-6 py-4 text-center font-mono text-slate-200">{user.csatScore !== null ? `${user.csatScore.toFixed(1)}%` : '-'}</td>}
                        <td className="px-6 py-4 text-center"><span className={`font-bold font-mono ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>{user.finalComplianceWithBonus.toFixed(1)}%</span></td>
                        <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${isApproved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>{user.incentiveStatus}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden mb-10">
            <div className="px-6 py-5 bg-[#0f172a] border-b border-slate-700 flex items-center justify-between"><h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2"><List className="w-5 h-5 text-blue-400" /> Auditoría de Tickets ({filteredTickets.length})</h3></div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-[12px] whitespace-nowrap">
                <thead className="sticky top-0 bg-[#0f172a] text-slate-200 shadow-sm z-10">
                  <tr>
                    <th className="px-5 py-3 font-bold uppercase text-[10px]">Ticket ID</th>
                    <th className="px-5 py-3 font-bold uppercase text-[10px]">Especialista</th>
                    <th className="px-5 py-3 font-bold uppercase text-[10px]">Categoría</th>
                    <th className="px-5 py-3 font-bold uppercase text-[10px]">Estatus</th>
                    <th className="px-5 py-3 font-bold uppercase text-[10px]">SLA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredTickets.map((t, idx) => {
                    const isViolation = getVal(t, ['SLA Violation Type', 'Tipo Violación SLA', 'SLA Status'], '').toLowerCase().includes('violation');
                    const ticketIdVal = getVal(t, ['Ticket Id', 'Ticket ID', 'Ticket Reference Id', 'Reference Id', 'Id'], '-');
                    let ownerVal = getVal(t, ['Ticket Owner', 'Técnico Responsable', 'Técnico', 'Agent', 'Owner', 'Agente'], '-');
                    if (ownerVal.toLowerCase().includes('total records') || ownerVal.length > 35) ownerVal = 'Sin Asignar';

                    return (
                      <tr key={idx} className={`hover:bg-slate-700/40 transition-colors ${isViolation ? 'bg-rose-950/20' : ''}`}>
                        <td className="px-5 py-2.5 font-mono font-bold text-blue-400">{ticketIdVal}</td>
                        <td className="px-5 py-2.5 text-slate-100 font-medium">{ownerVal}</td>
                        <td className="px-5 py-2.5 text-slate-300 truncate max-w-[180px]">{getVal(t, ['Product Name (Ticket)', 'Categoría', 'Product Name'], 'General')}</td>
                        <td className="px-5 py-2.5 text-slate-300 font-medium">{getVal(t, ['Status (Ticket)', 'Estado', 'Status'], '-')}</td>
                        <td className="px-5 py-2.5">{isViolation ? <span className="text-rose-400 font-bold flex items-center gap-1"><AlertOctagon className="w-3 h-3"/> Violación</span> : <span className="text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> OK</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tool2' && tool2Data && (
          <div className="space-y-6">
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-6 h-6 text-emerald-400" /> IT TICKETS
                </h2>
                <p className="text-xs text-emerald-400 font-bold mt-1">Control de Volumetría y SLAs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 h-fit">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-700 pb-3">
                  <Sliders className="w-4 h-4 text-blue-400" /> Filtros Específicos
                </h3>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" /> Período
                  </label>
                  <div className="space-y-2">
                    <CustomDateInput label="Fecha Inicio" value={startDate} onChange={setStartDate} />
                    <CustomDateInput label="Fecha Fin" value={endDate} onChange={setEndDate} />
                  </div>
                </div>

                <CustomSelect label="AGENTE ASIGNADO" value={d2Agent} onChange={setD2Agent} options={[{ value: 'Todos', label: 'Todos los Agentes' }, ...uniqueUsers.map(u => ({ value: u, label: u }))]} />
                <CustomSelect label="REQUEST LEVEL" value={d2Level} onChange={setD2Level} options={[{ value: 'Todos', label: 'Todos los Niveles' }, ...tool2Data.levels.map(l => ({ value: l, label: l }))]} />
                <CustomSelect label="PRIORITY" value={d2Priority} onChange={setD2Priority} options={[{ value: 'Todas', label: 'Todas las Prioridades' }, ...tool2Data.priorities.map(p => ({ value: p, label: p }))]} />

                <button onClick={() => { setD2Agent('Todos'); setD2Level('Todos'); setD2Priority('Todas'); setStartDate(''); setEndDate(''); }} className="w-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg transition-colors border border-slate-600 shadow-sm">
                  Restablecer Filtros
                </button>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tickets Totales</span>
                    <span className="text-3xl font-extrabold text-white">{tool2Data.total}</span>
                  </div>
                  <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tickets Abiertos</span>
                    <span className="text-3xl font-extrabold text-white">{tool2Data.openCount}</span>
                  </div>
                  <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tickets Cerrados</span>
                    <span className="text-3xl font-extrabold text-white">{tool2Data.closedCount}</span>
                  </div>
                  <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">SLA Violados</span>
                    <span className="text-3xl font-extrabold text-white">{tool2Data.slaViolatedCount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-md">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" /> Distribución por Estado
                    </h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={tool2Data.statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                            {tool2Data.statusPieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '8px', color: '#ffffff' }} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-md">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" /> Tickets por Prioridad
                    </h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tool2Data.priorityBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                          <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '8px', color: '#ffffff' }} />
                          <Bar dataKey="Tickets" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32}>
                            {tool2Data.priorityBarData.map((entry, index) => (
                              <Cell key={index} fill={entry.name === 'High' ? '#ef4444' : entry.name === 'Medium' ? '#f59e0b' : entry.name === 'Low' ? '#10b981' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function CustomSelect({ label, value, onChange, options, placeholder = 'Seleccionar...' }: { label?: string; value: string; onChange: (val: string) => void; options: { value: string; label: string }[]; placeholder?: string; }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value || placeholder;

  return (
    <div className="relative w-full" ref={ref}>
      {label && <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-[#0f172a] border border-slate-700 hover:border-slate-500 rounded-lg px-3.5 py-2.5 min-h-[42px] text-xs text-slate-200 flex items-center justify-between transition-colors shadow-sm text-left">
        <span className="truncate font-semibold text-slate-100 block py-0.5">{selectedLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto py-1">
          {options.map((opt) => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`w-full text-left px-3.5 py-2 text-xs transition-colors hover:bg-blue-600/20 hover:text-blue-300 ${value === opt.value ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-200 font-medium'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomDateInput({ label, value, onChange }: { label?: string; value: string; onChange: (val: string) => void; }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleClick = () => { if (inputRef.current) { if ('showPicker' in inputRef.current) { try { (inputRef.current as any).showPicker(); } catch (e) { inputRef.current.focus(); } } else { inputRef.current.focus(); } } };

  return (
    <div className="w-full">
      {label && <span className="block text-[10px] text-slate-400 font-semibold mb-1">{label}</span>}
      <div onClick={handleClick} className="relative w-full bg-[#0f172a] border border-slate-700 hover:border-slate-500 rounded-lg px-3.5 py-2.5 min-h-[42px] flex items-center justify-between text-xs text-slate-200 cursor-pointer transition-colors shadow-sm">
        <span className={`font-semibold ${value ? 'text-slate-100' : 'text-slate-400'}`}>{value || 'yyyy-mm-dd'}</span>
        <Calendar className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        <input ref={inputRef} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, text }: { active: boolean, onClick: () => void, icon: React.ReactNode, text: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700/60'}`}>
      <div className={active ? 'text-white' : 'text-slate-400'}>{React.cloneElement(icon as React.ReactElement, { size: 16 })}</div>{text}
    </button>
  );
}

function KpiCard({ title, value, subtitle, icon, color = 'slate', highlight = false, onClick }: { title: string, value: string | number, subtitle: string, icon: React.ReactNode, color?: 'slate' | 'blue' | 'emerald' | 'rose' | 'amber', highlight?: boolean, onClick?: () => void }) {
  const colorMap = {
    slate: 'from-slate-800 to-slate-900 border-slate-700 text-slate-300 hover:border-slate-500',
    blue: 'from-blue-950/60 to-slate-900 border-blue-500/40 text-blue-400 hover:border-blue-400',
    emerald: 'from-emerald-950/60 to-slate-900 border-emerald-500/40 text-emerald-400 hover:border-emerald-400',
    rose: 'from-rose-950/60 to-slate-900 border-rose-500/40 text-rose-400 hover:border-rose-400',
    amber: 'from-amber-950/60 to-slate-900 border-amber-500/40 text-amber-400 hover:border-amber-400',
  };

  return (
    <div onClick={onClick} className={`p-4 rounded-2xl border bg-gradient-to-br ${colorMap[color]} shadow-md flex flex-col justify-between relative overflow-hidden group transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${highlight ? 'ring-1 ring-white/20' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-1">{title} {onClick && <Sparkles className="w-3 h-3 opacity-60 text-blue-400" />}</span>
        <div className="opacity-80">{React.cloneElement(icon as React.ReactElement, { size: 16 })}</div>
      </div>
      <div>
        <span className="text-3xl font-black text-white tracking-tight">{value}</span>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">{subtitle}</p>
      </div>
    </div>
  );
}