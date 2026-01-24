import { ApiResponse, HealthStatus, PPTFile, Workflow, WorkflowExecution } from '@/types';
import { getApiKey, getAccessToken, refreshAccessToken, clearAuthTokens } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001';
const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5678';

function formatApiError(detail: unknown): string {
  // FastAPI 유효성 검사 에러 배열 처리
  if (Array.isArray(detail)) {
    return detail
      .map((err) => {
        if (typeof err === 'object' && err !== null && 'msg' in err) {
          const loc = (err as { loc?: string[] }).loc;
          const field = loc ? loc[loc.length - 1] : 'unknown';
          return `${field}: ${(err as { msg: string }).msg}`;
        }
        return String(err);
      })
      .join(', ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  return 'Request failed';
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<ApiResponse<T>> {
  try {
    // 인증 헤더 우선순위: JWT > API Key
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const accessToken = getAccessToken();
    if (accessToken) {
      // JWT 토큰이 있으면 Bearer 인증 사용
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // JWT 토큰이 없으면 API Key 사용 (하위 호환성)
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || getApiKey() || 'autom-api-key-2026';
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // 401 Unauthorized 처리
      if (response.status === 401 && !isRetry) {
        // JWT 토큰이 만료된 경우 자동 갱신 시도
        if (accessToken) {
          console.log('Access token expired, attempting refresh...');
          const newAccessToken = await refreshAccessToken();

          if (newAccessToken) {
            // 토큰 갱신 성공 시 요청 재시도
            console.log('Token refreshed successfully, retrying request...');
            return fetchApi<T>(endpoint, options, true);
          } else {
            // 토큰 갱신 실패 시 모든 토큰 삭제
            console.warn('Token refresh failed, clearing tokens...');
            clearAuthTokens();

            // 로그인 페이지로 리다이렉트 (브라우저 환경에서만)
            if (typeof window !== 'undefined') {
              window.location.href = '/login?session_expired=true';
            }
          }
        } else {
          // API Key 인증 실패
          if (typeof window !== 'undefined') {
            const storedKey = getApiKey();
            // Only clear if localStorage key is different from env var
            if (storedKey && storedKey !== process.env.NEXT_PUBLIC_API_KEY) {
              localStorage.removeItem('api_key');
              console.warn('Invalid API key removed from localStorage. Please refresh the page.');
            }
          }
        }
      }

      return {
        success: false,
        error: formatApiError(data.detail) || data.error || 'Request failed',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Generic API request function for new endpoints
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetchApi<any>(endpoint, options);
  if (response.success && response.data) {
    return response.data;
  }
  return {
    success: false,
    error: response.error || 'Request failed',
  };
}

// Health Check
export async function getHealth(): Promise<ApiResponse<HealthStatus>> {
  return fetchApi<HealthStatus>('/health');
}

// PPT APIs
export async function listPPTFiles(): Promise<ApiResponse<{ files: PPTFile[] }>> {
  return fetchApi<{ files: PPTFile[] }>('/api/ppt/list');
}

export async function generatePPT(slides: any[], title: string, filename: string): Promise<ApiResponse<any>> {
  return fetchApi('/api/ppt/generate', {
    method: 'POST',
    body: JSON.stringify({ slides, title, filename }),
  });
}

export async function generatePPTFromPrompt(
  prompt: string,
  maxSlides: number = 10,
  aiProvider: string = 'gemini'
): Promise<ApiResponse<any>> {
  return fetchApi('/api/ppt/generate-from-prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt, max_slides: maxSlides, ai_provider: aiProvider }),
  });
}

// PPT Pro Mode APIs
export async function getProStatus(): Promise<ApiResponse<{
  pro_available: boolean;
  anthropic_api_key_configured: boolean;
  node_js_available: boolean;
  estimated_cost_per_generation: string;
  features: string[];
}>> {
  return fetchApi('/api/ppt/pro/status');
}

export async function generatePPTPro(
  topic: string,
  maxSlides: number = 12,
  context: string = '',
  theme: string = 'corporate'
): Promise<ApiResponse<{
  success: boolean;
  file_path?: string;
  download_url?: string;
  slides_count: number;
  research_summary: string;
  stages_completed: string[];
  token_usage: { input: number; output: number };
  error?: string;
}>> {
  return fetchApi('/api/ppt/generate-pro', {
    method: 'POST',
    body: JSON.stringify({ topic, max_slides: maxSlides, context, theme }),
  });
}

// Mock data for workflows (until n8n API is integrated)
export async function getWorkflows(): Promise<ApiResponse<Workflow[]>> {
  // TODO: Integrate with n8n API
  const mockWorkflows: Workflow[] = [
    {
      id: '1',
      name: 'Google Form → Notion',
      description: '구글 폼 제출 시 Notion DB에 자동 등록',
      status: 'active',
      lastRun: new Date(Date.now() - 3600000).toISOString(),
      executionCount: 42,
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-01-11T15:30:00Z',
    },
    {
      id: '2',
      name: 'PDF 파싱 자동화',
      description: 'PDF 업로드 시 자동 파싱 및 요약',
      status: 'active',
      lastRun: new Date(Date.now() - 7200000).toISOString(),
      executionCount: 15,
      createdAt: '2026-01-08T14:00:00Z',
      updatedAt: '2026-01-11T12:00:00Z',
    },
    {
      id: '3',
      name: 'PPT 자동 생성',
      description: 'AI 기반 프레젠테이션 생성',
      status: 'inactive',
      executionCount: 8,
      createdAt: '2026-01-05T09:00:00Z',
      updatedAt: '2026-01-09T18:00:00Z',
    },
  ];

  return { success: true, data: mockWorkflows };
}

export async function getRecentExecutions(): Promise<ApiResponse<WorkflowExecution[]>> {
  // TODO: Integrate with execution log storage
  const mockExecutions: WorkflowExecution[] = [
    {
      id: 'exec-001',
      workflowId: '1',
      workflowName: 'Google Form → Notion',
      status: 'success',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      finishedAt: new Date(Date.now() - 3595000).toISOString(),
      duration: 5000,
      stages: [
        { name: 'Form Processing', status: 'success' },
        { name: 'AI Analysis', status: 'success' },
        { name: 'Notion Creation', status: 'success' },
        { name: 'Slack Notification', status: 'success' },
      ],
    },
    {
      id: 'exec-002',
      workflowId: '2',
      workflowName: 'PDF 파싱 자동화',
      status: 'success',
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      finishedAt: new Date(Date.now() - 7190000).toISOString(),
      duration: 10000,
      stages: [
        { name: 'File Upload', status: 'success' },
        { name: 'PDF Parsing', status: 'success' },
        { name: 'AI Summary', status: 'success' },
      ],
    },
    {
      id: 'exec-003',
      workflowId: '1',
      workflowName: 'Google Form → Notion',
      status: 'failed',
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      finishedAt: new Date(Date.now() - 86398000).toISOString(),
      duration: 2000,
      error: 'Notion API rate limit exceeded',
      stages: [
        { name: 'Form Processing', status: 'success' },
        { name: 'AI Analysis', status: 'success' },
        { name: 'Notion Creation', status: 'failed', error: 'Rate limit exceeded' },
      ],
    },
  ];

  return { success: true, data: mockExecutions };
}

// n8n API integration
export async function getN8nWorkflows(): Promise<ApiResponse<any[]>> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch n8n workflows' };
    }

    const data = await response.json();
    return { success: true, data: data.data || [] };
  } catch (error) {
    return { success: false, error: 'n8n connection failed' };
  }
}
