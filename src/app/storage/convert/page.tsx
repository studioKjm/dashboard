'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Document {
  id: number;
  uuid: string;
  filename: string;
  original_filename: string;
  file_type: string;
  category: string;
  size_human: string;
}

interface ConversionMatrix {
  [sourceFormat: string]: {
    [targetFormat: string]: {
      method: string;
      available: boolean;
    };
  };
}

interface ConversionJob {
  job_id: string;
  status: string;
  document_id: number;
  source_format: string;
  target_format: string;
  output_path?: string;
  error_message?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function ConvertPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const documentIdParam = searchParams.get('document');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [conversionMatrix, setConversionMatrix] = useState<ConversionMatrix>({});
  const [targetFormat, setTargetFormat] = useState<string>('');
  const [availableTargets, setAvailableTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [conversionJob, setConversionJob] = useState<ConversionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 문서 목록 조회
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/storage/documents?limit=100`);
      if (!response.ok) throw new Error('문서 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setDocuments(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  // 변환 매트릭스 조회
  const fetchConversionMatrix = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/storage/conversion-matrix`);
      if (!response.ok) throw new Error('변환 정보를 불러오는데 실패했습니다.');
      const data = await response.json();
      setConversionMatrix(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  // 특정 문서 조회
  const fetchDocument = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/storage/documents/${id}`);
      if (!response.ok) throw new Error('문서를 찾을 수 없습니다.');
      const data = await response.json();
      setSelectedDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDocuments(), fetchConversionMatrix()]);
      if (documentIdParam) {
        await fetchDocument(documentIdParam);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchDocuments, fetchConversionMatrix, fetchDocument, documentIdParam]);

  // 문서 선택 시 가능한 변환 형식 업데이트
  useEffect(() => {
    if (selectedDocument && conversionMatrix) {
      const sourceFormat = selectedDocument.file_type.toLowerCase();
      const targets = conversionMatrix[sourceFormat];

      if (targets) {
        const availableFormats = Object.entries(targets)
          .filter(([_, info]) => info.available)
          .map(([format]) => format);
        setAvailableTargets(availableFormats);
        setTargetFormat(availableFormats[0] || '');
      } else {
        setAvailableTargets([]);
        setTargetFormat('');
      }
    }
  }, [selectedDocument, conversionMatrix]);

  // 문서 선택
  const handleSelectDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setConversionJob(null);
    setError(null);
  };

  // 변환 실행
  const handleConvert = async () => {
    if (!selectedDocument || !targetFormat) return;

    setConverting(true);
    setError(null);
    setConversionJob(null);

    try {
      const response = await fetch(`${API_BASE}/storage/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: selectedDocument.id,
          target_format: targetFormat,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '변환에 실패했습니다.');
      }

      const job = await response.json();
      setConversionJob(job);

      // 폴링으로 상태 확인
      if (job.status === 'processing') {
        pollConversionStatus(job.job_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '변환 실패');
    } finally {
      setConverting(false);
    }
  };

  // 변환 상태 폴링
  const pollConversionStatus = async (jobId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/storage/convert/${jobId}`);
        if (!response.ok) return;

        const job = await response.json();
        setConversionJob(job);

        if (job.status === 'processing' && attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 2000);
        }
      } catch {
        // 에러 무시
      }
    };

    checkStatus();
  };

  // 변환된 파일 다운로드
  const handleDownloadConverted = async () => {
    if (!conversionJob?.output_path) return;

    try {
      const response = await fetch(
        `${API_BASE}/storage/convert/${conversionJob.job_id}/download`
      );

      if (!response.ok) throw new Error('다운로드에 실패했습니다.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = conversionJob.output_path.split('/').pop() || 'converted_file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 실패');
    }
  };

  // 필터된 문서 목록
  const filteredDocuments = documents.filter((doc) =>
    doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 형식별 아이콘/색상
  const formatInfo: Record<string, { color: string; label: string }> = {
    '.pdf': { color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200', label: 'PDF' },
    '.docx': { color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200', label: 'DOCX' },
    '.doc': { color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200', label: 'DOC' },
    '.xlsx': { color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', label: 'XLSX' },
    '.xls': { color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', label: 'XLS' },
    '.csv': { color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', label: 'CSV' },
    '.pptx': { color: 'bg-orange-100 text-orange-800', label: 'PPTX' },
    '.ppt': { color: 'bg-orange-100 text-orange-800', label: 'PPT' },
    '.md': { color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200', label: 'MD' },
    '.txt': { color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200', label: 'TXT' },
    '.jpg': { color: 'bg-purple-100 text-purple-800', label: 'JPG' },
    '.jpeg': { color: 'bg-purple-100 text-purple-800', label: 'JPEG' },
    '.png': { color: 'bg-purple-100 text-purple-800', label: 'PNG' },
  };

  const getFormatInfo = (format: string) =>
    formatInfo[format.toLowerCase()] || { color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200', label: format.toUpperCase().replace('.', '') };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

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
            <h1 className="\1text-gray-900 dark:text-white\2">형식 변환</h1>
            <p className="\1text-gray-500 dark:text-gray-400\2">
              문서를 선택하고 원하는 형식으로 변환하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">x</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Selection */}
        <div className="lg:col-span-1">
          <div className="\1bg-white dark:bg-gray-900\2">
            <div className="\1border-gray-200 dark:border-gray-700\2">
              <h3 className="\1text-gray-900 dark:text-white\2">문서 선택</h3>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문서 검색..."
                className="\1border-gray-300 dark:border-gray-700\2"
              />
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredDocuments.length === 0 ? (
                  <p className="\1text-gray-500 dark:text-gray-400\2">문서가 없습니다.</p>
                ) : (
                  filteredDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedDocument?.id === doc.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getFormatInfo(doc.file_type).color}`}>
                          {getFormatInfo(doc.file_type).label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="\1text-gray-900 dark:text-white\2">
                            {doc.original_filename}
                          </p>
                          <p className="\1text-gray-500 dark:text-gray-400\2">{doc.size_human}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Panel */}
        <div className="lg:col-span-2">
          <div className="\1bg-white dark:bg-gray-900\2">
            <div className="\1border-gray-200 dark:border-gray-700\2">
              <h3 className="\1text-gray-900 dark:text-white\2">변환 설정</h3>
            </div>
            <div className="p-6">
              {selectedDocument ? (
                <div className="space-y-6">
                  {/* Selected Document Info */}
                  <div className="\1bg-gray-50 dark:bg-gray-800\2">
                    <div className="flex-shrink-0">
                      <span className={`px-3 py-1.5 text-sm font-medium rounded ${getFormatInfo(selectedDocument.file_type).color}`}>
                        {getFormatInfo(selectedDocument.file_type).label}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="\1text-gray-900 dark:text-white\2">{selectedDocument.original_filename}</p>
                      <p className="\1text-gray-500 dark:text-gray-400\2">{selectedDocument.size_human}</p>
                    </div>
                  </div>

                  {/* Conversion Arrow */}
                  <div className="flex items-center justify-center">
                    <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                    </svg>
                  </div>

                  {/* Target Format Selection */}
                  {availableTargets.length > 0 ? (
                    <div>
                      <label className="\1text-gray-700 dark:text-gray-300\2">
                        변환할 형식 선택
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {availableTargets.map((format) => (
                          <button
                            key={format}
                            onClick={() => setTargetFormat(format)}
                            className={`p-4 rounded-lg border-2 text-center transition-colors ${
                              targetFormat === format
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${getFormatInfo(format).color}`}>
                              {getFormatInfo(format).label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <p className="\1text-gray-500 dark:text-gray-400\2">
                        이 파일 형식은 변환을 지원하지 않습니다.
                      </p>
                    </div>
                  )}

                  {/* Convert Button */}
                  {availableTargets.length > 0 && (
                    <button
                      onClick={handleConvert}
                      disabled={!targetFormat || converting}
                      className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {converting ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          변환 중...
                        </span>
                      ) : (
                        `${getFormatInfo(selectedDocument.file_type).label} → ${getFormatInfo(targetFormat).label} 변환`
                      )}
                    </button>
                  )}

                  {/* Conversion Result */}
                  {conversionJob && (
                    <div className={`p-4 rounded-lg ${
                      conversionJob.status === 'completed' ? 'bg-green-50 border border-green-200' :
                      conversionJob.status === 'failed' ? 'bg-red-50 border border-red-200' :
                      'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        {conversionJob.status === 'completed' ? (
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : conversionJob.status === 'failed' ? (
                          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${
                            conversionJob.status === 'completed' ? 'text-green-800' :
                            conversionJob.status === 'failed' ? 'text-red-800' :
                            'text-yellow-800'
                          }`}>
                            {conversionJob.status === 'completed' ? '변환 완료' :
                             conversionJob.status === 'failed' ? '변환 실패' :
                             '변환 처리 중...'}
                          </p>
                          {conversionJob.error_message && (
                            <p className="text-sm text-red-600 mt-1">{conversionJob.error_message}</p>
                          )}
                        </div>
                        {conversionJob.status === 'completed' && (
                          <button
                            onClick={handleDownloadConverted}
                            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                          >
                            다운로드
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <h3 className="\1text-gray-900 dark:text-white\2">문서를 선택하세요</h3>
                  <p className="\1text-gray-500 dark:text-gray-400\2">
                    왼쪽 목록에서 변환할 문서를 선택하세요.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Conversion Matrix Info */}
          <div className="\1bg-white dark:bg-gray-900\2">
            <div className="\1border-gray-200 dark:border-gray-700\2">
              <h3 className="\1text-gray-900 dark:text-white\2">지원 변환 형식</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="\1text-gray-900 dark:text-white\2">PDF 변환</p>
                  <ul className="\1text-gray-600 dark:text-gray-400\2">
                    <li>PDF → DOCX</li>
                    <li>DOCX/DOC → PDF</li>
                    <li>XLSX/XLS → PDF</li>
                    <li>PPTX/PPT → PDF</li>
                  </ul>
                </div>
                <div>
                  <p className="\1text-gray-900 dark:text-white\2">문서 변환</p>
                  <ul className="\1text-gray-600 dark:text-gray-400\2">
                    <li>MD → DOCX/PDF</li>
                    <li>XLSX → CSV</li>
                    <li>이미지 → PDF</li>
                  </ul>
                </div>
              </div>
              <p className="\1text-gray-500 dark:text-gray-400\2">
                * 실제 지원 여부는 서버 환경에 따라 다를 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConvertPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <ConvertPageContent />
    </Suspense>
  );
}
