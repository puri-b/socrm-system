'use client';

import { useEffect, useState } from 'react';

// --- Internal SVG Icons ---
const Icons = {
  Plus: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Excel: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2v7" />
      <path d="M12 13v7" />
      <path d="M16 13v7" />
      <path d="M8 13h8" />
    </svg>
  ),
  Filter: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Calendar: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Close: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Alert: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
};

// ✅ สถานะที่ “ปิดงาน” แล้ว ต้องล็อค dropdown (ห้ามแก้ไขต่อ)
const LOCK_STATUSES = new Set(['completed', 'cancelled']);

// ✅ สถานะที่ต้องให้ผู้ใช้ใส่หมายเหตุ/เหตุผลก่อนส่ง (แทน prompt ของ browser)
const NOTE_REQUIRED_STATUSES = new Set(['postponed']);
const NOTE_REQUEST_STATUSES = new Set(['completed', 'cancelled', 'postponed']);

function formatDateTimeTH(value: any) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // ✅ Modal ใส่หมายเหตุ/เหตุผล (แทน prompt ของ browser)
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteTaskId, setNoteTaskId] = useState<number | null>(null);
  const [noteNextStatus, setNoteNextStatus] = useState<string>('');
  const [noteText, setNoteText] = useState('');

  // ✅ Modal อนุมัติ/ไม่อนุมัติ (กรณีมีคำขอเปลี่ยนสถานะรออนุมัติ)
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalTask, setApprovalTask] = useState<any>(null);
  const [approvalDecisionNote, setApprovalDecisionNote] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // ✅ customer filter
  const [customerFilter, setCustomerFilter] = useState('all');

  // ✅ ล้างตัวกรอง
  const resetFilters = () => {
    setStatusFilter('all');
    setAssignedFilter('all');
    setCustomerFilter('all');
    setProjectFilter('all');
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, statusFilter, assignedFilter, projectFilter, customerFilter]);

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (statusFilter !== 'all') filtered = filtered.filter((t: any) => t.status === statusFilter);
    if (assignedFilter !== 'all') filtered = filtered.filter((t: any) => t.assigned_to === parseInt(assignedFilter));

    // ✅ customer filter
    if (customerFilter !== 'all') filtered = filtered.filter((t: any) => Number(t.customer_id) === Number(customerFilter));

    if (projectFilter !== 'all') {
      if (projectFilter === 'none') {
        filtered = filtered.filter((t: any) => !t.project_id);
      } else {
        filtered = filtered.filter((t: any) => Number(t.project_id) === Number(projectFilter));
      }
    }

    setFilteredTasks(filtered);
  };

  const isOverdue = (dateStr: string, status: string) => {
    if (LOCK_STATUSES.has(status)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateStr);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today;
  };

  const closeNoteModal = () => {
    setNoteOpen(false);
    setNoteSubmitting(false);
    setNoteTaskId(null);
    setNoteNextStatus('');
    setNoteText('');
  };

  const closeApprovalModal = () => {
    setApprovalOpen(false);
    setApprovalSubmitting(false);
    setApprovalTask(null);
    setApprovalDecisionNote('');
  };

  const canUserApprove = (task: any) => {
    if (!user || !task) return false;
    // ผู้อนุมัติหลัก: ผู้สร้างงาน (created_by) หรือ admin
    return user.role === 'admin' || Number(task.created_by) === Number(user.user_id);
  };

  const openApprovalModal = (task: any) => {
    if (!task?.pending_request_id) return;
    if (!canUserApprove(task)) return;
    setApprovalTask(task);
    setApprovalDecisionNote('');
    setApprovalOpen(true);
  };

  const submitApprovalDecision = async (decision: 'approved' | 'rejected') => {
    if (!approvalTask?.pending_request_id) return;
    try {
      setApprovalSubmitting(true);
      const payload: any = {
        request_id: Number(approvalTask.pending_request_id),
        decision,
      };
      if (approvalDecisionNote.trim()) payload.decision_note = approvalDecisionNote.trim();

      const res = await fetch('/api/tasks/status-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('approve/reject failed:', await res.text());
        alert('อนุมัติไม่สำเร็จ (โปรดลองใหม่)');
        setApprovalSubmitting(false);
        return;
      }

      await fetchData();
      closeApprovalModal();
    } catch (e) {
      console.error(e);
      alert('อนุมัติไม่สำเร็จ (โปรดลองใหม่)');
      setApprovalSubmitting(false);
    }
  };

  const doPatchTaskStatus = async (taskId: number, newStatus: string, note?: string) => {
    const payload: any = { task_id: taskId, status: newStatus };
    if (note && note.trim()) payload.note = note.trim();
    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      await fetchData();
      return true;
    }
    return false;
  };

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    const task = tasks.find((t: any) => Number(t.task_id) === Number(taskId));
    if (!task) return;

    // ✅ ถ้ามีคำขอรออนุมัติอยู่แล้ว ห้ามทำอะไรเพิ่ม
    if (task.pending_request_id) return;

    // ✅ ให้ผู้ถูก assign เท่านั้นที่เปลี่ยนสถานะได้ (ส่งคำขอ/อัปเดต)
    if (!user || Number(task.assigned_to) !== Number(user.user_id)) return;

    // ✅ ถ้าสถานะนี้ต้องใส่หมายเหตุ ให้เปิด modal ของระบบ
    if (NOTE_REQUEST_STATUSES.has(newStatus)) {
      setNoteTaskId(taskId);
      setNoteNextStatus(newStatus);
      setNoteText('');
      setNoteOpen(true);
      return;
    }

    try {
      await doPatchTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error(error);
    }
  };

  const submitNoteAndUpdate = async () => {
    if (!noteTaskId || !noteNextStatus) return;

    // บังคับใส่เหตุผลเฉพาะบางสถานะ
    if (NOTE_REQUIRED_STATUSES.has(noteNextStatus) && !noteText.trim()) {
      return;
    }

    try {
      setNoteSubmitting(true);
      const ok = await doPatchTaskStatus(noteTaskId, noteNextStatus, noteText);
      if (ok) closeNoteModal();
      else setNoteSubmitting(false);
    } catch (e) {
      console.error(e);
      setNoteSubmitting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const styles: any = {
      pending: 'bg-slate-100 text-slate-600 border-slate-200',
      in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
      postponed: 'bg-amber-50 text-amber-700 border-amber-200',
      not_approved: 'bg-slate-50 text-slate-500 border-slate-200'
    };
    return styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getStatusText = (status: string) => {
    const texts: any = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังทำ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      postponed: 'ขอเลื่อน',
      not_approved: 'ไม่อนุมัติ'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">งาน (Tasks)</h1>
          <p className="text-sm text-slate-500 mt-1">ติดตามงานและอัปเดตสถานะงานในทีม</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"
        >
          <Icons.Plus />
          เพิ่มงานใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Icons.Filter />
          <span className="text-sm font-semibold">ตัวกรอง</span>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังทำ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="postponed">ขอเลื่อน</option>
            <option value="cancelled">ยกเลิก</option>
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">ผู้รับผิดชอบทั้งหมด</option>
            {users.map((u: any) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name}
              </option>
            ))}
          </select>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">ลูกค้าทั้งหมด</option>
            {customers.map((c: any) => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.company_name}
              </option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">โปรเจคทั้งหมด</option>
            <option value="none">ไม่ระบุโปรเจค</option>
            {Array.from(
              new Map(
                tasks
                  .filter((t: any) => t.project_id)
                  .map((t: any) => [String(t.project_id), { project_id: t.project_id, project_name: t.project_name }])
              ).values()
            ).map((p: any) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name || `Project #${p.project_id}`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all whitespace-nowrap"
        >
          ล้างตัวกรอง
        </button>
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

                {/* ✅ NEW columns */}
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">วันที่สร้าง</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">อัปเดตล่าสุด</th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">สถานะ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">ดำเนินการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    ไม่พบงานตามตัวกรองที่เลือก
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task: any) => (
                  <tr
                    key={task.task_id}
                    onClick={() => openApprovalModal(task)}
                    className={`hover:bg-slate-50/50 transition-colors ${
                      task.pending_request_id && canUserApprove(task) ? 'cursor-pointer' : ''
                    }`}
                  >
                    {/* Details */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-800">{task.title}</div>
                        {task.description && <div className="text-xs text-slate-500 line-clamp-2">{task.description}</div>}
                        {task.project_name && (
                          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100">
                              {task.project_name}
                            </span>
                          </div>
                        )}

                        {/* pending request info */}
                        {task.pending_request_id && (
                          <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                            <div className="text-xs font-semibold">รออนุมัติการเปลี่ยนสถานะ</div>
                            <div className="text-[11px] mt-1">
                              ขอเป็น: <b>{getStatusText(task.pending_requested_status)}</b>
                              {task.pending_requested_by_name ? (
                                <>
                                  {' '}
                                  โดย <b>{task.pending_requested_by_name}</b>
                                </>
                              ) : null}
                              {task.pending_requested_at ? <> • {formatDateTimeTH(task.pending_requested_at)}</> : null}
                            </div>
                            {task.pending_note ? (
                              <div className="text-[11px] mt-1 text-amber-700 whitespace-pre-wrap">หมายเหตุ: {task.pending_note}</div>
                            ) : null}
                            {canUserApprove(task) ? (
                              <div className="text-[11px] mt-2 text-amber-800">
                                * คลิกแถวนี้เพื่อ “อนุมัติ / ไม่อนุมัติ”
                              </div>
                            ) : (
                              <div className="text-[11px] mt-2 text-amber-800">
                                * รอผู้สร้างงานทำการพิจารณา
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{task.company_name || '—'}</div>
                    </td>

                    {/* Assigned + Due */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-700">{task.assigned_to_name || '—'}</div>
                        <div
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            isOverdue(task.task_date, task.status) ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          <Icons.Calendar />
                          {formatDateTimeTH(task.task_date)}
                          {isOverdue(task.task_date, task.status) && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                              <Icons.Alert />
                              เกินกำหนด
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ✅ Created at */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{formatDateTimeTH(task.created_at)}</div>
                    </td>

                    {/* ✅ Updated at */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{formatDateTimeTH(task.updated_at)}</div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusStyle(
                            task.status
                          )}`}
                        >
                          {getStatusText(task.status)}
                        </span>

                        {task.pending_request_id && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-100">
                            รออนุมัติ
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <select
                        value={task.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateTaskStatus(task.task_id, e.target.value)}
                        disabled={
                          LOCK_STATUSES.has(task.status) ||
                          !!task.pending_request_id ||
                          !user ||
                          Number(task.assigned_to) !== Number(user.user_id)
                        }
                        className={`bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 outline-none transition-all ${
                          LOCK_STATUSES.has(task.status) ||
                          !!task.pending_request_id ||
                          !user ||
                          Number(task.assigned_to) !== Number(user.user_id)
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:border-blue-300 cursor-pointer'
                        }`}
                      >
                        <option value="pending">รอดำเนินการ</option>
                        <option value="in_progress">กำลังทำ</option>
                        <option value="completed">เสร็จสิ้น (ขออนุมัติ)</option>
                        <option value="postponed">ขอเลื่อน (ขออนุมัติ)</option>
                        <option value="cancelled">ยกเลิก (ขออนุมัติ)</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {noteOpen && (
        <NoteModal
          title={
            noteNextStatus === 'completed'
              ? 'เสร็จสิ้น (ขออนุมัติ)'
              : noteNextStatus === 'cancelled'
              ? 'ยกเลิก (ขออนุมัติ)'
              : noteNextStatus === 'postponed'
              ? 'ขอเลื่อน (ขออนุมัติ)'
              : 'ใส่หมายเหตุ'
          }
          required={NOTE_REQUIRED_STATUSES.has(noteNextStatus)}
          value={noteText}
          onChange={setNoteText}
          submitting={noteSubmitting}
          onClose={closeNoteModal}
          onSubmit={submitNoteAndUpdate}
        />
      )}

      {approvalOpen && approvalTask && (
        <ApprovalModal
          task={approvalTask}
          decisionNote={approvalDecisionNote}
          setDecisionNote={setApprovalDecisionNote}
          submitting={approvalSubmitting}
          onClose={closeApprovalModal}
          onApprove={() => submitApprovalDecision('approved')}
          onReject={() => submitApprovalDecision('rejected')}
        />
      )}

      {showAddModal && (
        <AddTaskModal user={user} customers={customers} users={users} onClose={() => setShowAddModal(false)} onSuccess={fetchData} />
      )}
    </div>
  );
}

// --- Modal: Note / Reason ---
function NoteModal({ title, required, value, onChange, submitting, onClose, onSubmit }: any) {
  const canSubmit = !submitting && (!required || (required && String(value || '').trim().length > 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {required ? 'กรุณาระบุเหตุผลในการดำเนินการ' : 'กรุณาระบุหมายเหตุเพิ่มเติม (ถ้ามี)'}
            </p>
          </div>
          <button
            onClick={submitting ? undefined : onClose}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition"
            aria-label="close"
          >
            <Icons.Close />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="text-xs font-semibold text-slate-600">หมายเหตุ</label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={required ? 'กรุณาระบุเหตุผล...' : 'พิมพ์หมายเหตุเพิ่มเติม (ถ้ามี)...'}
            disabled={submitting}
          />
          {required && !String(value || '').trim() && (
            <p className="mt-2 text-xs text-rose-600">* จำเป็นต้องระบุเหตุผล</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={submitting ? undefined : onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={canSubmit ? onSubmit : undefined}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md shadow-blue-100"
          >
            {submitting ? 'กำลังส่ง...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modal: Approve / Reject (Status Request) ---
function ApprovalModal({ task, decisionNote, setDecisionNote, submitting, onClose, onApprove, onReject }: any) {
  const requestedStatusText =
    task.pending_requested_status === 'completed'
      ? 'เสร็จสิ้น'
      : task.pending_requested_status === 'cancelled'
      ? 'ยกเลิก'
      : task.pending_requested_status === 'postponed'
      ? 'ขอเลื่อน'
      : task.pending_requested_status || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <div className="text-sm font-semibold text-slate-700">พิจารณาคำขอเปลี่ยนสถานะ</div>
            <div className="text-xs text-slate-500 mt-1">
              งาน: <span className="font-semibold text-slate-700">{task.title}</span>
            </div>
          </div>

          <button
            onClick={submitting ? undefined : onClose}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition"
            aria-label="close"
          >
            <Icons.Close />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-xs font-semibold text-slate-500">ขอเปลี่ยนเป็น</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{requestedStatusText}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-xs font-semibold text-slate-500">ผู้ขอ</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{task.pending_requested_by_name || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-1">{formatDateTimeTH(task.pending_requested_at)}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <div className="text-xs font-semibold text-slate-600">หมายเหตุจากผู้ขอ</div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{task.pending_note || '—'}</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">หมายเหตุผู้อนุมัติ (ไม่บังคับ)</label>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              rows={3}
              className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="พิมพ์หมายเหตุเพิ่มเติม..."
              disabled={submitting}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={submitting ? undefined : onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            ไม่อนุมัติ
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md shadow-emerald-100"
          >
            อนุมัติ
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ----------------------------
 * AddTaskModal (ของเดิมคุณ)
 * ----------------------------
 * หมายเหตุ: ส่วนนี้ผม “คงโครง UI/ฟีเจอร์ของคุณไว้” (มีปุ่มสร้างโปรเจคใหม่, และ project dropdown เลือกได้เฉพาะลูกค้าที่เลือก)
 */
function AddTaskModal({ user, customers, users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState<any>({
    customer_id: '',
    project_id: '',
    assigned_to: users?.[0]?.user_id ? String(users[0].user_id) : '',
    task_date: new Date().toISOString().slice(0, 10),
    title: '',
    description: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // --- Projects loading by customer ---
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // --- Create Project modal inside AddTaskModal ---
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectForm, setProjectForm] = useState<any>({
    project_name: '',
    project_type: '',
    description: ''
  });
  const [projectError, setProjectError] = useState<string>('');

  useEffect(() => {
    const loadProjects = async () => {
      if (!formData.customer_id) {
        setProjects([]);
        setFormData((prev: any) => ({ ...prev, project_id: '' }));
        return;
      }

      try {
        setProjectsLoading(true);
        const res = await fetch(`/api/projects?customer_id=${formData.customer_id}`);
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (e) {
        console.error(e);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.customer_id]);

  const createProject = async () => {
    if (!formData.customer_id) return;
    if (!projectForm.project_name.trim()) {
      setProjectError('กรุณาระบุชื่อโปรเจค');
      return;
    }

    try {
      setProjectError('');
      setCreatingProject(true);

      const payload = {
        customer_id: Number(formData.customer_id),
        project_name: projectForm.project_name.trim(),
        project_type: projectForm.project_type?.trim() || null,
        description: projectForm.description?.trim() || null,
        department: user?.department || null
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setProjectError(data?.error || 'สร้างโปรเจคไม่สำเร็จ');
        setCreatingProject(false);
        return;
      }

      // refresh projects list
      const listRes = await fetch(`/api/projects?customer_id=${formData.customer_id}`);
      const listData = await listRes.json();
      setProjects(listData.projects || []);

      // auto-select created project
      const createdId = data?.project?.project_id;
      if (createdId) {
        setFormData((prev: any) => ({ ...prev, project_id: String(createdId) }));
      }

      setShowCreateProject(false);
      setProjectForm({ project_name: '', project_type: '', description: '' });
    } catch (e) {
      console.error(e);
      setProjectError('สร้างโปรเจคไม่สำเร็จ');
    } finally {
      setCreatingProject(false);
    }
  };

  const createTask = async (e: any) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      setSubmitting(true);

      const payload: any = {
        ...formData,
        customer_id: formData.customer_id ? Number(formData.customer_id) : null,
        project_id: formData.project_id ? Number(formData.project_id) : null,
        assigned_to: Number(formData.assigned_to)
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await onSuccess();
        onClose();
        return;
      }

      console.error('Create task failed:', await res.text());
      alert('สร้างงานไม่สำเร็จ');
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      alert('สร้างงานไม่สำเร็จ');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-3xl bg-white rounded-[1.75rem] border border-slate-100 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">เพิ่มงานใหม่</h2>
            <p className="text-xs text-slate-500 mt-0.5">สร้างงานและกำหนดผู้รับผิดชอบ</p>
          </div>
          <button
            onClick={submitting ? undefined : onClose}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition"
          >
            <Icons.Close />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={createTask} className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div>
              <label className="text-xs font-semibold text-slate-600">ลูกค้า (ไม่บังคับ)</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, customer_id: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ไม่ระบุลูกค้า</option>
                {customers.map((c: any) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">โปรเจค (ไม่บังคับ)</label>
                <button
                  type="button"
                  disabled={!formData.customer_id}
                  onClick={() => setShowCreateProject(true)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                    formData.customer_id
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  + สร้างโปรเจคใหม่
                </button>
              </div>

              <select
                value={formData.project_id}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, project_id: e.target.value }))}
                disabled={!formData.customer_id}
                className={`mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !formData.customer_id ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <option value="">
                  {!formData.customer_id ? 'โปรดเลือกลูกค้าก่อน' : projectsLoading ? 'กำลังโหลดโปรเจค...' : 'ไม่ระบุโปรเจค'}
                </option>
                {projects.map((p: any) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
              {formData.customer_id && !projectsLoading && projects.length === 0 && (
                <p className="mt-2 text-xs text-slate-400">ลูกค้ารายนี้ยังไม่มีโปรเจค</p>
              )}
            </div>

            {/* Assigned to */}
            <div>
              <label className="text-xs font-semibold text-slate-600">ผู้รับผิดชอบ</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, assigned_to: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u: any) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task date */}
            <div>
              <label className="text-xs font-semibold text-slate-600">กำหนดส่ง</label>
              <input
                type="date"
                value={formData.task_date}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, task_date: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-600">หัวข้องาน</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, title: e.target.value }))}
              required
              className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="เช่น ติดต่อลูกค้า / ส่งใบเสนอราคา / นัดประชุม"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600">รายละเอียด</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="อธิบายรายละเอียดเพิ่มเติม (ถ้ามี)"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md shadow-blue-100"
            >
              {submitting ? 'กำลังสร้าง...' : 'สร้างงาน'}
            </button>
          </div>
        </form>

        {/* Create Project modal inside AddTaskModal */}
        {showCreateProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowCreateProject(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div>
                  <h3 className="text-base font-bold text-slate-800">สร้างโปรเจคใหม่</h3>
                  <p className="text-xs text-slate-500 mt-0.5">โปรเจคจะถูกผูกกับลูกค้าที่เลือก</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition"
                >
                  <Icons.Close />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {projectError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">
                    {projectError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-600">ชื่อโปรเจค</label>
                  <input
                    value={projectForm.project_name}
                    onChange={(e) => setProjectForm((p: any) => ({ ...p, project_name: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น เช่ารถกองพิธี / Call Center / บริหาร Mail Room"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">ประเภท (ไม่บังคับ)</label>
                  <input
                    value={projectForm.project_type}
                    onChange={(e) => setProjectForm((p: any) => ({ ...p, project_type: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น Bidding / จัดซื้อจัดจ้างพิเศษ / เสนอราคาปกติ"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">รายละเอียด (ไม่บังคับ)</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm((p: any) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="รายละเอียดโปรเจค (ถ้ามี)"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={createProject}
                  disabled={creatingProject || !projectForm.project_name.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md shadow-blue-100"
                >
                  {creatingProject ? 'กำลังสร้าง...' : 'สร้างโปรเจค'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
