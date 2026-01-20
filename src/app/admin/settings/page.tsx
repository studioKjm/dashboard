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

const API_SETTINGS = [
  {
    key: 'gemini_api_key',
    category: 'ai',
    description: 'Google Gemini API Key (보고서 생성, AI 분석)',
    placeholder: 'AIzaSy...',
  },
  {
    key: 'openai_api_key',
    category: 'ai',
    description: 'OpenAI API Key (GPT 모델)',
    placeholder: 'sk-...',
  },
  {
    key: 'claude_api_key',
    category: 'ai',
    description: 'Anthropic Claude API Key',
    placeholder: 'sk-ant-...',
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
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
      const response = await fetch('http://localhost:9001/api/v1/admin/settings?category=ai', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
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

  async function saveSetting(key: string, value: string, description: string) {
    setSaving({ ...saving, [key]: true });
    setError('');
    setSuccess('');

    try {
      const token = getAccessToken();
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

      setSuccess(`${key} 저장 완료`);
      setTimeout(() => setSuccess(''), 3000);
      fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSaving({ ...saving, [key]: false });
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">시스템 설정</h1>
        <p className="text-gray-600 mt-1">AI API 키 및 시스템 구성 관리</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-600">
          {success}
        </div>
      )}

      {/* AI API Keys */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI API 키</h2>
          <p className="text-sm text-gray-600 mt-1">
            AI 기능을 사용하기 위한 API 키를 설정하세요.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {API_SETTINGS.map((apiSetting) => {
            const setting = settings[apiSetting.key];
            const currentValue = editValues[apiSetting.key] ?? setting?.value ?? '';
            const isConfigured = setting && setting.value && setting.value !== '***ENCRYPTED***';

            return (
              <div key={apiSetting.key} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {apiSetting.description}
                </label>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="password"
                      value={currentValue}
                      onChange={(e) => setEditValues({ ...editValues, [apiSetting.key]: e.target.value })}
                      placeholder={apiSetting.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {isConfigured && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        구성됨 (마지막 업데이트: {new Date(setting.updated_at).toLocaleString('ko-KR')})
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => saveSetting(apiSetting.key, currentValue, apiSetting.description)}
                    disabled={saving[apiSetting.key] || !currentValue}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving[apiSetting.key] ? '저장 중...' : '저장'}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Key: <code className="bg-gray-100 px-1 py-0.5 rounded">{apiSetting.key}</code>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">API 키 발급 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>Google Gemini:</strong>{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              https://aistudio.google.com/app/apikey
            </a>
          </li>
          <li>
            <strong>OpenAI:</strong>{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              https://platform.openai.com/api-keys
            </a>
          </li>
          <li>
            <strong>Anthropic Claude:</strong>{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              https://console.anthropic.com/settings/keys
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
