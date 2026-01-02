'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    leadCount: 0,
    potentialCount: 0,
    prospectCount: 0,
    pipelineCount: 0,
    poCount: 0,
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

      setStats({
        totalCustomers: customers.length,
        leadCount: customers.filter((c: any) => c.lead_status === 'Lead').length,
        potentialCount: customers.filter((c: any) => c.lead_status === 'Potential').length,
        prospectCount: customers.filter((c: any) => c.lead_status === 'Prospect').length,
        pipelineCount: customers.filter((c: any) => c.lead_status === 'Pipeline').length,
        poCount: customers.filter((c: any) => c.lead_status === 'PO').length,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  const StatCard = ({ title, value, color, icon }: any) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">ภาพรวมข้อมูลแผนก {user?.department}</p>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 สถิติลูกค้า</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="ลูกค้าทั้งหมด"
            value={stats.totalCustomers}
            color="border-blue-500"
            icon="👥"
          />
          <StatCard
            title="Lead"
            value={stats.leadCount}
            color="border-gray-500"
            icon="📝"
          />
          <StatCard
            title="Potential"
            value={stats.potentialCount}
            color="border-yellow-500"
            icon="⭐"
          />
          <StatCard
            title="Prospect"
            value={stats.prospectCount}
            color="border-orange-500"
            icon="🎯"
          />
          <StatCard
            title="Pipeline"
            value={stats.pipelineCount}
            color="border-purple-500"
            icon="🚀"
          />
          <StatCard
            title="PO"
            value={stats.poCount}
            color="border-green-500"
            icon="✅"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✓ สถิติงาน</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="งานรอดำเนินการ"
            value={stats.pendingTasks}
            color="border-red-500"
            icon="⏳"
          />
          <StatCard
            title="กำลังดำเนินการ"
            value={stats.inProgressTasks}
            color="border-blue-500"
            icon="🔄"
          />
          <StatCard
            title="เสร็จสิ้นแล้ว"
            value={stats.completedTasks}
            color="border-green-500"
            icon="✅"
          />
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ เมนูด่วน</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/customers"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">➕</div>
            <div className="font-medium text-gray-700">เพิ่มลูกค้าใหม่</div>
          </Link>
          <Link
            href="/dashboard/tasks"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="font-medium text-gray-700">สร้างงานใหม่</div>
          </Link>
          <Link
            href="/dashboard/customers"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <div className="font-medium text-gray-700">ดูรายชื่อลูกค้า</div>
          </Link>
          <Link
            href="/dashboard/tasks"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">✓</div>
            <div className="font-medium text-gray-700">ดูรายการงาน</div>
          </Link>
        </div>
      </div>
    </div>
  );
}