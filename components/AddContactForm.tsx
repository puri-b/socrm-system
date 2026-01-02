'use client';

import { useState, useEffect } from 'react';

interface AddContactFormProps {
  customerId: number;
  onSuccess: () => void;
}

export default function AddContactForm({ customerId, onSuccess }: AddContactFormProps) {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    contact_date: new Date().toISOString().split('T')[0],
    contact_subject: '',
    contact_channel: '',
    customer_contact_person: '',
    quotation_amount: '',
    next_followup_date: '',
    notes: '',
    lead_status_updated: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customer_id: customerId
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        setFormData({
          contact_date: new Date().toISOString().split('T')[0],
          contact_subject: '',
          contact_channel: '',
          customer_contact_person: '',
          quotation_amount: '',
          next_followup_date: '',
          notes: '',
          lead_status_updated: ''
        });
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
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
      <h4 className="font-semibold text-lg">บันทึกการติดต่อใหม่</h4>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            วันที่ติดต่อ *
          </label>
          <input
            type="date"
            value={formData.contact_date}
            onChange={(e) => setFormData({ ...formData, contact_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            หัวข้อการติดต่อ *
          </label>
          <select
            value={formData.contact_subject}
            onChange={(e) => setFormData({ ...formData, contact_subject: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">-- เลือก --</option>
            <option value="นำเสนอบริการ">นำเสนอบริการ</option>
            <option value="ติดตามงาน">ติดตามงาน</option>
            <option value="เข้าพบ">เข้าพบ</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ช่องทางการติดต่อ *
          </label>
          <select
            value={formData.contact_channel}
            onChange={(e) => setFormData({ ...formData, contact_channel: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">-- เลือก --</option>
            <option value="โทร">โทร</option>
            <option value="vdo call">VDO Call</option>
            <option value="พบหน้า">พบหน้า</option>
            <option value="email">Email</option>
            <option value="line">Line</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ผู้ติดต่อ (ฝั่งลูกค้า)
          </label>
          <input
            type="text"
            value={formData.customer_contact_person}
            onChange={(e) => setFormData({ ...formData, customer_contact_person: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            อัพเดตสถานะ Lead
          </label>
          <select
            value={formData.lead_status_updated}
            onChange={(e) => setFormData({ ...formData, lead_status_updated: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- ไม่เปลี่ยน --</option>
            <option value="Lead">Lead</option>
            <option value="Potential">Potential</option>
            <option value="Prospect">Prospect</option>
            <option value="Pipeline">Pipeline</option>
            <option value="PO">PO</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            มูลค่าการเสนอราคา (บาท)
          </label>
          <input
            type="number"
            value={formData.quotation_amount}
            onChange={(e) => setFormData({ ...formData, quotation_amount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            วันติดตามครั้งถัดไป
          </label>
          <input
            type="date"
            value={formData.next_followup_date}
            onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            หมายเหตุ
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="รายละเอียดเพิ่มเติม..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกการติดต่อ'}
        </button>
      </div>
    </form>
  );
}