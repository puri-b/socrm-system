'use client';

import { useEffect, useState } from 'react';

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchData();
    }
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, statusFilter, assignedFilter]);

  const fetchData = async () => {
    try {
      const [tasksRes, customersRes, usersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/customers'),
        fetch('/api/users')
      ]);

      const tasksData = await tasksRes.json();
      const customersData = await customersRes.json();
      const usersData = await usersRes.json();

      setTasks(tasksData.tasks || []);
      setCustomers(customersData.customers || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (assignedFilter !== 'all') {
      filtered = filtered.filter(t => t.assigned_to === parseInt(assignedFilter));
    }

    setFilteredTasks(filtered);
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    
    const exportData = filteredTasks.map(task => ({
      'ชื่องาน': task.title,
      'ลูกค้า': task.company_name,
      'มอบหมายให้': task.assigned_to_name,
      'สร้างโดย': task.created_by_name,
      'วันที่': new Date(task.task_date).toLocaleDateString('th-TH'),
      'สถานะ': task.status === 'pending' ? 'รอดำเนินการ' : 
               task.status === 'in_progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น',
      'แผนก': task.department,
      'รายละเอียด': task.description
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    
    ws['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 40 }
    ];

    XLSX.writeFile(wb, `Tasks_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, status: newStatus })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'pending': 'bg-red-100 text-red-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: any = {
      'pending': 'รอดำเนินการ',
      'in_progress': 'กำลังดำเนินการ',
      'completed': 'เสร็จสิ้น'
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">รายการงาน (Tasks)</h2>
          <p className="text-gray-600">จัดการงานทั้งหมด</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <span>📊</span>
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>➕</span>
            <span>สร้างงานใหม่</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สถานะ
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จสิ้น</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              มอบหมายให้
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกคน</option>
              {users.map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ชื่องาน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ลูกค้า
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  มอบหมายให้
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  วันที่
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบรายการงาน
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.task_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-500">{task.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {task.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {task.assigned_to_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(task.task_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.task_id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">รอดำเนินการ</option>
                        <option value="in_progress">กำลังดำเนินการ</option>
                        <option value="completed">เสร็จสิ้น</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddTaskModal
          user={user}
          customers={customers}
          users={users}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function AddTaskModal({ user, customers, users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    customer_id: '',
    assigned_to: user.user_id,
    title: '',
    description: '',
    task_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    department: user.department
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">สร้างงานใหม่</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่องาน *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รายละเอียด
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ลูกค้า
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- เลือกลูกค้า (ถ้ามี) --</option>
                {customers.map((c: any) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                มอบหมายให้
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u: any) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่ *
                </label>
                <input
                  type="date"
                  value={formData.task_date}
                  onChange={(e) => setFormData({ ...formData, task_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สถานะ
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">รอดำเนินการ</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="completed">เสร็จสิ้น</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'กำลังสร้าง...' : 'สร้างงาน'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}