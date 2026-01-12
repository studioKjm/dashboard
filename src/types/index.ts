// Workflow Types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  lastRun?: string;
  nextRun?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  error?: string;
  stages: ExecutionStage[];
}

export interface ExecutionStage {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt?: string;
  finishedAt?: string;
  output?: string;
  error?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  services: Record<string, string>;
}

// PPT Types
export interface PPTFile {
  filename: string;
  size: number;
  created_at: number;
  download_url: string;
}

// Stats Types
export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  recentExecutions: WorkflowExecution[];
}
