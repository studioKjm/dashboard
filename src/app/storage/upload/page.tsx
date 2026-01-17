'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  documentId?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const SUPPORTED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
  '.xls', '.xlsx', '.csv', '.ods',
  '.ppt', '.pptx', '.odp',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  '.md', '.markdown',
  '.json', '.xml', '.yaml', '.yml',
  '.zip', '.tar', '.gz', '.7z', '.rar',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 파일 유효성 검사
  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return `지원하지 않는 파일 형식입니다: ${ext}`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기가 너무 큽니다. 최대 100MB까지 업로드 가능합니다.`;
    }

    return null;
  };

  // 파일 추가
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      uploadFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      });
    });

    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    e.target.value = '';
  }, [addFiles]);

  // 파일 제거
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // 태그 추가
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  // 태그 제거
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // 단일 파일 업로드
  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }

    try {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
        )
      );

      const response = await fetch(`${API_BASE}/storage/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '업로드에 실패했습니다.');
      }

      const result = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'completed', progress: 100, documentId: result.id }
            : f
        )
      );
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : '업로드 실패',
              }
            : f
        )
      );
    }
  };

  // 모든 파일 업로드
  const uploadAllFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    setIsUploading(false);
  };

  // 완료된 파일 수
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  // 파일 크기 포맷
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
            <h1 className="\1text-gray-900 dark:text-white\2">파일 업로드</h1>
            <p className="\1text-gray-500 dark:text-gray-400\2">
              여러 파일을 드래그 앤 드롭하거나 선택하여 업로드하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={SUPPORTED_EXTENSIONS.join(',')}
        />

        <svg
          className={`mx-auto h-16 w-16 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <div className="mt-4">
          <p className={`text-lg font-medium ${isDragging ? 'text-indigo-600' : 'text-gray-900'}`}>
            {isDragging ? '여기에 파일을 놓으세요' : '파일을 드래그하거나 클릭하여 선택'}
          </p>
          <p className="\1text-gray-500 dark:text-gray-400\2">
            최대 100MB / 지원 형식: PDF, Word, Excel, PowerPoint, 이미지, Markdown 등
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="\1bg-white dark:bg-gray-900\2">
        <h3 className="\1text-gray-900 dark:text-white\2">태그 (선택사항)</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-2 text-indigo-600 hover:text-indigo-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
            placeholder="태그 입력 후 Enter"
            className="\1border-gray-300 dark:border-gray-700\2"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg"
          >
            추가
          </button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="\1bg-white dark:bg-gray-900\2">
          <div className="\1border-gray-200 dark:border-gray-700\2">
            <div className="flex items-center gap-4">
              <h3 className="\1text-gray-900 dark:text-white\2">
                업로드 파일 ({files.length})
              </h3>
              <div className="flex items-center gap-2 text-xs">
                {completedCount > 0 && (
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                    완료 {completedCount}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="\1bg-gray-100 dark:bg-gray-800\2">
                    대기 {pendingCount}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="px-2 py-1 rounded bg-red-100 text-red-800">
                    오류 {errorCount}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiles([])}
                className="\1text-gray-800 dark:text-gray-200\2"
              >
                전체 삭제
              </button>
              <button
                onClick={uploadAllFiles}
                disabled={pendingCount === 0 || isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    업로드 중...
                  </span>
                ) : (
                  `${pendingCount}개 파일 업로드`
                )}
              </button>
            </div>
          </div>

          <ul className="\1divide-gray-200 dark:divide-gray-700\2">
            {files.map((file) => (
              <li key={file.id} className="px-4 py-3 flex items-center gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  file.status === 'completed' ? 'bg-green-100' :
                  file.status === 'error' ? 'bg-red-100' :
                  file.status === 'uploading' ? 'bg-indigo-100' :
                  'bg-gray-100'
                }`}>
                  {file.status === 'completed' ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : file.status === 'error' ? (
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  ) : file.status === 'uploading' ? (
                    <svg className="w-5 h-5 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="\1text-gray-400 dark:text-gray-500\2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="\1text-gray-900 dark:text-white\2">
                      {file.file.name}
                    </p>
                    {file.status === 'completed' && file.documentId && (
                      <Link
                        href={`/storage/${file.documentId}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        보기
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="\1text-gray-500 dark:text-gray-400\2">{formatSize(file.file.size)}</span>
                    {file.error && (
                      <span className="text-xs text-red-600">{file.error}</span>
                    )}
                  </div>
                  {file.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="\1text-gray-600 dark:text-gray-400\2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Supported Formats */}
      <div className="\1bg-gray-50 dark:bg-gray-800\2">
        <h3 className="\1text-gray-900 dark:text-white\2">지원 파일 형식</h3>
        <div className="\1text-gray-600 dark:text-gray-400\2">
          <div>
            <p className="\1text-gray-900 dark:text-white\2">문서</p>
            <p>PDF, DOC, DOCX, TXT, RTF</p>
          </div>
          <div>
            <p className="\1text-gray-900 dark:text-white\2">스프레드시트</p>
            <p>XLS, XLSX, CSV</p>
          </div>
          <div>
            <p className="\1text-gray-900 dark:text-white\2">프레젠테이션</p>
            <p>PPT, PPTX</p>
          </div>
          <div>
            <p className="\1text-gray-900 dark:text-white\2">이미지</p>
            <p>JPG, PNG, GIF, SVG, WEBP</p>
          </div>
          <div>
            <p className="\1text-gray-900 dark:text-white\2">마크다운</p>
            <p>MD, MARKDOWN</p>
          </div>
          <div>
            <p className="\1text-gray-900 dark:text-white\2">데이터</p>
            <p>JSON, XML, YAML</p>
          </div>
          <div>
            <p className="\1text-gray-900 dark:text-white\2">압축파일</p>
            <p>ZIP, TAR, GZ, 7Z</p>
          </div>
          <div>
            <p className="\1text-gray-900 dark:text-white\2">기타</p>
            <p>최대 100MB</p>
          </div>
        </div>
      </div>

      {/* Navigation after upload */}
      {completedCount > 0 && pendingCount === 0 && !isUploading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">
              {completedCount}개 파일이 성공적으로 업로드되었습니다.
            </span>
          </div>
          <Link
            href="/storage"
            className="px-4 py-2 text-sm font-medium text-green-700 hover:text-green-800"
          >
            문서 목록 보기
          </Link>
        </div>
      )}
    </div>
  );
}
