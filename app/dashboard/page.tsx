'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
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

  // Donut Chart Component
  const DonutChart = ({ data, title }: any) => {
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    let currentAngle = 0;

    const createArc = (percentage: number, color: string) => {
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
      
      return `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {data.map((item: any, index: number) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                if (percentage === 0) return null;
                return (
                  <path
                    key={index}
                    d={createArc(percentage, item.color)}
                    fill={item.color}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                );
              })}
              <circle cx="50" cy="50" r="25" fill="white" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-xs text-gray-500">รวม</div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-gray-700">{item.label}</span>
              </div>
              <span className="font-semibold text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const CompactStatCard = ({ title, count, value, color, icon }: any) => (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow transition-shadow p-3 border-l-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <h3 className="text-xs font-medium text-gray-600">{title}</h3>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-bold text-gray-900">{count}</p>
        <span className="text-xs text-gray-500">รายการ</span>
      </div>
      {value > 0 && (
        <p className="text-xs text-gray-600 mt-1">
          ฿ {formatCurrency(value)}
        </p>
      )}
    </div>
  );

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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow p-4 text-white">
        <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
        <p className="text-sm text-blue-100">ภาพรวมข้อมูลแผนก {user?.department}</p>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart 
          data={customerCountData} 
          title="📊 จำนวนลูกค้าแต่ละประเภท"
        />
        <DonutChart 
          data={customerValueData} 
          title="💰 มูลค่าลูกค้า (พันบาท)"
        />
      </div>

      {/* Customer Stats */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-900">สถิติลูกค้า</h3>
          <Link 
            href="/dashboard/customers"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <CompactStatCard
            title="Lead"
            count={stats.leadCount}
            value={stats.leadValue}
            color="border-gray-400"
            icon="📋"
          />
          <CompactStatCard
            title="Potential"
            count={stats.potentialCount}
            value={stats.potentialValue}
            color="border-yellow-500"
            icon="⭐"
          />
          <CompactStatCard
            title="Prospect"
            count={stats.prospectCount}
            value={stats.prospectValue}
            color="border-orange-500"
            icon="🎯"
          />
          <CompactStatCard
            title="Pipeline"
            count={stats.pipelineCount}
            value={stats.pipelineValue}
            color="border-purple-500"
            icon="🚀"
          />
          <CompactStatCard
            title="PO"
            count={stats.poCount}
            value={stats.poValue}
            color="border-green-500"
            icon="✅"
          />
          <CompactStatCard
            title="Close"
            count={stats.closeCount}
            value={stats.closeValue}
            color="border-red-500"
            icon="❌"
          />
        </div>
      </div>

      {/* Tasks Stats */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-900">สถิติงาน</h3>
          <Link 
            href="/dashboard/tasks"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CompactStatCard
            title="รอดำเนินการ"
            count={stats.pendingTasks}
            value={0}
            color="border-red-500"
            icon="⏳"
          />
          <CompactStatCard
            title="กำลังดำเนินการ"
            count={stats.inProgressTasks}
            value={0}
            color="border-blue-500"
            icon="🔄"
          />
          <CompactStatCard
            title="เสร็จสิ้น"
            count={stats.completedTasks}
            value={0}
            color="border-green-500"
            icon="✅"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-base font-bold text-gray-900 mb-3">⚡ เมนูด่วน</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/dashboard/customers"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">➕</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">เพิ่มลูกค้าใหม่</div>
          </Link>
          <Link
            href="/dashboard/tasks"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">สร้างงานใหม่</div>
          </Link>
          <Link
            href="/dashboard/customers"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">👥</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">รายชื่อลูกค้า</div>
          </Link>
          <Link
            href="/dashboard/tasks"
            className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">✔</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">รายการงาน</div>
          </Link>
        </div>
      </div>
    </div>
  );
}