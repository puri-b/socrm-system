//เพิ่ม Field คู่แข่ง (ไม่บังคับกรอก)//
//เพิ่ม Field Solution (LBA)//

'use client';

import { useEffect, useMemo, useState } from 'react';

type Service = {
  service_id: number;
  department: string;
  service_name: string;
  requires_quantity: boolean;
  quantity_unit: string;
  created_at?: string;
};

type CurrentUser = {
  user_id: number;
  email: string;
  full_name: string;
  department: string;
  role: 'admin' | 'manager' | 'user' | 'digital_marketing';
};

const DEPARTMENTS = ['LBD', 'LBA', 'CR', 'LM', 'DS', 'SN'];
const QUANTITY_UNITS = [
  { value: 'people', label: 'คน' },
  { value: 'vehicles', label: 'คัน' },
  { value: 'pages', label: 'หน้า' },
  { value: 'users', label: 'user' },
  { value: 'boxes', label: 'กล่อง' },
];

const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Briefcase: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
};

export default function ServicesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const [formData, setFormData] = useState({
    service_name: '',
    department: '',
    quantity_unit: 'people',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      window.location.href = '/login';
      return;
    }

    const user = JSON.parse(userData) as CurrentUser;
    setCurrentUser(user);

    if (user.role !== 'admin') {
      window.location.href = '/dashboard';
      return;
    }

    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services', { cache: 'no-store' });
      const data = await response.json();
      setServices(Array.isArray(data?.services) ? data.services : []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = useMemo(() => {
    let result = [...services];

    if (departmentFilter !== 'all') {
      result = result.filter((item) => item.department === departmentFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.service_name?.toLowerCase().includes(q) ||
          item.department?.toLowerCase().includes(q) ||
          item.quantity_unit?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const deptCompare = a.department.localeCompare(b.department);
      if (deptCompare !== 0) return deptCompare;
      return a.service_name.localeCompare(b.service_name);
    });
  }, [services, searchTerm, departmentFilter]);

  const resetForm = () => {
    setFormData({
      service_name: '',
      department: '',
      quantity_unit: 'people',
    });
  };

  const handleCreateService = async () => {
    if (!formData.service_name.trim()) {
      alert('กรุณากรอกชื่อบริการ');
      return;
    }

    if (!formData.department) {
      alert('กรุณาเลือกแผนก');
      return;
    }

    if (!formData.quantity_unit) {
      alert('กรุณาเลือกหน่วย');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: formData.service_name.trim(),
          department: formData.department,
          quantity_unit: formData.quantity_unit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data?.error || 'เกิดข้อผิดพลาดในการบันทึกบริการ');
        return;
      }

      alert('บันทึกบริการเรียบร้อยแล้ว');
      setShowAddModal(false);
      resetForm();
      await fetchServices();
    } catch (error) {
      console.error('Create service error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกบริการ');
    } finally {
      setSaving(false);
    }
  };

  const getUnitLabel = (value: string) => {
    return QUANTITY_UNITS.find((item) => item.value === value)?.label || value;
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-slate-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">กำลังโหลดข้อมูลบริการ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">เมนูบริการ</h1>
          <p className="text-slate-500 text-sm font-normal">สำหรับ Admin เท่านั้น ใช้จัดการรายการบริการในระบบ ({filteredServices.length} รายการ)</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
        >
          <Icons.Plus /> เพิ่มบริการใหม่
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <span className="text-slate-400"><Icons.Briefcase /></span>
          <div className="text-xs font-semibold uppercase tracking-wider">ขอบเขตการใช้งาน</div>
        </div>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>✓ หน้านี้แสดงเฉพาะผู้ใช้งานสิทธิ์ Admin</li>
          <li>✓ Admin สามารถเพิ่มบริการใหม่และกำหนดแผนก/หน่วยได้</li>
          <li>✓ ระบบจะบันทึกลงตาราง <span className="font-semibold">x_socrm.services</span></li>
        </ul>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">ค้นหาบริการ</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icons.Search />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อบริการ / แผนก / หน่วย"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">กรองตามแผนก</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="all">ทุกแผนก</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-600">
                <th className="px-5 py-4 font-semibold">รหัส</th>
                <th className="px-5 py-4 font-semibold">แผนก</th>
                <th className="px-5 py-4 font-semibold">ชื่อบริการ</th>
                <th className="px-5 py-4 font-semibold">ใช้จำนวน</th>
                <th className="px-5 py-4 font-semibold">หน่วย</th>
                <th className="px-5 py-4 font-semibold">วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">ไม่พบข้อมูลบริการ</td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.service_id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 text-slate-700 font-medium">{service.service_id}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-100">
                        {service.department}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-800 font-medium">{service.service_name}</td>
                    <td className="px-5 py-4 text-slate-600">{service.requires_quantity ? 'ใช่' : 'ไม่ใช่'}</td>
                    <td className="px-5 py-4 text-slate-600">{getUnitLabel(service.quantity_unit)}</td>
                    <td className="px-5 py-4 text-slate-500">{service.created_at ? new Date(service.created_at).toLocaleString('th-TH') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">เพิ่มบริการใหม่</h2>
                <p className="text-sm text-slate-500 mt-1">กรอกชื่อบริการ เลือกหน่วย และเลือกแผนกเพื่อบันทึกลงระบบ</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                title="ปิด"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อบริการ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.service_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, service_name: e.target.value }))}
                    placeholder="ใส่ชื่อบริการ"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">แผนก <span className="text-red-500">*</span></label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="">เลือกแผนก</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">หน่วย <span className="text-red-500">*</span></label>
                <select
                  value={formData.quantity_unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quantity_unit: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                >
                  {QUANTITY_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600">
                หลังจากบันทึก <span className="font-semibold">บริการใหม่แล้ว</span> ระบบจะเปิดใช้งานบริการนั้นๆ ให้โดยอัตโนมัติ
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition-all"
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateService}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-60"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกบริการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
