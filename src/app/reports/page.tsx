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
          <h1 className="\1text-gray-900 dark:text-white\2">리포트</h1>
          <p className="\1text-gray-500 dark:text-gray-400\2">워크플로우 실행 통계 및 분석</p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          리포트 출력
        </button>
      </div>

      {/* Period Selector */}
      <div className="\1bg-white dark:bg-gray-900\2">
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          className="\1border-gray-300 dark:border-gray-700\2"
        />
        <span className="\1text-gray-500 dark:text-gray-400\2">
          기간: <strong>{reportData.period}</strong>
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="\1bg-white dark:bg-gray-900\2">
          <p className="\1text-gray-500 dark:text-gray-400\2">총 실행</p>
          <p className="\1text-gray-900 dark:text-white\2">{reportData.totalExecutions}</p>
        </div>
        <div className="\1bg-white dark:bg-gray-900\2">
          <p className="\1text-gray-500 dark:text-gray-400\2">성공</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{reportData.successCount}</p>
        </div>
        <div className="\1bg-white dark:bg-gray-900\2">
          <p className="\1text-gray-500 dark:text-gray-400\2">실패</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{reportData.failedCount}</p>
        </div>
        <div className="\1bg-white dark:bg-gray-900\2">
          <p className="\1text-gray-500 dark:text-gray-400\2">성공률</p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {reportData.successRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Workflows */}
        <div className="\1bg-white dark:bg-gray-900\2">
          <h2 className="\1text-gray-900 dark:text-white\2">Top 워크플로우</h2>
          {reportData.topWorkflows.length === 0 ? (
            <p className="\1text-gray-500 dark:text-gray-400\2">데이터가 없습니다</p>
          ) : (
            <div className="space-y-4">
              {reportData.topWorkflows.map((wf, index) => (
                <div key={wf.name} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="\1text-gray-900 dark:text-white\2">{wf.name}</p>
                    <div className="\1text-gray-500 dark:text-gray-400\2">
                      <span>{wf.count}회 실행</span>
                      <span>•</span>
                      <span className={wf.successRate >= 90 ? 'text-green-600' : wf.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
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
        <div className="\1bg-white dark:bg-gray-900\2">
          <h2 className="\1text-gray-900 dark:text-white\2">에러 요약</h2>
          {reportData.errorSummary.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="\1text-gray-500 dark:text-gray-400\2">에러가 없습니다</p>
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
      <div className="\1bg-white dark:bg-gray-900\2">
        <h2 className="\1text-gray-900 dark:text-white\2">성능 지표</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="text-center">
            <p className="\1text-gray-500 dark:text-gray-400\2">평균 처리 시간</p>
            <p className="\1text-gray-900 dark:text-white\2">
              {formatDuration(reportData.avgDuration)}
            </p>
          </div>
          <div className="text-center">
            <p className="\1text-gray-500 dark:text-gray-400\2">최고 성공률 워크플로우</p>
            <p className="\1text-gray-900 dark:text-white\2">
              {reportData.topWorkflows[0]?.name || '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="\1text-gray-500 dark:text-gray-400\2">활성 워크플로우</p>
            <p className="\1text-gray-900 dark:text-white\2">
              {workflows.filter((w) => w.status === 'active').length}
            </p>
          </div>
        </div>
      </div>

      {/* Print-friendly summary */}
      <div className="\1bg-white dark:bg-gray-900\2">
        <h2 className="\1text-gray-900 dark:text-white\2">리포트 요약</h2>
        <div className="\1text-gray-700 dark:text-gray-300\2">
          <p>
            <strong>{reportData.period}</strong> 기간 동안 총 <strong>{reportData.totalExecutions}건</strong>의
            워크플로우가 실행되었습니다. 성공률은 <strong>{reportData.successRate.toFixed(1)}%</strong>이며,
            평균 처리 시간은 <strong>{formatDuration(reportData.avgDuration)}</strong>입니다.
          </p>
          {reportData.errorSummary.length > 0 && (
            <p>
              가장 빈번한 에러는 <strong>"{reportData.errorSummary[0]?.error}"</strong>로,
              {reportData.errorSummary[0]?.count}회 발생했습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
