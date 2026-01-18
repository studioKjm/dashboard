'use client';

import { useState } from 'react';
import Link from 'next/link';

type ReportType = 'business' | 'research' | 'technical' | 'marketing' | 'financial' | 'general';
type OutputFormat = 'pdf' | 'docx' | 'txt' | 'md' | 'xlsx';

interface GeneratedReport {
  id: string;
  title: string;
  content: string;
  type: ReportType;
  created_at: string;
  available_formats: OutputFormat[];
}

export default function ReportGeneratorPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reportType, setReportType] = useState<ReportType>('general');
  const [selectedFormats, setSelectedFormats] = useState<OutputFormat[]>(['pdf', 'docx', 'txt', 'md']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState<'title' | 'content' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001';

  const reportTypes: { value: ReportType; label: string; description: string }[] = [
    { value: 'general', label: '일반 보고서', description: '범용적인 보고서 형식' },
    { value: 'business', label: '비즈니스', description: '사업 계획, 제안서, 분석 보고서' },
    { value: 'research', label: '연구', description: '학술 연구, 조사 보고서' },
    { value: 'technical', label: '기술', description: '기술 문서, 명세서, 매뉴얼' },
    { value: 'marketing', label: '마케팅', description: '마케팅 전략, 캠페인 보고서' },
    { value: 'financial', label: '재무', description: '재무 분석, 회계 보고서' },
  ];

  const outputFormats: { value: OutputFormat; label: string; icon: string }[] = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'docx', label: 'Word (DOCX)', icon: '📝' },
    { value: 'txt', label: 'Text', icon: '📃' },
    { value: 'md', label: 'Markdown', icon: '📋' },
    { value: 'xlsx', label: 'Excel (XLSX)', icon: '📊' },
  ];

  const toggleFormat = (format: OutputFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handleEnhanceText = async (type: 'title' | 'content') => {
    const text = type === 'title' ?
      (generatedReport ? editedTitle : title) :
      (generatedReport ? editedContent : content);

    if (!text.trim()) {
      setError(`${type === 'title' ? '제목' : '내용'}을 입력해주세요.`);
      return;
    }

    setIsEnhancing(type);
    setError(null);

    try {
      const apiKey = localStorage.getItem('api_key') || 'autom-api-key-2026';
      const response = await fetch(`${API_URL}/api/v1/reports/enhance-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          text,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('AI 보정에 실패했습니다.');
      }

      const data = await response.json();

      if (generatedReport) {
        // Edit mode
        if (type === 'title') {
          setEditedTitle(data.enhanced_text);
        } else {
          setEditedContent(data.enhanced_text);
        }
      } else {
        // Input mode
        if (type === 'title') {
          setTitle(data.enhanced_text);
        } else {
          setContent(data.enhanced_text);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 보정 중 오류가 발생했습니다.');
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleSaveChanges = async () => {
    if (!generatedReport) return;

    setIsSaving(true);
    setError(null);

    try {
      const apiKey = localStorage.getItem('api_key') || 'autom-api-key-2026';
      const response = await fetch(`${API_URL}/api/v1/reports/${generatedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });

      if (!response.ok) {
        throw new Error('저장에 실패했습니다.');
      }

      const data = await response.json();
      setGeneratedReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (selectedFormats.length === 0) {
      setError('최소 한 가지 출력 형식을 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedReport(null);

    try {
      const apiKey = localStorage.getItem('api_key') || 'autom-api-key-2026';
      const response = await fetch(`${API_URL}/api/v1/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          title,
          content,
          type: reportType,
          output_formats: selectedFormats,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '보고서 생성에 실패했습니다.');
      }

      const data = await response.json();
      setGeneratedReport(data);
      setEditedTitle(data.title);
      setEditedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : '보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (format: OutputFormat) => {
    if (!generatedReport) return;

    try {
      const apiKey = localStorage.getItem('api_key') || 'autom-api-key-2026';
      const response = await fetch(
        `${API_URL}/api/v1/reports/${generatedReport.id}/download?format=${format}`,
        {
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editedTitle}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleReset = () => {
    setTitle('');
    setContent('');
    setReportType('general');
    setSelectedFormats(['pdf', 'docx', 'txt']);
    setGeneratedReport(null);
    setEditedTitle('');
    setEditedContent('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보고서 생성기</h1>
          <p className="text-gray-500">AI를 활용하여 전문적인 보고서를 자동으로 생성합니다</p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          보고서 목록
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Section */}
      {!generatedReport && (
        <div className="space-y-6">
          {/* Report Title */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              보고서 제목 *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2024년 3분기 매출 분석 보고서"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isGenerating}
              />
              <button
                onClick={() => handleEnhanceText('title')}
                disabled={isGenerating || isEnhancing === 'title' || !title.trim()}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI로 제목 보정하기"
              >
                {isEnhancing === 'title' ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Report Type */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              보고서 유형
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reportTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value)}
                  disabled={isGenerating}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    reportType === type.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="mt-1 text-xs text-gray-500">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Report Content */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              보고서 내용 *
            </label>
            <div className="flex flex-col gap-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="보고서의 주요 내용을 입력하세요. AI가 내용을 보강하고 전문적인 형식으로 재구성합니다.&#10;&#10;예시:&#10;- 3분기 매출이 전년 대비 15% 증가했습니다&#10;- 주요 성장 동력은 온라인 채널입니다&#10;- 신제품 라인업이 긍정적인 반응을 얻었습니다"
                rows={12}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                disabled={isGenerating}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {content.length} 자 / AI가 내용을 분석하여 전문적인 보고서로 재구성합니다
                </div>
                <button
                  onClick={() => handleEnhanceText('content')}
                  disabled={isGenerating || isEnhancing === 'content' || !content.trim()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI로 내용 보정하기"
                >
                  {isEnhancing === 'content' ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      보정 중...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      AI 보정
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Output Formats */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              출력 형식 * (다중 선택 가능)
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {outputFormats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => toggleFormat(format.value)}
                  disabled={isGenerating}
                  className={`rounded-lg border-2 p-4 text-center transition-all ${
                    selectedFormats.includes(format.value)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-3xl mb-2">{format.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{format.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  보고서 생성 중...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  AI로 보고서 생성
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Report Section */}
      {generatedReport && (
        <div className="space-y-6">
          {/* Success Message */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  보고서가 성공적으로 생성되었습니다! 제목과 내용을 수정할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Editable Report */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">보고서 편집</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                      </svg>
                      변경사항 저장
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  새 보고서 작성
                </button>
              </div>
            </div>

            {/* Editable Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                보고서 제목
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-lg font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleEnhanceText('title')}
                  disabled={isEnhancing === 'title' || !editedTitle.trim()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI로 제목 보정하기"
                >
                  {isEnhancing === 'title' ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Editable Content */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                보고서 내용
              </label>
              <div className="flex flex-col gap-2">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {editedContent.length} 자
                  </div>
                  <button
                    onClick={() => handleEnhanceText('content')}
                    disabled={isEnhancing === 'content' || !editedContent.trim()}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="AI로 내용 보정하기"
                  >
                    {isEnhancing === 'content' ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        보정 중...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        AI 보정
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              생성 시간: {new Date(generatedReport.created_at).toLocaleString('ko-KR')}
            </div>
          </div>

          {/* Download Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">다운로드</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {outputFormats
                .filter((format) => generatedReport.available_formats.includes(format.value))
                .map((format) => (
                  <button
                    key={format.value}
                    onClick={() => handleDownload(format.value)}
                    className="rounded-lg border-2 border-gray-200 bg-white p-4 text-center transition-all hover:border-indigo-500 hover:bg-indigo-50"
                  >
                    <div className="text-3xl mb-2">{format.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{format.label}</div>
                    <div className="mt-1 text-xs text-gray-500">다운로드</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      {!generatedReport && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-900">AI 보강</h3>
                <p className="mt-1 text-xs text-blue-700">
                  입력된 내용을 분석하여 전문적인 문장으로 재구성합니다
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-purple-900">다양한 형식</h3>
                <p className="mt-1 text-xs text-purple-700">
                  PDF, Word, Excel 등 다양한 형식으로 내보내기 가능합니다
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-900">빠른 생성</h3>
                <p className="mt-1 text-xs text-green-700">
                  몇 초 안에 완성도 높은 보고서를 생성합니다
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
