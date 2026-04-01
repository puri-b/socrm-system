'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DEPARTMENTS = ['LBD', 'LBA', 'CR', 'LM', 'DS', 'SN'];

export default function CompleteMicrosoftProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const defaultFirst = searchParams.get('first_name') || '';
  const defaultLast = searchParams.get('last_name') || '';
  const defaultFull = searchParams.get('full_name') || '';

  const initialNames = useMemo(() => {
    if (defaultFirst || defaultLast) {
      return { first_name: defaultFirst, last_name: defaultLast };
    }
    const parts = defaultFull.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { first_name: defaultFull, last_name: '' };
    return { first_name: parts.slice(0, -1).join(' '), last_name: parts.slice(-1).join(' ') };
  }, [defaultFirst, defaultLast, defaultFull]);

  const [formData, setFormData] = useState({
    first_name: initialNames.first_name,
    last_name: initialNames.last_name,
    department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/microsoft/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...formData }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-8">
        <h1 className="text-xl font-bold text-slate-800">ยืนยันข้อมูลผู้ใช้งานครั้งแรก</h1>
        <p className="text-sm text-slate-500 mt-1">กรุณาตรวจสอบและกรอกข้อมูลก่อนเริ่มใช้งาน Microsoft SSO</p>

        {email && <div className="mt-4 text-sm text-slate-600">บัญชี Microsoft: <span className="font-semibold">{email}</span></div>}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="ชื่อ *">
            <input
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </Field>

          <Field label="นามสกุล *">
            <input
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </Field>

          <Field label="แผนก *">
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">เลือกแผนก</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all disabled:bg-slate-300"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกและเข้าสู่ระบบ'}
          </button>
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
