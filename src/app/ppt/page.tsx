'use client';

import { useState, useEffect } from 'react';
import { listPPTFiles, generatePPTFromPrompt, getProStatus, generatePPTPro } from '@/lib/api';
import { PPTFile } from '@/types';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type GenerationMode = 'quick' | 'pro';

interface ProStatus {
  pro_available: boolean;
  anthropic_api_key_configured: boolean;
  node_js_available: boolean;
  estimated_cost_per_generation: string;
  features: string[];
}

export default function PPTPage() {
  const [files, setFiles] = useState<PPTFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [maxSlides, setMaxSlides] = useState(10);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'claude'>('gemini');
  const [mode, setMode] = useState<GenerationMode>('quick');
  const [theme, setTheme] = useState('corporate');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('');

  const loadFiles = async () => {
    setIsLoading(true);
    const result = await listPPTFiles();
    if (result.success && result.data) {
      setFiles(result.data.files);
    }
    setIsLoading(false);
  };

  const loadProStatus = async () => {
    const result = await getProStatus();
    if (result.success && result.data) {
      setProStatus(result.data);
    }
  };

  useEffect(() => {
    loadFiles();
    loadProStatus();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('프레젠테이션 주제를 입력하세요');
      return;
    }
    if (prompt.trim().length < 10) {
      setError('프레젠테이션 주제는 10자 이상 입력하세요');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    setCurrentStage('');

    if (mode === 'quick') {
      // Quick Mode (Gemini/Claude)
      const result = await generatePPTFromPrompt(prompt, maxSlides, aiProvider);

      if (result.success) {
        setSuccess('프레젠테이션이 생성되었습니다');
        setPrompt('');
        loadFiles();
      } else {
        setError(result.error || '생성 실패');
      }
    } else {
      // Pro Mode (Claude Haiku 3)
      setCurrentStage('Research...');

      const result = await generatePPTPro(prompt, maxSlides, context, theme);

      if (result.success && result.data) {
        const data = result.data;
        if (data.success) {
          setSuccess(
            `프레젠테이션이 생성되었습니다!\n` +
            `슬라이드: ${data.slides_count}장\n` +
            `요약: ${data.research_summary?.slice(0, 100)}...`
          );
          setPrompt('');
          setContext('');
          loadFiles();
        } else {
          setError(data.error || '생성 실패');
        }
      } else {
        setError(result.error || '생성 실패');
      }
    }

    setIsGenerating(false);
    setCurrentStage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PPT 생성</h1>
        <p className="text-gray-500">AI 기반 프레젠테이션 자동 생성</p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setMode('quick')}
          className={`flex-1 rounded-xl p-4 border-2 transition-all ${
            mode === 'quick'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              mode === 'quick' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${mode === 'quick' ? 'text-indigo-900' : 'text-gray-900'}`}>
                Quick Mode
              </p>
              <p className="text-sm text-gray-500">빠른 생성 (10-30초) • 무료</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('pro')}
          disabled={!proStatus?.pro_available}
          className={`flex-1 rounded-xl p-4 border-2 transition-all ${
            mode === 'pro'
              ? 'border-purple-500 bg-purple-50'
              : proStatus?.pro_available
                ? 'border-gray-200 bg-white hover:border-gray-300'
                : 'border-gray-100 bg-gray-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              mode === 'pro' ? 'bg-purple-500 text-white' :
              proStatus?.pro_available ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-300'
            }`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${
                mode === 'pro' ? 'text-purple-900' :
                proStatus?.pro_available ? 'text-gray-900' : 'text-gray-400'
              }`}>
                Pro Mode
                {!proStatus?.pro_available && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
                    API Key 필요
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                고품질 (1-3분) • ~$0.04/건
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Pro Mode Info Banner */}
      {mode === 'pro' && proStatus && (
        <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-purple-900">Pro Mode 파이프라인</p>
              <ul className="mt-1 text-sm text-purple-700 space-y-1">
                {proStatus.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-purple-600">
                예상 비용: {proStatus.estimated_cost_per_generation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generator Form */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          새 프레젠테이션 생성
          {mode === 'pro' && (
            <span className="ml-2 text-sm font-normal text-purple-600">Pro Mode</span>
          )}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프레젠테이션 주제
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="예: 2026년 AI 기술 트렌드와 비즈니스 적용 방안에 대한 발표 자료"
            />
          </div>

          {/* Pro Mode: Context Input */}
          {mode === 'pro' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                추가 요구사항 (선택)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="예: 경영진 대상 발표, 구체적인 수치 데이터 포함, 결론에 액션 아이템 포함"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최대 슬라이드 수: {maxSlides}
              </label>
              <input
                type="range"
                min={mode === 'pro' ? 8 : 5}
                max={mode === 'pro' ? 20 : 30}
                value={maxSlides}
                onChange={(e) => setMaxSlides(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {mode === 'quick' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI 모델
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'claude')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  테마
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="corporate">Corporate (비즈니스)</option>
                  <option value="modern">Modern (모던)</option>
                  <option value="minimal">Minimal (심플)</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 whitespace-pre-line">
              {success}
            </div>
          )}

          {currentStage && (
            <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-600 flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              {currentStage}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              mode === 'pro'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {mode === 'pro' ? 'Pro 생성 중...' : '생성 중...'}
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {mode === 'pro' ? 'Pro로 생성' : 'AI로 생성'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">생성된 파일</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-gray-500 py-8">생성된 파일이 없습니다</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {files.map((file) => (
              <div key={file.filename} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    file.mode === 'pro' ? 'bg-purple-100' : 'bg-orange-100'
                  }`}>
                    <svg className={`h-6 w-6 ${file.mode === 'pro' ? 'text-purple-600' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{file.filename}</p>
                      {file.mode === 'pro' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>
                <a
                  href={`http://localhost:9001${file.download_url}?api_key=autom-api-key-2026`}
                  download
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  다운로드
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
