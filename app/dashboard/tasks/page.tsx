'use client';

import { useEffect, useMemo, useState } from 'react';

const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Alert: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Folder: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  ),
  List: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
};

const LOCK_STATUSES = new Set(['completed', 'cancelled']);
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
    minute: '2-digit',
  });
}

function formatDateTH(value: any) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function normalizeAssignees(task: any) {
  if (Array.isArray(task?.assignees) && task.assignees.length > 0) {
    return task.assignees.filter((a: any) => a && a.user_id);
  }

  if (task?.assigned_to) {
    return [
      {
        user_id: task.assigned_to,
        name: task.assigned_to_name || '—',
      },
    ];
  }

  return [];
}

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteTaskId, setNoteTaskId] = useState<number | null>(null);
  const [noteNextStatus, setNoteNextStatus] = useState<string>('');
  const [noteText, setNoteText] = useState('');

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalTask, setApprovalTask] = useState<any>(null);
  const [approvalDecisionNote, setApprovalDecisionNote] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  const resetFilters = () => {
    setStatusFilter('all');
    setCustomerFilter('all');
    setProjectFilter('all');
    setAssignedFilter('all');
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, customersRes, usersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/customers'),
        fetch('/api/users'),
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

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t: any) => t.status === statusFilter);
    }

    if (customerFilter !== 'all') {
      filtered = filtered.filter((t: any) => Number(t.customer_id) === Number(customerFilter));
    }

    if (projectFilter !== 'all') {
      if (projectFilter === 'none') {
        filtered = filtered.filter((t: any) => !t.project_id);
      } else {
        filtered = filtered.filter((t: any) => Number(t.project_id) === Number(projectFilter));
      }
    }

    if (assignedFilter !== 'all') {
      filtered = filtered.filter((t: any) => {
        const assignees = normalizeAssignees(t);
        return assignees.some((a: any) => Number(a.user_id) === Number(assignedFilter));
      });
    }

    return filtered;
  }, [tasks, statusFilter, customerFilter, projectFilter, assignedFilter]);

  const groupedCards = useMemo(() => {
    const map = new Map<string, any>();

    for (const task of filteredTasks) {
      const key = task.project_id ? `project-${task.project_id}` : `general-${task.customer_id || 'none'}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          project_id: task.project_id || null,
          project_name: task.project_name || 'งานทั่วไป',
          project_type: task.project_type || null,
          customer_id: task.customer_id || null,
          company_name: task.company_name || '—',
          tasks: [],
        });
      }

      map.get(key).tasks.push(task);
    }

    const groups = Array.from(map.values()).map((group: any) => {
      const totalTasks = group.tasks.length;
      const completedTasks = group.tasks.filter((t: any) => t.status === 'completed').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const assigneeMap = new Map<number, any>();
      group.tasks.forEach((task: any) => {
        normalizeAssignees(task).forEach((a: any) => {
          assigneeMap.set(Number(a.user_id), a);
        });
      });

      return {
        ...group,
        totalTasks,
        completedTasks,
        progress,
        assignees: Array.from(assigneeMap.values()),
      };
    });

    groups.sort((a: any, b: any) => {
      const aMax = Math.max(...a.tasks.map((t: any) => new Date(t.created_at || 0).getTime()));
      const bMax = Math.max(...b.tasks.map((t: any) => new Date(t.created_at || 0).getTime()));
      return bMax - aMax;
    });

    return groups;
  }, [filteredTasks]);

  const isOverdue = (dateStr: string, status: string) => {
    if (!dateStr || LOCK_STATUSES.has(status)) return false;
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

      if (approvalDecisionNote.trim()) {
        payload.decision_note = approvalDecisionNote.trim();
      }

      const res = await fetch('/api/tasks/status-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(await res.text());
        alert('อนุมัติไม่สำเร็จ');
        setApprovalSubmitting(false);
        return;
      }

      await fetchData();
      closeApprovalModal();
    } catch (e) {
      console.error(e);
      alert('อนุมัติไม่สำเร็จ');
      setApprovalSubmitting(false);
    }
  };

  const doPatchTaskStatus = async (taskId: number, newStatus: string, note?: string) => {
    const payload: any = { task_id: taskId, status: newStatus };
    if (note && note.trim()) payload.note = note.trim();

    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

    if (task.pending_request_id) return;

    // ยังใช้ assigned_to หลักตาม backend เดิม
    if (!user || Number(task.assigned_to) !== Number(user.user_id)) return;

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
      not_approved: 'bg-slate-50 text-slate-500 border-slate-200',
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
      not_approved: 'ไม่อนุมัติ',
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">งาน (Tasks)</h1>
          <p className="text-sm text-slate-500 mt-1">แสดงผลแบบการ์ดตามโปรเจค พร้อม milestone และความคืบหน้า</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"
        >
          <Icons.Plus />
          เพิ่มงานใหม่
        </button>
      </div>

      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">โปรเจคทั้งหมด</option>
            <option value="none">ไม่มีโปรเจค</option>
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

          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {groupedCards.length === 0 ? (
          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-10 text-center text-sm text-slate-400">
            ไม่พบข้อมูลตามตัวกรองที่เลือก
          </div>
        ) : (
          groupedCards.map((group: any) => (
            <div key={group.key} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-blue-100 bg-gradient-to-r from-blue-100 to-white">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      {group.project_id ? <Icons.Folder /> : <Icons.List />}
                      <h2 className="text-lg font-bold text-slate-800">
                        {group.project_id ? group.project_name : 'งานทั่วไป'}
                      </h2>
                      {group.project_type && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {group.project_type}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">{group.company_name}</span>
                      <span>•</span>
                      <span>{group.totalTasks} งาน</span>
                      <span>•</span>
                      <span>สำเร็จแล้ว {group.completedTasks} งาน</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.assignees.length > 0 ? (
                        group.assignees.map((a: any) => (
                          <span
                            key={a.user_id}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
                          >
                            {a.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">ยังไม่มีผู้รับผิดชอบ</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full xl:w-[360px] xl:min-w-[360px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">Progress</span>
                      <span className="text-sm font-bold text-slate-800">{group.progress}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${group.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {group.tasks.map((task: any) => {
                  const assignees = normalizeAssignees(task);
                  const canApprove = task.pending_request_id && canUserApprove(task);
                  const canChangeStatus =
                    !LOCK_STATUSES.has(task.status) &&
                    !task.pending_request_id &&
                    !!user &&
                    Number(task.assigned_to) === Number(user.user_id);

                  return (
                    <div
                      key={task.task_id}
                      onClick={() => canApprove && openApprovalModal(task)}
                      className={`p-5 transition ${
                        canApprove ? 'cursor-pointer hover:bg-amber-50/50' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="pt-1">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'bg-white border-slate-300 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                          </div>

                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-sm font-bold ${
                                  task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'
                                }`}
                              >
                                {task.title}
                              </h3>

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

                            {task.description && (
                              <p className="text-sm text-slate-500 whitespace-pre-wrap">{task.description}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Icons.Calendar />
                                กำหนดส่ง: {formatDateTH(task.task_date)}
                              </span>

                              {isOverdue(task.task_date, task.status) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                                  <Icons.Alert />
                                  เกินกำหนด
                                </span>
                              )}

                              <span>สร้างเมื่อ: {formatDateTimeTH(task.created_at)}</span>
                              <span>อัปเดตล่าสุด: {formatDateTimeTH(task.updated_at)}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
  {assignees.length > 0 ? (
    assignees.map((a: any) => {
      const isPrimary =
        Number(a.user_id) === Number(task.assigned_to);

      return (
        <span
          key={a.user_id}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
            isPrimary
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {isPrimary && '• '}
          {a.name}
          {isPrimary && ' (ผู้รับผิดชอบหลัก)'}
        </span>
      );
    })
  ) : (
    <span className="text-xs text-slate-400">ยังไม่มีผู้รับผิดชอบ</span>
  )}
</div>

                            {task.pending_request_id && (
                              <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                                <div className="text-xs font-semibold">รออนุมัติการเปลี่ยนสถานะ</div>
                                <div className="text-[11px] mt-1">
                                  ขอเป็น <b>{getStatusText(task.pending_requested_status)}</b>
                                  {task.pending_requested_by_name ? (
                                    <>
                                      {' '}
                                      โดย <b>{task.pending_requested_by_name}</b>
                                    </>
                                  ) : null}
                                  {task.pending_requested_at ? <> • {formatDateTimeTH(task.pending_requested_at)}</> : null}
                                </div>
                                {task.pending_note ? (
                                  <div className="text-[11px] mt-1 whitespace-pre-wrap">หมายเหตุ: {task.pending_note}</div>
                                ) : null}
                                {canApprove ? (
                                  <div className="text-[11px] mt-2">* คลิกการ์ดงานนี้เพื่ออนุมัติ / ไม่อนุมัติ</div>
                                ) : (
                                  <div className="text-[11px] mt-2">* รอผู้สร้างงานทำการพิจารณา</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-full xl:w-[220px] xl:min-w-[220px]">
                          <select
                            value={task.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateTaskStatus(task.task_id, e.target.value)}
                            disabled={!canChangeStatus}
                            className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 outline-none transition ${
                              canChangeStatus ? 'hover:border-blue-300 cursor-pointer' : 'opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <option value="pending">รอดำเนินการ</option>
                            <option value="in_progress">กำลังทำ</option>
                            <option value="completed">เสร็จสิ้น (ขออนุมัติ)</option>
                            <option value="postponed">ขอเลื่อน (ขออนุมัติ)</option>
                            <option value="cancelled">ยกเลิก (ขออนุมัติ)</option>
                          </select>
                          <p className="text-[11px] text-slate-400 mt-2">
                            เปลี่ยนสถานะได้เฉพาะผู้รับผิดชอบหลักของงาน
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
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
        <AddTaskModal
          user={user}
          customers={customers}
          users={users}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

function NoteModal({ title, required, value, onChange, submitting, onClose, onSubmit }: any) {
  const canSubmit = !submitting && (!required || String(value || '').trim().length > 0);

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
          {required && !String(value || '').trim() && <p className="mt-2 text-xs text-rose-600">* จำเป็นต้องระบุเหตุผล</p>}
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
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'กำลังส่ง...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            อนุมัติ
          </button>
        </div>
      </div>
    </div>
  );
}


function MultiUserSelect({
  users,
  value,
  onChange,
  placeholder = 'เลือกผู้ช่วย / ผู้รับผิดชอบร่วม',
}: {
  users: any[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedUsers = users.filter((u: any) => value.includes(String(u.user_id)));

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-2 w-full min-h-[52px] px-4 py-3 rounded-2xl bg-white border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <div className="flex flex-wrap gap-2 text-left">
          {selectedUsers.length > 0 ? (
            selectedUsers.map((u: any) => (
              <span
                key={u.user_id}
                className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                {u.full_name}
              </span>
            ))
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <svg
          className={`w-4 h-4 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl max-h-64 overflow-auto p-2">
            {users.length > 0 ? (
              users.map((u: any) => {
                const checked = value.includes(String(u.user_id));

                return (
                  <label
                    key={u.user_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(String(u.user_id))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{u.full_name}</span>
                  </label>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-slate-400">ไม่พบผู้ใช้งาน</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AddTaskModal({ user, customers, users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState<any>({
    customer_id: '',
    project_id: '',
  });

  const [taskItems, setTaskItems] = useState<any[]>([
    {
      id: Date.now(),
      title: '',
      description: '',
      task_date: new Date().toISOString().slice(0, 10),
      assigned_to: users?.[0]?.user_id ? String(users[0].user_id) : '',
      assignees: users?.[0]?.user_id ? [String(users[0].user_id)] : [],
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [projectForm, setProjectForm] = useState<any>({
    project_name: '',
    project_type: '',
    description: '',
  });

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
  }, [formData.customer_id]);

  const updateTaskItem = (id: number, field: string, value: any) => {
    setTaskItems((prev: any[]) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === 'assignees') {
          const nextAssignees = Array.isArray(value) ? value : [];
          return {
            ...item,
            assignees: nextAssignees,
            assigned_to: nextAssignees[0] || '',
          };
        }

        if (field === 'assigned_to') {
          const currentAssignees = Array.isArray(item.assignees) ? item.assignees : [];
          const merged = value
            ? Array.from(new Set([String(value), ...currentAssignees.map((x: any) => String(x))]))
            : currentAssignees;
          return {
            ...item,
            assigned_to: value,
            assignees: merged,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const addTaskRow = () => {
    setTaskItems((prev: any[]) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: '',
        description: '',
        task_date: new Date().toISOString().slice(0, 10),
        assigned_to: users?.[0]?.user_id ? String(users[0].user_id) : '',
        assignees: users?.[0]?.user_id ? [String(users[0].user_id)] : [],
      },
    ]);
  };

  const removeTaskRow = (id: number) => {
    if (taskItems.length <= 1) return;
    setTaskItems((prev: any[]) => prev.filter((item) => item.id !== id));
  };

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
        department: user?.department || null,
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setProjectError(data?.error || 'สร้างโปรเจคไม่สำเร็จ');
        setCreatingProject(false);
        return;
      }

      const listRes = await fetch(`/api/projects?customer_id=${formData.customer_id}`);
      const listData = await listRes.json();
      setProjects(listData.projects || []);

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

  const createTasks = async (e: any) => {
    e.preventDefault();

    if (!taskItems.some((item) => item.title.trim())) {
      alert('กรุณาระบุหัวข้องานอย่างน้อย 1 งาน');
      return;
    }

    try {
      setSubmitting(true);

      for (const item of taskItems) {
        if (!item.title.trim()) continue;

        const payload: any = {
          customer_id: formData.customer_id ? Number(formData.customer_id) : null,
          project_id: formData.project_id ? Number(formData.project_id) : null,
          title: item.title.trim(),
          description: item.description?.trim() || null,
          task_date: item.task_date || null,
          assigned_to: item.assigned_to ? Number(item.assigned_to) : null,
          assignees: Array.isArray(item.assignees) ? item.assignees.map((x: any) => Number(x)) : [],
        };

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.error(await res.text());
          alert(`สร้างงานไม่สำเร็จ: ${item.title}`);
          setSubmitting(false);
          return;
        }
      }

      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('สร้างงานไม่สำเร็จ');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-6xl bg-white rounded-[1.75rem] border border-slate-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">เพิ่มงานใหม่</h2>
            <p className="text-xs text-slate-500 mt-0.5">สร้างหลาย task ในครั้งเดียว พร้อมกำหนดผู้รับผิดชอบหลายคน</p>
          </div>
          <button
            onClick={submitting ? undefined : onClose}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition"
          >
            <Icons.Close />
          </button>x
        </div>

        <form onSubmit={createTasks} className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">ลูกค้า</label>
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

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">โปรเจค</label>
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
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">รายการ Task</h3>
                <p className="text-xs text-slate-500">เพิ่มหลายงานเพื่อใช้เป็น milestone ของโปรเจคได้</p>
              </div>
              <button
                type="button"
                onClick={addTaskRow}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Icons.Plus />
                เพิ่ม Task
              </button>
            </div>

            <div className="space-y-4">
              {taskItems.map((item: any, index: number) => (
                <div key={item.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/60 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800">Task {index + 1}</div>
                    {taskItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTaskRow(item.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                      >
                        ลบ
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-600">หัวข้องาน</label>
                      <input
                        value={item.title}
                        onChange={(e) => updateTaskItem(item.id, 'title', e.target.value)}
                        className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="เช่น ส่งใบเสนอราคา / นัดประชุม / จัดเตรียมเอกสาร"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600">ผู้รับผิดชอบหลัก</label>
                      <select
                        value={item.assigned_to}
                        onChange={(e) => updateTaskItem(item.id, 'assigned_to', e.target.value)}
                        className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">เลือกผู้รับผิดชอบหลัก</option>
                        {users.map((u: any) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600">กำหนดส่ง</label>
                      <input
                        type="date"
                        value={item.task_date}
                        onChange={(e) => updateTaskItem(item.id, 'task_date', e.target.value)}
                        className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-600">ผู้ช่วย / ผู้รับผิดชอบร่วม</label>

                      <MultiUserSelect
                        users={users}
                        value={item.assignees}
                        onChange={(selectedValues) => updateTaskItem(item.id, 'assignees', selectedValues)}
                        placeholder="เลือกผู้ช่วย / ผู้รับผิดชอบร่วม"
                      />

                      <p className="mt-2 text-xs text-slate-400">
                        เลือกได้หลายคน โดยไม่ต้องกด Ctrl/Command
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-600">รายละเอียด</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateTaskItem(item.id, 'description', e.target.value)}
                        rows={3}
                        className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2 sticky bottom-0">
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
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'กำลังสร้าง...' : 'บันทึกทั้งหมด'}
            </button>
          </div>
        </form>

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
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">{projectError}</div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-600">ชื่อโปรเจค</label>
                  <input
                    value={projectForm.project_name}
                    onChange={(e) => setProjectForm((p: any) => ({ ...p, project_name: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น OCR Implementation / Mail Room Setup"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">ประเภท (ไม่บังคับ)</label>
                  <input
                    value={projectForm.project_type}
                    onChange={(e) => setProjectForm((p: any) => ({ ...p, project_type: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น New Project / Renewal / Presale"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">รายละเอียด (ไม่บังคับ)</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm((p: any) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="รายละเอียดโปรเจค"
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
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
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