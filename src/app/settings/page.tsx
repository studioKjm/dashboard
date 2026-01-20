'use client';

import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';

interface Setting {
  key: string;
  value: string | null;
  category: string | null;
  description: string | null;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface ValidationStatus {
  validating: boolean;
  valid: boolean | null;
  message: string;
}

const API_SETTINGS = [
  {
    key: 'gemini_api_key',
    provider: 'gemini',
    category: 'ai',
    title: 'Google Gemini API Key',
    description: '보고서 생성, AI 분석에 사용됩니다',
    placeholder: 'AIzaSy...',
    helpUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    key: 'openai_api_key',
    provider: 'openai',
    category: 'ai',
    title: 'OpenAI API Key',
    description: 'GPT 모델을 사용합니다 (선택사항)',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  {
    key: 'claude_api_key',
    provider: 'claude',
    category: 'ai',
    title: 'Anthropic Claude API Key',
    description: 'Claude 모델을 사용합니다 (선택사항)',
    placeholder: 'sk-ant-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, ValidationStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setError('');

    try {
      const token = getAccessToken();
      if (!token) {
        setError('로그인이 필요합니다. /login 페이지로 이동하세요.');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:9001/api/v1/admin/settings?category=ai', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('인증이 만료되었습니다. 다시 로그인하세요.');
        } else if (response.status === 403) {
          const errorData = await response.json();
          setError(errorData.detail || '권한이 없습니다.');
        } else {
          setError(`설정을 불러오는데 실패했습니다 (${response.status})`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      const settingsMap: Record<string, Setting> = {};
      data.forEach((setting: Setting) => {
        settingsMap[setting.key] = setting;
      });
      setSettings(settingsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function validateApiKey(provider: string, apiKey: string, settingKey: string) {
    if (!apiKey || apiKey.length < 10) {
      setValidationStatus({
        ...validationStatus,
        [settingKey]: {
          validating: false,
          valid: false,
          message: 'API 키를 입력하세요',
        },
      });
      return;
    }

    setValidationStatus({
      ...validationStatus,
      [settingKey]: {
        validating: true,
        valid: null,
        message: '검증 중...',
      },
    });

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다');
      }

      const response = await fetch('http://localhost:9001/api/v1/admin/validate-api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          api_key: apiKey,
        }),
      });

      const data = await response.json();

      setValidationStatus({
        ...validationStatus,
        [settingKey]: {
          validating: false,
          valid: data.valid,
          message: data.valid ? `유효한 키입니다 (${data.model})` : data.message,
        },
      });

      // 유효한 키면 자동 저장
      if (data.valid) {
        await saveSetting(settingKey, apiKey, `${provider} API Key`);

        // 입력 필드 초기화 (저장되었으므로)
        setEditValues({ ...editValues, [settingKey]: '' });

        // 성공 메시지 표시
        setSuccess(`${provider} API 키가 저장되었습니다. 이제 보고서 생성 및 PPT 생성 기능을 사용할 수 있습니다.`);
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      setValidationStatus({
        ...validationStatus,
        [settingKey]: {
          validating: false,
          valid: false,
          message: err instanceof Error ? err.message : '검증 실패',
        },
      });
    }
  }

  async function saveSetting(key: string, value: string, description: string) {
    setError('');

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다');
      }

      const response = await fetch(`http://localhost:9001/api/v1/admin/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value,
          category: 'ai',
          description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to save setting');
      }

      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI API 키 관리</h1>
          <p className="text-gray-600 mt-2">Pro Mode 및 고급 AI 기능을 사용하려면 API 키를 설정하세요</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-lg p-4 text-green-700 flex items-start gap-3 shadow-lg animate-pulse">
            <svg className="w-6 h-6 mt-0.5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-lg">{success}</p>
            </div>
          </div>
        )}

        {/* AI API Keys */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">AI API 키</h2>
            <p className="text-sm text-gray-600 mt-1">
              API 키를 입력하면 자동으로 유효성을 검사합니다
            </p>
          </div>

          <div className="p-6 space-y-8">
            {API_SETTINGS.map((apiSetting) => {
              const setting = settings[apiSetting.key];
              const currentValue = editValues[apiSetting.key] ?? '';
              const validation = validationStatus[apiSetting.key];
              // 암호화된 값이거나 실제 값이 있으면 구성됨으로 표시
              const isConfigured = setting && setting.value;

              return (
                <div key={apiSetting.key} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-1">
                        {apiSetting.title}
                      </label>
                      <p className="text-sm text-gray-600">{apiSetting.description}</p>
                    </div>
                    {isConfigured && !currentValue && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        구성됨
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="password"
                        value={currentValue}
                        onChange={(e) => {
                          setEditValues({ ...editValues, [apiSetting.key]: e.target.value });
                          // 이전 검증 상태 초기화
                          if (validationStatus[apiSetting.key]) {
                            setValidationStatus({
                              ...validationStatus,
                              [apiSetting.key]: {
                                validating: false,
                                valid: null,
                                message: '',
                              },
                            });
                          }
                        }}
                        placeholder={isConfigured && !currentValue ? '●●●●●●●● (저장됨)' : apiSetting.placeholder}
                        className="w-full px-4 py-3 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => validateApiKey(apiSetting.provider, currentValue, apiSetting.key)}
                        disabled={!currentValue || (validation?.validating ?? false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {validation?.validating ? '검증 중...' : '검증 및 저장'}
                      </button>
                    </div>

                    {/* 검증 상태 표시 */}
                    {validation && validation.message && (
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          validation.valid === true
                            ? 'text-green-600'
                            : validation.valid === false
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {validation.validating && (
                          <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {validation.valid === true && (
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {validation.valid === false && (
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span>{validation.message}</span>
                      </div>
                    )}

                    {/* 저장 정보 */}
                    {isConfigured && !currentValue && (
                      <p className="text-xs text-gray-500">
                        마지막 저장: {new Date(setting.updated_at).toLocaleString('ko-KR')}
                      </p>
                    )}

                    {/* 도움말 링크 */}
                    <a
                      href={apiSetting.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <span>API 키 발급 방법</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            사용 안내
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Google Gemini API</strong>는 무료로 사용 가능하며, 보고서 생성 기능에 필수입니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>API 키를 입력하고 "검증 및 저장" 버튼을 클릭하면 자동으로 유효성을 확인합니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>유효한 키가 확인되면 즉시 저장되며, 보고서 생성 및 PPT 생성에 사용됩니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>OpenAI와 Claude API는 선택사항이며, 향후 기능 확장 시 사용됩니다</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
