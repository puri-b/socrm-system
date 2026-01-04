'use client';

import { useEffect, useState } from 'react';

// --- Internal SVG Icons ---
const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  Excel: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2v7"/><path d="M12 13v7"/><path d="M16 13v7"/><path d="M8 13h8"/></svg>
  ),
  Filter: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Alert: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  )
};

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
        fetch('/api/tasks'), fetch('/api/customers'), fetch('/api/users')
      ]);
      const tasksData = await tasksRes.json();
      const customersData = await customersRes.json();
      const usersData = await usersRes.json();
      setTasks(tasksData.tasks || []);
      setCustomers(customersData.customers || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;
    if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
    if (assignedFilter !== 'all') filtered = filtered.filter(t => t.assigned_to === parseInt(assignedFilter));
    setFilteredTasks(filtered);
  };

  const isOverdue = (dateStr: string, status: string) => {
    if (status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateStr);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today;
  };

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, status: newStatus })
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusStyle = (status: string) => {
    const styles: any = {
      'pending': 'bg-slate-100 text-slate-600 border-slate-200',
      'in_progress': 'bg-blue-50 text-blue-600 border-blue-100',
      'completed': 'bg-emerald-50 text-emerald-600 border-emerald-100'
    };
    return styles[status] || 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const getStatusText = (status: string) => {
    const texts: any = { 'pending': 'รอดำเนินการ', 'in_progress': 'กำลังทำ', 'completed': 'เสร็จสิ้น' };
    return texts[status] || status;
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      
      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">รายการงาน</h1>
          <p className="text-slate-500 text-sm font-normal">
            จัดการและติดตามความคืบหน้างานทั้งหมด ({filteredTasks.length} รายการ)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm">
            <Icons.Excel /> ส่งออก Excel
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
            <Icons.Plus /> สร้างงานใหม่
          </button>
        </div>
      </header>

      {/* --- Filters --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400 px-2 border-r border-slate-100 mr-2">
          <Icons.Filter />
          <span className="text-xs font-semibold uppercase tracking-wider">ตัวกรอง</span>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้นแล้ว</option>
          </select>
          <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">ผู้รับผิดชอบทั้งหมด</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* --- Table --- */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">รายละเอียดงาน</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ลูกค้า</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ผู้รับผิดชอบ / กำหนดส่ง</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">สถานะ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">ไม่พบรายการงานที่ค้นหา</td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const overdue = isOverdue(task.task_date, task.status);
                  return (
                    <tr key={task.task_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700 text-sm">{task.title}</div>
                        <div className="text-xs text-slate-400 font-normal mt-0.5 line-clamp-1">{task.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600">{task.company_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-400">{task.assigned_to_name?.charAt(0)}</div>
                            {task.assigned_to_name}
                          </div>
                          <div className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${overdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                            <Icons.Calendar />
                            {new Date(task.task_date).toLocaleDateString('th-TH')}
                            {overdue && (
                              <span className="ml-1 bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] border border-red-100 flex items-center gap-0.5">
                                <Icons.Alert /> เกินกำหนด
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusStyle(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.task_id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:border-blue-300 outline-none transition-all cursor-pointer"
                        >
                          <option value="pending">รอดำเนินการ</option>
                          <option value="in_progress">กำลังทำ</option>
                          <option value="completed">เสร็จสิ้น</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddTaskModal
          user={user} customers={customers} users={users}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

// --- Modal ---
function AddTaskModal({ user, customers, users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    customer_id: '', assigned_to: user.user_id, title: '', description: '',
    task_date: new Date().toISOString().split('T')[0], status: 'pending', department: user.department
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) onSuccess();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[1.5rem] shadow-xl max-w-lg w-full overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-left">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800">สร้างงานใหม่</h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5">ระบุรายละเอียดงานที่ต้องการมอบหมาย</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
              <Icons.Close />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ชื่อโครงการ / หัวข้องาน *</label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="เช่น ติดตามเสนอราคา..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้รับผิดชอบ</label>
                <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: parseInt(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none">
                  {users.map((u: any) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">กำหนดส่ง</label>
                <input type="date" required value={formData.task_date} onChange={(e) => setFormData({ ...formData, task_date: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ลูกค้า</label>
              <select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none">
                <option value="">ไม่ได้ระบุลูกค้า</option>
                {customers.map((c: any) => <option key={c.customer_id} value={c.customer_id}>{c.company_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">รายละเอียด</label>
              <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none resize-none" placeholder="ข้อมูลเพิ่มเติม..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button type="submit" className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all">บันทึกงาน</button>
          </div>
        </form>
      </div>
    </div>
  );
}