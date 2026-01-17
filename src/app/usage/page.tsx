'use client';

import { useState, useEffect } from 'react';

interface UsageStats {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  by_provider: Record<string, {
    requests: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }>;
  by_model: Record<string, {
    requests: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }>;
  recent_usage: Array<{
    timestamp: string;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    operation: string;
  }>;
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001';

  useEffect(() => {
    loadUsageStats();
  }, [days]);

  async function loadUsageStats() {
    setLoading(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || localStorage.getItem('api_key') || 'autom-api-key-2026';
      const response = await fetch(`${API_URL}/api/v1/admin/usage/stats?days=${days}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      if (!response.ok) throw new Error('Failed to load usage stats');

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  function formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }

  function getProviderColor(provider: string): string {
    const colors: Record<string, string> = {
      gemini: 'bg-blue-100 text-blue-700',
      claude: 'bg-purple-100 text-purple-700',
      openai: 'bg-green-100 text-green-700',
    };
    return colors[provider] || 'bg-gray-100 text-gray-700';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="\1text-gray-900 dark:text-white\2">사용량 통계</h1>
          <p className="\1text-gray-500 dark:text-gray-400\2">AI 모델 사용량 및 비용 추적</p>
        </div>

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="\1border-gray-300 dark:border-gray-700\2"
        >
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
          <option value={90}>최근 90일</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="\1text-gray-500 dark:text-gray-400\2">로딩 중...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          에러: {error}
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="\1bg-white dark:bg-gray-900\2">
              <div className="flex items-center justify-between mb-2">
                <p className="\1text-gray-600 dark:text-gray-400\2">총 요청 수</p>
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <p className="\1text-gray-900 dark:text-white\2">{formatNumber(stats.total_requests)}</p>
            </div>

            <div className="\1bg-white dark:bg-gray-900\2">
              <div className="flex items-center justify-between mb-2">
                <p className="\1text-gray-600 dark:text-gray-400\2">입력 토큰</p>
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="\1text-gray-900 dark:text-white\2">{formatNumber(stats.total_input_tokens)}</p>
            </div>

            <div className="\1bg-white dark:bg-gray-900\2">
              <div className="flex items-center justify-between mb-2">
                <p className="\1text-gray-600 dark:text-gray-400\2">출력 토큰</p>
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <p className="\1text-gray-900 dark:text-white\2">{formatNumber(stats.total_output_tokens)}</p>
            </div>

            <div className="\1bg-white dark:bg-gray-900\2">
              <div className="flex items-center justify-between mb-2">
                <p className="\1text-gray-600 dark:text-gray-400\2">총 비용</p>
                <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="\1text-gray-900 dark:text-white\2">{formatCurrency(stats.total_cost_usd)}</p>
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className="\1bg-white dark:bg-gray-900\2">
            <h2 className="\1text-gray-900 dark:text-white\2">Provider별 사용량</h2>
            <div className="space-y-4">
              {Object.entries(stats.by_provider).map(([provider, data]) => (
                <div key={provider} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProviderColor(provider)}`}>
                        {provider.toUpperCase()}
                      </span>
                      <span className="\1text-gray-900 dark:text-white\2">{formatNumber(data.requests)} 요청</span>
                    </div>
                    <span className="\1text-gray-900 dark:text-white\2">{formatCurrency(data.cost_usd)}</span>
                  </div>
                  <div className="\1text-gray-600 dark:text-gray-400\2">
                    <div>입력: {formatNumber(data.input_tokens)} 토큰</div>
                    <div>출력: {formatNumber(data.output_tokens)} 토큰</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Usage */}
          <div className="\1bg-white dark:bg-gray-900\2">
            <h2 className="\1text-gray-900 dark:text-white\2">최근 사용 내역</h2>
            <div className="overflow-x-auto">
              <table className="\1divide-gray-200 dark:divide-gray-700\2">
                <thead>
                  <tr>
                    <th className="\1text-gray-500 dark:text-gray-400\2">시간</th>
                    <th className="\1text-gray-500 dark:text-gray-400\2">Provider</th>
                    <th className="\1text-gray-500 dark:text-gray-400\2">작업</th>
                    <th className="\1text-gray-500 dark:text-gray-400\2">토큰</th>
                    <th className="\1text-gray-500 dark:text-gray-400\2">비용</th>
                  </tr>
                </thead>
                <tbody className="\1divide-gray-200 dark:divide-gray-700\2">
                  {stats.recent_usage.map((usage, idx) => (
                    <tr key={idx} className="\1bg-gray-50 dark:bg-gray-800\2">
                      <td className="\1text-gray-900 dark:text-white\2">
                        {new Date(usage.timestamp).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProviderColor(usage.provider)}`}>
                          {usage.provider}
                        </span>
                      </td>
                      <td className="\1text-gray-900 dark:text-white\2">{usage.operation}</td>
                      <td className="\1text-gray-600 dark:text-gray-400\2">
                        {formatNumber(usage.input_tokens + usage.output_tokens)}
                      </td>
                      <td className="\1text-gray-900 dark:text-white\2">
                        {formatCurrency(usage.cost_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
