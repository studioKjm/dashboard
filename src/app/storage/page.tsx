'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function StoragePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문서 저장소</h1>
          <p className="text-gray-500">문서를 업로드하고 관리하세요. AI 요약, 형식 변환, 벡터 검색을 지원합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/storage/convert"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
            형식 변환
          </Link>
          <Link
            href="/storage/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            파일 업로드
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">전체 문서</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">0</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">전체 용량</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">0 MB</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">카테고리</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">0</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">파일 형식</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">0</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="파일명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">모든 카테고리</option>
            <option value="document">문서</option>
            <option value="spreadsheet">스프레드시트</option>
            <option value="presentation">프레젠테이션</option>
            <option value="image">이미지</option>
            <option value="markdown">마크다운</option>
            <option value="data">데이터</option>
            <option value="archive">압축파일</option>
          </select>
        </div>
      </div>

      {/* Document List - Empty State */}
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">문서가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">파일을 업로드하여 시작하세요.</p>
          <div className="mt-6">
            <Link
              href="/storage/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              첫 문서 업로드
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
