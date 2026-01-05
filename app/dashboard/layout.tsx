'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const Icons = {
  Dashboard: () => (
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
      <path d="M3 13h8V3H3v10z" />
      <path d="M13 21h8V11h-8v10z" />
      <path d="M13 3h8v6h-8V3z" />
      <path d="M3 17h8v4H3v-4z" />
    </svg>
  ),
  Customers: () => (
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Tasks: () => (
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
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Users: () => (
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-4-4h-1" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Logout: () => (
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navigation = useMemo(() => {
    const nav = [
      { name: 'Dashboard', href: '/dashboard', icon: <Icons.Dashboard /> },
      { name: 'ลูกค้า', href: '/dashboard/customers', icon: <Icons.Customers /> },
      { name: 'งาน (Tasks)', href: '/dashboard/tasks', icon: <Icons.Tasks /> },
    ];

    if (user?.role === 'manager' || user?.role === 'admin') {
      nav.push({ name: 'ผู้ใช้งาน', href: '/dashboard/users', icon: <Icons.Users /> });
    }

    return nav;
  }, [user?.role]);

  if (!user) return null;

  const roleText = (role: string) => {
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    return 'User';
  };

  const roleBadge = (role: string) => {
    if (role === 'admin') return 'bg-red-50 text-red-700 border-red-100';
    if (role === 'manager') return 'bg-purple-50 text-purple-700 border-purple-100';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-0 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3">
              {/* ✅ Logo in rounded box */}
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-md shadow-slate-100 flex items-center justify-center">
                <Image
                  src="/so-logo.png"
                  alt="SO Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>

              <div className="leading-tight">
                <div className="text-lg font-bold text-slate-800 tracking-tight">SO LEAD Management System</div>
                <div className="text-xs text-slate-400 font-medium">version 1.0 ระหว่างการทดสอบ</div>
              </div>

              <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-100">
                {user.department}
              </span>
            </div>

            {/* User / Logout */}
            <div className="flex items-center gap-3 justify-between md:justify-end">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-800">{user.full_name}</div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${roleBadge(user.role)}`}>
                    {roleText(user.role)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                title="ออกจากระบบ"
              >
                <Icons.Logout />
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="mt-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
              <nav className="flex flex-wrap gap-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                        ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }
                      `}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Page Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-0 py-6">{children}</main>
    </div>
  );
}
