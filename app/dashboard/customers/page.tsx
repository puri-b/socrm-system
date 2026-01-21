'use client';

import { useEffect, useMemo, useState } from 'react';
import AddContactForm from '@/components/AddContactForm';

// --- Internal SVG Icons (same direction as Tasks page) ---
const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Excel: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2v7" />
      <path d="M12 13v7" />
      <path d="M16 13v7" />
      <path d="M8 13h8" />
    </svg>
  ),
  Filter: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Edit: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  List: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

export default function CustomersPage() {
  const [user, setUser] = useState<any>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [contactHistory, setContactHistory] = useState<any[]>([]);

  // filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [qualityLeadFilter, setQualityLeadFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // service filter (ตาม requirement ของคุณ)
  const [serviceFilter, setServiceFilter] = useState('all');
  const [filterServices, setFilterServices] = useState<any[]>([]);

  const LEAD_SOURCES = useMemo(
    () => [
      'Offline - Callout',
      'Offline - Connection',
      'Online - Call in',
      'Online - Line',
      'Online - Leadform',
      'Online - E-mail',
      'Online - อื่นๆ',
    ],
    []
  );

  const DEPARTMENTS = useMemo(
    () => [
      { code: 'LBD', name: 'LBD' },
      { code: 'LBA', name: 'LBA' },
      { code: 'CR', name: 'CR' },
      { code: 'LM', name: 'LM' },
      { code: 'DS', name: 'DS' },
      { code: 'SN', name: 'SN' },
    ],
    []
  );

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setUser(u);
      fetchCustomers();
      fetchUsers();
      fetchFilterServices(u, 'all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload filter services when admin changes departmentFilter
  useEffect(() => {
    if (!user) return;
    fetchFilterServices(user, departmentFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentFilter, user?.role, user?.department]);

  useEffect(() => {
    filterCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, statusFilter, searchTerm, leadSourceFilter, salesPersonFilter, qualityLeadFilter, departmentFilter, serviceFilter]);

  const fetchFilterServices = async (u: any, deptFilter: string) => {
    try {
      if (!u) return;

      let url = '/api/services';
      // Admin: if select specific dept -> load services of that dept
      if (u.role === 'admin' && deptFilter !== 'all') {
        url = `/api/services?department=${encodeURIComponent(deptFilter)}`;
      }
      // Manager/User: API จะคืนเฉพาะบริการของแผนกตนเองอยู่แล้ว (ตามที่คุณแก้ไว้แล้ว)

      const res = await fetch(url);
      const data = await res.json();
      setFilterServices(data.services || []);
    } catch (e) {
      console.error('Failed to fetch services(filter):', e);
      setFilterServices([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (statusFilter !== 'all') filtered = filtered.filter((c) => c.lead_status === statusFilter);
    if (leadSourceFilter !== 'all') filtered = filtered.filter((c) => c.lead_source === leadSourceFilter);
    if (salesPersonFilter !== 'all') filtered = filtered.filter((c) => c.sales_person_id === parseInt(salesPersonFilter));
    if (qualityLeadFilter !== 'all') {
      const isQuality = qualityLeadFilter === 'quality';
      filtered = filtered.filter((c) => c.is_quality_lead === isQuality);
    }

    // Admin เท่านั้นที่มีตัวกรองแผนก
    if (user?.role === 'admin' && departmentFilter !== 'all') {
      filtered = filtered.filter((c) => c.department === departmentFilter);
    }

    // service filter (ต้องอาศัย service_ids ใน customer)
    if (serviceFilter !== 'all') {
      const sid = parseInt(serviceFilter);
      filtered = filtered.filter((c) => Array.isArray(c.service_ids) && c.service_ids.includes(sid));
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone?.includes(searchTerm)
      );
    }

    setFilteredCustomers(filtered);
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');

    const exportData = filteredCustomers.map((customer) => ({
      'ชื่อบริษัท': customer.company_name,
      อีเมล: customer.email,
      เบอร์โทร: customer.phone,
      ที่ตั้ง: customer.location,
      ประเภทธุรกิจ: customer.business_type,
      งบประมาณ: customer.budget,
      ผู้ติดต่อ: customer.contact_person,
      แหล่งที่มา: customer.lead_source,
      สถานะ: customer.lead_status,
      'มูลค่าสัญญา': customer.contract_value,
      Sale: customer.sales_person_name,
      แผนก: customer.department,
      'วันที่สร้าง': new Date(customer.created_at).toLocaleDateString('th-TH'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    ws['!cols'] = [
      { wch: 28 },
      { wch: 24 },
      { wch: 14 },
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 10 },
      { wch: 14 },
    ];

    XLSX.writeFile(wb, `Customers_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const viewCustomerDetail = (customer: any) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const editCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const viewContactHistory = async (customer: any) => {
    setSelectedCustomer(customer);
    try {
      const response = await fetch(`/api/contacts?customer_id=${customer.customer_id}`);
      const data = await response.json();
      setContactHistory(data.contacts || []);
      setShowContactModal(true);
    } catch (error) {
      console.error('Failed to fetch contact history:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      Lead: 'bg-slate-100 text-slate-600 border-slate-200',
      Potential: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      Prospect: 'bg-orange-50 text-orange-700 border-orange-100',
      Pipeline: 'bg-purple-50 text-purple-700 border-purple-100',
      PO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Close: 'bg-red-50 text-red-700 border-red-100',
    };
    return colors[status] || 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const formatCurrency = (value: any) => {
    if (!value) return '-';
    return new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">รายชื่อลูกค้า</h1>
          <p className="text-slate-500 text-sm font-normal">
            จัดการข้อมูลลูกค้าทั้งหมด ({filteredCustomers.length} รายการ)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
          >
            <Icons.Excel /> ส่งออก Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Icons.Plus /> เพิ่มลูกค้าใหม่
          </button>
        </div>
      </header>

      {/* --- Filters --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Icons.Filter />
          <span className="text-xs font-semibold uppercase tracking-wider">ตัวกรอง</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* search */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="ค้นหา: ชื่อบริษัท, อีเมล, เบอร์โทร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="Lead">Lead</option>
            <option value="Potential">Potential</option>
            <option value="Prospect">Prospect</option>
            <option value="Pipeline">Pipeline</option>
            <option value="PO">PO</option>
            <option value="Close">Close (ลูกค้าปฏิเสธ)</option>
          </select>

          {/* lead source */}
          <select
            value={leadSourceFilter}
            onChange={(e) => setLeadSourceFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">แหล่งที่มาทั้งหมด</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* service */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">บริการทั้งหมด</option>
            {filterServices.map((sv: any) => (
              <option key={sv.service_id} value={sv.service_id}>
                {sv.service_name}
              </option>
            ))}
          </select>

          {/* sales person */}
          <select
            value={salesPersonFilter}
            onChange={(e) => setSalesPersonFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Sale ผู้ดูแลทั้งหมด</option>
            {users.map((u: any) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name}
              </option>
            ))}
          </select>

          {/* quality */}
          <select
            value={qualityLeadFilter}
            onChange={(e) => setQualityLeadFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Quality Lead ทั้งหมด</option>
            <option value="quality">Lead คุณภาพ</option>
            <option value="not-quality">Lead ไม่คุณภาพ</option>
          </select>

          {/* department only for admin */}
          {user?.role === 'admin' && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">ทุกแผนก</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setStatusFilter('all');
              setLeadSourceFilter('all');
              setServiceFilter('all');
              setSalesPersonFilter('all');
              setQualityLeadFilter('all');
              setDepartmentFilter('all');
              setSearchTerm('');
            }}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {/* --- Table --- */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ลูกค้า</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ผู้ติดต่อ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">เบอร์โทร</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">บริการ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">สถานะ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">มูลค่าสัญญา</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Sale</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">การทำงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                    ไม่พบข้อมูลลูกค้า
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c: any) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <button onClick={() => viewCustomerDetail(c)} className="text-left group">
                        <div className="font-semibold text-slate-800 text-sm group-hover:underline">{c.company_name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{c.email || '—'}</div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{c.contact_person || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{c.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{c.customer_service_display || c.service_interested || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusColor(c.lead_status)}`}>
                        {c.lead_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {c.contract_value ? `฿ ${formatCurrency(c.contract_value)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{c.sales_person_name || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => viewCustomerDetail(c)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                          title="ดูรายละเอียด"
                        >
                          <Icons.Eye />
                        </button>
                        <button
                          onClick={() => editCustomer(c)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                          title="แก้ไขข้อมูล"
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          onClick={() => viewContactHistory(c)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                          title="ประวัติการติดต่อ"
                        >
                          <Icons.List />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modals --- */}
      {showAddModal && (
        <AddCustomerModal
          user={user}
          users={users}
          leadSources={LEAD_SOURCES}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCustomers();
          }}
        />
      )}

      {showDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCustomer(null);
          }}
          onEdit={() => editCustomer(selectedCustomer)}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
        />
      )}

      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          users={users}
          leadSources={LEAD_SOURCES}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
            fetchCustomers();
          }}
        />
      )}

      {showContactModal && selectedCustomer && (
        <ContactHistoryModal
          customer={selectedCustomer}
          contacts={contactHistory}
          onClose={() => {
            setShowContactModal(false);
            setSelectedCustomer(null);
          }}
          onAddContact={() => {
            viewContactHistory(selectedCustomer);
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}

// -----------------------------
// Detail Modal (UI updated)
// -----------------------------
function CustomerDetailModal({ customer, onClose, onEdit, formatCurrency, getStatusColor }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[1.5rem] shadow-xl max-w-4xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{customer.company_name}</h3>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusColor(customer.lead_status)}`}>
                {customer.lead_status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
            <Icons.Close />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase">ข้อมูลติดต่อ</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Info label="อีเมล" value={customer.email || '—'} />
              <Info label="เบอร์โทร" value={customer.phone || '—'} />
              <Info label="ผู้ติดต่อ" value={customer.contact_person || '—'} />
              <Info label="ที่ตั้ง" value={customer.location || '—'} />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase">ข้อมูลธุรกิจ</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Info label="ประเภทธุรกิจ" value={customer.business_type || '—'} />
              <Info label="ข้อมูลการจดทะเบียน" value={customer.registration_info || '—'} />
              <Info label="งบประมาณ" value={customer.budget ? `฿ ${formatCurrency(customer.budget)}` : '—'} />
              <Info
                label="บริการที่สนใจ"
                value={
                  customer.customer_service_display ||
                  (Array.isArray(customer.customer_services) && customer.customer_services.length > 0
                    ? customer.customer_services.map((s: any) => s?.service_name).filter(Boolean).join(', ')
                    : customer.service_interested) ||
                  '—'
                }
              />
              <Info label="แหล่งที่มา Lead" value={customer.lead_source || '—'} />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase">ข้อมูลการขาย</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Info label="Sale ผู้ดูแล" value={customer.sales_person_name || '—'} />
              <Info label="มูลค่าสัญญา" value={customer.contract_value ? `฿ ${formatCurrency(customer.contract_value)}` : '—'} />
              <Info label="Quality Lead" value={customer.is_quality_lead ? 'Lead คุณภาพ' : 'Lead ไม่คุณภาพ'} />
              <Info label="Keyword ค้นหา" value={customer.search_keyword || '—'} />
            </div>
            {customer.pain_points && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-500 mb-1">Pain Points</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{customer.pain_points}</div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase">ข้อมูลระบบ</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Info label="แผนก" value={customer.department || '—'} />
              <Info
                label="วันที่สร้าง"
                value={
                  customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'
                }
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-all"
          >
            ปิด
          </button>
          <button
            onClick={onEdit}
            className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"
          >
            แก้ไขข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className="text-sm text-slate-800 font-semibold mt-0.5">{value}</div>
    </div>
  );
}

// -----------------------------
// Add Customer Modal (UI updated)
// -----------------------------
function AddCustomerModal({ user, users, leadSources, onClose, onSuccess }: any) {
  const [services, setServices] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    phone: '',
    location: '',
    business_type: '',
    budget: '',
    contact_person: '',
    lead_source: '',
    search_keyword: '',
    is_quality_lead: false,
    sales_person_id: user?.user_id,
    lead_status: 'Lead',
    pain_points: '',
    department: user?.department,
    selectedServices: [] as any[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(`/api/services?department=${user.department}`);
      const data = await response.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

    // ✅ helper: หา service object จาก id
  const getServiceById = (serviceId: number | null | undefined) => {
    if (!serviceId) return null;
    return services.find((s: any) => Number(s.service_id) === Number(serviceId)) || null;
  };

  // ✅ เพิ่มแถวบริการ
  const addServiceRow = () => {
    setFormData((prev: any) => ({
      ...prev,
      selectedServices: [...(prev.selectedServices || []), { service_id: null, quantity: 1 }]
    }));
  };

  // ✅ ลบแถวบริการ
  const removeServiceRow = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      selectedServices: (prev.selectedServices || []).filter((_: any, i: number) => i !== index)
    }));
  };

  // ✅ เปลี่ยนบริการในแถว
  const updateServiceRowId = (index: number, serviceIdRaw: string) => {
    const serviceId = serviceIdRaw ? Number(serviceIdRaw) : null;

    setFormData((prev: any) => {
      const next = [...(prev.selectedServices || [])];
      next[index] = { ...next[index], service_id: serviceId };

      // ถ้า service นั้นไม่ต้องใส่จำนวน ให้ fix เป็น 1
      const svc = getServiceById(serviceId);
      if (svc && !svc.requires_quantity) {
        next[index].quantity = 1;
      } else if (svc && svc.requires_quantity && (!next[index].quantity || next[index].quantity < 1)) {
        next[index].quantity = 1;
      }

      return { ...prev, selectedServices: next };
    });
  };

  // ✅ เปลี่ยนจำนวนในแถว
  const updateServiceRowQty = (index: number, qtyRaw: string) => {
    const qty = Math.max(1, Number(qtyRaw || 1));
    setFormData((prev: any) => {
      const next = [...(prev.selectedServices || [])];
      next[index] = { ...next[index], quantity: qty };
      return { ...prev, selectedServices: next };
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  ...formData,
  services: (formData.selectedServices || [])
    .filter((s: any) => s?.service_id)
    .map((s: any) => ({
      service_id: Number(s.service_id),
      quantity: Math.max(1, Number(s.quantity || 1)),
      })),
  }),

      });

      const data = await response.json();

      if (response.ok) onSuccess();
      else setError(data.error || 'เกิดข้อผิดพลาด');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[1.5rem] shadow-xl max-w-4xl w-full overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-left max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800">เพิ่มลูกค้าใหม่</h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5">กรอกรายละเอียดลูกค้าเพื่อบันทึกเข้าระบบ</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
              <Icons.Close />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="ชื่อบริษัท *">
              <input
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น บริษัท สยามราชธานี จำกัด(มหาชน)"
              />
            </Field>

            <Field label="อีเมล *">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="เบอร์โทรศัพท์ * (ไม่ต้องใสขีดกลาง)">
              <input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="ชื่อผู้ติดต่อ *">
              <input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="ที่ตั้ง" full>
              <input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="ประเภทธุรกิจ">
              <input
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="งบประมาณ">
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="แหล่งที่มา Lead *">
              <select
                required
                value={formData.lead_source}
                onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">เลือกแหล่งที่มา</option>
                {leadSources.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Keyword ที่ใช้ค้นหา *">
              <input
                value={formData.search_keyword}
                onChange={(e) => setFormData({ ...formData, search_keyword: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="Sale ผู้ดูแล">
              <select
                value={formData.sales_person_id}
                onChange={(e) => setFormData({ ...formData, sales_person_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u: any) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="สถานะ Lead">
              <select
                value={formData.lead_status}
                onChange={(e) => setFormData({ ...formData, lead_status: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Lead">Lead</option>
                <option value="Potential">Potential</option>
                <option value="Prospect">Prospect</option>
                <option value="Pipeline">Pipeline</option>
                <option value="PO">PO</option>
                <option value="Close">Close (ลูกค้าปฏิเสธ)</option>
              </select>
            </Field>

            <Field label="Pain Points และปัญหาที่ต้องการแก้ไข *" full>
              <textarea
                rows={3}
                value={formData.pain_points}
                onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </Field>

            <div className="md:col-span-2">
              <label className="flex items-center text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.is_quality_lead}
                  onChange={(e) => setFormData({ ...formData, is_quality_lead: e.target.checked })}
                  className="mr-2 h-4 w-4"
                />
                เป็น Lead คุณภาพ
              </label>
            </div>

            {services.length > 0 && (
  <div className="md:col-span-2">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-slate-500 ml-1">บริการที่สนใจ</div>

      <button
        type="button"
        onClick={addServiceRow}
        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
      >
        + เพิ่มบริการ
      </button>
    </div>

    {(!formData.selectedServices || formData.selectedServices.length === 0) ? (
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
        ยังไม่ได้เลือกบริการ กรุณากด “เพิ่มบริการ”
      </div>
    ) : (
      <div className="space-y-2">
        {formData.selectedServices.map((row: any, index: number) => {
          const selectedId = row?.service_id ? Number(row.service_id) : null;
          const selectedSvc = getServiceById(selectedId);

          // กันเลือกซ้ำ: ถ้า id ถูกใช้ในแถวอื่นแล้ว จะไม่ให้เลือกซ้ำ
          const usedIds = new Set(
            (formData.selectedServices || [])
              .map((r: any) => (r?.service_id ? Number(r.service_id) : null))
              .filter((v: any) => v !== null)
          );

          return (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-center p-3 rounded-2xl bg-slate-50 border border-slate-100"
            >
              {/* Dropdown บริการ */}
              <div className="col-span-12 md:col-span-7">
                <select
                  value={selectedId ?? ''}
                  onChange={(e) => updateServiceRowId(index, e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— เลือกบริการ —</option>
                  {services
                    .filter((s: any) => {
                      const id = Number(s.service_id);
                      if (selectedId && id === selectedId) return true;
                      return !usedIds.has(id);
                    })
                    .map((s: any) => (
                      <option key={s.service_id} value={s.service_id}>
                        {s.service_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* จำนวน */}
              <div className="col-span-8 md:col-span-4">
                {selectedSvc?.requires_quantity ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={row?.quantity ?? 1}
                      onChange={(e) => updateServiceRowQty(index, e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="จำนวน"
                    />
                    <span className="text-sm text-slate-500 font-semibold whitespace-nowrap">
{
  selectedSvc.quantity_unit === 'people' ? 'คน' : 
  selectedSvc.service_name === 'บริการคลังเอกสารดิจิทัล' ? 'ผู้ใช้' :
  selectedSvc.service_name === 'บริการสแกนเอกสาร' ? 'หน้า' :
  selectedSvc.service_name === 'บริการ OCR' ? 'หน้า' :
  selectedSvc.service_name === 'คลังเก็บเอกสาร' ? 'กล่อง' : 
  'คัน'
}




                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-500">
                    ไม่ต้องระบุจำนวน
                  </div>
                )}
              </div>

              {/* ลบแถว */}
              <div className="col-span-4 md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeServiceRow(index)}
                  className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200 transition"
                  title="ลบบริการนี้"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

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
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, full }: any) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">{label}</label>
      {children}
    </div>
  );
}

// -----------------------------
// Edit Customer Modal (UI updated)
// -----------------------------
function EditCustomerModal({ customer, users, leadSources, onClose, onSuccess }: any) {
  const [services, setServices] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    company_name: customer.company_name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    location: customer.location || '',
    business_type: customer.business_type || '',
    budget: customer.budget || '',
    contact_person: customer.contact_person || '',
    lead_source: customer.lead_source || '',
    search_keyword: customer.search_keyword || '',
    is_quality_lead: customer.is_quality_lead || false,
    sales_person_id: customer.sales_person_id,
    lead_status: customer.lead_status || 'Lead',
    pain_points: customer.pain_points || '',
    contract_value: customer.contract_value || '',
    selectedServices: (customer.customer_services || []).map((s: any) => ({
      service_id: Number(s.service_id),
      quantity: Math.max(1, Number(s.quantity ?? 1)),
    })) as any[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchServices = async () => {
    try {
      const dept = customer?.department || '';
      const response = await fetch(`/api/services?department=${encodeURIComponent(dept)}`);
      const data = await response.json();
      setServices(data.services || []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  };

  // ✅ helper: หา service object จาก id
  const getServiceById = (serviceId: number | null | undefined) => {
    if (!serviceId) return null;
    return services.find((s: any) => Number(s.service_id) === Number(serviceId)) || null;
  };

  // ✅ เพิ่มแถวบริการ
  const addServiceRow = () => {
    setFormData((prev: any) => ({
      ...prev,
      selectedServices: [...(prev.selectedServices || []), { service_id: null, quantity: 1 }],
    }));
  };

  // ✅ ลบแถวบริการ
  const removeServiceRow = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      selectedServices: (prev.selectedServices || []).filter((_: any, i: number) => i !== index),
    }));
  };

  // ✅ เปลี่ยนบริการในแถว
  const updateServiceRowId = (index: number, serviceIdRaw: string) => {
    const serviceId = serviceIdRaw ? Number(serviceIdRaw) : null;

    setFormData((prev: any) => {
      const next = [...(prev.selectedServices || [])];
      next[index] = { ...next[index], service_id: serviceId };

      // ถ้า service นั้นไม่ต้องใส่จำนวน ให้ fix เป็น 1
      const svc = getServiceById(serviceId);
      if (svc && !svc.requires_quantity) {
        next[index].quantity = 1;
      } else if (svc && svc.requires_quantity && (!next[index].quantity || next[index].quantity < 1)) {
        next[index].quantity = 1;
      }

      return { ...prev, selectedServices: next };
    });
  };

  // ✅ เปลี่ยนจำนวนในแถว
  const updateServiceRowQty = (index: number, qtyRaw: string) => {
    const qty = Math.max(1, Number(qtyRaw || 1));
    setFormData((prev: any) => {
      const next = [...(prev.selectedServices || [])];
      next[index] = { ...next[index], quantity: qty };
      return { ...prev, selectedServices: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.customer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          services: (formData.selectedServices || [])
            .filter((s: any) => s?.service_id)
            .map((s: any) => ({
              service_id: Number(s.service_id),
              quantity: Math.max(1, Number(s.quantity ?? 1)),
            })),
        }),
      });

      const data = await response.json();
      if (response.ok) onSuccess();
      else setError(data.error || 'เกิดข้อผิดพลาด');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[1.5rem] shadow-xl max-w-4xl w-full overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-left max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800">แก้ไขข้อมูลลูกค้า</h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5">อัปเดตข้อมูลให้เป็นปัจจุบัน</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
              <Icons.Close />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="ชื่อบริษัท *">
              <input
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="อีเมล">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="เบอร์โทรศัพท์">
              <input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="ชื่อผู้ติดต่อ">
              <input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="ที่ตั้ง" full>
              <input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="ประเภทธุรกิจ">
              <input
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="งบประมาณ">
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="แหล่งที่มา Lead *">
              <select
                required
                value={formData.lead_source}
                onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">เลือกแหล่งที่มา</option>
                {leadSources.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Keyword ที่ใช้ค้นหา">
              <input
                value={formData.search_keyword}
                onChange={(e) => setFormData({ ...formData, search_keyword: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="Sale ผู้ดูแล">
              <select
                value={formData.sales_person_id}
                onChange={(e) => setFormData({ ...formData, sales_person_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u: any) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="สถานะ Lead">
              <select
                value={formData.lead_status}
                onChange={(e) => setFormData({ ...formData, lead_status: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Lead">Lead</option>
                <option value="Potential">Potential</option>
                <option value="Prospect">Prospect</option>
                <option value="Pipeline">Pipeline</option>
                <option value="PO">PO</option>
                <option value="Close">Close (ลูกค้าปฏิเสธ)</option>
              </select>
            </Field>

            <Field label="มูลค่าสัญญา">
              <input
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="Pain Points และปัญหาที่ต้องการแก้ไข" full>
              <textarea
                rows={3}
                value={formData.pain_points}
                onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </Field>

            <div className="md:col-span-2">
              <label className="flex items-center text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.is_quality_lead}
                  onChange={(e) => setFormData({ ...formData, is_quality_lead: e.target.checked })}
                  className="mr-2 h-4 w-4"
                />
                เป็น Lead คุณภาพ
              </label>
            </div>

            {services.length > 0 && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-500 ml-1">บริการที่สนใจ</div>

                  <button
                    type="button"
                    onClick={addServiceRow}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                  >
                    + เพิ่มบริการ
                  </button>
                </div>

                {(!formData.selectedServices || formData.selectedServices.length === 0) ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
                    ยังไม่ได้เลือกบริการ กรุณากด “เพิ่มบริการ”
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.selectedServices.map((row: any, index: number) => {
                      const selectedId = row?.service_id ? Number(row.service_id) : null;
                      const selectedSvc = getServiceById(selectedId);

                      // กันเลือกซ้ำ: ถ้า id ถูกใช้ในแถวอื่นแล้ว จะไม่ให้เลือกซ้ำ
                      const usedIds = new Set(
                        (formData.selectedServices || [])
                          .map((r: any) => (r?.service_id ? Number(r.service_id) : null))
                          .filter((v: any) => v !== null)
                      );

                      return (
                        <div
                          key={index}
                          className="grid grid-cols-12 gap-2 items-center p-3 rounded-2xl bg-slate-50 border border-slate-100"
                        >
                          {/* Dropdown บริการ */}
                          <div className="col-span-12 md:col-span-7">
                            <select
                              value={selectedId ?? ''}
                              onChange={(e) => updateServiceRowId(index, e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">— เลือกบริการ —</option>
                              {services
                                .filter((s: any) => {
                                  const id = Number(s.service_id);
                                  if (selectedId && id === selectedId) return true;
                                  return !usedIds.has(id);
                                })
                                .map((s: any) => (
                                  <option key={s.service_id} value={s.service_id}>
                                    {s.service_name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* จำนวน */}
                          <div className="col-span-8 md:col-span-4">
                            {selectedSvc?.requires_quantity ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={row?.quantity ?? 1}
                                  onChange={(e) => updateServiceRowQty(index, e.target.value)}
                                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="จำนวน"
                                />
                                <span className="text-sm text-slate-500 font-semibold whitespace-nowrap">
    {
  selectedSvc.quantity_unit === 'people' ? 'คน' : 
  selectedSvc.service_name === 'บริการคลังเอกสารดิจิทัล' ? 'ผู้ใช้' :
  selectedSvc.service_name === 'บริการสแกนเอกสาร' ? 'หน้า' :
  selectedSvc.service_name === 'บริการ OCR' ? 'หน้า' :
  selectedSvc.service_name === 'คลังเก็บเอกสาร' ? 'กล่อง' : 
  'คัน'
}




                                </span>
                              </div>
                            ) : (
                              <div className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-500">
                                ไม่ต้องระบุจำนวน
                              </div>
                            )}
                          </div>

                          {/* ลบแถว */}
                          <div className="col-span-4 md:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeServiceRow(index)}
                              className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200 transition"
                              title="ลบบริการนี้"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
              {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// Contact History Modal (UI updated)
// -----------------------------
function ContactHistoryModal({ customer, contacts, onClose, onAddContact }: any) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[1.5rem] shadow-xl max-w-4xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800">ประวัติการติดต่อ</h3>
            <p className="text-xs text-slate-400 mt-0.5">{customer.company_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
            <Icons.Close />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"
          >
            <Icons.Plus />
            {showAddForm ? 'ซ่อนฟอร์ม' : 'บันทึกการติดต่อใหม่'}
          </button>

          {showAddForm && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <AddContactForm
                customerId={Number(customer.customer_id)}
                onSuccess={() => {
                  setShowAddForm(false);
                  onAddContact();
                }}
              />
            </div>
          )}

          <div className="space-y-3">
            {contacts.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">ยังไม่มีประวัติการติดต่อ</div>
            ) : (
              contacts.map((ct: any) => (
                <div key={ct.contact_id} className="border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{ct.contact_subject}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Icons.Calendar />
                          {ct.contact_date ? new Date(ct.contact_date).toLocaleDateString('th-TH') : '—'}
                        </span>
                        {ct.contact_channel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                            {ct.contact_channel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-600 space-y-1">
                    {ct.customer_contact_person && <div>ผู้ติดต่อ: <span className="font-semibold text-slate-800">{ct.customer_contact_person}</span></div>}
                    {ct.sales_person_name && <div>Sale: <span className="font-semibold text-slate-800">{ct.sales_person_name}</span></div>}
                    {ct.quotation_amount && <div>มูลค่าเสนอราคา: <span className="font-semibold text-slate-800">{Number(ct.quotation_amount).toLocaleString()} บาท</span></div>}
                    {ct.lead_status_updated && <div>อัปเดตสถานะ: <span className="font-semibold text-slate-800">{ct.lead_status_updated}</span></div>}
                    {ct.notes && <div className="pt-1">หมายเหตุ: <span className="text-slate-700">{ct.notes}</span></div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
