'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type GuideType = 'user-manual' | 'installation' | 'tutorial' | 'faq' | 'onboarding' | 'technical';
type GenerationMode = 'basic' | 'pro';
type OutputFormat = 'pdf' | 'docx' | 'txt' | 'md';
type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';
type ContentFormat = 'markdown' | 'plain';

interface GeneratedGuide {
  id: string;
  title: string;
  content: string;
  guide_type: GuideType;
  mode: GenerationMode;
  created_at: string;
  available_formats: OutputFormat[];
  model?: string;
  tokens_used?: {
    input: number;
    output: number;
    total: number;
  };
}

// Gemini API 가격 정보
const MODEL_PRICING = {
  'gemini-2.5-flash': {
    input: 0.30,
    output: 2.50,
    name: 'Gemini 2.5 Flash',
    speed: '빠름',
    avgCostPerGuide: 0.010, // 가이드는 보고서보다 약간 더 길 수 있음
  },
  'gemini-2.0-flash': {
    input: 0.10,
    output: 0.40,
    name: 'Gemini 2.0 Flash',
    speed: '빠름',
    avgCostPerGuide: 0.0009,
  },
  'gemini-2.0-flash-lite': {
    input: 0.075,
    output: 0.30,
    name: 'Gemini 2.0 Flash Lite',
    speed: '매우 빠름',
    avgCostPerGuide: 0.0007,
  },
} as const;

export default function GuideGeneratorPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [guideType, setGuideType] = useState<GuideType>('user-manual');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('basic');
  const [selectedFormats, setSelectedFormats] = useState<OutputFormat[]>(['pdf', 'docx', 'txt', 'md']);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.5-flash');
  const [contentFormat, setContentFormat] = useState<ContentFormat>('markdown');
  const [includeImages, setIncludeImages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGuide, setGeneratedGuide] = useState<GeneratedGuide | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // localStorage에서 가이드 복원
  useEffect(() => {
    const savedGuide = localStorage.getItem('currentGuide');
    if (savedGuide) {
      try {
        const guide = JSON.parse(savedGuide) as GeneratedGuide;
        setGeneratedGuide(guide);
        setEditedTitle(guide.title);
        setEditedContent(guide.content);
      } catch (e) {
        console.error('Failed to restore guide from localStorage:', e);
      }
    }
  }, []);

  // 가이드 변경 시 localStorage에 저장
  useEffect(() => {
    if (generatedGuide) {
      const guideToSave = {
        ...generatedGuide,
        title: editedTitle,
        content: editedContent,
      };
      localStorage.setItem('currentGuide', JSON.stringify(guideToSave));
    }
  }, [generatedGuide, editedTitle, editedContent]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001';

  // 예상 비용 계산 함수
  const calculateEstimatedCost = (text: string, model: GeminiModel): number => {
    const estimatedInputTokens = Math.ceil(text.length / 2);
    const estimatedOutputTokens = estimatedInputTokens * 3.5; // 가이드는 약 3.5배로 확장

    const pricing = MODEL_PRICING[model];
    const inputCost = (estimatedInputTokens / 1000000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1000000) * pricing.output;

    return inputCost + outputCost;
  };

  const guideTypes: { value: GuideType; label: string; description: string }[] = [
    { value: 'user-manual', label: '사용자 매뉴얼', description: '제품/서비스 사용 방법 안내' },
    { value: 'installation', label: '설치 가이드', description: '설치 및 설정 방법' },
    { value: 'tutorial', label: '튜토리얼', description: '단계별 학습 가이드' },
    { value: 'faq', label: 'FAQ', description: '자주 묻는 질문과 답변' },
    { value: 'onboarding', label: '온보딩 가이드', description: '신규 사용자 환영 및 시작 가이드' },
    { value: 'technical', label: '기술 문서', description: 'API, 개발 문서, 기술 스펙' },
  ];

  const outputFormats: { value: OutputFormat; label: string; icon: string }[] = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'docx', label: 'Word (DOCX)', icon: '📝' },
    { value: 'txt', label: 'Text', icon: '📃' },
    { value: 'md', label: 'Markdown', icon: '📋' },
  ];

  const toggleFormat = (format: OutputFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
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
    setGeneratedGuide(null);

    try {
      const apiKey = localStorage.getItem('api_key') || 'autom-api-key-2026';
      const response = await fetch(`${API_URL}/api/v1/guides/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          title,
          content,
          guide_type: guideType,
          mode: generationMode,
          output_formats: selectedFormats,
          model: selectedModel,
          content_format: contentFormat,
          include_images: includeImages && generationMode === 'pro',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '가이드 생성에 실패했습니다.');
      }

      const data = await response.json();
      setGeneratedGuide(data);
      setEditedTitle(data.title);
      setEditedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : '가이드 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (format: OutputFormat) => {
    if (!generatedGuide) return;

    try {
      const apiKey = localStorage.getItem('api_key') || 'autom-api-key-2026';
      const response = await fetch(
        `${API_URL}/api/v1/guides/${generatedGuide.id}/download/${format}`,
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
      a.download = `${generatedGuide.title}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleReset = () => {
    setGeneratedGuide(null);
    setEditedTitle('');
    setEditedContent('');
    setTitle('');
    setContent('');
    setError(null);
    localStorage.removeItem('currentGuide');
  };

  // 실제 비용 계산 (생성 후)
  const calculateActualCost = (tokensUsed: { input: number; output: number }) => {
    const pricing = MODEL_PRICING[selectedModel];
    const inputCost = (tokensUsed.input / 1000000) * pricing.input;
    const outputCost = (tokensUsed.output / 1000000) * pricing.output;
    return inputCost + outputCost;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span className="text-sm font-medium">대시보드로 돌아가기</span>
            </Link>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">가이드 문서 생성</h1>
          <p className="mt-2 text-gray-600">
            AI를 활용하여 전문적인 가이드 문서를 자동으로 생성합니다. 기본 모드와 프로 모드를 선택할 수 있습니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {!generatedGuide ? (
          /* Input Form */
          <div className="space-y-6">
            {/* 가이드 제목 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                가이드 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 제품 사용 가이드, 설치 매뉴얼, API 문서"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* 가이드 내용 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                가이드 내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="가이드에 포함할 내용을 입력하세요. AI가 전문적인 가이드 문서로 확장합니다.&#10;&#10;예시:&#10;- 주요 기능 설명&#10;- 단계별 사용 방법&#10;- 문제 해결 팁&#10;- 자주 묻는 질문"
                rows={12}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* 가이드 유형 선택 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                가이드 유형
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {guideTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setGuideType(type.value)}
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      guideType === type.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="mt-1 text-sm text-gray-600">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 생성 모드 선택 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                생성 모드
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setGenerationMode('basic');
                    setIncludeImages(false);
                  }}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    generationMode === 'basic'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">📝</div>
                    <div className="font-medium text-gray-900">기본 모드</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    텍스트 위주의 가이드 문서 생성
                  </div>
                </button>

                <button
                  onClick={() => setGenerationMode('pro')}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    generationMode === 'pro'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">🎨</div>
                    <div className="font-medium text-gray-900">프로 모드</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    텍스트 + 이미지 위치 표시가 포함된 가이드
                  </div>
                </button>
              </div>

              {generationMode === 'pro' && (
                <div className="mt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeImages}
                      onChange={(e) => setIncludeImages(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      이미지 위치 표시 포함 (예: [이미지: 스크린샷 설명])
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* 내용 출력 형식 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                내용 출력 형식
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setContentFormat('markdown')}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    contentFormat === 'markdown'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">마크다운 (Markdown)</div>
                  <div className="mt-1 text-sm text-gray-600">
                    구조화된 서식 (##, **, * 등) - PDF/Word 변환에 최적
                  </div>
                </button>

                <button
                  onClick={() => setContentFormat('plain')}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    contentFormat === 'plain'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">일반 텍스트 (Plain Text)</div>
                  <div className="mt-1 text-sm text-gray-600">
                    마크다운 문법 없는 깔끔한 텍스트 - 읽기 쉬움
                  </div>
                </button>
              </div>
            </div>

            {/* AI 모델 선택 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                AI 모델 선택
              </label>
              <div className="space-y-3">
                {(Object.keys(MODEL_PRICING) as GeminiModel[]).map((model) => {
                  const info = MODEL_PRICING[model];
                  const reportsFor1Dollar = Math.floor(1 / info.avgCostPerGuide);
                  return (
                    <button
                      key={model}
                      onClick={() => setSelectedModel(model)}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                        selectedModel === model
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{info.name}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {info.speed}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            $1로 약 {reportsFor1Dollar.toLocaleString()}개 가이드 생성 (가이드 1개당 평균 ${info.avgCostPerGuide.toFixed(4)})
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {(title || content) && (
                <div className="mt-4 rounded-lg bg-blue-50 p-4">
                  <div className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-blue-900">예상 비용</div>
                      <div className="mt-1 text-sm text-blue-700">
                        약 ${calculateEstimatedCost(title + content, selectedModel).toFixed(4)}
                        ({MODEL_PRICING[selectedModel].name})
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 출력 형식 선택 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                출력 형식 선택
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {outputFormats.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => toggleFormat(format.value)}
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      selectedFormats.includes(format.value)
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{format.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{format.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !title.trim() || !content.trim()}
              className="w-full rounded-lg bg-indigo-600 px-6 py-4 text-white font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  생성 중...
                </span>
              ) : (
                '가이드 문서 생성'
              )}
            </button>
          </div>
        ) : (
          /* Generated Guide Display */
          <div className="space-y-6">
            {/* Guide Info */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{generatedGuide.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span>유형: {guideTypes.find(t => t.value === generatedGuide.guide_type)?.label}</span>
                    <span>모드: {generatedGuide.mode === 'basic' ? '기본' : '프로'}</span>
                    <span>생성 일시: {new Date(generatedGuide.created_at).toLocaleString('ko-KR')}</span>
                    {generatedGuide.model && (
                      <span>AI 모델: {MODEL_PRICING[generatedGuide.model as GeminiModel]?.name || generatedGuide.model}</span>
                    )}
                  </div>
                  {generatedGuide.tokens_used && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span>토큰 사용: {generatedGuide.tokens_used.input.toLocaleString()} 입력 + {generatedGuide.tokens_used.output.toLocaleString()} 출력 = {generatedGuide.tokens_used.total.toLocaleString()} 총</span>
                      <span className="ml-2">(실제 비용: ${calculateActualCost(generatedGuide.tokens_used).toFixed(4)})</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  새로 만들기
                </button>
              </div>
            </div>

            {/* Guide Content */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">가이드 내용</h3>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {generatedGuide.content}
                </pre>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">다운로드</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {generatedGuide.available_formats.map((format) => {
                  const formatInfo = outputFormats.find((f) => f.value === format);
                  return (
                    <button
                      key={format}
                      onClick={() => handleDownload(format)}
                      className="rounded-lg border border-gray-300 p-4 text-center hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-2xl mb-2">{formatInfo?.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{formatInfo?.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
