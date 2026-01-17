'use client';

import { useState, useEffect, useMemo } from 'react';
import { getRecentExecutions, getWorkflows } from '@/lib/api';
import { WorkflowExecution, Workflow } from '@/types';

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

interface ReportData {
  period: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDuration: number;
  topWorkflows: { name: string; count: number; successRate: number }[];
  errorSummary: { error: string; count: number }[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function ReportsPage() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [execResult, workflowResult] = await Promise.all([
        getRecentExecutions(),
        getWorkflows(),
      ]);

      if (execResult.success && execResult.data) {
        setExecutions(execResult.data);
      }
      if (workflowResult.success && workflowResult.data) {
        setWorkflows(workflowResult.data);
      }
      setIsLoading(false);
    }

    loadData();
  }, []);

  // Calculate report data based on period
  const reportData = useMemo((): ReportData => {
    const now = new Date(selectedDate);
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        periodLabel = formatDate(startDate);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        periodLabel = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
        break;
      default:
        startDate = new Date();
        endDate = new Date();
        periodLabel = '';
    }

    // Filter executions by period
    const periodExecutions = executions.filter((e) => {
      const execDate = new Date(e.startedAt);
      return execDate >= startDate && execDate <= endDate;
    });

    const totalExecutions = periodExecutions.length;
    const successCount = periodExecutions.filter((e) => e.status === 'success').length;
    const failedCount = periodExecutions.filter((e) => e.status === 'failed').length;
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;
    const avgDuration =
      totalExecutions > 0
        ? periodExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / totalExecutions
        : 0;

    // Top workflows
    const workflowCounts = new Map<string, { count: number; success: number }>();
    periodExecutions.forEach((e) => {
      const current = workflowCounts.get(e.workflowName) || { count: 0, success: 0 };
      current.count++;
      if (e.status === 'success') current.success++;
      workflowCounts.set(e.workflowName, current);
    });

    const topWorkflows = Array.from(workflowCounts.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        successRate: (data.success / data.count) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Error summary
    const errorCounts = new Map<string, number>();
    periodExecutions
      .filter((e) => e.error)
      .forEach((e) => {
        const error = e.error!;
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });

    const errorSummary = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period: periodLabel,
      totalExecutions,
      successCount,
      failedCount,
      successRate,
      avgDuration,
      topWorkflows,
      errorSummary,
    };
  }, [executions, period, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리포트</h1>
          <p className="text-gray-500">워크플로우 실행 통계 및 분석</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          리포트 출력
        </button>
      </div>

      {/* Period Selector */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p === 'daily' ? '일간' : p === 'weekly' ? '주간' : '월간'}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex-1">
            <span className="text-sm text-gray-500">
              기간: <strong className="text-gray-900">{reportData.period}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">총 실행</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{reportData.totalExecutions}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">성공</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{reportData.successCount}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">실패</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{reportData.failedCount}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">성공률</p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {reportData.successRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Workflows */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 워크플로우</h2>
          {reportData.topWorkflows.length === 0 ? (
            <p className="text-center py-8 text-gray-500">데이터가 없습니다</p>
          ) : (
            <div className="space-y-4">
              {reportData.topWorkflows.map((wf, index) => (
                <div key={wf.name} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{wf.name}</p>
                    <div className="text-xs text-gray-500">
                      {wf.count}회 실행 • <span className={wf.successRate >= 90 ? 'text-green-600' : wf.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                        {wf.successRate.toFixed(0)}% 성공
                      </span>
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full ${
                          wf.successRate >= 90 ? 'bg-green-500' : wf.successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${wf.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Summary */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">에러 요약</h2>
          {reportData.errorSummary.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">에러가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportData.errorSummary.map((err, index) => (
                <div key={index} className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-red-800 truncate flex-1">{err.error}</p>
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      {err.count}회
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">성능 지표</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">평균 처리 시간</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatDuration(reportData.avgDuration)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">최고 성공률 워크플로우</p>
            <p className="mt-2 text-lg font-semibold text-gray-900 truncate">
              {reportData.topWorkflows[0]?.name || '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">활성 워크플로우</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {workflows.filter((w) => w.status === 'active').length}
            </p>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">리포트 요약</h2>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>{reportData.period}</strong> 기간 동안 총 <strong>{reportData.totalExecutions}건</strong>의
            워크플로우가 실행되었습니다. 성공률은 <strong>{reportData.successRate.toFixed(1)}%</strong>이며,
            평균 처리 시간은 <strong>{formatDuration(reportData.avgDuration)}</strong>입니다.
          </p>
          {reportData.errorSummary.length > 0 && (
            <p className="text-red-700">
              가장 빈번한 에러는 <strong>"{reportData.errorSummary[0]?.error}"</strong>로,
              {reportData.errorSummary[0]?.count}회 발생했습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
