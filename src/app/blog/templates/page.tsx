'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

interface Template {
  id: number;
  name: string;
  description: string | null;
  content_type: string;
  tone: string;
  target_word_count: number;
  default_keywords: string[];
  default_tags: string[];
  structure: Record<string, unknown>;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  created_at: string;
}

const contentTypeLabels: Record<string, string> = {
  tech: '기술',
  marketing: '마케팅',
  informational: '정보성',
  newsletter: '뉴스레터',
};

const toneLabels: Record<string, string> = {
  professional: '전문적',
  casual: '캐주얼',
  friendly: '친근한',
  formal: '격식체',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    content_type: 'tech',
    tone: 'professional',
    target_word_count: 1500,
    default_keywords: '',
    default_tags: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/v1/blog/templates');
      if (response.success) {
        setTemplates(response.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setForm({
      name: '',
      description: '',
      content_type: 'tech',
      tone: 'professional',
      target_word_count: 1500,
      default_keywords: '',
      default_tags: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description || '',
      content_type: template.content_type,
      tone: template.tone,
      target_word_count: template.target_word_count,
      default_keywords: template.default_keywords.join(', '),
      default_tags: template.default_tags.join(', '),
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const body = {
        name: form.name,
        description: form.description || null,
        content_type: form.content_type,
        tone: form.tone,
        target_word_count: form.target_word_count,
        default_keywords: form.default_keywords.split(',').map(k => k.trim()).filter(Boolean),
        default_tags: form.default_tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      let response;
      if (editingTemplate) {
        response = await apiRequest(`/api/v1/blog/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        response = await apiRequest('/api/v1/blog/templates', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      if (response.success) {
        setShowModal(false);
        fetchTemplates();
      } else {
        setFormError(response.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      setFormError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await apiRequest(`/api/v1/blog/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.success) {
        fetchTemplates();
      } else {
        alert(`삭제 실패: ${response.error}`);
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await apiRequest(`/api/v1/blog/templates/${template.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !template.is_active }),
      });

      if (response.success) {
        fetchTemplates();
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
            <span>템플릿</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 템플릿</h1>
          <p className="text-gray-500">자주 사용하는 블로그 설정을 템플릿으로 저장하세요.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          템플릿 추가
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center rounded-xl bg-white shadow-sm">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">템플릿이 없습니다</h3>
            <p className="mt-1 text-gray-500">자주 사용하는 설정을 템플릿으로 저장해보세요.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              템플릿 만들기
            </button>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                    {template.description && (
                      <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      template.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {template.is_active ? '활성' : '비활성'}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {contentTypeLabels[template.content_type] || template.content_type}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    {toneLabels[template.tone] || template.tone}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {template.target_word_count}자
                  </span>
                </div>

                {template.default_keywords.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">기본 키워드: </span>
                    <span className="text-xs text-gray-700">{template.default_keywords.join(', ')}</span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>사용 {template.usage_count}회</span>
                  <span>{new Date(template.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
                <button
                  onClick={() => openEditModal(template)}
                  className="text-sm text-indigo-600 hover:text-indigo-900"
                >
                  편집
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-sm text-red-600 hover:text-red-900"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-6">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !saving && setShowModal(false)} />
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingTemplate ? '템플릿 편집' : '새 템플릿'}
              </h2>

              {formError && (
                <div className="rounded-lg bg-red-50 p-3 mb-4">
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="예: 기술 블로그 템플릿"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="템플릿에 대한 설명"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={saving}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">콘텐츠 유형</label>
                    <select
                      value={form.content_type}
                      onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={saving}
                    >
                      <option value="tech">기술 블로그</option>
                      <option value="marketing">마케팅</option>
                      <option value="informational">정보성</option>
                      <option value="newsletter">뉴스레터</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">톤</label>
                    <select
                      value={form.tone}
                      onChange={(e) => setForm({ ...form, tone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={saving}
                    >
                      <option value="professional">전문적</option>
                      <option value="casual">캐주얼</option>
                      <option value="friendly">친근한</option>
                      <option value="formal">격식체</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">목표 단어 수</label>
                  <input
                    type="number"
                    value={form.target_word_count}
                    onChange={(e) => setForm({ ...form, target_word_count: parseInt(e.target.value) || 1500 })}
                    min={500}
                    max={5000}
                    step={100}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기본 키워드 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={form.default_keywords}
                    onChange={(e) => setForm({ ...form, default_keywords: e.target.value })}
                    placeholder="예: Python, 개발, 프로그래밍"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기본 태그 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={form.default_tags}
                    onChange={(e) => setForm({ ...form, default_tags: e.target.value })}
                    placeholder="예: tech, development"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      저장 중...
                    </>
                  ) : (
                    '저장하기'
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
