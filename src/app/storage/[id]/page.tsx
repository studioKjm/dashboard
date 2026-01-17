'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Document {
  id: number;
  uuid: string;
  filename: string;
  original_filename: string;
  file_type: string;
  category: string;
  mime_type: string;
  size_bytes: number;
  size_human: string;
  checksum: string;
  storage_path: string;
  tags: string[];
  uploaded_at: string;
  has_summary: boolean;
  conversion_count: number;
}

interface Summary {
  id: number;
  document_id: number;
  summary_text: string;
  key_points: string[];
  keywords: string[];
  entities: Array<{ type: string; value: string; confidence?: number }>;
  ai_model: string;
  summary_length: string;
  created_at: string;
}

interface ConversionHistory {
  id: number;
  document_id: number;
  source_format: string;
  target_format: string;
  status: string;
  output_path: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const categoryColors: Record<string, string> = {
  document: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  spreadsheet: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  presentation: 'bg-orange-100 text-orange-800',
  image: 'bg-purple-100 text-purple-800',
  markdown: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  data: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  archive: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  other: 'bg-slate-100 text-slate-800',
};

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [conversions, setConversions] = useState<ConversionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'summary' | 'conversions'>('info');
  const [summarizing, setSummarizing] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // 문서 상세 조회
  const fetchDocument = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/storage/documents/${documentId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('문서를 찾을 수 없습니다.');
        }
        throw new Error('문서를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setDocument(data);
      setNewTags(data.tags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [documentId]);

  // 요약 조회
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/storage/summary/${documentId}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch {
      // 요약이 없을 수 있음
    }
  }, [documentId]);

  // 변환 이력 조회
  const fetchConversions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/storage/documents/${documentId}/conversions`);
      if (response.ok) {
        const data = await response.json();
        setConversions(data.items || []);
      }
    } catch {
      // 변환 이력이 없을 수 있음
    }
  }, [documentId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDocument();
      await fetchSummary();
      await fetchConversions();
      setLoading(false);
    };
    loadData();
  }, [fetchDocument, fetchSummary, fetchConversions]);

  // 문서 다운로드
  const handleDownload = async () => {
    if (!document) return;
    try {
      const response = await fetch(`${API_BASE}/storage/documents/${documentId}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.original_filename;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  // 문서 삭제
  const handleDelete = async () => {
    if (!confirm('정말로 이 문서를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_BASE}/storage/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');
      router.push('/storage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // AI 요약 생성
  const handleSummarize = async (length: string = 'medium') => {
    setSummarizing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/storage/summarize/${documentId}?length=${length}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '요약 생성에 실패했습니다.');
      }

      // 요약 완료 후 다시 조회
      await fetchSummary();
      await fetchDocument();
      setActiveTab('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : '요약 생성 실패');
    } finally {
      setSummarizing(false);
    }
  };

  // 태그 저장
  const handleSaveTags = async () => {
    try {
      const response = await fetch(`${API_BASE}/storage/documents/${documentId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });

      if (!response.ok) throw new Error('태그 저장에 실패했습니다.');

      await fetchDocument();
      setEditingTags(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '태그 저장 실패');
    }
  };

  // 태그 추가
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !newTags.includes(tag)) {
      setNewTags([...newTags, tag]);
    }
    setTagInput('');
  };

  // 태그 삭제
  const removeTag = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <Link href="/storage" className="text-indigo-600 hover:text-indigo-800">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!document) return null;

  const isPreviewable = ['image', 'markdown'].includes(document.category) ||
    ['.pdf'].includes(document.file_type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/storage"
            className="\1bg-gray-100 dark:bg-gray-800\2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="\1text-gray-900 dark:text-white\2">{document.original_filename}</h1>
            <p className="\1text-gray-500 dark:text-gray-400\2">
              {document.file_type} | {document.size_human} |
              업로드: {new Date(document.uploaded_at).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="\1bg-white dark:bg-gray-900\2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            다운로드
          </button>
          <Link
            href={`/storage/convert?document=${documentId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
            형식 변환
          </Link>
          <button
            onClick={handleDelete}
            className="\1bg-white dark:bg-gray-900\2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            삭제
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">x</button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview / Info Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview */}
          {isPreviewable && (
            <div className="\1bg-white dark:bg-gray-900\2">
              <div className="\1bg-gray-50 dark:bg-gray-800\2">
                <h3 className="\1text-gray-900 dark:text-white\2">미리보기</h3>
              </div>
              <div className="p-4">
                {document.category === 'image' && (
                  <img
                    src={`${API_BASE}/storage/documents/${documentId}/preview`}
                    alt={document.original_filename}
                    className="max-w-full h-auto rounded"
                  />
                )}
                {document.file_type === '.pdf' && (
                  <iframe
                    src={`${API_BASE}/storage/documents/${documentId}/preview`}
                    className="w-full h-[600px] border-0"
                    title="PDF Preview"
                  />
                )}
                {document.category === 'markdown' && (
                  <div className="prose max-w-none">
                    <iframe
                      src={`${API_BASE}/storage/documents/${documentId}/preview`}
                      className="w-full h-[400px] border-0"
                      title="Markdown Preview"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="\1bg-white dark:bg-gray-900\2">
            <div className="\1border-gray-200 dark:border-gray-700\2">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'info'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  상세 정보
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'summary'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  AI 요약
                  {document.has_summary && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      완료
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('conversions')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'conversions'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  변환 이력
                  {conversions.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {conversions.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="\1text-gray-500 dark:text-gray-400\2">파일명</dt>
                      <dd className="\1text-gray-900 dark:text-white\2">{document.original_filename}</dd>
                    </div>
                    <div>
                      <dt className="\1text-gray-500 dark:text-gray-400\2">저장 파일명</dt>
                      <dd className="\1text-gray-900 dark:text-white\2">{document.filename}</dd>
                    </div>
                    <div>
                      <dt className="\1text-gray-500 dark:text-gray-400\2">카테고리</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${categoryColors[document.category]}`}>
                          {document.category}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="\1text-gray-500 dark:text-gray-400\2">파일 형식</dt>
                      <dd className="\1text-gray-900 dark:text-white\2">{document.file_type}</dd>
                    </div>
                    <div>
                      <dt className="\1text-gray-500 dark:text-gray-400\2">MIME 타입</dt>
                      <dd className="\1text-gray-900 dark:text-white\2">{document.mime_type}</dd>
                    </div>
                    <div>
                      <dt className="\1text-gray-500 dark:text-gray-400\2">파일 크기</dt>
                      <dd className="\1text-gray-900 dark:text-white\2">{document.size_human} ({document.size_bytes.toLocaleString()} bytes)</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="\1text-gray-500 dark:text-gray-400\2">체크섬 (SHA-256)</dt>
                      <dd className="\1text-gray-900 dark:text-white\2">{document.checksum}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="\1text-gray-500 dark:text-gray-400\2">UUID</dt>
                      <dd className="\1text-gray-900 dark:text-white\2">{document.uuid}</dd>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {summary ? (
                    <>
                      <div>
                        <h4 className="\1text-gray-900 dark:text-white\2">요약</h4>
                        <p className="\1bg-gray-50 dark:bg-gray-800\2">
                          {summary.summary_text}
                        </p>
                      </div>

                      {summary.key_points && summary.key_points.length > 0 && (
                        <div>
                          <h4 className="\1text-gray-900 dark:text-white\2">핵심 포인트</h4>
                          <ul className="\1text-gray-700 dark:text-gray-300\2">
                            {summary.key_points.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {summary.keywords && summary.keywords.length > 0 && (
                        <div>
                          <h4 className="\1text-gray-900 dark:text-white\2">키워드</h4>
                          <div className="flex flex-wrap gap-2">
                            {summary.keywords.map((keyword, i) => (
                              <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {summary.entities && summary.entities.length > 0 && (
                        <div>
                          <h4 className="\1text-gray-900 dark:text-white\2">추출된 엔티티</h4>
                          <div className="flex flex-wrap gap-2">
                            {summary.entities.map((entity, i) => (
                              <span key={i} className="\1bg-gray-100 dark:bg-gray-800\2">
                                <span className="\1text-gray-500 dark:text-gray-400\2">{entity.type}:</span>
                                {entity.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="\1text-gray-500 dark:text-gray-400\2">
                        모델: {summary.ai_model} | 길이: {summary.summary_length} |
                        생성: {new Date(summary.created_at).toLocaleString('ko-KR')}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                      <h3 className="\1text-gray-900 dark:text-white\2">AI 요약이 없습니다</h3>
                      <p className="\1text-gray-500 dark:text-gray-400\2">AI를 사용하여 문서를 요약해보세요.</p>
                      <div className="mt-6 flex justify-center gap-2">
                        <button
                          onClick={() => handleSummarize('short')}
                          disabled={summarizing}
                          className="\1bg-white dark:bg-gray-900\2"
                        >
                          짧게
                        </button>
                        <button
                          onClick={() => handleSummarize('medium')}
                          disabled={summarizing}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {summarizing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              요약 중...
                            </>
                          ) : (
                            '요약 생성'
                          )}
                        </button>
                        <button
                          onClick={() => handleSummarize('detailed')}
                          disabled={summarizing}
                          className="\1bg-white dark:bg-gray-900\2"
                        >
                          상세하게
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Conversions Tab */}
              {activeTab === 'conversions' && (
                <div>
                  {conversions.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                      </svg>
                      <h3 className="\1text-gray-900 dark:text-white\2">변환 이력이 없습니다</h3>
                      <p className="\1text-gray-500 dark:text-gray-400\2">문서를 다른 형식으로 변환해보세요.</p>
                      <div className="mt-6">
                        <Link
                          href={`/storage/convert?document=${documentId}`}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                          형식 변환하기
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversions.map((conv) => (
                        <div key={conv.id} className="\1bg-gray-50 dark:bg-gray-800\2">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="\1bg-white dark:bg-gray-900\2">
                                {conv.source_format}
                              </span>
                              <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                              <span className="\1bg-white dark:bg-gray-900\2">
                                {conv.target_format}
                              </span>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              conv.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                              conv.status === 'failed' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                              'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {conv.status}
                            </span>
                          </div>
                          <div className="\1text-gray-500 dark:text-gray-400\2">
                            {new Date(conv.created_at).toLocaleString('ko-KR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          <div className="\1bg-white dark:bg-gray-900\2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="\1text-gray-900 dark:text-white\2">태그</h3>
              <button
                onClick={() => setEditingTags(!editingTags)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {editingTags ? '취소' : '편집'}
              </button>
            </div>

            {editingTags ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {newTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 text-indigo-600 hover:text-indigo-800">
                        x
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="새 태그"
                    className="\1border-gray-300 dark:border-gray-700\2"
                  />
                  <button onClick={addTag} className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800">
                    추가
                  </button>
                </div>
                <button
                  onClick={handleSaveTags}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  저장
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {document.tags && document.tags.length > 0 ? (
                  document.tags.map((tag) => (
                    <span key={tag} className="\1bg-gray-100 dark:bg-gray-800\2">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="\1text-gray-500 dark:text-gray-400\2">태그 없음</span>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="\1bg-white dark:bg-gray-900\2">
            <h3 className="\1text-gray-900 dark:text-white\2">빠른 작업</h3>
            <div className="space-y-2">
              {!summary && (
                <button
                  onClick={() => handleSummarize('medium')}
                  disabled={summarizing}
                  className="\1bg-gray-50 dark:bg-gray-800\2"
                >
                  <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI 요약 생성
                </button>
              )}
              <Link
                href={`/storage/convert?document=${documentId}`}
                className="\1bg-gray-50 dark:bg-gray-800\2"
              >
                <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
                형식 변환
              </Link>
              <button
                onClick={handleDownload}
                className="\1bg-gray-50 dark:bg-gray-800\2"
              >
                <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                다운로드
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
