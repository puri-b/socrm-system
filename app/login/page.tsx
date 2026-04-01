'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const Icons = {
  Mail: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16v16H4z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  ),
  Microsoft: () => (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <rect width="10" height="10" x="1" y="1" fill="#f25022" />
      <rect width="10" height="10" x="12" y="1" fill="#7fba00" />
      <rect width="10" height="10" x="1" y="12" fill="#00a4ef" />
      <rect width="10" height="10" x="12" y="12" fill="#ffb900" />
    </svg>
  ),
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'microsoft_login_failed') setError('เข้าสู่ระบบผ่าน Microsoft ไม่สำเร็จ');
    if (err === 'microsoft_account_not_allowed') setError('บัญชี Microsoft นี้ยังไม่ได้รับสิทธิ์ใช้งานระบบ');
    if (err === 'microsoft_email_missing') setError('ไม่พบอีเมลจากบัญชี Microsoft กรุณาติดต่อผู้ดูแลระบบ');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = () => {
    setMsLoading(true);
    window.location.href = '/api/auth/microsoft/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-md shadow-slate-100 flex items-center justify-center">
            <Image src="/so-logo.png" alt="SO Logo" width={48} height={48} className="w-full h-full object-cover" priority />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-bold text-slate-800 tracking-tight">SO LEAD Management System</div>
            <div className="text-xs text-slate-400 font-medium">Sign in to continue</div>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-7">
            <h1 className="text-lg font-bold text-slate-800">เข้าสู่ระบบ</h1>
            <p className="text-sm text-slate-500 mt-1">กรุณากรอกข้อมูลเพื่อเข้าสู่ระบบ</p>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={msLoading}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-60"
            >
              <Icons.Microsoft />
              {msLoading ? 'กำลังไปยัง Microsoft...' : 'เข้าสู่ระบบด้วย Microsoft'}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs font-medium text-slate-400">หรือเข้าสู่ระบบด้วยอีเมลของระบบ</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="อีเมล">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Mail /></div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    autoComplete="email"
                  />
                </div>
              </Field>

              <Field label="รหัสผ่าน">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Lock /></div>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all disabled:bg-slate-300"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                {!loading && <Icons.ArrowRight />}
              </button>
            </form>
          </div>
        </div>
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
