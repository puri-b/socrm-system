'use client';

import { useEffect, useState } from 'react';

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [qualityLeadFilter, setQualityLeadFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const LEAD_SOURCES = [
    'Offline - Callout',
    'Offline - Connection',
    'Online - Call in',
    'Online - Line',
    'Online - E-mail',
    'Online - อื่นๆ'
  ];

  const DEPARTMENTS = [
    { code: 'LBD', name: 'LBD' },
    { code: 'LBA', name: 'LBA' },
    { code: 'CR', name: 'CR' },
    { code: 'LM', name: 'LM' },
    { code: 'DS', name: 'DS' },
    { code: 'SN', name: 'SN' }
  ];

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchCustomers();
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, statusFilter, searchTerm, leadSourceFilter, salesPersonFilter, qualityLeadFilter, departmentFilter]);

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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.lead_status === statusFilter);
    }

    if (leadSourceFilter !== 'all') {
      filtered = filtered.filter(c => c.lead_source === leadSourceFilter);
    }

    if (salesPersonFilter !== 'all') {
      filtered = filtered.filter(c => c.sales_person_id === parseInt(salesPersonFilter));
    }

    if (qualityLeadFilter !== 'all') {
      const isQuality = qualityLeadFilter === 'quality';
      filtered = filtered.filter(c => c.is_quality_lead === isQuality);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(c => c.department === departmentFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      );
    }

    setFilteredCustomers(filtered);
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    
    const exportData = filteredCustomers.map(customer => ({
      'ชื่อบริษัท': customer.company_name,
      'อีเมล': customer.email,
      'เบอร์โทร': customer.phone,
      'ที่ตั้ง': customer.location,
      'ประเภทธุรกิจ': customer.business_type,
      'งบประมาณ': customer.budget,
      'ผู้ติดต่อ': customer.contact_person,
      'แหล่งที่มา': customer.lead_source,
      'สถานะ': customer.lead_status,
      'มูลค่าสัญญา': customer.contract_value,
      'Sale': customer.sales_person_name,
      'แผนก': customer.department,
      'วันที่สร้าง': new Date(customer.created_at).toLocaleDateString('th-TH')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    
    ws['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 10 }, { wch: 15 }
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
      'Lead': 'bg-gray-100 text-gray-800',
      'Potential': 'bg-yellow-100 text-yellow-800',
      'Prospect': 'bg-orange-100 text-orange-800',
      'Pipeline': 'bg-purple-100 text-purple-800',
      'PO': 'bg-green-100 text-green-800',
      'Close': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (value: any) => {
    if (!value) return '-';
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">รายชื่อลูกค้า</h2>
          <p className="text-gray-600">จัดการข้อมูลลูกค้าทั้งหมด</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <span>📊</span>
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <span>➕</span>
            <span>เพิ่มลูกค้าใหม่</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="ชื่อบริษัท, อีเมล, เบอร์โทร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
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
              <option value="Lead">Lead</option>
              <option value="Potential">Potential</option>
              <option value="Prospect">Prospect</option>
              <option value="Pipeline">Pipeline</option>
              <option value="PO">PO</option>
              <option value="Close">Close (ลูกค้าปฏิเสธ)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              แหล่งที่มา
            </label>
            <select
              value={leadSourceFilter}
              onChange={(e) => setLeadSourceFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              {LEAD_SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sale ผู้ดูแล
            </label>
            <select
              value={salesPersonFilter}
              onChange={(e) => setSalesPersonFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              {users.map(u => (
                <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Lead
            </label>
            <select
              value={qualityLeadFilter}
              onChange={(e) => setQualityLeadFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="quality">Lead คุณภาพ</option>
              <option value="not-quality">Lead ไม่คุณภาพ</option>
            </select>
          </div>

          {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                แผนก
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept.code} value={dept.code}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('all');
                setLeadSourceFilter('all');
                setSalesPersonFilter('all');
                setQualityLeadFilter('all');
                setDepartmentFilter('all');
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors w-full"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ชื่อบริษัท
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ผู้ติดต่อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  เบอร์โทร
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  แหล่งที่มา
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  มูลค่าสัญญา
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลลูกค้า
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.customer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewCustomerDetail(customer)}
                        className="text-left hover:text-blue-600 transition-colors"
                      >
                        <div className="font-medium text-gray-900 hover:underline">
                          {customer.company_name}
                        </div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customer.contact_person || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customer.phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customer.lead_source || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.lead_status)}`}>
                        {customer.lead_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customer.contract_value ? `฿ ${formatCurrency(customer.contract_value)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customer.sales_person_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => viewContactHistory(customer)}
                        className="text-blue-600 hover:text-blue-900 text-xl"
                        title="ดูประวัติการติดต่อ"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

function CustomerDetailModal({ customer, onClose, onEdit, formatCurrency, getStatusColor }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {customer.company_name}
            </h3>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.lead_status)}`}>
              {customer.lead_status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-xl mr-2">📞</span>
              ข้อมูลติดต่อ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">อีเมล</p>
                <p className="font-medium text-gray-900">{customer.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">เบอร์โทรศัพท์</p>
                <p className="font-medium text-gray-900">{customer.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ผู้ติดต่อ</p>
                <p className="font-medium text-gray-900">{customer.contact_person || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ที่ตั้ง</p>
                <p className="font-medium text-gray-900">{customer.location || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-xl mr-2">🏢</span>
              ข้อมูลธุรกิจ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ประเภทธุรกิจ</p>
                <p className="font-medium text-gray-900">{customer.business_type || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ข้อมูลการจดทะเบียน</p>
                <p className="font-medium text-gray-900">{customer.registration_info || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">งบประมาณ</p>
                <p className="font-medium text-gray-900">
                  {customer.budget ? `฿ ${formatCurrency(customer.budget)}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">แหล่งที่มา Lead</p>
                <p className="font-medium text-gray-900">{customer.lead_source || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-xl mr-2">💰</span>
              ข้อมูลการขาย
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">สถานะ</p>
                <p className="font-medium text-gray-900">{customer.lead_status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">มูลค่าสัญญา</p>
                <p className="font-medium text-green-600 text-lg">
                  {customer.contract_value ? `฿ ${formatCurrency(customer.contract_value)}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sale ผู้ดูแล</p>
                <p className="font-medium text-gray-900">{customer.sales_person_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quality Lead</p>
                <p className="font-medium text-gray-900">
                  {customer.is_quality_lead ? '✅ Lead คุณภาพ' : '❌ Lead ไม่คุณภาพ'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Keyword ค้นหา</p>
                <p className="font-medium text-gray-900">{customer.search_keyword || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">บริการที่สนใจ</p>
                <p className="font-medium text-gray-900">{customer.service_interested || '-'}</p>
              </div>
            </div>
          </div>

          {customer.contract_start_date && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">📄</span>
                ข้อมูลสัญญา
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">ระยะเวลาสัญญา</p>
                  <p className="font-medium text-gray-900">{customer.contract_duration || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">วันเริ่มสัญญา</p>
                  <p className="font-medium text-gray-900">
                    {customer.contract_start_date ? new Date(customer.contract_start_date).toLocaleDateString('th-TH') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">วันสิ้นสุดสัญญา</p>
                  <p className="font-medium text-gray-900">
                    {customer.contract_end_date ? new Date(customer.contract_end_date).toLocaleDateString('th-TH') : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {customer.pain_points && (
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">🎯</span>
                Pain Points และปัญหาที่ต้องการแก้ไข
              </h4>
              <p className="text-gray-700 whitespace-pre-wrap">{customer.pain_points}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-xl mr-2">ℹ️</span>
              ข้อมูลระบบ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">แผนก</p>
                <p className="font-medium text-gray-900">{customer.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">วันที่สร้าง</p>
                <p className="font-medium text-gray-900">
                  {new Date(customer.created_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onEdit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ✏️ แก้ไขข้อมูล
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

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
    sales_person_id: user.user_id,
    lead_status: 'Lead',
    pain_points: '',
    department: user.department,
    selectedServices: [] as any[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServices();
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
          services: formData.selectedServices
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

  const toggleService = (serviceId: number) => {
    const exists = formData.selectedServices.find(s => s.service_id === serviceId);
    if (exists) {
      setFormData({
        ...formData,
        selectedServices: formData.selectedServices.filter(s => s.service_id !== serviceId)
      });
    } else {
      setFormData({
        ...formData,
        selectedServices: [...formData.selectedServices, { service_id: serviceId, quantity: 1 }]
      });
    }
  };

  const updateServiceQuantity = (serviceId: number, quantity: number) => {
    setFormData({
      ...formData,
      selectedServices: formData.selectedServices.map(s =>
        s.service_id === serviceId ? { ...s, quantity } : s
      )
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">เพิ่มลูกค้าใหม่</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อบริษัท *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อผู้ติดต่อ
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ที่ตั้ง
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ประเภทธุรกิจ
                </label>
                <input
                  type="text"
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  งบประมาณ
                </label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  แหล่งที่มา Lead *
                </label>
                <select
                  value={formData.lead_source}
                  onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">เลือกแหล่งที่มา</option>
                  {leadSources.map((source: string) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keyword ที่ใช้ค้นหา
                </label>
                <input
                  type="text"
                  value={formData.search_keyword}
                  onChange={(e) => setFormData({ ...formData, search_keyword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale ผู้ดูแล
                </label>
                <select
                  value={formData.sales_person_id}
                  onChange={(e) => setFormData({ ...formData, sales_person_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {users.map((u: any) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สถานะ Lead
                </label>
                <select
                  value={formData.lead_status}
                  onChange={(e) => setFormData({ ...formData, lead_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Lead">Lead</option>
                  <option value="Potential">Potential</option>
                  <option value="Prospect">Prospect</option>
                  <option value="Pipeline">Pipeline</option>
                  <option value="PO">PO</option>
                  <option value="Close">Close (ลูกค้าปฏิเสธ)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pain Points และปัญหาที่ต้องการแก้ไข
                </label>
                <textarea
                  value={formData.pain_points}
                  onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    บริการที่สนใจ
                  </label>
                  <div className="space-y-2">
                    {services.map((service: any) => {
                      const isSelected = formData.selectedServices.find(s => s.service_id === service.service_id);
                      return (
                        <div key={service.service_id} className="flex items-center space-x-3 p-2 border rounded">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => toggleService(service.service_id)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1">{service.service_name}</span>
                          {isSelected && service.requires_quantity && (
                            <div className="flex items-center space-x-2">
                              <label className="text-sm">จำนวน:</label>
                              <input
                                type="number"
                                min="1"
                                value={isSelected.quantity}
                                onChange={(e) => updateServiceQuantity(service.service_id, parseInt(e.target.value))}
                                className="w-20 px-2 py-1 border rounded"
                              />
                              <span className="text-sm text-gray-600">
                                {service.quantity_unit === 'people' ? 'คน' : 'คัน'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

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
    selectedServices: [] as any[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(`/api/services?department=${customer.department}`);
      const data = await response.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.customer_id}`, {
        method: 'PUT',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">✏️ แก้ไขข้อมูลลูกค้า</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อบริษัท *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อผู้ติดต่อ
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ที่ตั้ง
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ประเภทธุรกิจ
                </label>
                <input
                  type="text"
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  งบประมาณ
                </label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  แหล่งที่มา Lead *
                </label>
                <select
                  value={formData.lead_source}
                  onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">เลือกแหล่งที่มา</option>
                  {leadSources.map((source: string) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keyword ที่ใช้ค้นหา
                </label>
                <input
                  type="text"
                  value={formData.search_keyword}
                  onChange={(e) => setFormData({ ...formData, search_keyword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale ผู้ดูแล
                </label>
                <select
                  value={formData.sales_person_id}
                  onChange={(e) => setFormData({ ...formData, sales_person_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {users.map((u: any) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สถานะ Lead
                </label>
                <select
                  value={formData.lead_status}
                  onChange={(e) => setFormData({ ...formData, lead_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Lead">Lead</option>
                  <option value="Potential">Potential</option>
                  <option value="Prospect">Prospect</option>
                  <option value="Pipeline">Pipeline</option>
                  <option value="PO">PO</option>
                  <option value="Close">Close (ลูกค้าปฏิเสธ)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  มูลค่าสัญญา
                </label>
                <input
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pain Points และปัญหาที่ต้องการแก้ไข
                </label>
                <textarea
                  value={formData.pain_points}
                  onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.is_quality_lead}
                    onChange={(e) => setFormData({ ...formData, is_quality_lead: e.target.checked })}
                    className="mr-2 h-4 w-4"
                  />
                  เป็น Lead คุณภาพ
                </label>
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
                {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ContactHistoryModal({ customer, contacts, onClose, onAddContact }: any) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              ประวัติการติดต่อ - {customer.company_name}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showAddForm ? 'ซ่อนฟอร์ม' : '➕ บันทึกการติดต่อใหม่'}
          </button>

          {showAddForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <p className="text-gray-600">ฟอร์มเพิ่มการติดต่อ (ต้องมี AddContactForm component)</p>
            </div>
          )}

          <div className="space-y-4">
            {contacts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">ยังไม่มีประวัติการติดต่อ</p>
            ) : (
              contacts.map((contact: any) => (
                <div key={contact.contact_id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium">{contact.contact_subject}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(contact.contact_date).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {contact.contact_channel}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {contact.customer_contact_person && (
                      <p>ผู้ติดต่อ: {contact.customer_contact_person}</p>
                    )}
                    {contact.sales_person_name && (
                      <p>Sale: {contact.sales_person_name}</p>
                    )}
                    {contact.quotation_amount && (
                      <p>มูลค่าเสนอราคา: {Number(contact.quotation_amount).toLocaleString()} บาท</p>
                    )}
                    {contact.lead_status_updated && (
                      <p>อัพเดตสถานะ: {contact.lead_status_updated}</p>
                    )}
                    {contact.notes && (
                      <p className="mt-2">หมายเหตุ: {contact.notes}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}