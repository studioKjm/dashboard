'use client';

import { useState } from 'react';

export default function PDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'parse' | 'summarize'>('parse');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('PDF 파일만 업로드 가능합니다');
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('파일을 선택하세요');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const endpoint = mode === 'parse' ? '/api/pdf/parse' : '/api/pdf/summarize';

    try {
      const response = await fetch(`http://localhost:9001${endpoint}`, {
        method: 'POST',
        headers: {
          'X-API-Key': 'autom-api-key-2026',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '처리 실패');
      }
    } catch (err) {
      setError('서버 연결 실패');
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PDF 파싱</h1>
        <p className="text-gray-500">PDF 문서 분석 및 AI 요약</p>
      </div>

      {/* Upload Form */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">PDF 업로드</h2>

        {/* Mode Selection */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('parse')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'parse'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            텍스트 추출
          </button>
          <button
            onClick={() => setMode('summarize')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'summarize'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            AI 요약
          </button>
        </div>

        {/* File Input */}
        <div className="mb-4">
          <label className="block">
            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  {file ? file.name : 'PDF 파일을 선택하세요'}
                </p>
              </div>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || !file}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              처리 중...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {mode === 'parse' ? '분석하기' : 'AI 요약'}
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">결과</h2>

          {mode === 'parse' && result.metadata && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">메타데이터</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">제목:</span> {result.metadata.title || '-'}</div>
                <div><span className="text-gray-500">작성자:</span> {result.metadata.author || '-'}</div>
                <div><span className="text-gray-500">페이지 수:</span> {result.metadata.page_count}</div>
                <div><span className="text-gray-500">파일 크기:</span> {(result.metadata.file_size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          )}

          {mode === 'summarize' && result.summary && (
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h3 className="font-medium text-indigo-900 mb-2">AI 요약</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{result.summary}</p>
            </div>
          )}

          {result.full_text && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-900 mb-2">추출된 텍스트</h3>
              <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {result.full_text.substring(0, 5000)}
                  {result.full_text.length > 5000 && '...'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
