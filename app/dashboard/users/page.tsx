'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      
      if (user.role !== 'manager' && user.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }
      
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: any = {
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-purple-100 text-purple-800',
      'user': 'bg-blue-100 text-blue-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleText = (role: string) => {
    const texts: any = {
      'admin': 'ผู้ดูแลระบบ',
      'manager': 'ผู้จัดการ',
      'user': 'พนักงาน'
    };
    return texts[role] || role;
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h2>
          <p className="text-gray-600">เพิ่มและจัดการผู้ใช้ในระบบ</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>➕</span>
          <span>เพิ่มผู้ใช้ใหม่</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ สิทธิ์การใช้งาน</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          {currentUser?.role === 'admin' && (
            <>
              <li>✓ Admin สามารถสร้างผู้ใช้ทุกระดับ (User, Manager, Admin) ได้</li>
              <li>✓ Admin สามารถเห็นผู้ใช้ทุกแผนกได้</li>
            </>
          )}
          {currentUser?.role === 'manager' && (
            <>
              <li>✓ Manager สามารถสร้างผู้ใช้ระดับ User ในแผนกของตนเองเท่านั้น</li>
              <li>✓ Manager เห็นเฉพาะผู้ใช้ในแผนกเดียวกัน</li>
            </>
          )}
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ชื่อ-สกุล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  อีเมล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  แผนก
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ตำแหน่ง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  วันที่สร้าง
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบผู้ใช้งาน
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.full_name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                        {user.department}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="text-green-600">●</span>
                      ) : (
                        <span className="text-red-600">●</span>
                      )}
                      <span className="ml-2 text-sm text-gray-600">
                        {user.is_active ? 'ใช้งาน' : 'ระงับ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddUserModal
          currentUser={currentUser}
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

function AddUserModal({ currentUser, onClose, onSuccess }: any) {
  const DEPARTMENTS = ['LBD', 'LBA', 'CR', 'LM', 'DS', 'SN'];
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    department: currentUser.role === 'admin' ? '' : currentUser.department,
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (formData.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
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
          role: formData.role
        })
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

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">เพิ่มผู้ใช้ใหม่</h3>
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
                ชื่อ-สกุล *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                อีเมล *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน * (อย่างน้อย 6 ตัวอักษร)
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ยืนยันรหัสผ่าน *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                แผนก *
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={!isAdmin}
              >
                {isAdmin && <option value="">-- เลือกแผนก --</option>}
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {!isAdmin && (
                <p className="mt-1 text-xs text-gray-500">
                  Manager สามารถสร้างผู้ใช้ในแผนกของตนเองเท่านั้น
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ตำแหน่ง *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="user">พนักงาน (User)</option>
                {isAdmin && (
                  <>
                    <option value="manager">ผู้จัดการ (Manager)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </>
                )}
              </select>
              {!isAdmin && (
                <p className="mt-1 text-xs text-gray-500">
                  Manager สามารถสร้างเฉพาะผู้ใช้ระดับ User เท่านั้น
                </p>
              )}
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
                {loading ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}