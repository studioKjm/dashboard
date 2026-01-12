'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWorkflows, getRecentExecutions, getHealth } from '@/lib/api';
import { Workflow, WorkflowExecution, HealthStatus } from '@/types';

function StatsCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'indigo' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg ${colorClasses[color]} p-3 text-white`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    running: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [workflowsRes, executionsRes, healthRes] = await Promise.all([
        getWorkflows(),
        getRecentExecutions(),
        getHealth(),
      ]);

      if (workflowsRes.success && workflowsRes.data) {
        setWorkflows(workflowsRes.data);
      }
      if (executionsRes.success && executionsRes.data) {
        setExecutions(executionsRes.data);
      }
      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      }
      setIsLoading(false);
    }

    loadData();
  }, []);

  const activeWorkflows = workflows.filter(w => w.status === 'active').length;
  const totalExecutions = workflows.reduce((sum, w) => sum + w.executionCount, 0);
  const successfulExecutions = executions.filter(e => e.status === 'success').length;
  const successRate = executions.length > 0
    ? Math.round((successfulExecutions / executions.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to Turnkey Automation OS</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 워크플로우"
          value={workflows.length}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
            </svg>
          }
          color="indigo"
        />
        <StatsCard
          title="활성 워크플로우"
          value={activeWorkflows}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
            </svg>
          }
          color="green"
        />
        <StatsCard
          title="총 실행 횟수"
          value={totalExecutions}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
            </svg>
          }
          color="yellow"
        />
        <StatsCard
          title="성공률"
          value={`${successRate}%`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color={successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Workflows */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">워크플로우</h2>
            <Link href="/workflows" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              전체 보기
            </Link>
          </div>
          <div className="space-y-4">
            {workflows.slice(0, 5).map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{workflow.name}</p>
                  <p className="text-sm text-gray-500 truncate">{workflow.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={workflow.status} />
                  {workflow.lastRun && (
                    <span className="text-xs text-gray-400">{formatTimeAgo(workflow.lastRun)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Executions */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">최근 실행</h2>
            <Link href="/logs" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              전체 보기
            </Link>
          </div>
          <div className="space-y-4">
            {executions.slice(0, 5).map((execution) => (
              <div key={execution.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{execution.workflowName}</p>
                  <p className="text-sm text-gray-500">
                    {execution.duration ? `${(execution.duration / 1000).toFixed(1)}s` : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={execution.status} />
                  <span className="text-xs text-gray-400">{formatTimeAgo(execution.startedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Status */}
      {health && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">서비스 상태</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(health.services).map(([name, status]) => (
              <div key={name} className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
                <div className={`h-3 w-3 rounded-full ${
                  status === 'available' || status === 'running' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900 capitalize">{name.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500 capitalize">{status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
