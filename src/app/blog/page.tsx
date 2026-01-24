'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

interface BlogPost {
  id: number;
  title: string;
  content_type: string;
  status: string;
  seo_score: number | null;
  published_url: string | null;
  created_at: string;
  topic: string | null;
  keywords: string[];
}

interface BlogStats {
  total_posts: number;
  published: number;
  drafts: number;
  avg_seo_score: number;
}

const contentTypeLabels: Record<string, string> = {
  tech: '기술',
  marketing: '마케팅',
  informational: '정보성',
  newsletter: '뉴스레터',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-gray-100 text-gray-700' },
  pending_review: { label: '검토 대기', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '승인됨', color: 'bg-blue-100 text-blue-700' },
  publishing: { label: '게시 중', color: 'bg-indigo-100 text-indigo-700' },
  published: { label: '게시됨', color: 'bg-green-100 text-green-700' },
  failed: { label: '실패', color: 'bg-red-100 text-red-700' },
  scheduled: { label: '예약됨', color: 'bg-purple-100 text-purple-700' },
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<BlogStats>({
    total_posts: 0,
    published: 0,
    drafts: 0,
    avg_seo_score: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');

  // Generate Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    topic: '',
    content_type: 'tech',
    keywords: '',
    word_count: 1500,
    tone: 'professional',
  });
  const [generateResult, setGenerateResult] = useState<{
    success: boolean;
    title?: string;
    seo_score?: number;
    cost_estimate?: number;
    error?: string;
  } | null>(null);

  // Publish Modal
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingPostId, setPublishingPostId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<{ id: number; name: string; platform: string }[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchCredentials();
  }, [statusFilter, contentTypeFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (contentTypeFilter) params.append('content_type', contentTypeFilter);

      const response = await apiRequest(`/api/v1/blog/posts?${params.toString()}`);
      if (response.success) {
        setPosts(response.posts || []);

        // Calculate stats
        const allPosts = response.posts || [];
        const published = allPosts.filter((p: BlogPost) => p.status === 'published').length;
        const drafts = allPosts.filter((p: BlogPost) => p.status === 'draft').length;
        const scores = allPosts.filter((p: BlogPost) => p.seo_score).map((p: BlogPost) => p.seo_score!);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

        setStats({
          total_posts: response.total || allPosts.length,
          published,
          drafts,
          avg_seo_score: avgScore,
        });
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentials = async () => {
    try {
      const response = await apiRequest('/api/v1/blog/credentials');
      if (response.success) {
        setCredentials(response.credentials || []);
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.topic.trim()) return;

    setGenerating(true);
    setGenerateResult(null);

    try {
      const response = await apiRequest('/api/v1/blog/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: generateForm.topic,
          content_type: generateForm.content_type,
          keywords: generateForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
          word_count: generateForm.word_count,
          tone: generateForm.tone,
        }),
      });

      setGenerateResult({
        success: response.success,
        title: response.title,
        seo_score: response.seo_score,
        cost_estimate: response.cost_estimate,
        error: response.error,
      });

      if (response.success) {
        fetchPosts();
      }
    } catch (error) {
      setGenerateResult({
        success: false,
        error: error instanceof Error ? error.message : '생성 중 오류가 발생했습니다.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!publishingPostId || !selectedCredentialId) return;

    setPublishing(true);
    try {
      const response = await apiRequest('/api/v1/blog/publish', {
        method: 'POST',
        body: JSON.stringify({
          post_id: publishingPostId,
          credential_id: selectedCredentialId,
          headless: true,
        }),
      });

      if (response.success) {
        alert(`게시 완료!\nURL: ${response.published_url}`);
        setShowPublishModal(false);
        fetchPosts();
      } else {
        alert(`게시 실패: ${response.error}`);
      }
    } catch (error) {
      alert('게시 중 오류가 발생했습니다.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await apiRequest(`/api/v1/blog/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        fetchPosts();
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const openPublishModal = (postId: number) => {
    setPublishingPostId(postId);
    setSelectedCredentialId(credentials.length > 0 ? credentials[0].id : null);
    setShowPublishModal(true);
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 자동화</h1>
          <p className="text-gray-500">AI로 블로그 글을 생성하고 자동 게시하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/blog/credentials"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            인증 관리
          </Link>
          <Link
            href="/blog/templates"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            템플릿
          </Link>
          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGenerateResult(null);
              setGenerateForm({
                topic: '',
                content_type: 'tech',
                keywords: '',
                word_count: 1500,
                tone: 'professional',
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            AI 글 생성
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">전체 포스트</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_posts}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">게시됨</div>
              <div className="text-2xl font-bold text-gray-900">{stats.published}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">초안</div>
              <div className="text-2xl font-bold text-gray-900">{stats.drafts}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">평균 SEO 점수</div>
              <div className={`text-2xl font-bold ${stats.avg_seo_score > 0 ? getSeoScoreColor(stats.avg_seo_score) : 'text-gray-900'}`}>
                {stats.avg_seo_score > 0 ? `${stats.avg_seo_score}점` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">모든 상태</option>
            <option value="draft">초안</option>
            <option value="published">게시됨</option>
            <option value="pending_review">검토 대기</option>
            <option value="failed">실패</option>
          </select>
          <select
            value={contentTypeFilter}
            onChange={(e) => setContentTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">모든 유형</option>
            <option value="tech">기술</option>
            <option value="marketing">마케팅</option>
            <option value="informational">정보성</option>
            <option value="newsletter">뉴스레터</option>
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">포스트가 없습니다</h3>
            <p className="mt-1 text-gray-500">AI로 첫 번째 블로그 글을 생성해보세요.</p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              글 생성하기
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SEO 점수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {post.title}
                    </div>
                    {post.keywords && post.keywords.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {post.keywords.slice(0, 3).map((keyword, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {contentTypeLabels[post.content_type] || post.content_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[post.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[post.status]?.label || post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {post.seo_score !== null ? (
                      <span className={`text-sm font-medium ${getSeoScoreColor(post.seo_score)}`}>
                        {post.seo_score}점
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {post.published_url ? (
                        <a
                          href={post.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          보기
                        </a>
                      ) : post.status === 'draft' && credentials.length > 0 ? (
                        <button
                          onClick={() => openPublishModal(post.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          게시
                        </button>
                      ) : null}
                      <Link href={`/blog/${post.id}`} className="text-indigo-600 hover:text-indigo-900">
                        편집
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id)}
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

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-6">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !generating && setShowGenerateModal(false)} />
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI 블로그 글 생성</h2>

              {generateResult ? (
                <div className={`rounded-lg p-4 mb-4 ${generateResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  {generateResult.success ? (
                    <>
                      <div className="flex items-center gap-2 text-green-800 font-medium">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        생성 완료!
                      </div>
                      <p className="mt-2 text-sm text-green-700">제목: {generateResult.title}</p>
                      <p className="text-sm text-green-700">SEO 점수: {generateResult.seo_score}점</p>
                      <p className="text-sm text-green-700">비용: ${generateResult.cost_estimate?.toFixed(4)}</p>
                    </>
                  ) : (
                    <div className="text-red-800">
                      <span className="font-medium">오류:</span> {generateResult.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">주제 *</label>
                    <input
                      type="text"
                      value={generateForm.topic}
                      onChange={(e) => setGenerateForm({ ...generateForm, topic: e.target.value })}
                      placeholder="예: Python 비동기 프로그래밍 가이드"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={generating}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">콘텐츠 유형</label>
                      <select
                        value={generateForm.content_type}
                        onChange={(e) => setGenerateForm({ ...generateForm, content_type: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={generating}
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
                        value={generateForm.tone}
                        onChange={(e) => setGenerateForm({ ...generateForm, tone: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={generating}
                      >
                        <option value="professional">전문적</option>
                        <option value="casual">캐주얼</option>
                        <option value="friendly">친근한</option>
                        <option value="formal">격식체</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">키워드 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={generateForm.keywords}
                      onChange={(e) => setGenerateForm({ ...generateForm, keywords: e.target.value })}
                      placeholder="예: Python, async, await"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={generating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">목표 단어 수</label>
                    <input
                      type="number"
                      value={generateForm.word_count}
                      onChange={(e) => setGenerateForm({ ...generateForm, word_count: parseInt(e.target.value) || 1500 })}
                      min={500}
                      max={5000}
                      step={100}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={generating}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={generating}
                >
                  {generateResult ? '닫기' : '취소'}
                </button>
                {!generateResult && (
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !generateForm.topic.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        생성하기
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-6">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !publishing && setShowPublishModal(false)} />
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">블로그 게시</h2>

              {credentials.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-4">등록된 인증정보가 없습니다.</p>
                  <Link
                    href="/blog/credentials"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    인증정보 등록하기
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">게시할 블로그 선택</label>
                    <select
                      value={selectedCredentialId || ''}
                      onChange={(e) => setSelectedCredentialId(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={publishing}
                    >
                      {credentials.map((cred) => (
                        <option key={cred.id} value={cred.id}>
                          {cred.name} ({cred.platform})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowPublishModal(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      disabled={publishing}
                    >
                      취소
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={publishing || !selectedCredentialId}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {publishing ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          게시 중...
                        </>
                      ) : (
                        '게시하기'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
