# AI 인계 지침서 — 학교 업무일지 데모 버전

> 이 문서는 이 코드를 이어서 고칠 **AI 코딩 도우미(Claude, ChatGPT, Gemini 등)** 를 위한 것입니다.
> 선생님은 이 파일을 AI에게 그대로 주고 "이 지침서를 먼저 읽고 ○○를 고쳐 줘"라고 요청하면 됩니다.
> 사람이 설치하는 방법은 「사용 방법(선생님용).md」에 있습니다.

## 0. 먼저 지킬 것 (요약)

1. **사용자는 개발자가 아닌 교사입니다.** 답변·화면 문구·오류 메시지는 쉬운 한국어로, 전문 용어는 풀어 씁니다. 화면 문구는 "~해요/~합니다" 존댓말, 이모지는 남발하지 않습니다.
2. **배포 파일은 3개뿐입니다**: `code.gs`, `index.html`, `appsscript.json`. 사용자가 앱스 스크립트 편집기에 **손으로 붙여넣어** 배포합니다. 빌드 도구·npm 패키지·추가 파일을 만들면 안 됩니다. `index.html`은 한 파일로 유지합니다(CSS·JS 모두 안에).
3. **비밀값(API 키)을 코드에 적지 않습니다.** 나이스 키·Gemini 키는 스크립트 속성에만 둡니다. 저장소가 공개(GitHub)입니다.
4. **Firestore 경로·컬렉션 이름·문서 필드 이름·부서 내부값을 바꾸지 않습니다.** 이미 쓰는 학교의 데이터가 안 보이게 됩니다. 표시 이름은 라벨 매핑으로만 바꿉니다(아래 6장).
5. **드라이브 파일은 앱에서 지우지 않습니다.** 자료·섹션 삭제는 `deleted: true` 표시(소프트 삭제)입니다.
6. 고친 뒤에는 **문법 검사 + 로컬 하네스로 실제 동작 확인**(9장)을 하고, 무엇이 확인됐고 무엇이 실제 배포에서만 확인 가능한지 사용자에게 구분해 알립니다.

---

## 1. 무엇인가

- 학교 교직원이 함께 쓰는 **업무일지·공유 달력** 웹 앱. Google Apps Script(GAS) 웹 앱 + Firebase Firestore.
- 원래 한 중학교(장흥관산중)의 실제 업무일지(구글 로그인 방식)에서 갈라져 나온 **"데모 버전"** 입니다. 실제 버전 코드는 이 저장소에 없고, 두 버전은 **따로 관리**됩니다(한쪽을 고쳐도 다른 쪽에 반영되지 않음).
- 데모 버전의 목표: **어느 학교든** 자기 구글 계정으로 배포해 **로그인 없이** 쓰기. 연수(바이브코딩 강의)에서 시연용으로도 씁니다.
- 주요 기능: 달력(일정 CRUD, 공휴일·재량휴업일), AI 업무 입력기(자연어 → 일정 JSON), AI 챗봇, AI 주간·월간 요약, 주간 업무계획 표, 월중계획 표, 계획 시트 만들기(구글 시트 템플릿 복사), 시간표 탭(구글 시트 임베드), 교육활동 성찰 게시판(좋아요·댓글·엑셀 보고서), 온라인 교무실(부서별 자료 + 드라이브 업로드 + 일정 연결), 나이스 급식·시간표 위젯, 관리 정보(처음 설정·초기화·점검).

## 2. 파일 지도

| 파일 | 역할 | 배포에 들어가나 |
|---|---|---|
| `code.gs` | GAS 서버. 웹 앱 진입점 `doGet`, AI·나이스·드라이브·설정·관리자 함수 | O |
| `index.html` | 화면 전체(HTML+CSS+JS 모듈 한 파일, 약 1.1만 줄). Firestore는 브라우저에서 직접 읽고 씀 | O (편집기에서 이름 `index`) |
| `appsscript.json` | 매니페스트. `webapp.executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`, OAuth 범위 | O |
| `firestore.rules` | Firestore 보안 규칙. 사용자가 Firebase 콘솔에 붙여넣음 | X (Firebase에) |
| `사용 방법(선생님용).md` | 설치·설정 안내(교사용) | X |
| `AI 인계 지침서.md` | 이 문서 | X |
| `README.md` | 저장소 첫 화면 | X |
| `개발용/local-harness.js` | 로컬 시험 도구(Node). GAS 서비스를 흉내 내고 화면을 띄움 | X |

## 3. 실행 구조

```
브라우저(로그인 없음)
 ├─ index.html (GAS가 template.evaluate()로 내려줌, <?!= bootJson ?> 자리에 시작 설정 주입)
 │   ├─ Firestore 직접 읽기/쓰기 (Firebase JS SDK 11.10.0, 인증 없음)
 │   └─ google.script.run.X(...)  ──→  code.gs 의 X 함수 (배포한 계정 권한으로 실행)
 │                                       ├─ UrlFetchApp → 나이스 OpenAPI, Gemini API, 드라이브 업로드, Firestore REST(연결 확인)
 │                                       ├─ DriveApp / SpreadsheetApp (교무실 폴더, 계획 시트)
 │                                       └─ PropertiesService (설정·사용량), CacheService (캐시·업로드 세션)
```

- **실행: 나(배포한 계정) / 액세스: 모든 사용자(익명 포함)**. 따라서
  - `Session.getActiveUser().getEmail()`은 익명 사용자에게 **빈 문자열**입니다. 배포 계정 본인이 로그인해 열었을 때만 이메일이 나옵니다.
  - 모든 서버 함수는 배포 계정 권한으로 돌아가므로 **익명 사용자가 부를 수 있는 함수 = 공격면**입니다.
  - GAS에서는 **이름이 `_`로 끝나는 함수만 화면에서 부를 수 없습니다.** 나머지 최상위 함수는 전부 `google.script.run`으로 호출 가능합니다. 내부용 함수는 반드시 `_`로 끝내세요.
- Firebase Auth는 쓰지 않습니다. 화면은 브라우저별 임의 ID(`localStorage.worklogDemoDeviceId`, `demo-xxxxxxxxxxxx`)를 `state.userId`로 씁니다(좋아요·작성자 구분용, 보안 수단 아님).

### 3-1. 시작 설정(BOOT)

`doGet` → `getBootJson_()`이 아래 JSON을 만들어 `index.html`의 `<script type="application/json" id="bootConfig"><?!= bootJson ?></script>`에 넣습니다(`<`는 `<`로 이스케이프). 비밀값은 넣지 않습니다.

```json
{ "schoolName": "…", "schoolKind": "중학교", "neisReady": true,
  "periodTimes": {"1":"8:50~9:35", …} | null,
  "firebaseConfig": {…} | null,      // null이면 공용 체험 DB
  "dataSpace": "s1a2b3c4d5e6" | "" } // 공용 체험 DB에서만 사용
```

- `index.html` 전체가 GAS 템플릿으로 평가됩니다. **파일 어디에도 `<?` 문자열을 새로 넣지 마세요**(템플릿 구문으로 해석됨). 넣어야 하면 `'<' + '?'`처럼 나눕니다.
- 서버 없이 파일을 열면 bootConfig 파싱이 실패하고 `BOOT = {}`로 동작합니다(로컬 미리보기).

### 3-2. 데이터베이스 선택과 데이터 칸

`index.html` 앞부분:

```js
const firebaseConfig = hasOwnFirebase ? BOOT.firebaseConfig : SHARED_DEMO_FIREBASE_CONFIG;
const appId = usingSharedDb && BOOT.dataSpace ? `${firebaseConfig.appId}__${BOOT.dataSpace}` : firebaseConfig.appId;
// 모든 경로: artifacts/${appId}/public/data/<컬렉션>/<문서>
```

- **공용 체험 DB**: 제작자의 Firebase 프로젝트 `school-worklog-demo`(Firestore, 서울 리전). 여러 학교 배포가 함께 쓰므로 `dataSpace = 's' + md5(ScriptApp.getScriptId()).slice(0,12)`로 **스크립트 프로젝트마다 칸을 나눕니다**(`sharedDataSpace_`). 같은 스크립트를 재배포해도 칸은 같고, 새 스크립트 프로젝트를 만들면 새 칸(빈 상태 → 예시 자동 채움)입니다.
- **우리 학교 Firebase**: 관리자가 붙여넣은 설정을 스크립트 속성 `FIREBASE_CONFIG`(JSON)에 저장. 이때는 칸 이름을 붙이지 않고 `appId` 그대로 씁니다.
- 두 경우 모두 같은 `firestore.rules`를 씁니다: `artifacts/{appId}/public/data/{컬렉션}/{문서}` 중 허용 목록 8개 컬렉션만 누구나 읽기·쓰기. **새 컬렉션을 추가하면 규칙에도 추가해야 하고, 이미 배포한 학교는 규칙을 다시 게시해야 합니다**(공용 체험 DB는 제작자가 `firebase deploy --only firestore`).

## 4. 서버 함수 (code.gs)

### 4-1. 화면에서 부르는 함수 (공개)

| 함수 | 누가 | 하는 일 / 보호 장치 |
|---|---|---|
| `doGet` | 누구나 | 템플릿 평가, 제목에 학교 이름 |
| `getTimetableConfigs` / `saveTimetableConfig` / `deleteTimetableConfig` | 누구나 | 「시간표」 탭의 구글 시트 링크 목록(스크립트 속성 `TIMETABLE_CONFIGS_V1`). 최대 10개 |
| `callGeminiApi(prompt, type)` / `getAiChatResponse(q, eventsJson)` | 누구나 | Gemini 호출. 프롬프트 12만 자 제한, 하루 한도 `DEMO_AI_DAILY_LIMIT`, 429/503은 "요청이 몰려 있습니다" |
| `createPlanningSheet(payload)` | 누구나 | 템플릿 시트 복사 → 월중·주간 시트 채움. 하루 한도 `DEMO_SHEET_DAILY_LIMIT`, 결과는 교무실 폴더 `_만든 계획 시트`에, 링크 공개(보기) |
| `neisFetch(endpoint, params, force)` | 누구나 | 나이스 프록시. 허용 엔드포인트만, `'timetable'`은 학교 종류로 els/mis/his/spsTimetable 선택. 1시간 캐시, 강제 새로고침은 1분에 1번 |
| `getPublicHolidays(force)` | 누구나 | 구글 공휴일 iCal → 스크립트 속성 24시간 캐시 |
| `refreshPublicHolidaysJob` | 트리거 | 5분에 1번만 실제 실행(공개 함수라 남용 방지) |
| `getOfficeConfig` | 누구나 | 업로드 가능 여부 |
| `officeStartUpload` / `officeUploadChunk` / `officeUploadStatus` | 누구나 | 드라이브 재개 가능 업로드(5MB 조각, base64). 한 파일 20MB, 하루 파일 수·용량 한도 |
| `saveOfficeBackup(json)` | 누구나 | 자료 목록 JSON을 하루 1회 `_목록 백업`에(60개 보관) |
| `demoGetSampleFiles` | 누구나 | 예시 PDF 3개를 `_예시 자료`에 준비(있으면 재사용) |
| `getAdminStatus(adminCode)` | 관리자 | 관리 정보. 관리자가 아니면 최소 정보만 |
| `searchNeisSchools(name, code)` | 관리자 | 나이스 `schoolInfo`로 학교 찾기(키 없으면 결과 일부만) |
| `saveSchoolSettings(settings, code)` | 관리자 | 학교·나이스 키·Gemini 키·교시 시간·관리자 암호 저장. **키는 저장 전에 실제로 검증**(나이스 `schoolInfo` pSize=1 → `ERROR-290`이면 거부, Gemini `models?pageSize=1` → 200이어야 함) |
| `saveFirebaseConfig(text, code)` / `useSharedDemoDatabase(code)` | 관리자 | 콘솔의 `const firebaseConfig = {…}` 텍스트나 JSON을 파싱 → Firestore REST로 `demoMeta/connectionCheck`를 PATCH 해 보고(DB 없음/규칙 미게시 구분) 저장 |
| `setOfficeFolder` / `createOfficeFolder` / `createDemoOfficeFolder` / `shareDemoFolderByLink` | 관리자 | 교무실 폴더 지정·생성·링크 공개 |
| `installHolidayTrigger` / `removeMyHolidayTrigger` | 관리자 | 공휴일 매일 갱신 트리거 |
| `demoPrepareReset(code)` | 관리자 | 초기화 전 서버 상태(시간표 설정) 되돌리기 + 예시 파일 정보 |
| `setupDemo` / `setupPublicHolidayTrigger` | 편집기에서 직접 | `requireOwnerRun_`(활성 사용자 = 실행 사용자일 때만). 화면에서 부르면 거부 |

### 4-2. 관리자 확인

- `requireAdmin_(adminCode)`: ① 스크립트 속성 `DEMO_ADMIN_CODE`와 일치(10번 틀리면 10분 잠금, `isValidAdminCode_`) 또는 ② 접속 계정이 `ADMIN_EMAILS`에 있거나 스크립트 파일 소유자.
- 관리 함수는 **마지막 인자로 `adminCode`** 를 받습니다. 화면은 `sessionStorage.worklogDemoAdminCode`에 두었다가 넘깁니다. 새 관리 함수도 같은 방식으로 만드세요.

### 4-3. 하루 한도·남용 방지

- `demoUseQuota_(name, amount, limit, message)`: 스크립트 속성 `DEMO_USAGE_<name>`에 `{day:'yyyyMMdd'(서울), used}` 저장, `LockService`로 경합 방지. 이름: `ai`, `uploadFiles`, `uploadBytes`, `sheet`.
- `demoThrottle_(name, seconds)`: `CacheService` 키로 짧은 시간 반복 방지.

## 5. 설정값 (스크립트 속성)

`getConfig_(key)` = 스크립트 속성 → `CONFIG_DEFAULTS` 순서. **새 설정도 이 방식으로 추가**하고 코드에 값을 박지 마세요. 「처음 설정」 화면이 아래 앞쪽 항목을 대신 저장합니다.

| 키 | 내용 | 저장 위치 |
|---|---|---|
| `NEIS_API_KEY` | 나이스 인증키 | 처음 설정 ① |
| `NEIS_ATPT_OFCDC_SC_CODE`, `NEIS_SD_SCHUL_CODE`, `NEIS_SCHOOL_KIND`, `SCHOOL_NAME` | 학교 정보 | 처음 설정 ②(학교 찾기) |
| `GEMINI_API_KEY` | Gemini 키 | 처음 설정 ③ |
| `GEMINI_MODEL` | 기본 `gemini-2.5-flash` | 스크립트 속성 |
| `PERIOD_TIMES` | `08:50-09:35, …` (`parsePeriodTimes_`) | 처음 설정 ④ |
| `DEMO_ADMIN_CODE` | 관리자 암호 | 처음 설정 ⑤ |
| `FIREBASE_CONFIG` | 우리 학교 Firebase(JSON) | 관리 정보 → 데이터베이스 |
| `OFFICE_DRIVE_FOLDER_ID` | 교무실 폴더 | setupDemo / 관리 정보 |
| `PLANNING_TEMPLATE_SPREADSHEET_ID` | 계획 시트 기본틀(제작자 시트, 링크 보기 공유) | 스크립트 속성 |
| `ADMIN_EMAILS` | 관리자 계정(쉼표) | 스크립트 속성 |
| `DEMO_AI_DAILY_LIMIT`(400), `DEMO_UPLOAD_DAILY_FILES`(120), `DEMO_UPLOAD_DAILY_MB`(500), `DEMO_SHEET_DAILY_LIMIT`(60) | 하루 한도 | 스크립트 속성 |
| `DEMO_TIMETABLE_SHEET_URL` | 초기화 때 되돌릴 기본 시간표 시트 | 스크립트 속성 |
| 자동 관리(손대지 않음) | `TIMETABLE_CONFIGS_V1`, `PUBLIC_HOLIDAYS_V1`, `OFFICE_FOLDER_MAP_V1`, `OFFICE_BACKUP_AT_V1`, `DEMO_USAGE_*` | 앱 |

## 6. 데이터 모델 (Firestore)

경로 접두어: `artifacts/{appId}/public/data/`

| 컬렉션 | 문서 ID | 주요 필드 |
|---|---|---|
| `calendarEvents` | 자동 / `academic_sem1Start` 등 | `startDate`,`endDate`(YYYY-MM-DD), `startTime`,`endTime`(HH:MM), `description`, `target`, `eventLocation`, `taskManager`, `department`, `isExternal`, `includeInMonthlyPlan`, `isAcademic`, `createdBy`, `timestamp` |
| `weeklyNotes` | `{월요일}_{category}__{sub}` / `persistent_겸임` | `weekStartDate`, `category`('협의 및 전달사항'·'겸임'), `subCategory`('관리자'·'교무부'·'학생부'·'정보부'·'행정실'), `content`(관리자는 JSON `{교장,교감,행정실장}`), `persistent` |
| `schoolHolidays` | 날짜 | `date`, `type:'discretionary'`, `name` |
| `eduReflections` | 자동 | `department`, `activityName`, `reflection`, `activityDate`, `author`, `likes[]`(기기 ID), `comments[{author,text,ts,by}]`, `timestamp` |
| `academicConfig` | `current` | `schoolYear`, `sem1Start`…`winterEnd` |
| `officeSections` | 자동 | `department`, `title`, `order`, `deleted` |
| `officeMaterials` | 자동 | `department`, `sectionId`, `title`, `description`, `author`, `link`, `files[{id,name,mimeType,size,url}]`, `linkedEventIds[]`, `pinned`, `deleted`, `createdAtMs`, `updatedAtMs`, `order` |
| `demoMeta` | `state` / `connectionCheck` | `seedVersion`, `reason`('auto'·'reset'·'empty'), `seededAtMs`, `count`, `filesAttached` |

**부서 값 규칙 (바꾸지 말 것)**
- 일정 `department`: `교무부`·`학생부`·`행정실`·`연수/협의회`·`복무`(+ 학사일정은 빈 값). `Utils.normalizeDepartment`가 옛 값을 정리합니다. `복무`는 주간계획 표에만 나오고 일부 목록에서 빠집니다.
- 성찰 `department`: 내부값 `학생부`·`교무부`·`연구정보부`·`행정실`·`기타`. 표시는 `REFLECTION_DEPT_LABELS`(`행정실`→`행정실(급식실)`). `기타`는 주요 4부서가 아닌 값을 모두 흡수(`reflectionPostsForDept`).
- 교무실 부서: `OFFICE_DEPTS`(`교무부`·`학생부`·`연구정보부`·`행정실`·`기타`), 표시 `OFFICE_DEPT_LABELS`(`기타`→`공통·기타`). 서버 `OFFICE_DEPARTMENTS`와 같아야 합니다(드라이브 하위 폴더 이름).
- 학교마다 부서 이름이 다르면 **내부값은 두고 라벨 매핑만** 바꾸세요. 내부값을 바꿔야 한다면 기존 데이터 이전 방법을 사용자와 먼저 상의합니다.

## 7. 화면 코드(index.html) 지도

모듈 스크립트 안의 주요 객체(위에서 아래 순서):
`BOOT`/`firebaseConfig`/`appId` → `state`, `dataStore` → `DOMElements` → `Utils` → `TimeSelectService` → `ModalManager` → `ReflectionExporter`(xlsx-js-style) → `ViewRenderer`(달력·주간·월중·성찰 그리기) → **`DemoService`**(예시 데이터·초기화) → `FirebaseService`(Firestore 구독·저장, 접속 팝업) → `ApiService`(AI) → `ExportService`(계획 시트) → `TimetableService`(시간표 탭) → **`AdminInfoService`**(⚙ 관리 정보) → `OfficeService`(온라인 교무실) → `HolidayService` → **`NeisService`**(급식·시간표 위젯) → `App.init()`

- **DemoService**: `ensureSeeded()` — `demoMeta/state`가 없으면 예시를 채움(문서 ID 고정 `demo_evt_*`, `demo_mat_*` 등이라 동시 접속에도 중복 없음). 날짜는 **오늘 기준 상대 계산**. `resetAll(code, {seed})` — 7개 컬렉션 일괄 삭제 후 예시 채움(seed) 또는 `reason:'empty'` 기록(비우기). 예시 일정 중 `demo_evt_vibe`(2026-11-26 15:00~16:30 바이브코딩 연수, 장흥중 SW실)는 **제작자가 요청한 고정 일정**입니다. 다른 학교용으로 빼려면 `buildSeed`에서 그 줄과 연결된 `demo_mat_06`의 `events`를 함께 정리하세요.
- **NeisService**: 서버 없이 열면 호출하지 않고 안내만. `BOOT.neisReady === false`면 "학교를 정하면 … 나와요" 안내(`loadErrorHtml`). 학급 수가 `manyClassThreshold`(8)를 넘으면 학년 칩(`data-tt-grade`)으로 한 학년만 표시, 선택은 `localStorage.schoolDiaryTtGradeV1`. 반 번호 없는 행(고교 선택과목)은 같은 학년에 반이 있으면 열에서 뺍니다. 과목 색 `subjectColors`, 교시 시간 `periodTimes`(BOOT 우선).
- **AdminInfoService**: `render(status, notice, {reload})`, `setupHtml`, `databaseHtml`, `runServer(fn, args, done, opts)` — 실패하면 화면을 지우지 않고 메시지 상자만 띄웁니다(입력값 유지). 학교·교시·DB를 바꾸면 "새로고침" 안내(`target="_top"` 링크로 웹 앱 주소).
- **OfficeService**: 표지 위젯 배치(`updateLayout`), 보드, 업로드(`uploadFile` → 서버 조각 업로드), 일정 연결은 자료 쪽 `linkedEventIds`에만 저장하고 일정 쪽은 `byEvent`로 역계산.
- 화면은 1280px 본문(`max-w-7xl`) 고정. 좌우 여백이 넓으면 위젯 상시 표시, 좁으면 가장자리 서랍(`side-widgets-drawer`). **본문 폭을 줄이지 마세요**(원 사용자가 거부한 변경).

## 8. 외부 API 메모

- **나이스 OpenAPI** `https://open.neis.go.kr/hub/{엔드포인트}?KEY=…&Type=json&pIndex=1&pSize=1000&ATPT_OFCDC_SC_CODE=…&SD_SCHUL_CODE=…`
  - 사용: `mealServiceDietInfo`, `elsTimetable`(초), `misTimetable`(중), `hisTimetable`(고), `spsTimetable`(특수), `classInfo`, `schoolInfo`(학교 찾기).
  - 결과 코드: `INFO-000` 정상, `INFO-200` 데이터 없음, `ERROR-290` 키 오류, `ERROR-300` 필수값 누락. 키가 없으면 "샘플" 모드로 몇 건만 돌려줍니다.
  - 자료는 **하루 1회 배치 갱신**(행의 `LOAD_DTM`). 토요휴업일 행은 `isRestRow`로 거릅니다.
  - 키 발급: open.neis.go.kr 로그인(SNS) → 활용가이드 → 인증키 신청 → 즉시 발급 → 마이페이지 → 인증키 발급 내역.
- **Gemini**: `v1beta/models/{GEMINI_MODEL}:generateContent?key=…`. `type==='tasks'`이면 JSON 스키마 응답. 키 확인은 `v1beta/models?pageSize=1`. 무료 등급은 분당·하루 한도가 있어 연수 때 429가 날 수 있음.
- **구글 공휴일**: `ko.south_korea#holiday` 공개 iCal. DESCRIPTION이 "공휴일"인 것만, "쉬는 날 X" → "X 대체공휴일".
- **Firestore REST**(연결 확인만): `PATCH …/documents/artifacts/{appId}/public/data/demoMeta/connectionCheck?key=…`. 200 정상, 403 "Missing or insufficient permissions" = 규칙 미게시, "does not exist" = DB 없음. (잘못된 apiKey여도 규칙이 열려 있으면 통과하므로 apiKey 검증 수단은 아님)
- **드라이브 재개 업로드**: 서버가 `ScriptApp.getOAuthToken()`으로 세션을 열고 세션 주소는 `CacheService`에만 둠(브라우저로 토큰을 보내지 않음).

## 9. 로컬에서 시험하는 법

```bash
node 개발용/local-harness.js           # http://localhost:8765
PORT=8799 HARNESS_PROPS='{"DEMO_ADMIN_CODE":"demo-pass"}' node 개발용/local-harness.js
```

- `code.gs`를 Node `vm`에서 그대로 실행하고 `PropertiesService`·`CacheService`·`DriveApp`·`SpreadsheetApp`·`ScriptApp`·`Session`·`LockService`·`Utilities`를 메모리로 흉내 냅니다. 요청마다 `code.gs`·`index.html`을 다시 읽으므로 수정 후 새로고침만 하면 됩니다.
- `?as=admin`(배포 계정으로 로그인) / `?as=anon`(익명) 으로 접속 계정을 바꿉니다.
- 나이스·Firestore REST는 **실제로** 호출(curl), Gemini는 **모의 응답**, 드라이브 업로드도 모의입니다.
- Firestore는 화면이 고른 실제 DB에 붙습니다. 기본은 공용 체험 DB의 하네스 전용 칸(가짜 스크립트 ID `SCRIPT_ID`의 해시)이라 실제 학교 데이터와 섞이지 않습니다. 시험 중 우리 학교 Firebase를 붙였다면 끝나고 되돌리세요.
- 서버 함수 직접 호출: `curl -X POST "localhost:8765/gas?as=anon" -H 'Content-Type: application/json' -d '{"fn":"neisFetch","args":["mealServiceDietInfo",{…},false]}'`
- 상태 보기 `/__state`, 값 바꾸기 `/__set?prop=KEY&value=V`, `/__set?ai=busy`(429 흉내).
- 문법 검사: `code.gs`는 `.js`로 복사해 `node --check`, `index.html`은 `<script type="module">` 안쪽만 잘라 `.mjs`로 `node --check`.
- **하네스로 확인할 수 없는 것**: 실제 GAS 권한 승인·배포, 익명 접속 시 `Session` 동작, 실제 Gemini 응답, 실제 드라이브 폴더·공유·PDF 변환, HtmlService 샌드박스(다운로드·팝업·`target="_top"`). 이런 변경은 사용자에게 "배포해서 확인해 주세요"라고 분명히 말합니다.

## 10. 자주 하는 수정

- **화면 문구·라벨 바꾸기**: `index.html`에서 해당 문구 검색. 부서 표시 이름은 `REFLECTION_DEPT_LABELS`·`OFFICE_DEPT_LABELS`.
- **새 설정 추가**: `CONFIG_DEFAULTS`에 키 추가 → 필요하면 `ADMIN_SETTING_ITEMS`(관리 정보 표) → 화면에서 필요하면 `getBootJson_`에 비밀이 아닌 값만 추가 → 「처음 설정」에서 입력받으려면 `saveSchoolSettings`와 `AdminInfoService.setupHtml`/`runAction`.
- **새 서버 함수**: 익명 호출이 위험하면 `requireAdmin_(adminCode)`를 첫 줄에, 비용이 드는 외부 호출이면 `demoUseQuota_`를. 내부용은 이름 끝에 `_`.
- **새 Firestore 컬렉션**: `firestore.rules` 허용 목록에 추가 + `DEMO_COLLECTIONS`(초기화 대상)에 추가 + 사용 방법 문서에 "규칙 다시 게시" 안내.
- **예시 데이터 바꾸기**: `DemoService.buildSeed`. 바꾼 뒤 `seedVersion`을 올려도 이미 채운 DB는 자동으로 바뀌지 않습니다(관리자 초기화 필요).
- **AI 프롬프트**: `ApiService.getAiTaskPrompt`(일정 추출), `handleAiChatSubmit`/`getAiChatResponse`(챗봇), `generateWeeklySummaryFromAI`·`generateMonthlySummaryFromAI`.

## 11. 알려진 한계

- 데이터는 **주소를 아는 누구나 읽고 쓸 수 있습니다**(인증 없음). 학생 개인정보 저장 용도로 쓰면 안 됩니다. 진짜 보안이 필요하면 구글 로그인 + Firebase Auth + 규칙(`request.auth`) 구조로 바꿔야 하고, 이는 실제(관산중) 버전에 가까운 설계입니다.
- 공용 체험 DB는 제작자 계정의 무료 한도를 모든 체험 배포가 나눠 씁니다.
- 구글 캘린더 동기화 없음(의도). 로그인 기반 버전에만 있음.
- 계획 시트 기본틀은 제작자 드라이브의 시트(링크 보기 공유)를 복사합니다. 기본틀 셀 위치(`populateMonthlyPlanningSheet_`의 `B5:E35`, 주간 `B2`·`B3`·9행부터 등)에 강하게 묶여 있어, 다른 기본틀을 쓰려면 같은 구조여야 합니다.
- 하루 한도·잠금은 스크립트 속성·캐시 기반이라 아주 많은 동시 요청에서는 대략적입니다.

## 12. 끝내기 전 확인 목록

- [ ] `node --check`로 `code.gs`·화면 스크립트 문법 통과
- [ ] 하네스에서 `?as=anon`·`?as=admin` 둘 다 열어 콘솔 오류 없음
- [ ] 코드·문서에 API 키, 개인 이메일, 학교 계정이 들어가지 않았음 (`grep -nE "AIza|[0-9a-f]{32}|@" code.gs index.html`로 확인. Firebase 웹 apiKey는 공개값이라 예외)
- [ ] `index.html`에 새 `<?` 없음
- [ ] Firestore 경로·필드·부서 내부값을 바꾸지 않았음
- [ ] 사용자에게 바뀐 점, 확인한 것, 배포해야만 확인되는 것, 다시 배포하는 방법(배포 관리 → 새 버전)을 알렸음
