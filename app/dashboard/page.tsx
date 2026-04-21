'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const Icons = {
  Lead: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  Potential: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Prospect: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Pipeline: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      <path d="m9.05 4.1 .5 4.65" />
      <path d="m14.95 4.1-.5 4.65" />
    </svg>
  ),
  PO: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Clock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Refresh: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <polyline points="21 3 21 8 16 8" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Database: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  Filter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

type User = {
  user_id: number;
  full_name: string;
  department: string;
  role: string;
};

type Customer = {
  customer_id: number;
  company_name?: string;
  email?: string;
  phone?: string;
  lead_status?: string;
  contract_value?: string | number;
  lead_source?: string;
  sales_person_id?: number;
  is_quality_lead?: boolean;
  department?: string;
  created_at?: string;
  customer_services?: Array<{ service_id?: number; service_name?: string }>;
};

type Task = {
  task_id: number;
  customer_id?: number | null;
  title?: string;
  description?: string;
  task_date?: string;
  status?: string;
  company_name?: string;
  assigned_to_name?: string;
};

const DEPARTMENTS = [
  { code: 'LBD', name: 'LBD' },
  { code: 'LBA', name: 'LBA' },
  { code: 'CR', name: 'CR' },
  { code: 'LM', name: 'LM' },
  { code: 'DS', name: 'DS' },
  { code: 'SN', name: 'SN' },
];

const LEAD_SOURCE_GROUPS = {
  OFFLINE_ALL: 'OFFLINE_ALL',
  ONLINE_ALL: 'ONLINE_ALL',
} as const;

const LEAD_SOURCES = [
  'Offline - Callout',
  'Offline - Connection',
  'Online - Call in',
  'Online - Line',
  'Online - Leadform',
  'Online - E-mail',
  'Online - อื่นๆ',
];

const normalizeDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isTaskOpen = (status?: string) => ['pending', 'in_progress'].includes(String(status || '').toLowerCase());

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filterServices, setFilterServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [qualityLeadFilter, setQualityLeadFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(raw);
    setUser(parsed);

    Promise.all([fetchCustomers(), fetchTasks(), fetchUsers(), fetchFilterServices(parsed, 'all')]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchFilterServices(user, departmentFilter);
  }, [departmentFilter, user]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchFilterServices = async (currentUser: User, deptFilter: string) => {
    try {
      let url = '/api/services';
      if ((currentUser.role === 'admin' || currentUser.role === 'digital_marketing') && deptFilter !== 'all') {
        url = `/api/services?department=${encodeURIComponent(deptFilter)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setFilterServices(data.services || []);
    } catch (error) {
      console.error('Failed to fetch services(filter):', error);
      setFilterServices([]);
    }
  };

  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    if (statusFilter !== 'all') filtered = filtered.filter((c) => c.lead_status === statusFilter);

    if (leadSourceFilter !== 'all') {
      if (leadSourceFilter === LEAD_SOURCE_GROUPS.OFFLINE_ALL) {
        filtered = filtered.filter((c) => (c.lead_source || '').startsWith('Offline -'));
      } else if (leadSourceFilter === LEAD_SOURCE_GROUPS.ONLINE_ALL) {
        filtered = filtered.filter((c) => (c.lead_source || '').startsWith('Online -'));
      } else {
        filtered = filtered.filter((c) => c.lead_source === leadSourceFilter);
      }
    }

    if (salesPersonFilter !== 'all') {
      filtered = filtered.filter((c) => Number(c.sales_person_id) === Number(salesPersonFilter));
    }

    if (qualityLeadFilter !== 'all') {
      const isQuality = qualityLeadFilter === 'quality';
      filtered = filtered.filter((c) => Boolean(c.is_quality_lead) === isQuality);
    }

    if ((user?.role === 'admin' || user?.role === 'digital_marketing') && departmentFilter !== 'all') {
      filtered = filtered.filter((c) => c.department === departmentFilter);
    }

    if (serviceFilter !== 'all') {
      const serviceId = Number(serviceFilter);
      filtered = filtered.filter((c) => {
        const arr = Array.isArray(c.customer_services) ? c.customer_services : [];
        return arr.some((s: any) => Number(s?.service_id) === serviceId);
      });
    }

    if (createdFrom) {
      const from = new Date(`${createdFrom}T00:00:00`).getTime();
      filtered = filtered.filter((c) => {
        const t = c.created_at ? new Date(c.created_at).getTime() : NaN;
        return Number.isFinite(t) && t >= from;
      });
    }

    if (createdTo) {
      const to = new Date(`${createdTo}T23:59:59`).getTime();
      filtered = filtered.filter((c) => {
        const t = c.created_at ? new Date(c.created_at).getTime() : NaN;
        return Number.isFinite(t) && t <= to;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((c) =>
        c.company_name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(searchTerm.trim())
      );
    }

    return filtered;
  }, [customers, statusFilter, leadSourceFilter, salesPersonFilter, qualityLeadFilter, departmentFilter, serviceFilter, createdFrom, createdTo, searchTerm, user]);

  const filteredCustomerIds = useMemo(() => new Set(filteredCustomers.map((c) => Number(c.customer_id))), [filteredCustomers]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => task.customer_id && filteredCustomerIds.has(Number(task.customer_id)));
  }, [tasks, filteredCustomerIds]);

  const todayFollowUps = useMemo(() => {
    const today = normalizeDate(new Date().toISOString());
    return filteredTasks
      .filter((task) => isTaskOpen(task.status) && normalizeDate(task.task_date) === today)
      .sort((a, b) => String(a.task_date || '').localeCompare(String(b.task_date || '')));
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const filterStatus = (s: string) => filteredCustomers.filter((c) => c.lead_status === s);
    const sumVal = (arr: Customer[]) => arr.reduce((sum, c) => sum + (parseFloat(String(c.contract_value || 0)) || 0), 0);

    return {
      totalCustomers: filteredCustomers.length,
      leadCount: filterStatus('Lead').length,
      leadValue: sumVal(filterStatus('Lead')),
      potentialCount: filterStatus('Potential').length,
      potentialValue: sumVal(filterStatus('Potential')),
      prospectCount: filterStatus('Prospect').length,
      prospectValue: sumVal(filterStatus('Prospect')),
      pipelineCount: filterStatus('Pipeline').length,
      pipelineValue: sumVal(filterStatus('Pipeline')),
      poCount: filterStatus('PO').length,
      poValue: sumVal(filterStatus('PO')),
      closeCount: filterStatus('Close').length,
      closeValue: sumVal(filterStatus('Close')),
      pendingTasks: filteredTasks.filter((t) => String(t.status) === 'pending').length,
      inProgressTasks: filteredTasks.filter((t) => String(t.status) === 'in_progress').length,
      completedTasks: filteredTasks.filter((t) => ['completed', 'done'].includes(String(t.status))).length,
    };
  }, [filteredCustomers, filteredTasks]);

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setLeadSourceFilter('all');
    setSalesPersonFilter('all');
    setQualityLeadFilter('all');
    setDepartmentFilter('all');
    setServiceFilter('all');
    setCreatedFrom('');
    setCreatedTo('');
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('th-TH').format(v);
  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const formatCompactCurrency = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const fmt = (n: number) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format(n);
    if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000)}B`;
    if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${sign}${fmt(abs / 1_000)}K`;
    return `${sign}${new Intl.NumberFormat('th-TH').format(abs)}`;
  };

  const ModernStatCard = ({ title, count, value, themeColor, icon: Icon }: any) => {
    const themes: any = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100',
      amber: 'text-amber-600 bg-amber-50 border-amber-100',
      orange: 'text-orange-600 bg-orange-50 border-orange-100',
      purple: 'text-purple-600 bg-purple-50 border-purple-100',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      rose: 'text-rose-600 bg-rose-50 border-rose-100',
      slate: 'text-slate-600 bg-slate-50 border-slate-100',
    };
    const theme = themes[themeColor] || themes.slate;

    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-xl border ${theme}`}>
            <Icon />
          </div>
          {value > 0 && (
            <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${theme}`}>
              ฿{formatCurrency(value)}
            </span>
          )}
        </div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{count}</h4>
      </div>
    );
  };

  const DonutCard = ({ title, subtitle, data, centerText, centerSubText, valueFormatter }: {
    title: string;
    subtitle: string;
    data: { label: string; value: number; color: string }[];
    centerText: string;
    centerSubText: string;
    valueFormatter: (v: number) => string;
  }) => {
    const total = data.reduce((s, d) => s + (Number.isFinite(d.value) ? d.value : 0), 0);
    const safeTotal = total > 0 ? total : 0;

    const size = 220;
    const stroke = 35;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;

    let offset = 0;
    const segments = data.map((d, idx) => {
      const v = Number.isFinite(d.value) ? d.value : 0;
      const frac = safeTotal === 0 ? 0 : v / safeTotal;
      const dash = frac * c;
      const dasharray = `${dash} ${c - dash}`;
      const dashoffset = -offset;
      offset += dash;

      return (
        <circle
          key={`${d.label}-${idx}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke={d.color}
          strokeWidth={stroke}
          strokeDasharray={dasharray}
          strokeDashoffset={dashoffset}
          strokeLinecap="butt"
        />
      );
    });

    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
            <h4 className="text-lg font-black text-slate-800 tracking-tight mt-1">{subtitle}</h4>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</p>
            <p className="text-sm font-black text-slate-700">{centerText}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-center">
          <div className="relative w-[220px] h-[220px] mx-auto">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
              <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#e2e8f0" strokeWidth={stroke} />
              <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>{segments}</g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-black text-slate-900 tracking-tight">{centerText}</div>
              <div className="text-xs text-slate-400 font-semibold mt-1">{centerSubText}</div>
            </div>
          </div>

          <div className="space-y-2">
            {data.map((d) => {
              const v = Number.isFinite(d.value) ? d.value : 0;
              const pct = safeTotal === 0 ? 0 : (v / safeTotal) * 100;
              return (
                <div key={d.label} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm font-semibold text-slate-700 truncate">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-800">{valueFormatter(v)}</span>
                    <span className="text-xs font-bold text-slate-400 w-[54px] text-right">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">กำลังเตรียมข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            ยินดีต้อนรับ, <span className="text-blue-600 font-bold">{user?.full_name || '—'}</span> • แผนก {user?.department || '—'}
          </p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Update</p>
          <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Add Customer', sub: 'เพิ่มลูกค้าใหม่', color: 'bg-blue-600', icon: Icons.Plus, href: '/dashboard/customers' },
          { label: 'Create Task', sub: 'สร้างงานใหม่', color: 'bg-indigo-600', icon: Icons.Refresh, href: '/dashboard/tasks' },
          { label: 'Database', sub: 'ฐานข้อมูลลูกค้า', color: 'bg-slate-800', icon: Icons.Database, href: '/dashboard/customers' },
          { label: 'Schedule', sub: 'ปฏิทินงาน', color: 'bg-emerald-600', icon: Icons.Clock, href: '/dashboard/tasks' },
        ].map((action, i) => (
          <Link key={i} href={action.href} className="group relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200 transition-all overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 ${action.color} opacity-[0.03] rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500`}></div>
            <div className={`w-10 h-10 ${action.color} text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10`}>
              <action.icon />
            </div>
            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{action.label}</h4>
            <p className="text-[11px] text-slate-400 font-medium">{action.sub}</p>
          </Link>
        ))}
      </section>

      <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Icons.Filter />
          <span className="text-xs font-semibold uppercase tracking-wider">ตัวกรอง</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="ค้นหา: ชื่อบริษัท, อีเมล, เบอร์โทร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="Lead">Lead</option>
            <option value="Potential">Potential</option>
            <option value="Prospect">Prospect</option>
            <option value="Pipeline">Pipeline</option>
            <option value="PO">PO</option>
            <option value="Close">Close (ลูกค้าปฏิเสธ)</option>
          </select>

          <select
            value={leadSourceFilter}
            onChange={(e) => setLeadSourceFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">แหล่งที่มาทั้งหมด</option>
            <option value={LEAD_SOURCE_GROUPS.OFFLINE_ALL}>Offline ทั้งหมด</option>
            <option value={LEAD_SOURCE_GROUPS.ONLINE_ALL}>Online ทั้งหมด</option>
            <option disabled value="__sep__">──────────</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <div className="w-full">
            <div className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
              <Icons.Calendar /> วันที่บันทึก (เริ่ม)
            </div>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="w-full">
            <div className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
              <Icons.Calendar /> วันที่บันทึก (สิ้นสุด)
            </div>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="w-full">
            <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
              บริการ
            </div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">บริการทั้งหมด</option>
              {filterServices.map((service: any) => (
                <option key={service.service_id} value={service.service_id}>
                  {service.service_name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={salesPersonFilter}
            onChange={(e) => setSalesPersonFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Sale ผู้ดูแลทั้งหมด</option>
            {users.map((u: any) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name}
              </option>
            ))}
          </select>

          <select
            value={qualityLeadFilter}
            onChange={(e) => setQualityLeadFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Quality Lead ทั้งหมด</option>
            <option value="quality">Lead คุณภาพ</option>
            <option value="not-quality">Lead ไม่คุณภาพ</option>
          </select>

          {(user?.role === 'admin' || user?.role === 'digital_marketing') && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">ทุกแผนก</option>
              {(user?.role === 'digital_marketing'
                ? (Array.isArray((user as any)?.allowed_departments) ? (user as any).allowed_departments : []).map((code: string) => ({ code, name: code }))
                : DEPARTMENTS
              ).map((dept: any) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={clearFilters}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-1.5 bg-slate-800 rounded-full"></div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Customers Overview</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutCard
            title="Customers"
            subtitle="จำนวนลูกค้าทั้งหมด"
            data={[
              { label: 'Lead', value: stats.leadCount, color: '#475569' },
              { label: 'Potential', value: stats.potentialCount, color: '#f59e0b' },
              { label: 'Prospect', value: stats.prospectCount, color: '#fb923c' },
              { label: 'Pipeline', value: stats.pipelineCount, color: '#8b5cf6' },
              { label: 'PO', value: stats.poCount, color: '#10b981' },
              { label: 'Close', value: stats.closeCount, color: '#f43f5e' },
            ]}
            centerText={String(stats.totalCustomers)}
            centerSubText="Total Customers"
            valueFormatter={(v) => `${new Intl.NumberFormat('th-TH').format(v)} ราย`}
          />

          <DonutCard
            title="Value"
            subtitle="มูลค่าของลูกค้าแต่ละกลุ่ม"
            data={[
              { label: 'Lead', value: stats.leadValue, color: '#475569' },
              { label: 'Potential', value: stats.potentialValue, color: '#f59e0b' },
              { label: 'Prospect', value: stats.prospectValue, color: '#fb923c' },
              { label: 'Pipeline', value: stats.pipelineValue, color: '#8b5cf6' },
              { label: 'PO', value: stats.poValue, color: '#10b981' },
              { label: 'Close', value: stats.closeValue, color: '#f43f5e' },
            ]}
            centerText={`฿${formatCompactCurrency(
              stats.leadValue + stats.potentialValue + stats.prospectValue + stats.pipelineValue + stats.poValue + stats.closeValue
            )}`}
            centerSubText="Total Value"
            valueFormatter={(v) => `฿${formatCompactCurrency(v)}`}
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-1.5 bg-blue-600 rounded-full"></div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">สรุปรวมมูลค่าของลูกค้าของแต่ละกลุ่ม</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <ModernStatCard title="Lead" count={stats.leadCount} value={stats.leadValue} themeColor="slate" icon={Icons.Lead} />
          <ModernStatCard title="Potential" count={stats.potentialCount} value={stats.potentialValue} themeColor="amber" icon={Icons.Potential} />
          <ModernStatCard title="Prospect" count={stats.prospectCount} value={stats.prospectValue} themeColor="orange" icon={Icons.Prospect} />
          <ModernStatCard title="Pipeline" count={stats.pipelineCount} value={stats.pipelineValue} themeColor="purple" icon={Icons.Pipeline} />
          <ModernStatCard title="PO" count={stats.poCount} value={stats.poValue} themeColor="emerald" icon={Icons.PO} />
          <ModernStatCard title="Close" count={stats.closeCount} value={stats.closeValue} themeColor="rose" icon={Icons.Close} />
        </div>
      </section>

      <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-8 w-1.5 bg-slate-800 rounded-full"></div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Task Overview</h3>
          </div>
          <Link href="/dashboard/tasks" className="text-sm font-semibold text-blue-600 hover:text-blue-700">ดูงานทั้งหมด</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100"><Icons.Clock /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.pendingTasks} <span className="text-sm font-normal text-slate-400 ml-1">Items</span></h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><Icons.Refresh /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Progress</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.inProgressTasks} <span className="text-sm font-normal text-slate-400 ml-1">Items</span></h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><Icons.Check /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.completedTasks} <span className="text-sm font-normal text-slate-400 ml-1">Items</span></h4>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Follow-Up Today</p>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">ลูกค้าที่ต้อง Follow-Up วันนี้</h3>
            
          </div>
          <Link href="/dashboard/tasks" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">ไปหน้างานทั้งหมด</Link>
        </div>

        {todayFollowUps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-slate-600 font-semibold">วันนี้ไม่มีลูกค้าที่ต้อง Follow-Up ตามตัวกรองที่เลือก</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">ลูกค้า</th>
                  <th className="px-4 py-3 text-left font-bold">หัวข้องาน</th>
                  <th className="px-4 py-3 text-left font-bold">ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 text-left font-bold">กำหนดส่ง</th>
                  <th className="px-4 py-3 text-left font-bold">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {todayFollowUps.map((task) => (
                  <tr key={task.task_id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-800">{task.company_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{task.title || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{task.assigned_to_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(task.task_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
