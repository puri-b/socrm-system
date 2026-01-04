'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  // --- 1. State Logic (คงเดิมทุกประการ) ---
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    leadCount: 0,
    leadValue: 0,
    potentialCount: 0,
    potentialValue: 0,
    prospectCount: 0,
    prospectValue: 0,
    pipelineCount: 0,
    pipelineValue: 0,
    poCount: 0,
    poValue: 0,
    closeCount: 0,
    closeValue: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0
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

      const leadCustomers = customers.filter((c: any) => c.lead_status === 'Lead');
      const potentialCustomers = customers.filter((c: any) => c.lead_status === 'Potential');
      const prospectCustomers = customers.filter((c: any) => c.lead_status === 'Prospect');
      const pipelineCustomers = customers.filter((c: any) => c.lead_status === 'Pipeline');
      const poCustomers = customers.filter((c: any) => c.lead_status === 'PO');
      const closeCustomers = customers.filter((c: any) => c.lead_status === 'Close');

      setStats({
        totalCustomers: customers.length,
        leadCount: leadCustomers.length,
        leadValue: leadCustomers.reduce((sum: number, c: any) => sum + (parseFloat(c.contract_value) || 0), 0),
        potentialCount: potentialCustomers.length,
        potentialValue: potentialCustomers.reduce((sum: number, c: any) => sum + (parseFloat(c.contract_value) || 0), 0),
        prospectCount: prospectCustomers.length,
        prospectValue: prospectCustomers.reduce((sum: number, c: any) => sum + (parseFloat(c.contract_value) || 0), 0),
        pipelineCount: pipelineCustomers.length,
        pipelineValue: pipelineCustomers.reduce((sum: number, c: any) => sum + (parseFloat(c.contract_value) || 0), 0),
        poCount: poCustomers.length,
        poValue: poCustomers.reduce((sum: number, c: any) => sum + (parseFloat(c.contract_value) || 0), 0),
        closeCount: closeCustomers.length,
        closeValue: closeCustomers.reduce((sum: number, c: any) => sum + (parseFloat(c.contract_value) || 0), 0),
        pendingTasks: tasks.filter((t: any) => t.status === 'pending').length,
        inProgressTasks: tasks.filter((t: any) => t.status === 'in_progress').length,
        completedTasks: tasks.filter((t: any) => t.status === 'completed').length
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // --- 2. Components (ปรับปรุง UI) ---

  // Refined Donut Chart
  const DonutChart = ({ data, title, subTitle }: any) => {
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    let currentAngle = 0;

    const createArc = (percentage: number) => {
      const startAngle = currentAngle;
      const angle = (percentage / 100) * 360;
      currentAngle += angle;
      
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (startAngle + angle - 90) * Math.PI / 180;
      
      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      // Handle 100% case correctly (full circle)
      if (percentage >= 100) {
         return `M 50 10 A 40 40 0 1 1 49.99 10 Z`; 
      }
      
      return `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
        <h3 className="text-gray-800 font-bold text-lg mb-1">{title}</h3>
        {subTitle && <p className="text-gray-400 text-xs mb-6">{subTitle}</p>}
        
        <div className="flex flex-col md:flex-row items-center gap-8 mt-2 h-full justify-center">
          {/* Chart Area */}
          <div className="relative w-48 h-48 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-md">
              {total === 0 && (
                 <circle cx="50" cy="50" r="40" fill="#f3f4f6" />
              )}
              {data.map((item: any, index: number) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                if (percentage === 0) return null;
                return (
                  <path
                    key={index}
                    d={createArc(percentage)}
                    fill={item.color}
                    className="hover:brightness-110 transition-all cursor-pointer"
                  />
                );
              })}
              <circle cx="50" cy="50" r="28" fill="white" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <div className="text-3xl font-extrabold text-gray-800">{new Intl.NumberFormat('en-US', { notation: "compact" }).format(total)}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">รวมทั้งหมด</div>
            </div>
          </div>

          {/* Legend Area */}
          <div className="flex-1 w-full">
             <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {data.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: item.color }}></span>
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modern Stat Card
  const ModernStatCard = ({ title, count, value, theme, icon }: any) => {
    // Theme mapping for modern colors
    const themes: any = {
      gray:     { bg: 'bg-gray-50',     text: 'text-gray-600',    iconBg: 'bg-gray-100' },
      yellow:   { bg: 'bg-yellow-50',   text: 'text-yellow-600',  iconBg: 'bg-yellow-100' },
      orange:   { bg: 'bg-orange-50',   text: 'text-orange-600',  iconBg: 'bg-orange-100' },
      purple:   { bg: 'bg-purple-50',   text: 'text-purple-600',  iconBg: 'bg-purple-100' },
      green:    { bg: 'bg-green-50',    text: 'text-green-600',   iconBg: 'bg-green-100' },
      red:      { bg: 'bg-red-50',      text: 'text-red-600',     iconBg: 'bg-red-100' },
      blue:     { bg: 'bg-blue-50',     text: 'text-blue-600',    iconBg: 'bg-blue-100' },
    };

    const t = themes[theme] || themes.gray;

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2 rounded-lg ${t.iconBg} text-xl`}>
            {icon}
          </div>
          {value > 0 && (
             <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${t.bg} ${t.text}`}>
               ฿ {formatCurrency(value)}
             </span>
          )}
        </div>
        <div>
           <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
           <h4 className="text-2xl font-bold text-gray-900">{count}</h4>
        </div>
      </div>
    );
  };

  // Quick Action Card
  const ActionCard = ({ href, icon, title, subtitle, colorClass }: any) => (
    <Link
      href={href}
      className={`group relative bg-white overflow-hidden rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300`}
    >
      <div className={`absolute top-0 right-0 w-16 h-16 transform translate-x-4 -translate-y-4 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 ${colorClass}`}></div>
      
      <div className="relative z-10 flex flex-col items-center text-center gap-3">
         <div className={`text-3xl p-3 rounded-full bg-gray-50 group-hover:bg-white group-hover:shadow-sm transition-all duration-300`}>
            {icon}
         </div>
         <div>
            <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{title}</h4>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
         </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
        <div className="relative w-16 h-16">
           <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full"></div>
           <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 text-sm animate-pulse">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const customerCountData = [
    { label: 'Lead', value: stats.leadCount, color: '#9CA3AF' },
    { label: 'Potential', value: stats.potentialCount, color: '#EAB308' },
    { label: 'Prospect', value: stats.prospectCount, color: '#F97316' },
    { label: 'Pipeline', value: stats.pipelineCount, color: '#A855F7' },
    { label: 'PO', value: stats.poCount, color: '#22C55E' },
    { label: 'Close', value: stats.closeCount, color: '#EF4444' }
  ];

  const customerValueData = [
    { label: 'Lead', value: Math.round(stats.leadValue / 1000), color: '#9CA3AF' },
    { label: 'Potential', value: Math.round(stats.potentialValue / 1000), color: '#EAB308' },
    { label: 'Prospect', value: Math.round(stats.prospectValue / 1000), color: '#F97316' },
    { label: 'Pipeline', value: Math.round(stats.pipelineValue / 1000), color: '#A855F7' },
    { label: 'PO', value: Math.round(stats.poValue / 1000), color: '#22C55E' },
    { label: 'Close', value: Math.round(stats.closeValue / 1000), color: '#EF4444' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
             ยินดีต้อนรับคุณ <span className="font-semibold text-blue-600">{user?.name || 'User'}</span> 
             • แผนก <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{user?.department}</span>
          </p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-xs text-gray-400">ข้อมูลล่าสุดเมื่อ</p>
           <p className="text-sm font-medium text-gray-700">{new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart 
          data={customerCountData} 
          title="สถานะลูกค้า (จำนวน)"
          subTitle="สัดส่วนจำนวนลูกค้าในแต่ละขั้นตอนการขาย"
        />
        <DonutChart 
          data={customerValueData} 
          title="มูลค่าประเมิน (พันบาท)"
          subTitle="มูลค่าสัญญาที่คาดการณ์แยกตามสถานะ"
        />
      </div>

      {/* Customer Pipeline Stats */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
             <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
             <h3 className="text-lg font-bold text-gray-800">Pipeline Sales</h3>
          </div>
          <Link 
            href="/dashboard/customers"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
          >
            ดูข้อมูลทั้งหมด →
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <ModernStatCard title="Lead" count={stats.leadCount} value={stats.leadValue} theme="gray" icon="📋" />
          <ModernStatCard title="Potential" count={stats.potentialCount} value={stats.potentialValue} theme="yellow" icon="⭐" />
          <ModernStatCard title="Prospect" count={stats.prospectCount} value={stats.prospectValue} theme="orange" icon="🎯" />
          <ModernStatCard title="Pipeline" count={stats.pipelineCount} value={stats.pipelineValue} theme="purple" icon="🚀" />
          <ModernStatCard title="PO" count={stats.poCount} value={stats.poValue} theme="green" icon="✅" />
          <ModernStatCard title="Close" count={stats.closeCount} value={stats.closeValue} theme="red" icon="❌" />
        </div>
      </section>

      {/* Workflow & Tasks */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
             <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
             <h3 className="text-lg font-bold text-gray-800">Workflow Status</h3>
          </div>
          <Link 
            href="/dashboard/tasks"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
          >
            ดูงานทั้งหมด →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModernStatCard title="รอดำเนินการ" count={stats.pendingTasks} value={0} theme="red" icon="⏳" />
          <ModernStatCard title="กำลังดำเนินการ" count={stats.inProgressTasks} value={0} theme="blue" icon="🔄" />
          <ModernStatCard title="เสร็จสิ้นแล้ว" count={stats.completedTasks} value={0} theme="green" icon="✨" />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
         <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Quick Actions</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard 
              href="/dashboard/customers" 
              icon="➕" 
              title="เพิ่มลูกค้าใหม่" 
              subtitle="บันทึกข้อมูล Lead หรือลูกค้า" 
              colorClass="bg-blue-500"
            />
            <ActionCard 
              href="/dashboard/tasks" 
              icon="📝" 
              title="สร้างงานใหม่" 
              subtitle="มอบหมายงานหรือติดตามผล" 
              colorClass="bg-indigo-500"
            />
            <ActionCard 
              href="/dashboard/customers" 
              icon="👥" 
              title="ฐานข้อมูลลูกค้า" 
              subtitle="ค้นหาและจัดการลูกค้าทั้งหมด" 
              colorClass="bg-teal-500"
            />
            <ActionCard 
              href="/dashboard/tasks" 
              icon="📅" 
              title="ตารางงาน" 
              subtitle="ตรวจสอบรายการสิ่งที่ต้องทำ" 
              colorClass="bg-rose-500"
            />
         </div>
      </section>
    </div>
  );
}