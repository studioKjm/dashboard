# 다크모드 구현 계획서

## 현재 상태 (2026-01-17)
- ✅ 기존 디자인으로 롤백 완료
- ✅ 모든 다크모드 관련 파일 제거 완료
- ✅ 깨끗한 상태로 복구됨

---

## 문제점 분석

### 이전 구현의 문제점
1. **일관성 없는 색상 적용**
   - 일부 컴포넌트는 다크모드 스타일 있음
   - 일부 컴포넌트는 다크모드 스타일 없음
   - 자동화 스크립트로 인한 불완전한 적용

2. **입력 필드 가독성 문제**
   - 화이트모드: 흰 배경에 흰 글자
   - 다크모드: 검은 배경에 검은 글자
   - !important 사용으로 인한 CSS 우선순위 충돌

3. **카드/UI 요소 불일치**
   - 배경은 다크인데 카드는 밝음
   - 텍스트 색상이 배경과 대비 부족

4. **ThemeProvider 초기화 문제**
   - mounted 체크로 인한 Context 에러
   - 깜빡임 문제 미해결

---

## 새로운 구현 계획

### 원칙
1. **일관성 우선**: 모든 페이지, 모든 컴포넌트가 동일한 규칙 적용
2. **접근성 준수**: WCAG AA 기준 (최소 4.5:1 대비율)
3. **단계별 검증**: 각 단계마다 브라우저에서 직접 확인
4. **자동화 금지**: 수동으로 하나씩 확인하며 적용

---

## 구현 단계

### Phase 1: 디자인 시스템 정의 (30분)

#### 1.1 색상 팔레트 정의
```css
/* Light Mode */
--bg-primary: #f9fafb;     /* 페이지 배경 */
--bg-secondary: #ffffff;    /* 카드 배경 */
--bg-tertiary: #f3f4f6;     /* 섹션 배경 */
--bg-hover: #f3f4f6;        /* Hover 상태 */

--text-primary: #111827;    /* 주요 텍스트 */
--text-secondary: #6b7280;  /* 보조 텍스트 */
--text-tertiary: #9ca3af;   /* 비활성/placeholder */

--border: #e5e7eb;          /* 테두리 */
--border-light: #f3f4f6;    /* 약한 테두리 */

/* Dark Mode */
--bg-primary: #0a0a0a;      /* 페이지 배경 */
--bg-secondary: #1a1a1a;    /* 카드 배경 */
--bg-tertiary: #262626;     /* 섹션 배경 */
--bg-hover: #2a2a2a;        /* Hover 상태 */

--text-primary: #fafafa;    /* 주요 텍스트 */
--text-secondary: #a1a1aa;  /* 보조 텍스트 */
--text-tertiary: #71717a;   /* 비활성/placeholder */

--border: #3f3f46;          /* 테두리 */
--border-light: #27272a;    /* 약한 테두리 */
```

#### 1.2 매핑 규칙
| 라이트 모드 Tailwind | 다크 모드 추가 |
|---------------------|---------------|
| `bg-gray-100` | `dark:bg-gray-900` |
| `bg-white` | `dark:bg-gray-950` |
| `text-gray-900` | `dark:text-white` |
| `text-gray-600` | `dark:text-gray-400` |
| `border-gray-200` | `dark:border-gray-700` |

---

### Phase 2: 핵심 인프라 구축 (30분)

#### 2.1 ThemeProvider 구현
- localStorage 기반 테마 저장
- 시스템 설정 감지 (prefers-color-scheme)
- SSR 호환성 보장
- 깜빡임 방지 (inline script)

**파일**: `src/components/ThemeProvider.tsx`

#### 2.2 ThemeToggle 버튼
- Header에 통합
- 태양/달 아이콘
- 부드러운 전환 효과

**파일**: `src/components/ThemeToggle.tsx`

#### 2.3 전역 CSS 설정
- CSS 변수 정의
- Scrollbar 스타일
- Input 필드 기본 스타일 (중요!)

**파일**: `src/app/globals.css`

---

### Phase 3: 컴포넌트별 적용 (2시간)

#### 3.1 레이아웃 컴포넌트 (우선순위 높음)
1. **Sidebar** (20분)
   - [ ] 배경: `bg-gray-900` → 유지 (이미 다크)
   - [ ] 텍스트: `text-white` → 유지
   - [ ] 라이트모드 전환: `bg-white dark:bg-gray-900`

2. **Header** (20분)
   - [ ] 배경: `bg-white` → `bg-white dark:bg-gray-950`
   - [ ] 테두리: `border-gray-200` → `border-gray-200 dark:border-gray-800`
   - [ ] 검색창 입력 필드 확인

3. **RootLayout** (10분)
   - [ ] ThemeProvider 추가
   - [ ] 배경: `bg-gray-100` → `bg-gray-100 dark:bg-black`

#### 3.2 메인 페이지 (Dashboard)
**파일**: `src/app/page.tsx` (40분)

- [ ] 페이지 헤더 (제목, 설명)
- [ ] StatsCard 컴포넌트
  - [ ] 배경
  - [ ] 텍스트 (title, value)
  - [ ] 아이콘 배경 (유지)
- [ ] StatusBadge 컴포넌트
  - [ ] 모든 상태별 색상 (success, failed, running, pending)
- [ ] 워크플로우 목록 카드
  - [ ] 카드 배경
  - [ ] 리스트 아이템 hover
  - [ ] 텍스트 (이름, 설명, 시간)
- [ ] 최근 실행 카드
- [ ] 서비스 상태 카드

#### 3.3 서브 페이지 적용 (60분)
각 페이지당 10분 예상

1. **workflows/page.tsx**
   - [ ] 페이지 헤더
   - [ ] 필터 버튼
   - [ ] 테이블 (thead, tbody, hover)
   - [ ] StatusBadge

2. **logs/page.tsx**
   - [ ] 통계 카드
   - [ ] 필터 섹션
   - [ ] 실행 목록
   - [ ] 페이지네이션

3. **storage/page.tsx**
4. **pdf/page.tsx**
5. **ppt/page.tsx**
6. **settings/page.tsx**

---

### Phase 4: 검증 및 테스트 (30분)

#### 4.1 시각적 검증 체크리스트
각 페이지에서 다음 항목 확인:

**라이트 모드**
- [ ] 배경이 밝은 회색/흰색
- [ ] 텍스트가 검은색 계열
- [ ] 카드가 흰색 배경
- [ ] 입력 필드에 글자가 선명하게 보임
- [ ] 모든 텍스트 읽기 쉬움

**다크 모드**
- [ ] 배경이 검은색 계열
- [ ] 텍스트가 흰색 계열
- [ ] 카드가 진한 회색 배경
- [ ] 입력 필드에 글자가 선명하게 보임
- [ ] 모든 텍스트 읽기 쉬움

**전환**
- [ ] 테마 전환 시 부드러운 애니메이션
- [ ] 새로고침 후 테마 유지
- [ ] 깜빡임 없음

#### 4.2 테스트 페이지 목록
- [ ] / (Dashboard)
- [ ] /workflows
- [ ] /logs
- [ ] /storage
- [ ] /pdf
- [ ] /ppt
- [ ] /settings

---

## 성공 기준

### 필수 요구사항
1. ✅ 모든 페이지에서 라이트/다크 모드 일관성 유지
2. ✅ 입력 필드에서 글자가 항상 선명하게 보임
3. ✅ 카드와 배경의 대비가 충분함
4. ✅ 테마 전환이 즉시 반영됨
5. ✅ 새로고침 후 테마 유지됨

### 품질 기준
1. ✅ WCAG AA 접근성 준수
2. ✅ 부드러운 전환 애니메이션
3. ✅ 깜빡임 없음
4. ✅ 모든 UI 요소가 읽기 쉬움

---

## 타임라인

| 단계 | 예상 시간 | 누적 시간 |
|-----|---------|---------|
| Phase 1: 디자인 시스템 | 30분 | 30분 |
| Phase 2: 핵심 인프라 | 30분 | 1시간 |
| Phase 3: 컴포넌트 적용 | 2시간 | 3시간 |
| Phase 4: 검증 및 테스트 | 30분 | 3.5시간 |

**총 예상 시간**: 3.5시간

---

## 다음 단계

1. **이 계획서 검토 및 승인 받기**
2. Phase 1부터 순차적으로 진행
3. 각 Phase 완료 후 사용자 확인
4. 문제 발생 시 즉시 롤백 후 재계획

---

## 주의사항

### 하지 말아야 할 것
- ❌ 자동화 스크립트로 일괄 적용
- ❌ !important 사용
- ❌ 한번에 모든 파일 수정
- ❌ 테스트 없이 다음 단계 진행

### 반드시 해야 할 것
- ✅ 각 컴포넌트 수정 후 브라우저 확인
- ✅ 라이트/다크 모드 양쪽 모두 테스트
- ✅ 입력 필드 가독성 우선 확인
- ✅ 문제 발견 시 즉시 수정

---

**작성일**: 2026-01-17
**상태**: 승인 대기중
