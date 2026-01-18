'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setApiKey, isAuthenticated } from '@/lib/auth';

function LoginForm() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 환경변수에 API Key가 있으면 자동으로 설정하고 로그인
    const envApiKey = process.env.NEXT_PUBLIC_API_KEY;
    if (envApiKey && !isAuthenticated()) {
      setApiKey(envApiKey);
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
      return;
    }

    // 이미 로그인된 경우 홈으로 리다이렉트
    if (isAuthenticated()) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [router, searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // API 키 검증
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'}/health`, {
        headers: {
          'X-API-Key': apiKeyInput,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid API Key');
      }

      // 쿠키와 로컬 스토리지에 API 키 저장
      setApiKey(apiKeyInput);

      // 리다이렉트 경로 또는 홈으로 이동
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
      router.refresh(); // Force refresh to apply middleware
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="\1bg-white dark:bg-gray-900\2">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="\1text-gray-900 dark:text-white\2">Automation OS</h1>
          <p className="\1text-gray-500 dark:text-gray-400\2">Dashboard에 접속하려면 로그인하세요</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="\1text-gray-700 dark:text-gray-300\2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your API key"
              className="\1border-gray-300 dark:border-gray-700\2"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* Footer */}
        <div className="\1text-gray-500 dark:text-gray-400\2">
          <p>기본 API Key: <code className="\1bg-gray-100 dark:bg-gray-800\2">autom-api-key-2026</code></p>
          <p className="mt-2 text-xs">환경변수에 설정되어 있으면 자동으로 로그인됩니다</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
