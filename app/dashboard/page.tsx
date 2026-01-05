'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// --- Internal SVG Icons (ไม่ต้อง Install เพิ่ม) ---
const Icons = {
  Lead: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
  ),
  Potential: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  ),
  Prospect: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  Pipeline: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/><path d="m9.05 4.1 .5 4.65"/><path d="m14.95 4.1-.5 4.65"/></svg>
  ),
  PO: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  ),
  Clock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  Refresh: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="21 3 21 8 16 8"/></svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  Database: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
  )
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalCustomers: 0, leadCount: 0, leadValue: 0, potentialCount: 0, potentialValue: 0,
    prospectCount: 0, prospectValue: 0, pipelineCount: 0, pipelineValue: 0,
    poCount: 0, poValue: 0, closeCount: 0, closeValue: 0,
    pendingTasks: 0, inProgressTasks: 0, completedTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    try {
      const [customersRes, tasksRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/tasks')
      ]);
      const customersData = await customersRes.json();
      const tasksData = await tasksRes.json();
      const customers = customersData.customers || [];
      const tasks = tasksData.tasks || [];

      const filterStatus = (s: string) => customers.filter((c: any) => c.lead_status === s);
      const sumVal = (arr: any[]) => arr.reduce((sum, c) => sum + (parseFloat(c.contract_value) || 0), 0);

      setStats({
        totalCustomers: customers.length,
        leadCount: filterStatus('Lead').length, leadValue: sumVal(filterStatus('Lead')),
        potentialCount: filterStatus('Potential').length, potentialValue: sumVal(filterStatus('Potential')),
        prospectCount: filterStatus('Prospect').length, prospectValue: sumVal(filterStatus('Prospect')),
        pipelineCount: filterStatus('Pipeline').length, pipelineValue: sumVal(filterStatus('Pipeline')),
        poCount: filterStatus('PO').length, poValue: sumVal(filterStatus('PO')),
        closeCount: filterStatus('Close').length, closeValue: sumVal(filterStatus('Close')),
        pendingTasks: tasks.filter((t: any) => t.status === 'pending').length,
        inProgressTasks: tasks.filter((t: any) => t.status === 'in_progress').length,
        completedTasks: tasks.filter((t: any) => t.status === 'completed').length
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('th-TH').format(v);

  const formatCompactCurrency = (v: number) => {
    // แสดงผลแบบอ่านง่าย (เช่น 1.2M) เพื่อใช้ในกราฟ
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const fmt = (n: number) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format(n);

    if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000)}B`;
    if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${sign}${fmt(abs / 1_000)}K`;
    return `${sign}${new Intl.NumberFormat('th-TH').format(abs)}`;
  };

  // --- Sub Components ---

  const ModernStatCard = ({ title, count, value, themeColor, icon: Icon }: any) => {
    const themes: any = {
      blue: "text-blue-600 bg-blue-50 border-blue-100",
      amber: "text-amber-600 bg-amber-50 border-amber-100",
      orange: "text-orange-600 bg-orange-50 border-orange-100",
      purple: "text-purple-600 bg-purple-50 border-purple-100",
      emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
      rose: "text-rose-600 bg-rose-50 border-rose-100",
      slate: "text-slate-600 bg-slate-50 border-slate-100",
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

  const DonutCard = ({
    title,
    subtitle,
    data,
    centerText,
    centerSubText,
    valueFormatter,
  }: {
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
              {/* base ring */}
              <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#e2e8f0" strokeWidth={stroke} />
              {/* segments */}
              <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>{segments}</g>
            </svg>

            {/* center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-black text-slate-900 tracking-tight">{centerText}</div>
              <div className="text-xs text-slate-400 font-semibold mt-1">{centerSubText}</div>
            </div>
          </div>

          {/* legend */}
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 text-sm font-medium">กำลังเตรียมข้อมูล...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            ยินดีต้อนรับ, <span className="text-blue-600 font-bold">{user.full_name}</span> • แผนก {user.department}
          </p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Update</p>
          <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
        </div>
      </header>

      {/* Quick Actions */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
      </section>

      {/* ✅ Donut Charts (ตามที่ต้องการ: ใต้เมนูหลัก และเหนือ Pipeline Progress) */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-1.5 bg-slate-800 rounded-full"></div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Pipeline Overview</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Count by Pipeline */}
          <DonutCard
            title="Customers"
            subtitle="จำนวนลูกค้าแต่ละ Pipeline"
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

          {/* Right: Value by Pipeline */}
          <DonutCard
            title="Value"
            subtitle="มูลค่าของแต่ละ Pipeline"
            data={[
              { label: 'Lead', value: stats.leadValue, color: '#475569' },
              { label: 'Potential', value: stats.potentialValue, color: '#f59e0b' },
              { label: 'Prospect', value: stats.prospectValue, color: '#fb923c' },
              { label: 'Pipeline', value: stats.pipelineValue, color: '#8b5cf6' },
              { label: 'PO', value: stats.poValue, color: '#10b981' },
              { label: 'Close', value: stats.closeValue, color: '#f43f5e' },
            ]}
            centerText={`฿${formatCompactCurrency(
              stats.leadValue +
                stats.potentialValue +
                stats.prospectValue +
                stats.pipelineValue +
                stats.poValue +
                stats.closeValue
            )}`}
            centerSubText="Total Value"
            valueFormatter={(v) => `฿${formatCompactCurrency(v)}`}
          />
        </div>
      </section>

      {/* Pipeline Progress */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-1.5 bg-blue-600 rounded-full"></div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Pipeline Progress</h3>
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

      {/* Workflow Status */}
      <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-1.5 bg-slate-800 rounded-full"></div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Task Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
               <Icons.Clock />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.pendingTasks} <span className="text-sm font-normal text-slate-400 ml-1">Items</span></h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
               <Icons.Refresh />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Progress</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.inProgressTasks} <span className="text-sm font-normal text-slate-400 ml-1">Items</span></h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
               <Icons.Check />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.completedTasks} <span className="text-sm font-normal text-slate-400 ml-1">Items</span></h4>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
