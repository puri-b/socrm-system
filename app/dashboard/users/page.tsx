'use client';

import { useEffect, useMemo, useState } from 'react';

// -----------------------------
// Internal SVG Icons (no extra libs)
// -----------------------------
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
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Search: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Shield: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

type User = {
  user_id: number;
  email: string;
  full_name: string;
  department: string;
  role: 'admin' | 'manager' | 'user';
  is_active?: boolean;
  created_at?: string;
};

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);

  // filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  const DEPARTMENTS = useMemo(() => ['LBD', 'LBA', 'CR', 'LM', 'DS', 'SN'], []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setCurrentUser(u);

      // หน้า users ให้ manager/admin เข้าเท่านั้น (เหมือนเดิม)
      if (u.role !== 'manager' && u.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }

      fetchUsers();
    } else {
      // ถ้าไม่มี user ใน localStorage ให้กลับ dashboard/login ตาม flow ของระบบคุณ
      window.location.href = '/dashboard';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, deptFilter, roleFilter, activeFilter]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      const list: User[] = data?.users || [];
      setUsers(list);
      setFilteredUsers(list);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let arr = [...users];

    if (deptFilter !== 'all') arr = arr.filter((u) => u.department === deptFilter);
    if (roleFilter !== 'all') arr = arr.filter((u) => u.role === roleFilter);

    if (activeFilter !== 'all') {
      const isActive = activeFilter === 'active';
      arr = arr.filter((u) => !!u.is_active === isActive);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      arr = arr.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
      );
    }

    setFilteredUsers(arr);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-50 text-red-700 border-red-100',
      manager: 'bg-purple-50 text-purple-700 border-purple-100',
      user: 'bg-blue-50 text-blue-700 border-blue-100',
    };
    return colors[role] || 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const getRoleText = (role: string) => {
    const texts: Record<string, string> = {
      admin: 'ผู้ดูแลระบบ',
      manager: 'ผู้จัดการ',
      user: 'พนักงาน',
    };
    return texts[role] || role;
  };

  const getDeptBadge = (dept: string) => {
    return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  };

  const getActiveDot = (isActive?: boolean) => {
    if (isActive) return { dot: 'text-emerald-500', text: 'ใช้งาน', textColor: 'text-emerald-600' };
    return { dot: 'text-red-500', text: 'ระงับ', textColor: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      {/* -----------------------------
          Header
      ----------------------------- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">จัดการผู้ใช้งาน</h1>
          <p className="text-slate-500 text-sm font-normal">
            เพิ่มและจัดการผู้ใช้ในระบบ ({filteredUsers.length} รายการ)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
        >
          <Icons.Plus /> เพิ่มผู้ใช้ใหม่
        </button>
      </header>

      {/* -----------------------------
          Info / Permission Card
      ----------------------------- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <span className="text-slate-400">
            <Icons.Shield />
          </span>
          <div className="text-xs font-semibold uppercase tracking-wider">สิทธิ์การใช้งาน</div>
        </div>

        {currentUser?.role === 'admin' ? (
          <ul className="text-sm text-slate-600 space-y-1">
            <li>✓ Admin สามารถสร้างผู้ใช้ทุกระดับ (User, Manager, Admin) ได้</li>
            <li>✓ Admin สามารถเห็นผู้ใช้ทุกแผนกได้</li>
          </ul>
        ) : (
          <ul className="text-sm text-slate-600 space-y-1">
            <li>✓ Manager สามารถสร้างผู้ใช้ระดับ User ในแผนกของตนเองเท่านั้น</li>
            <li>✓ Manager เห็นเฉพาะผู้ใช้ในแผนกเดียวกัน</li>
          </ul>
        )}
      </div>

      {/* -----------------------------
          Filters
      ----------------------------- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Icons.Filter />
          <span className="text-xs font-semibold uppercase tracking-wider">ตัวกรอง</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icons.Search />
            </div>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ / อีเมล / แผนก..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Department */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">ทุกแผนก</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Role */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">ทุกระดับสิทธิ์</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>

          {/* Active */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ระงับ</option>
          </select>

          {/* Clear */}
          <button
            onClick={() => {
              setSearchTerm('');
              setDeptFilter('all');
              setRoleFilter('all');
              setActiveFilter('all');
            }}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all lg:col-span-4"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {/* -----------------------------
          Table
      ----------------------------- */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ชื่อ-สกุล</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">อีเมล</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">แผนก</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">สิทธิ์</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">สถานะ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    ไม่พบผู้ใช้งาน
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const active = getActiveDot(u.is_active);
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 text-sm">{u.full_name}</div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">{u.email}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getDeptBadge(
                            u.department
                          )}`}
                        >
                          {u.department}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getRoleBadgeColor(
                            u.role
                          )}`}
                        >
                          {getRoleText(u.role)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${active.textColor}`}>
                          <span className={`text-lg leading-none ${active.dot}`}>●</span>
                          <span className="text-slate-600 font-medium">{active.text}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -----------------------------
          Add User Modal
      ----------------------------- */}
      {showAddModal && (
        <AddUserModal
          currentUser={currentUser}
          departments={DEPARTMENTS}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// -----------------------------
// Add User Modal (UI updated to match Tasks style)
// -----------------------------
function AddUserModal({
  currentUser,
  departments,
  onClose,
  onSuccess,
}: {
  currentUser: any;
  departments: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isAdmin = currentUser?.role === 'admin';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    department: isAdmin ? '' : currentUser?.department,
    role: 'user',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canCreateManagerOrAdmin = isAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name.trim()) {
      setError('กรุณากรอกชื่อ-สกุล');
      return;
    }
    if (!formData.email.trim()) {
      setError('กรุณากรอกอีเมล');
      return;
    }
    if (formData.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    // Manager: role บังคับ user
    if (!canCreateManagerOrAdmin && formData.role !== 'user') {
      setError('Manager สามารถสร้างได้เฉพาะ User');
      return;
    }

    // Manager: dept บังคับของตัวเอง
    if (!isAdmin && formData.department !== currentUser?.department) {
      setError('Manager สามารถสร้างได้เฉพาะแผนกของตนเอง');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          department: formData.department,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (response.ok) onSuccess();
      else setError(data?.error || 'เกิดข้อผิดพลาด');
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[1.5rem] shadow-xl max-w-lg w-full overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-left">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800">เพิ่มผู้ใช้ใหม่</h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5">สร้างบัญชีเพื่อใช้งานในระบบ</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
              <Icons.Close />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          <div className="space-y-4">
            <Field label="ชื่อ-สกุล *">
              <input
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น ทนงทวย คงควรคอย"
              />
            </Field>

            <Field label="อีเมล *">
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@company.com"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="รหัสผ่าน *">
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="ยืนยันรหัสผ่าน *">
                <input
                  required
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>

            <Field label="แผนก *">
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={!isAdmin}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 ${
                  isAdmin
                    ? 'bg-slate-50 border-none text-slate-700'
                    : 'bg-slate-100 border-none text-slate-500 cursor-not-allowed'
                }`}
              >
                <option value="">เลือกแผนก</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {!isAdmin && <p className="text-xs text-slate-400 mt-1 ml-1">Manager สร้างได้เฉพาะแผนกของตนเอง</p>}
            </Field>

            <Field label="สิทธิ์ผู้ใช้">
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                disabled={!canCreateManagerOrAdmin}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 ${
                  canCreateManagerOrAdmin
                    ? 'bg-slate-50 border-none text-slate-700'
                    : 'bg-slate-100 border-none text-slate-500 cursor-not-allowed'
                }`}
              >
                <option value="user">User</option>
                {canCreateManagerOrAdmin && <option value="manager">Manager</option>}
                {canCreateManagerOrAdmin && <option value="admin">Admin</option>}
              </select>
              {!canCreateManagerOrAdmin && (
                <p className="text-xs text-slate-400 mt-1 ml-1">Manager สามารถสร้างได้เฉพาะ User</p>
              )}
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-all"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all disabled:bg-slate-300"
            >
              {loading ? 'กำลังบันทึก...' : 'สร้างผู้ใช้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">{label}</label>
      {children}
    </div>
  );
}
