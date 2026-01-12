'use client';

import { useState, useEffect } from 'react';
import { getRecentExecutions } from '@/lib/api';
import { WorkflowExecution } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms?: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function LogsPage() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  useEffect(() => {
    async function loadExecutions() {
      setIsLoading(true);
      const result = await getRecentExecutions();
      if (result.success && result.data) {
        setExecutions(result.data);
      }
      setIsLoading(false);
    }

    loadExecutions();
  }, []);

  const filteredExecutions = executions.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">실행 로그</h1>
        <p className="text-gray-500">워크플로우 실행 기록 조회</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'success', 'failed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? '전체' : status === 'success' ? '성공' : '실패'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Executions List */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="divide-y divide-gray-200">
              {filteredExecutions.map((execution) => (
                <div
                  key={execution.id}
                  onClick={() => setSelectedExecution(execution)}
                  className={`cursor-pointer p-4 hover:bg-gray-50 ${
                    selectedExecution?.id === execution.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{execution.workflowName}</p>
                      <p className="text-sm text-gray-500">{execution.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={execution.status} />
                      <span className="text-sm text-gray-500">
                        {formatDuration(execution.duration)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {formatDate(execution.startedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Execution Details */}
        <div className="lg:col-span-1">
          <div className="rounded-xl bg-white p-6 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">실행 상세</h2>

            {selectedExecution ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">워크플로우</p>
                  <p className="text-gray-900">{selectedExecution.workflowName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">상태</p>
                  <StatusBadge status={selectedExecution.status} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">시작 시간</p>
                  <p className="text-gray-900">{formatDate(selectedExecution.startedAt)}</p>
                </div>
                {selectedExecution.finishedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">종료 시간</p>
                    <p className="text-gray-900">{formatDate(selectedExecution.finishedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">소요 시간</p>
                  <p className="text-gray-900">{formatDuration(selectedExecution.duration)}</p>
                </div>

                {selectedExecution.error && (
                  <div>
                    <p className="text-sm font-medium text-red-500">오류</p>
                    <p className="text-red-600 text-sm bg-red-50 p-2 rounded">
                      {selectedExecution.error}
                    </p>
                  </div>
                )}

                {/* Stages */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">단계</p>
                  <div className="space-y-2">
                    {selectedExecution.stages.map((stage, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${
                            stage.status === 'success' ? 'bg-green-500' :
                            stage.status === 'failed' ? 'bg-red-500' :
                            stage.status === 'running' ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="text-sm text-gray-900">{stage.name}</span>
                        </div>
                        <StatusBadge status={stage.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                실행 기록을 선택하세요
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
