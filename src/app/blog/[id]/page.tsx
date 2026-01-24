'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

interface BlogPost {
  id: number;
  title: string;
  content_html: string;
  content_markdown: string | null;
  excerpt: string | null;
  content_type: string;
  generation_mode: string;
  topic: string | null;
  keywords: string[];
  tags: string[];
  category: string | null;
  meta_title: string | null;
  meta_description: string | null;
  seo_score: number | null;
  seo_analysis: {
    breakdown?: Record<string, number>;
    improvements?: string[];
    keyword_density?: Record<string, number>;
  };
  status: string;
  published_url: string | null;
  published_at: string | null;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  created_at: string;
  updated_at: string | null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-gray-100 text-gray-700' },
  pending_review: { label: '검토 대기', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '승인됨', color: 'bg-blue-100 text-blue-700' },
  publishing: { label: '게시 중', color: 'bg-indigo-100 text-indigo-700' },
  published: { label: '게시됨', color: 'bg-green-100 text-green-700' },
  failed: { label: '실패', color: 'bg-red-100 text-red-700' },
  scheduled: { label: '예약됨', color: 'bg-purple-100 text-purple-700' },
};

export default function BlogPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content_html: '',
    excerpt: '',
    meta_title: '',
    meta_description: '',
    keywords: '',
    tags: '',
    category: '',
  });

  // Revise Modal
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revising, setRevising] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState('');

  useEffect(() => {
    fetchPost();
  }, [resolvedParams.id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/v1/blog/posts/${resolvedParams.id}`);
      if (response.success && response.post) {
        setPost(response.post);
        setEditForm({
          title: response.post.title,
          content_html: response.post.content_html,
          excerpt: response.post.excerpt || '',
          meta_title: response.post.meta_title || '',
          meta_description: response.post.meta_description || '',
          keywords: (response.post.keywords || []).join(', '),
          tags: (response.post.tags || []).join(', '),
          category: response.post.category || '',
        });
      } else {
        router.push('/blog');
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
      router.push('/blog');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!post) return;

    setSaving(true);
    try {
      const response = await apiRequest(`/api/v1/blog/posts/${post.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editForm.title,
          content_html: editForm.content_html,
          excerpt: editForm.excerpt || null,
          meta_title: editForm.meta_title || null,
          meta_description: editForm.meta_description || null,
          keywords: editForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
          tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          category: editForm.category || null,
        }),
      });

      if (response.success) {
        setEditMode(false);
        fetchPost();
      } else {
        alert(`저장 실패: ${response.error}`);
      }
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevise = async () => {
    if (!post || !revisionRequest.trim()) return;

    setRevising(true);
    try {
      const response = await apiRequest(`/api/v1/blog/posts/${post.id}/revise`, {
        method: 'POST',
        body: JSON.stringify({
          revision_request: revisionRequest,
        }),
      });

      if (response.success) {
        setShowReviseModal(false);
        setRevisionRequest('');
        fetchPost();
        alert('수정이 완료되었습니다.');
      } else {
        alert(`수정 실패: ${response.error}`);
      }
    } catch (error) {
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setRevising(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await apiRequest(`/api/v1/blog/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (response.success) {
        router.push('/blog');
      } else {
        alert(`삭제 실패: ${response.error}`);
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/blog" className="hover:text-indigo-600">블로그</Link>
            <span>/</span>
            <span>포스트 상세</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 truncate max-w-2xl">{post.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[post.status]?.color || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[post.status]?.label || post.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.published_url && (
            <a
              href={post.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              블로그 보기
            </a>
          )}
          <button
            onClick={() => setShowReviseModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI 수정
          </button>
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
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
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              편집
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">콘텐츠</h2>
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">본문 (HTML)</label>
                  <textarea
                    value={editForm.content_html}
                    onChange={(e) => setEditForm({ ...editForm, content_html: e.target.value })}
                    rows={20}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">요약</label>
                  <textarea
                    value={editForm.excerpt}
                    onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="prose prose-indigo max-w-none">
                <div dangerouslySetInnerHTML={{ __html: post.content_html }} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Score */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">SEO 분석</h2>
            <div className="text-center mb-4">
              <span className={`text-4xl font-bold ${post.seo_score ? getSeoScoreColor(post.seo_score) : 'text-gray-400'}`}>
                {post.seo_score ?? '-'}
              </span>
              <span className="text-gray-500 text-lg"> / 100</span>
            </div>
            {post.seo_analysis?.breakdown && (
              <div className="space-y-3">
                {Object.entries(post.seo_analysis.breakdown).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                    <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {post.seo_analysis?.improvements && post.seo_analysis.improvements.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">개선 제안</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {post.seo_analysis.improvements.slice(0, 3).map((improvement, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <svg className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">메타 정보</h2>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메타 제목</label>
                  <input
                    type="text"
                    value={editForm.meta_title}
                    onChange={(e) => setEditForm({ ...editForm, meta_title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메타 설명</label>
                  <textarea
                    value={editForm.meta_description}
                    onChange={(e) => setEditForm({ ...editForm, meta_description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">키워드 (쉼표 구분)</label>
                  <input
                    type="text"
                    value={editForm.keywords}
                    onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표 구분)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">메타 제목</dt>
                  <dd className="mt-1 text-gray-900">{post.meta_title || '-'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">메타 설명</dt>
                  <dd className="mt-1 text-gray-900">{post.meta_description || '-'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">키워드</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {post.keywords && post.keywords.length > 0 ? (
                      post.keywords.map((keyword, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">태그</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {post.tags && post.tags.length > 0 ? (
                      post.tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">카테고리</dt>
                  <dd className="mt-1 text-gray-900">{post.category || '-'}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">통계</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">생성 모드</dt>
                <dd className="text-gray-900">{post.generation_mode === 'full_auto' ? 'AI 자동' : 'AI 보조'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">입력 토큰</dt>
                <dd className="text-gray-900">{post.input_tokens.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">출력 토큰</dt>
                <dd className="text-gray-900">{post.output_tokens.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">비용</dt>
                <dd className="text-gray-900">${post.total_cost_usd.toFixed(4)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">생성일</dt>
                <dd className="text-gray-900">{new Date(post.created_at).toLocaleString('ko-KR')}</dd>
              </div>
              {post.published_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">게시일</dt>
                  <dd className="text-gray-900">{new Date(post.published_at).toLocaleString('ko-KR')}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-lg font-medium text-red-600 mb-4">위험 영역</h2>
            <button
              onClick={handleDelete}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              포스트 삭제
            </button>
          </div>
        </div>
      </div>

      {/* Revise Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-6">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !revising && setShowReviseModal(false)} />
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI 수정 요청</h2>
              <p className="text-sm text-gray-500 mb-4">
                수정하고 싶은 내용을 자세히 설명해주세요. AI가 내용을 분석하고 수정합니다.
              </p>

              <textarea
                value={revisionRequest}
                onChange={(e) => setRevisionRequest(e.target.value)}
                placeholder="예: SEO 점수를 높이고, 도입부를 더 매력적으로 수정해주세요. 코드 예제를 추가해주세요."
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={revising}
              />

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowReviseModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={revising}
                >
                  취소
                </button>
                <button
                  onClick={handleRevise}
                  disabled={revising || !revisionRequest.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {revising ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      수정 중...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      수정 요청
                    </>
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
