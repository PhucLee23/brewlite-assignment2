'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth, type SessionUser } from '@/store/auth';

interface Props {
  mode: 'login' | 'register';
}

/** Chỉ cho quay lại đường dẫn nội bộ, tránh bị chuyển hướng sang trang ngoài */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

// FR-06, FR-07: form đăng nhập / đăng ký, kiểm tra dữ liệu ngay trên giao diện trước khi gửi
export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(params.get('expired') ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email không hợp lệ';
    if (mode === 'register') {
      if (password.length < 6 || password.length > 72) return 'Mật khẩu phải dài từ 6 đến 72 ký tự';
      if (fullName.trim().length < 2 || fullName.trim().length > 100) return 'Họ tên phải dài từ 2 đến 100 ký tự';
    } else if (!password) {
      return 'Vui lòng nhập mật khẩu';
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) return setError(invalid);
    setSubmitting(true);
    setError(null);
    try {
      const body = mode === 'login' ? { email, password } : { email, password, fullName };
      const res = await api<{ accessToken: string; user: SessionUser }>(`/auth/${mode}`, { method: 'POST', body });
      setSession(res.accessToken, res.user);
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  const input = 'mt-1 block min-h-12 w-full rounded-xl border border-latte bg-white px-3 text-base focus:border-crema focus:ring-2 focus:ring-crema/30 focus:outline-none';
  const other = mode === 'login' ? '/register' : '/login';

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-sm space-y-4 rounded-2xl bg-white p-5 border border-latte">
      <h1 className="text-2xl font-bold">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
      {mode === 'register' && (
        <label className="block text-sm font-medium">
          Họ tên
          <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </label>
      )}
      <label className="block text-sm font-medium">
        Email
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">
        Mật khẩu
        <input
          className={input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </label>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-xl bg-espresso font-semibold text-white hover:bg-roast disabled:opacity-50"
      >
        {submitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </button>
      <p className="text-center text-sm">
        {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
        <Link href={`${other}?next=${encodeURIComponent(next)}`} className="font-semibold text-roast underline">
          {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
        </Link>
      </p>
    </form>
  );
}
