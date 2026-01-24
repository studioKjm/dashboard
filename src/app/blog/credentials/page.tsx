'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

interface Credential {
  id: number;
  name: string;
  platform: string;
  blog_url: string;
  is_active: boolean;
  last_verified_at: string | null;
  verification_error: string | null;
  consecutive_failures: number;
  created_at: string;
}

const platformLabels: Record<string, { label: string; color: string }> = {
  tistory: { label: '티스토리', color: 'bg-orange-100 text-orange-700' },
  naver: { label: '네이버', color: 'bg-green-100 text-green-700' },
};

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    platform: 'tistory',
    blog_url: '',
    username: '',
    password: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Verify state
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/v1/blog/credentials');
      if (response.success) {
        setCredentials(response.credentials || []);
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.blog_url.trim() || !createForm.username.trim() || !createForm.password.trim()) {
      setCreateError('모든 필드를 입력해주세요.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const response = await apiRequest('/api/v1/blog/credentials', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });

      if (response.success) {
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          platform: 'tistory',
          blog_url: '',
          username: '',
          password: '',
        });
        fetchCredentials();
      } else {
        setCreateError(response.error || '등록에 실패했습니다.');
      }
    } catch (error) {
      setCreateError('등록 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleVerify = async (id: number) => {
    setVerifyingId(id);
    try {
      const response = await apiRequest(`/api/v1/blog/credentials/${id}/verify`, {
        method: 'POST',
      });

      if (response.success) {
        alert('인증 확인 완료!');
      } else {
        alert(`인증 실패: ${response.error}`);
      }
      fetchCredentials();
    } catch (error) {
      alert('인증 확인 중 오류가 발생했습니다.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까? 이 인증정보로 게시된 글은 영향받지 않습니다.')) return;

    try {
      const response = await apiRequest(`/api/v1/blog/credentials/${id}`, {
        method: 'DELETE',
      });

      if (response.success) {
        fetchCredentials();
      } else {
        alert(`삭제 실패: ${response.error}`);
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await apiRequest(`/api/v1/blog/credentials/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.success) {
        fetchCredentials();
      }
    } catch (error) {
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/blog" className="hover:text-indigo-600">블로그</Link>
            <span>/</span>
            <span>인증 관리</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 인증 관리</h1>
          <p className="text-gray-500">티스토리, 네이버 블로그 로그인 정보를 관리합니다.</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          인증정보 추가
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">보안 안내</h3>
            <p className="mt-1 text-sm text-blue-700">
              로그인 정보는 AES-256으로 암호화되어 안전하게 저장됩니다. 5회 연속 로그인 실패 시 자동으로 비활성화됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Credentials List */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : credentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">등록된 인증정보가 없습니다</h3>
            <p className="mt-1 text-gray-500">블로그 자동 게시를 위해 인증정보를 등록해주세요.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              인증정보 추가
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  플랫폼
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  블로그 URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  최근 확인
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {credentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cred.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platformLabels[cred.platform]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {platformLabels[cred.platform]?.label || cred.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={cred.blog_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-900 truncate block max-w-xs"
                    >
                      {cred.blog_url}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(cred.id, cred.is_active)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cred.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {cred.is_active ? '활성' : '비활성'}
                    </button>
                    {cred.consecutive_failures > 0 && (
                      <span className="ml-2 text-xs text-red-500">
                        (실패 {cred.consecutive_failures}회)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cred.last_verified_at
                      ? new Date(cred.last_verified_at).toLocaleString('ko-KR')
                      : '확인 안됨'}
                    {cred.verification_error && (
                      <div className="text-xs text-red-500 truncate max-w-xs" title={cred.verification_error}>
                        {cred.verification_error}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleVerify(cred.id)}
                        disabled={verifyingId === cred.id}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        {verifyingId === cred.id ? '확인 중...' : '확인'}
                      </button>
                      <button
                        onClick={() => handleDelete(cred.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-6">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !creating && setShowCreateModal(false)} />
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">인증정보 추가</h2>

              {createError && (
                <div className="rounded-lg bg-red-50 p-3 mb-4">
                  <p className="text-sm text-red-700">{createError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="예: 내 티스토리"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">플랫폼</label>
                  <select
                    value={createForm.platform}
                    onChange={(e) => setCreateForm({ ...createForm, platform: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={creating}
                  >
                    <option value="tistory">티스토리</option>
                    <option value="naver">네이버 블로그</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">블로그 URL *</label>
                  <input
                    type="url"
                    value={createForm.blog_url}
                    onChange={(e) => setCreateForm({ ...createForm, blog_url: e.target.value })}
                    placeholder="https://myblog.tistory.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {createForm.platform === 'tistory' ? '카카오 이메일' : '네이버 아이디'} *
                  </label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder={createForm.platform === 'tistory' ? 'kakao@example.com' : 'naver_id'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="********"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={creating}
                >
                  취소
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      등록 중...
                    </>
                  ) : (
                    '등록하기'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
