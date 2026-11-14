'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function StudioLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('from') || '/studio';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(redirectUrl);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Mật khẩu không chính xác.');
      }
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#3E2723]/10 bg-white p-8 shadow-xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A96B54]/10 text-[#A96B54]">
        <Lock className="h-7 w-7" />
      </div>

      <h1 className="mt-6 text-center font-editorial text-2xl font-bold sm:text-3xl">
        Mở khóa Portfolio Studio
      </h1>
      <p className="mt-2 text-center text-xs text-[#3E2723]/70 sm:text-sm">
        Trang Studio được bảo vệ. Vui lòng nhập mật khẩu quản trị để truy cập và chỉnh sửa Portfolio.
      </p>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E2723]/80">
            Mật khẩu truy cập
          </label>
          <input
            type="password"
            required
            autoFocus
            placeholder="Nhập mật khẩu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#A96B54] focus:bg-white focus:ring-2 focus:ring-[#A96B54]/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A96B54] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#8f5742] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>Mở khóa ngay</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-stone-100 pt-4 text-center">
        <p className="text-[11px] text-stone-400">
          AI Portfolio Factory &bull; Secure Studio Protection
        </p>
      </div>
    </div>
  );
}

export default function StudioLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF3E6] px-4 text-[#3E2723]">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-[#A96B54]" />}>
        <StudioLoginForm />
      </Suspense>
    </div>
  );
}
