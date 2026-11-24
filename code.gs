// =====================================================================
// 학교 업무일지 "데모 버전" — 어느 학교든 배포해서 쓸 수 있는 판
// =====================================================================
// 실제(관산중) 업무일지와 다른 점
//  1) 구글 로그인 없이 누구나 엽니다.  → 배포할 때 "실행: 나 / 액세스: 모든 사용자"로 설정합니다.
//  2) 서버 기능(AI·드라이브·나이스)은 모두 "배포한 사람 계정"으로 실행됩니다.
//  3) 구글 캘린더 동기화는 뺐습니다. (참가자 일정이 배포한 사람 캘린더로 들어가는 것을 막기 위해)
//  4) 누구나 호출할 수 있으므로 AI 호출·파일 업로드·시트 만들기에 하루 한도를 둡니다.
//  5) 학교(나이스 키·학교 코드), AI 키, 데이터베이스는 학교마다 따로 정합니다.
//     → 배포한 뒤 앱의 ⚙ 관리 정보 → 「처음 설정」 화면에서 입력합니다. 코드는 고치지 않아도 됩니다.
//  6) 데이터베이스를 따로 정하지 않으면 "공용 체험 DB"(제작자가 만든 데모용 Firebase)에
//     이 배포만의 칸을 만들어 저장합니다. 체험용이므로 실제로 쓰려면 우리 학교 Firebase로 바꿉니다.
//
// ★ 자세한 순서: 폴더의 「사용 방법(선생님용).md」
// ★ 코드 구조·고칠 때 주의점: 폴더의 「AI 인계 지침서.md」
// =====================================================================

// ★ 처음 설정(선택) : 이미 쓰고 있는 온라인 교무실 폴더가 있으면 아래 따옴표 안에 그 폴더 주소를 붙여넣으세요.
//   그 폴더 "안에" '데모버전' 폴더를 만들어 연결합니다. (기존 자료는 건드리지 않습니다)
//   비워 두면 내 드라이브에 '온라인 교무실 (업무일지 데모)' 폴더를 새로 만들어 연결합니다.
//   어느 쪽이든 위쪽 함수 목록에서 setupDemo 를 고르고 ▶ 실행을 한 번 누르면 됩니다.
//   예) 'https://drive.google.com/drive/folders/1AbCdEf...'
const DEMO_EXISTING_OFFICE_FOLDER_URL = '';
const DEMO_FOLDER_NAME = '데모버전';
const DEMO_NEW_OFFICE_FOLDER_NAME = '온라인 교무실 (업무일지 데모)';
const DEMO_SHEET_FOLDER_NAME = '_만든 계획 시트';   // "시트 다운"으로 만든 구글 시트가 모이는 곳
const DEMO_SAMPLE_FOLDER_NAME = '_예시 자료';       // 예시 데이터에 붙는 예시 파일(PDF)이 들어가는 곳

const TIMETABLE_CONFIGS_PROPERTY_KEY = "TIMETABLE_CONFIGS_V1";

// =====================================================================
// 운영 설정값
// =====================================================================
// 아래 값은 [스크립트 편집기 > 프로젝트 설정 > 스크립트 속성]에 "같은 이름"으로 넣으면
// 그 값이 우선 적용됩니다. 속성이 없으면 여기 적힌 기본값을 그대로 씁니다.
// 학교·나이스 키·Gemini 키·교시 시간·데이터베이스·관리자 암호는 앱의 ⚙ 관리 정보 → 「처음 설정」에서
// 입력하면 같은 이름의 스크립트 속성에 저장됩니다. (키 같은 비밀값은 코드에 적지 않습니다)
const CONFIG_DEFAULTS = {
  NEIS_API_KEY: '',                        // 나이스 교육정보 개방 포털 인증키 (학교마다 따로 발급)
  NEIS_ATPT_OFCDC_SC_CODE: '',             // 교육청 코드 (예: 전남 Q10) — 「학교 찾기」로 자동 입력
  NEIS_SD_SCHUL_CODE: '',                  // 학교 코드 7자리 — 「학교 찾기」로 자동 입력
  NEIS_SCHOOL_KIND: '',                    // 초등학교·중학교·고등학교·특수학교 — 시간표 종류를 고르는 데 씀
  SCHOOL_NAME: '',                         // 화면 제목과 성찰 보고서에 쓰는 학교 이름
  PERIOD_TIMES: '',                        // 교시 시간 (예: 08:50-09:35, 09:45-10:30, …). 비우면 화면 기본값
  FIREBASE_CONFIG: '',                     // 우리 학교 Firebase 설정(JSON). 비우면 공용 체험 DB
  PLANNING_TEMPLATE_SPREADSHEET_ID: '1xjy8TmTk30SvYeOg5bgU8GkqTMtdWAav480PJBlRiNY',   // 월중·주간 계획 시트 기본틀(배포 계정이 볼 수 있어야 함)
  ADMIN_EMAILS: '',                        // 관리자 계정(쉼표로 여러 명). 비워 두면 이 스크립트 파일의 소유자만 관리자입니다.
  OFFICE_DRIVE_FOLDER_ID: '',              // 온라인 교무실 데모 폴더. setupDemo 또는 ⚙ 관리 정보에서 지정합니다.
  GEMINI_MODEL: 'gemini-2.5-flash',        // AI 기능에 쓰는 모델
  DEMO_ADMIN_CODE: '',                     // 관리자 암호(선택). 넣어 두면 로그인하지 않은 컴퓨터에서도 ⚙ 관리 정보를 열 수 있습니다.
  DEMO_AI_DAILY_LIMIT: '400',              // 하루 AI 호출 한도(모든 참가자 합계)
  DEMO_UPLOAD_DAILY_FILES: '120',          // 하루에 올릴 수 있는 파일 수(모든 참가자 합계)
  DEMO_UPLOAD_DAILY_MB: '500',             // 하루에 올릴 수 있는 용량 합계(MB)
  DEMO_SHEET_DAILY_LIMIT: '60',            // 하루에 만들 수 있는 계획 시트 수
  DEMO_TIMETABLE_SHEET_URL: ''             // (선택) 「시간표」 탭에 기본으로 보여줄 구글 시트 주소. 데모 초기화 때 이 주소로 되돌립니다.
};

// 데모에서 한 파일에 허용하는 최대 크기(실제 버전은 500MB)
const DEMO_MAX_FILE_BYTES = 20 * 1024 * 1024;
const DEMO_MAX_TIMETABLE_CONFIGS = 10;
const DEMO_MAX_PROMPT_CHARS = 120000;

let configCache_ = null;

/**
 * 설정값을 읽습니다. 스크립트 속성 → 코드 기본값 순서로 찾습니다.
 */
function getConfig_(key) {
  if (!configCache_) {
    try {
      configCache_ = PropertiesService.getScriptProperties().getProperties() || {};
    } catch (error) {
      console.warn('스크립트 속성을 읽지 못해 기본값을 사용합니다: ' + error);
      configCache_ = {};
    }
  }
  const stored = String(configCache_[key] || '').trim();
  return stored || CONFIG_DEFAULTS[key] || '';
}

/**
 * 웹 앱의 기본 GET 요청을 처리하여 HTML 페이지를 렌더링합니다.
 */
function doGet(e) {
  // index.html 안의 <?!= bootJson ?> 자리에 학교 이름·데이터베이스 설정 등을 끼워 넣어 보냅니다.
  const template = HtmlService.createTemplateFromFile('index');
  template.bootJson = getBootJson_();
  const schoolName = getConfig_('SCHOOL_NAME');
  return template.evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setTitle((schoolName ? schoolName + ' ' : '학교 ') + '업무일지 & 공유 달력 (데모)');
}

/**
 * 화면이 처음 열릴 때 필요한 설정. 비밀값(API 키)은 넣지 않습니다.
 * Firebase 웹 설정은 원래 브라우저에 공개되는 값이라 넣어도 됩니다.
 */
function getBootJson_() {
  const firebase = readFirebaseConfig_();
  const boot = {
    schoolName: getConfig_('SCHOOL_NAME'),
    schoolKind: getConfig_('NEIS_SCHOOL_KIND'),
    neisReady: !!(getConfig_('NEIS_API_KEY') && getConfig_('NEIS_ATPT_OFCDC_SC_CODE') && getConfig_('NEIS_SD_SCHUL_CODE')),
    periodTimes: parsePeriodTimes_(getConfig_('PERIOD_TIMES')),
    firebaseConfig: firebase,                       // null이면 화면이 공용 체험 DB를 씁니다
    dataSpace: firebase ? '' : sharedDataSpace_()   // 공용 체험 DB 안에서 이 배포만 쓰는 칸 이름
  };
  // </script>로 끝나는 일이 없도록 < 를 이스케이프합니다.
  return JSON.stringify(boot)
    .replace(/</g, "\\u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}

/**
 * 공용 체험 DB는 여러 학교 배포가 함께 쓰므로, 스크립트 프로젝트마다 다른 칸 이름을 씁니다.
 * (같은 스크립트를 다시 배포해도 칸은 그대로입니다)
 */
function sharedDataSpace_() {
  return 's' + md5Hex_(String(ScriptApp.getScriptId())).slice(0, 12);
}

/**
 * 교시 시간 문자열을 { 1: '8:50~9:35', … } 로 바꿉니다. 비었거나 형식이 틀리면 null.
 * 받는 형식: "08:50-09:35, 09:45-10:30" / "1=08:50~09:35, 2=…" / 줄바꿈으로 구분
 */
function parsePeriodTimes_(text) {
  const parts = String(text || '').split(/[,\n;]+/).map(function(part) { return part.trim(); }).filter(Boolean);
  if (!parts.length || parts.length > 12) return null;
  const result = {};
  for (let i = 0; i < parts.length; i++) {
    const match = /^(?:(\d{1,2})\s*[=:)]\s*)?(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})$/.exec(parts[i]);
    if (!match) return null;
    const period = match[1] ? Number(match[1]) : i + 1;
    const start = Number(match[2]) * 60 + Number(match[3]);
    const end = Number(match[4]) * 60 + Number(match[5]);
    if (Number(match[2]) > 23 || Number(match[4]) > 23 || Number(match[3]) > 59 || Number(match[5]) > 59 || end <= start) return null;
    result[period] = Number(match[2]) + ':' + match[3] + '~' + Number(match[4]) + ':' + match[5];
  }
  return result;
}

function readFirebaseConfig_() {
  const raw = getConfig_('FIREBASE_CONFIG');
  if (!raw) return null;
  try {
    const config = JSON.parse(raw);
    return config && config.apiKey && config.projectId && config.appId ? config : null;
  } catch (error) {
    return null;
  }
}

// =====================================================================
// 데모 공통 장치 — 하루 한도, 관리자 확인
// =====================================================================

function getConfigNumber_(key, fallback) {
  const value = Number(getConfig_(key));
  return isFinite(value) && value >= 0 ? value : fallback;
}

function demoTodayKey_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
}

/**
 * 하루 사용량을 올립니다. 한도를 넘으면 오류를 던집니다.
 * 누구나 호출할 수 있는 데모라서, 배포한 사람의 AI 키·드라이브 용량이 한꺼번에 소진되지 않게 막습니다.
 * @param {string} name   'ai' | 'uploadFiles' | 'uploadBytes' | 'sheet'
 * @param {number} amount 이번에 쓸 양
 * @param {number} limit  하루 한도
 * @param {string} message 한도를 넘었을 때 보여줄 문구
 */
function demoUseQuota_(name, amount, limit, message) {
  const key = 'DEMO_USAGE_' + name;
  const today = demoTodayKey_();
  const lock = LockService.getScriptLock();
  let locked = false;
  try { locked = lock.tryLock(5000); } catch (error) { locked = false; }
  try {
    const properties = PropertiesService.getScriptProperties();
    let usage = { day: today, used: 0 };
    try {
      const stored = JSON.parse(properties.getProperty(key) || '{}');
      if (stored && stored.day === today) usage.used = Number(stored.used) || 0;
    } catch (error) { /* 값이 깨졌으면 0부터 다시 셉니다 */ }
    if (usage.used + amount > limit) throw new Error(message);
    usage.used += amount;
    properties.setProperty(key, JSON.stringify(usage));
    return usage.used;
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (error) { /* ignore */ } }
  }
}

function demoReadUsage_(name) {
  try {
    const stored = JSON.parse(PropertiesService.getScriptProperties().getProperty('DEMO_USAGE_' + name) || '{}');
    return stored && stored.day === demoTodayKey_() ? (Number(stored.used) || 0) : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * 같은 요청을 짧은 시간 안에 되풀이하지 못하게 합니다. (나이스·공휴일 "강제 새로고침" 남용 방지)
 * @returns {boolean} 지금 실행해도 되면 true
 */
function demoThrottle_(name, seconds) {
  const cache = CacheService.getScriptCache();
  const key = 'demoThrottle:' + name;
  if (cache.get(key)) return false;
  cache.put(key, '1', seconds);
  return true;
}

/**
 * 설정용 함수를 "스크립트 편집기에서 직접 실행한 경우"(= 누른 사람이 곧 실행 계정)에만 통과시킵니다.
 * 로그인하지 않은 데모 참가자가 화면에서 이 함수들을 부르는 것을 막습니다.
 */
function requireOwnerRun_() {
  const active = getActiveUserEmailSafe_().toLowerCase();
  const effective = getEffectiveUserEmailSafe_().toLowerCase();
  if (!active || active !== effective) {
    throw new Error('이 함수는 스크립트 편집기에서 직접 실행하거나, 데모를 배포한 계정으로만 실행할 수 있습니다.');
  }
}

/**
 * 관리자 암호(DEMO_ADMIN_CODE)가 맞는지 확인합니다. 틀린 시도가 이어지면 10분간 잠급니다.
 */
function isValidAdminCode_(adminCode) {
  const expected = getConfig_('DEMO_ADMIN_CODE');
  const given = String(adminCode || '').trim();
  if (!expected || !given) return false;
  const cache = CacheService.getScriptCache();
  const failKey = 'demoAdminFail';
  const fails = Number(cache.get(failKey)) || 0;
  if (fails >= 10) throw new Error('관리자 암호를 여러 번 틀려 잠겼습니다. 10분 뒤에 다시 시도해주세요.');
  if (given === expected) return true;
  cache.put(failKey, String(fails + 1), 600);
  return false;
}

/**
 * 학기별 시간표 설정 목록을 반환합니다.
 * 데모에서는 로그인 없이 누구나 시간표 링크를 바꿔 볼 수 있습니다.
 */
function getTimetableConfigs() {
  return {
    configs: readTimetableConfigs_(),
    canEdit: true,
    userEmail: getActiveUserEmailSafe_() || ''
  };
}

/**
 * 학기별 시간표 설정을 저장합니다.
 */
function saveTimetableConfig(payload) {
  const userEmail = requireSignedInUserForTimetable_();
  const normalizedConfig = normalizeTimetableConfigPayload_(payload, userEmail);
  const configs = readTimetableConfigs_();
  const existingIndex = configs.findIndex(function(config) {
    return config.id === normalizedConfig.id;
  });

  if (existingIndex >= 0) {
    configs[existingIndex] = normalizedConfig;
  } else {
    if (configs.length >= DEMO_MAX_TIMETABLE_CONFIGS) {
      throw new Error('데모에서는 시간표를 ' + DEMO_MAX_TIMETABLE_CONFIGS + '개까지만 등록할 수 있습니다. 쓰지 않는 학기를 지운 뒤 다시 저장해주세요.');
    }
    configs.push(normalizedConfig);
  }

  configs.sort(compareTimetableConfigs_);
  writeTimetableConfigs_(configs);

  return {
    configs: configs,
    savedId: normalizedConfig.id,
    canEdit: true,
    userEmail: userEmail
  };
}

/**
 * 학기별 시간표 설정을 삭제합니다.
 */
function deleteTimetableConfig(configId) {
  const userEmail = requireSignedInUserForTimetable_();
  const targetId = String(configId || '').trim();
  if (!targetId) {
    throw new Error('삭제할 시간표 설정 ID가 없습니다.');
  }

  const configs = readTimetableConfigs_().filter(function(config) {
    return config.id !== targetId;
  });
  writeTimetableConfigs_(configs);

  return {
    configs: configs,
    canEdit: true,
    userEmail: userEmail
  };
}

/**
 * AI 챗봇의 질문에 답변하기 위해 Gemini API를 호출합니다.
 */
function getAiChatResponse(userQuestion, allEventsJson) {
  const today = new Date().toLocaleDateString('ko-KR');
  const prompt = `
    당신은 학교의 모든 일정을 파악하고 있는 유능한 AI 비서입니다.
    아래에 제공된 전체 업무일지 데이터를 참고하여 사용자의 질문에 대해 친절하고 명확하게 답변해주세요.
    오늘은 ${today} 입니다.

    [전체 업무일지 데이터 (JSON 형식)]
    ${allEventsJson}

    [사용자 질문]
    ${userQuestion}
  `;
  return callGeminiApi(prompt, 'summary');
}

/**
 * Gemini API를 서버 측에서 호출하는 중앙 함수.
 */
function callGeminiApi(prompt, type) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다. 프로젝트 설정의 스크립트 속성을 확인해주세요.");
  }

  // 데모: 누구나 호출할 수 있으므로 너무 긴 요청과 하루 한도 초과를 막습니다.
  prompt = String(prompt || '');
  if (!prompt.trim()) {
    throw new Error("AI에게 보낼 내용이 비어 있습니다.");
  }
  if (prompt.length > DEMO_MAX_PROMPT_CHARS) {
    throw new Error("AI에게 보낼 내용이 너무 깁니다. 데모에서는 한 번에 보낼 수 있는 양에 제한이 있습니다.");
  }
  demoUseQuota_('ai', 1, getConfigNumber_('DEMO_AI_DAILY_LIMIT', 400),
    '오늘 데모에서 쓸 수 있는 AI 사용량을 모두 썼습니다. 내일 다시 시도해주세요.');

  const model = String(getConfig_('GEMINI_MODEL') || 'gemini-2.5-flash').replace(/[^A-Za-z0-9._-]/g, '');
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  if (type === 'tasks') {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            "description": { "type": "STRING" },
            "department": { "type": "STRING" },
            "suggestedDateOffset": { "type": "NUMBER" }
          },
          required: ["description", "department", "suggestedDateOffset"]
        }
      }
    };
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 429 || responseCode === 503) {
      // 강의 중 여러 사람이 동시에 누르면 AI 서비스의 분당 한도에 걸릴 수 있습니다.
      console.warn(`Gemini API busy: ${responseCode} ${String(responseBody).slice(0, 300)}`);
      throw new Error('지금 AI 요청이 몰려 있습니다. 1분쯤 뒤에 다시 눌러주세요.');
    }
    if (responseCode !== 200) {
      console.error(`Gemini API Error: ${responseCode} ${responseBody}`);
      throw new Error(`AI API 요청 실패 (HTTP Code: ${responseCode}). 자세한 내용은 실행 로그를 확인하세요.`);
    }

    const result = JSON.parse(responseBody);
    if (result.candidates && result.candidates[0].content.parts[0].text) {
      return result.candidates[0].content.parts[0].text;
    }
    throw new Error("API 응답 형식이 올바르지 않습니다.");
  } catch (e) {
    console.error(`UrlFetchApp Error: ${e.toString()}`);
    throw new Error(`AI 서비스 연결 중 오류가 발생했습니다: ${e.message}`);
  }
}

// (데모 버전) 구글 캘린더 동기화 함수는 넣지 않았습니다.
// 로그인 없이 여는 데모에서는 서버가 "배포한 사람 계정"으로 실행되므로,
// 동기화를 켜면 참가자가 입력한 일정이 배포한 사람의 구글 캘린더에 들어가기 때문입니다.

/**
 * 월중/주간 계획 시트 템플릿을 복사해 새 구글 시트를 생성합니다.
 */
function createPlanningSheet(payload) {
  validatePlanningPayload_(payload);
  demoUseQuota_('sheet', 1, getConfigNumber_('DEMO_SHEET_DAILY_LIMIT', 60),
    '오늘 데모에서 만들 수 있는 계획 시트 수를 모두 썼습니다. 내일 다시 시도해주세요.');

  let templateFile;
  try {
    templateFile = DriveApp.getFileById(getConfig_('PLANNING_TEMPLATE_SPREADSHEET_ID'));
  } catch (error) {
    throw new Error('계획 시트 기본틀(템플릿)을 열 수 없습니다. 데모를 배포한 계정이 템플릿 시트를 볼 수 있어야 합니다.');
  }

  // 데모: 만든 시트는 데모 폴더의 "_만든 계획 시트"에 모으고, 로그인하지 않은 참가자도 볼 수 있게 "링크가 있는 사람 보기"로 둡니다.
  const sheetFolder = getDemoSheetFolder_();
  const fileName = '[데모] ' + getPlanningFileName_(payload);
  const copyFile = sheetFolder ? templateFile.makeCopy(fileName, sheetFolder) : templateFile.makeCopy(fileName);
  try {
    copyFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    console.warn('만든 계획 시트를 링크 공개로 바꾸지 못했습니다(기관 정책일 수 있음): ' + error);
  }
  const spreadsheet = SpreadsheetApp.openById(copyFile.getId());
  spreadsheet.setSpreadsheetTimeZone('Asia/Seoul');

  const monthlySheet = findSheetByKeyword_(spreadsheet, '월중계획');
  const weeklySheet = findSheetByKeyword_(spreadsheet, '주간계획');
  if (!monthlySheet || !weeklySheet) {
    throw new Error('기본틀 시트에서 월중계획/주간계획 시트를 찾지 못했습니다.');
  }

  populateMonthlyPlanningSheet_(monthlySheet, payload.monthly);
  populateWeeklyPlanningSheet_(weeklySheet, payload.weekly);

  renameSheetSafe_(monthlySheet, payload.monthly.tabName || '월중계획');
  renameSheetSafe_(weeklySheet, payload.weekly.tabName || '주간계획');

  SpreadsheetApp.flush();

  return {
    spreadsheetId: spreadsheet.getId(),
    url: spreadsheet.getUrl(),
    name: copyFile.getName()
  };
}

function getDemoSheetFolder_() {
  try {
    return getOrCreateChildFolder_(getOfficeRootFolder_(), DEMO_SHEET_FOLDER_NAME);
  } catch (error) {
    // 데모 폴더가 아직 연결되지 않았으면 배포한 사람의 내 드라이브 맨 위에 만들어집니다.
    return null;
  }
}

function validatePlanningPayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('계획 시트 생성 요청이 비어 있습니다.');
  }
  if (!payload.monthly || !Array.isArray(payload.monthly.rows)) {
    throw new Error('월중계획 데이터 형식이 올바르지 않습니다.');
  }
  if (!payload.weekly || !Array.isArray(payload.weekly.mainEvents) || !Array.isArray(payload.weekly.serviceItems)) {
    throw new Error('주간계획 데이터 형식이 올바르지 않습니다.');
  }
}

function getPlanningFileName_(payload) {
  const fallbackName = `${payload.monthly.year || ''}년 ${payload.monthly.month || ''}월 계획시트`;
  const rawName = String(payload.fileName || fallbackName).trim();
  return rawName || '계획시트';
}

function findSheetByKeyword_(spreadsheet, keyword) {
  const sheets = spreadsheet.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf(keyword) !== -1) {
      return sheets[i];
    }
  }
  return null;
}

function renameSheetSafe_(sheet, name) {
  const safeName = String(name || '')
    .replace(/[\\/?*\[\]:]/g, ' ')
    .trim()
    .slice(0, 99) || 'Sheet';
  if (sheet.getName() !== safeName) {
    sheet.setName(safeName);
  }
}

function populateMonthlyPlanningSheet_(sheet, monthly) {
  const rows = (monthly.rows || []).slice(0, 31);
  while (rows.length < 31) {
    rows.push({ day: '', weekday: '', isSaturday: false, isHoliday: false, contentLines: [], managerLines: [] });
  }

  const weekdayBackground = sheet.getRange('B6:E6').getBackgrounds()[0];
  const saturdayBackground = sheet.getRange('B11:E11').getBackgrounds()[0];
  const holidayBackground = sheet.getRange('B12:E12').getBackgrounds()[0];
  const weekdayFontColor = sheet.getRange('B6:E6').getFontColors()[0];
  const saturdayFontColor = sheet.getRange('B11:E11').getFontColors()[0];
  const holidayFontColor = sheet.getRange('B12:E12').getFontColors()[0];
  const compactRowHeight = sheet.getRowHeight(6);
  const contentRows = [];

  sheet.getRange('D2').setValue(monthly.title || `${monthly.month || ''}월중계획`);
  sheet.getRange('B5:E35').clearContent();

  rows.forEach((row, index) => {
    const rowNumber = 5 + index;
    const backgroundRow = row.isHoliday ? holidayBackground : row.isSaturday ? saturdayBackground : weekdayBackground;
    const fontColorRow = row.isHoliday ? holidayFontColor : row.isSaturday ? saturdayFontColor : weekdayFontColor;
    sheet.getRange(rowNumber, 2, 1, 4).setBackgrounds([backgroundRow]);
    sheet.getRange(rowNumber, 2, 1, 4).setFontColors([fontColorRow]);
    sheet.getRange(rowNumber, 2).setValue(valueOrBlank_(row.day));
    sheet.getRange(rowNumber, 3).setValue(valueOrBlank_(row.weekday));
    sheet.getRange(rowNumber, 4).setValue(normalizeMultilineValue_(row.contentLines));
    sheet.getRange(rowNumber, 5).setValue(normalizeMultilineValue_(row.managerLines));
    sheet.setRowHeight(rowNumber, compactRowHeight);
    if (hasVisibleMonthlyContent_(row)) {
      contentRows.push(rowNumber);
    }
  });

  sheet.getRange('D5:E35').setWrap(true);
  contentRows.forEach(function(rowNumber) {
    sheet.autoResizeRows(rowNumber, 1);
    if (sheet.getRowHeight(rowNumber) < compactRowHeight) {
      sheet.setRowHeight(rowNumber, compactRowHeight);
    }
  });
}

function populateWeeklyPlanningSheet_(sheet, weekly) {
  const mainEvents = weekly.mainEvents || [];
  const serviceItems = weekly.serviceItems || [];
  const departmentNotes = weekly.departmentNotes || [];

  sheet.getRange('B2').setValue(weekly.weekLabel || '');
  sheet.getRange('B3').setValue(weekly.dateRangeText || '');
  sheet.getRange('B6').setValue(weekly.bodyRangeText || '');

  const mainRowCount = resizeRepeatingSection_(sheet, {
    startRow: 9,
    baseCount: 7,
    templateRow: 15,
    spacerRow: 16
  }, mainEvents.length);

  clearSectionContents_(sheet, 9, 2, mainRowCount, 12);
  for (let i = 0; i < mainRowCount; i++) {
    const rowNumber = 9 + i;
    const item = mainEvents[i] || {};
    sheet.getRange(rowNumber, 2).setValue(valueOrBlank_(item.dateLabel));
    sheet.getRange(rowNumber, 3).setValue(valueOrBlank_(item.timeText));
    sheet.getRange(rowNumber, 4).setValue(valueOrBlank_(item.target));
    sheet.getRange(rowNumber, 5).setValue(valueOrBlank_(item.description));
    sheet.getRange(rowNumber, 8).setValue(valueOrBlank_(item.location));
    sheet.getRange(rowNumber, 9).setValue(valueOrBlank_(item.manager));
  }

  const serviceStartRow = 9 + mainRowCount + 3;
  const serviceRowCount = resizeRepeatingSection_(sheet, {
    startRow: serviceStartRow,
    baseCount: 6,
    templateRow: serviceStartRow + 5,
    spacerRow: serviceStartRow + 6
  }, serviceItems.length);

  clearSectionContents_(sheet, serviceStartRow, 2, serviceRowCount, 12);
  for (let i = 0; i < serviceRowCount; i++) {
    const rowNumber = serviceStartRow + i;
    const item = serviceItems[i] || {};
    sheet.getRange(rowNumber, 2).setValue(valueOrBlank_(item.name));
    sheet.getRange(rowNumber, 4).setValue(valueOrBlank_(item.dateTimeText));
    sheet.getRange(rowNumber, 6).setValue(valueOrBlank_(item.description));
    sheet.getRange(rowNumber, 10).setValue(valueOrBlank_(item.location));
    sheet.getRange(rowNumber, 13).setValue(valueOrBlank_(item.externalMark));
  }

  const departmentSectionTitleRow = serviceStartRow + serviceRowCount + 1;
  sheet.getRange(departmentSectionTitleRow, 2).setValue('부서별 전달 사항');
  populateWeeklyDepartmentNotes_(sheet, departmentSectionTitleRow, departmentNotes, weekly.adminNote || '');
}

function resizeRepeatingSection_(sheet, config, itemCount) {
  const effectiveCount = Math.max(Number(itemCount) || 0, 1);
  if (effectiveCount > config.baseCount) {
    const rowsToInsert = effectiveCount - config.baseCount;
    sheet.insertRowsBefore(config.spacerRow, rowsToInsert);

    const templateRange = sheet.getRange(config.templateRow, 2, 1, 12);
    const templateRowHeight = sheet.getRowHeight(config.templateRow);
    for (let i = 0; i < rowsToInsert; i++) {
      const targetRow = config.spacerRow + i;
      const targetRange = sheet.getRange(targetRow, 2, 1, 12);
      templateRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
      targetRange.clearContent();
      sheet.setRowHeight(targetRow, templateRowHeight);
    }
  } else if (effectiveCount < config.baseCount) {
    sheet.deleteRows(config.startRow + effectiveCount, config.baseCount - effectiveCount);
  }

  return effectiveCount;
}

function clearSectionContents_(sheet, row, column, numRows, numColumns) {
  if (numRows > 0 && numColumns > 0) {
    sheet.getRange(row, column, numRows, numColumns).clearContent();
  }
}

function populateWeeklyDepartmentNotes_(sheet, departmentSectionTitleRow, departmentNotes, adminNote) {
  const departmentHeaderRow = departmentSectionTitleRow + 1;
  const departmentStartRow = departmentSectionTitleRow + 2;
  const adminTitleRow = departmentSectionTitleRow + 7;
  const adminContentRow = departmentSectionTitleRow + 8;
  const baseDepartmentRowHeight = sheet.getRowHeight(departmentStartRow);
  const baseAdminRowHeight1 = sheet.getRowHeight(adminContentRow);
  const baseAdminRowHeight2 = sheet.getRowHeight(adminContentRow + 1);

  sheet.getRange(departmentHeaderRow, 2).setValue('부서명');
  sheet.getRange(departmentHeaderRow, 4).setValue('전달 사항');
  sheet.getRange(departmentHeaderRow, 13).setValue('비고');
  sheet.getRange(adminTitleRow, 2).setValue('협의 및 전달사항');

  clearSectionContents_(sheet, departmentStartRow, 2, 4, 12);
  for (let i = 0; i < 4; i++) {
    const rowNumber = departmentStartRow + i;
    const item = departmentNotes[i] || {};
    sheet.getRange(rowNumber, 2).setValue(valueOrBlank_(item.departmentName));
    sheet.getRange(rowNumber, 4).setValue(valueOrBlank_(item.note));
    sheet.getRange(rowNumber, 13).setValue(valueOrBlank_(item.remark));
    sheet.getRange(rowNumber, 4, 1, 9).setWrap(true);
    sheet.setRowHeight(rowNumber, baseDepartmentRowHeight);
    if (String(item.note || '').trim() || String(item.remark || '').trim()) {
      sheet.autoResizeRows(rowNumber, 1);
      if (sheet.getRowHeight(rowNumber) < baseDepartmentRowHeight) {
        sheet.setRowHeight(rowNumber, baseDepartmentRowHeight);
      }
    }
  }

  sheet.getRange(adminContentRow, 2, 2, 12).clearContent();
  sheet.getRange(adminContentRow, 2).setValue(valueOrBlank_(adminNote));
  sheet.getRange(adminContentRow, 2, 2, 12).setWrap(true);
  const adminTotalHeight = estimateMergedNoteHeight_(adminNote, baseAdminRowHeight1 + baseAdminRowHeight2);
  const firstRowHeight = Math.ceil(adminTotalHeight / 2);
  const secondRowHeight = Math.max(adminTotalHeight - firstRowHeight, baseAdminRowHeight2);
  sheet.setRowHeight(adminContentRow, Math.max(firstRowHeight, baseAdminRowHeight1));
  sheet.setRowHeight(adminContentRow + 1, secondRowHeight);
}

function estimateMergedNoteHeight_(text, minimumHeight) {
  const normalized = String(text || '').replace(/\r\n/g, '\n');
  if (!normalized.trim()) {
    return minimumHeight;
  }

  const lines = normalized.split('\n');
  let visualLines = 0;
  lines.forEach(function(line) {
    const trimmed = String(line || '');
    visualLines += Math.max(1, Math.ceil(trimmed.length / 40));
  });

  return Math.max(minimumHeight, 18 * visualLines + 16);
}

function normalizeMultilineValue_(value) {
  if (Array.isArray(value)) {
    return value.map(valueOrBlank_).join('\n');
  }
  return valueOrBlank_(value);
}

function valueOrBlank_(value) {
  return value === null || value === undefined ? '' : value;
}

function hasVisibleMonthlyContent_(row) {
  const contentLines = Array.isArray(row && row.contentLines) ? row.contentLines : [];
  const managerLines = Array.isArray(row && row.managerLines) ? row.managerLines : [];
  return contentLines.concat(managerLines).some(function(line) {
    return String(line || '').trim() !== '';
  });
}

function getActiveUserEmailSafe_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (error) {
    return '';
  }
}

function requireSignedInUserForTimetable_() {
  // 데모에서는 로그인하지 않은 참가자도 시간표 링크를 바꿔 볼 수 있습니다.
  return getActiveUserEmailSafe_() || '데모 참가자';
}

function readTimetableConfigs_() {
  const rawValue = PropertiesService.getScriptProperties().getProperty(TIMETABLE_CONFIGS_PROPERTY_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(sanitizeStoredTimetableConfig_)
      .filter(function(config) {
        return !!config;
      })
      .sort(compareTimetableConfigs_);
  } catch (error) {
    console.error('시간표 설정 파싱 실패: ' + error);
    return [];
  }
}

function writeTimetableConfigs_(configs) {
  PropertiesService.getScriptProperties().setProperty(
    TIMETABLE_CONFIGS_PROPERTY_KEY,
    JSON.stringify((configs || []).map(sanitizeStoredTimetableConfig_).filter(Boolean))
  );
}

function sanitizeStoredTimetableConfig_(config) {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const id = String(config.id || '').trim();
  const label = String(config.label || '').trim();
  const startDate = String(config.startDate || '').trim();
  const endDate = String(config.endDate || '').trim();
  const sheetUrl = String(config.sheetUrl || '').trim();
  const spreadsheetId = String(config.spreadsheetId || '').trim();

  if (!id || !label || !startDate || !endDate || !sheetUrl || !spreadsheetId) {
    return null;
  }

  const gid = String(config.gid || '').trim();
  const openUrl = String(config.openUrl || '').trim() || buildTimetableOpenUrl_(spreadsheetId, gid);
  const embedUrl = String(config.embedUrl || '').trim() || buildTimetableEmbedUrl_(spreadsheetId, gid);

  return {
    id: id,
    label: label,
    startDate: startDate,
    endDate: endDate,
    sheetUrl: sheetUrl,
    spreadsheetId: spreadsheetId,
    gid: gid,
    openUrl: openUrl,
    embedUrl: embedUrl,
    updatedBy: String(config.updatedBy || '').trim(),
    updatedAt: String(config.updatedAt || '').trim()
  };
}

function compareTimetableConfigs_(a, b) {
  return String(a.startDate || '').localeCompare(String(b.startDate || ''))
    || String(a.endDate || '').localeCompare(String(b.endDate || ''))
    || String(a.label || '').localeCompare(String(b.label || ''));
}

function normalizeTimetableConfigPayload_(payload, userEmail) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('시간표 설정 데이터가 비어 있습니다.');
  }

  const label = String(payload.label || '').trim();
  const startDate = String(payload.startDate || '').trim();
  const endDate = String(payload.endDate || '').trim();
  const sheetUrl = String(payload.sheetUrl || '').trim();
  const rawId = String(payload.id || '').trim();

  if (!label) {
    throw new Error('학기 이름을 입력해주세요.');
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error('학기 시작일 형식이 올바르지 않습니다.');
  }
  if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('학기 종료일 형식이 올바르지 않습니다.');
  }
  if (endDate < startDate) {
    throw new Error('학기 종료일은 시작일보다 빠를 수 없습니다.');
  }
  if (!sheetUrl) {
    throw new Error('Google Sheets 링크를 입력해주세요.');
  }

  const sheetInfo = extractSpreadsheetInfoFromUrl_(sheetUrl);

  return {
    id: rawId || Utilities.getUuid(),
    label: label,
    startDate: startDate,
    endDate: endDate,
    sheetUrl: sheetInfo.sheetUrl,
    spreadsheetId: sheetInfo.spreadsheetId,
    gid: sheetInfo.gid,
    openUrl: buildTimetableOpenUrl_(sheetInfo.spreadsheetId, sheetInfo.gid),
    embedUrl: buildTimetableEmbedUrl_(sheetInfo.spreadsheetId, sheetInfo.gid),
    updatedBy: userEmail,
    updatedAt: new Date().toISOString()
  };
}

function extractSpreadsheetInfoFromUrl_(sheetUrl) {
  const normalizedInput = String(sheetUrl || '').trim();
  if (!normalizedInput) {
    throw new Error('Google Sheets 링크 형식이 올바르지 않습니다.');
  }

  // Apps Script에서는 URL 생성자가 기대와 다르게 동작할 수 있어 정규식 기반으로 파싱합니다.
  const spreadsheetIdMatch = normalizedInput.match(/(?:docs\.google\.com\/spreadsheets\/d\/|\/spreadsheets\/d\/)([a-zA-Z0-9-_]+)/)
    || normalizedInput.match(/^([a-zA-Z0-9-_]{20,})$/);
  if (!spreadsheetIdMatch || !spreadsheetIdMatch[1]) {
    throw new Error('Google Sheets 문서 ID를 링크에서 찾지 못했습니다.');
  }

  const spreadsheetId = spreadsheetIdMatch[1];
  const gidMatch = normalizedInput.match(/[?#&]gid=([0-9]+)/);
  const gid = String((gidMatch && gidMatch[1]) || '').trim();

  return {
    spreadsheetId: spreadsheetId,
    gid: gid,
    sheetUrl: buildTimetableOpenUrl_(spreadsheetId, gid)
  };
}

function buildTimetableOpenUrl_(spreadsheetId, gid) {
  return 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit' + (gid ? '#gid=' + gid : '');
}

function buildTimetableEmbedUrl_(spreadsheetId, gid) {
  const query = gid ? ('gid=' + encodeURIComponent(gid) + '&') : '';
  return 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit?' + query + 'rm=minimal';
}

// =====================================================================
// 나이스(NEIS) 교육정보 개방 포털 API — 급식 / 시간표
// =====================================================================
// - 데이터 출처: https://open.neis.go.kr (급식식단정보, 중학교시간표, 학급정보)
// - 나이스 개방 포털은 학교 나이스 시스템의 데이터를 매일(일 1회 배치) 수집해 제공합니다.
//   따라서 학교에서 나이스 급식/시간표를 수정하면 별도 작업 없이 다음 수집(보통 익일 새벽)
//   이후 API 응답에 자동 반영됩니다. (각 행의 LOAD_DTM 값이 수집 기준일입니다.)
// - 이 서버 함수는 응답을 1시간 동안 캐시하므로, 캐시 만료 후 또는 "새로고침(force)"
//   요청 시 항상 나이스의 최신 데이터를 다시 받아옵니다.
// - API 키·교육청 코드·학교 코드는 파일 맨 위 "운영 설정값"(스크립트 속성 우선)에서 읽습니다.
const NEIS_BASE_URL = 'https://open.neis.go.kr/hub/';
const NEIS_CACHE_SECONDS = 60 * 60;         // 나이스 응답 캐시 1시간
const NEIS_ALLOWED_ENDPOINTS = ['mealServiceDietInfo', 'misTimetable', 'elsTimetable', 'hisTimetable', 'spsTimetable', 'classInfo'];
// 학교 종류별 시간표 API. 화면은 'timetable'이라고만 부르고, 서버가 학교 종류에 맞는 것을 고릅니다.
const NEIS_TIMETABLE_BY_KIND = [
  ['초등', 'elsTimetable'], ['중학', 'misTimetable'], ['고등', 'hisTimetable'], ['특수', 'spsTimetable']
];
const NEIS_TIMETABLE_FIELDS = ['ALL_TI_YMD', 'AY', 'SEM', 'GRADE', 'CLASS_NM', 'PERIO', 'ITRT_CNTNT', 'LOAD_DTM'];
// 캐시 용량(100KB)을 위해 응답 행에서 필요한 필드만 남깁니다.
const NEIS_ROW_FIELDS = {
  mealServiceDietInfo: ['MLSV_YMD', 'MMEAL_SC_CODE', 'MMEAL_SC_NM', 'DDISH_NM', 'CAL_INFO', 'NTR_INFO', 'MLSV_FGR', 'LOAD_DTM'],
  misTimetable: NEIS_TIMETABLE_FIELDS,
  elsTimetable: NEIS_TIMETABLE_FIELDS,
  hisTimetable: NEIS_TIMETABLE_FIELDS,
  spsTimetable: NEIS_TIMETABLE_FIELDS,
  classInfo: ['AY', 'GRADE', 'CLASS_NM', 'LOAD_DTM']
};

function resolveTimetableEndpoint_() {
  const kind = getConfig_('NEIS_SCHOOL_KIND');
  for (let i = 0; i < NEIS_TIMETABLE_BY_KIND.length; i++) {
    if (kind.indexOf(NEIS_TIMETABLE_BY_KIND[i][0]) !== -1) return NEIS_TIMETABLE_BY_KIND[i][1];
  }
  return 'misTimetable';
}

function requireNeisReady_() {
  if (!getConfig_('NEIS_API_KEY') || !getConfig_('NEIS_ATPT_OFCDC_SC_CODE') || !getConfig_('NEIS_SD_SCHUL_CODE')) {
    throw new Error('아직 학교가 정해지지 않았어요. 관리자가 ⚙ 관리 정보 → 「처음 설정」에서 나이스 API 키와 우리 학교를 정하면 나옵니다.');
  }
}

/**
 * 프런트엔드에서 호출하는 나이스 API 프록시.
 * @param {string} endpoint  mealServiceDietInfo | misTimetable | classInfo
 * @param {Object} params    endpoint별 쿼리 파라미터 (예: {MLSV_FROM_YMD:'20261001', MLSV_TO_YMD:'20261031'})
 * @param {boolean} force    true면 캐시를 무시하고 나이스에서 새로 받아옵니다.
 * @returns {{ok:boolean, rows:Array, fetchedAt:string, cached:boolean, message:string}}
 */
function neisFetch(endpoint, params, force) {
  let safeEndpoint = String(endpoint || '').trim();
  if (safeEndpoint === 'timetable') safeEndpoint = resolveTimetableEndpoint_();
  if (NEIS_ALLOWED_ENDPOINTS.indexOf(safeEndpoint) === -1) {
    throw new Error('허용되지 않은 나이스 API 엔드포인트입니다: ' + safeEndpoint);
  }
  requireNeisReady_();

  const query = sanitizeNeisParams_(params);
  const cacheKey = 'neis:' + getConfig_('NEIS_SD_SCHUL_CODE') + ':' + safeEndpoint + ':' + md5Hex_(JSON.stringify(query));
  const cache = CacheService.getScriptCache();

  // 데모: "새로고침"을 연달아 눌러도 같은 요청은 1분에 한 번만 나이스에 다시 묻습니다.
  if (force && !demoThrottle_(cacheKey, 60)) force = false;

  if (!force) {
    const cachedValue = cache.get(cacheKey);
    if (cachedValue) {
      try {
        const parsed = JSON.parse(cachedValue);
        parsed.cached = true;
        return parsed;
      } catch (error) {
        cache.remove(cacheKey);
      }
    }
  }

  const result = fetchNeisFromOrigin_(safeEndpoint, query);
  try {
    cache.put(cacheKey, JSON.stringify(result), NEIS_CACHE_SECONDS);
  } catch (error) {
    console.warn('나이스 응답 캐시 저장 실패(용량 초과 가능): ' + error);
  }
  result.cached = false;
  return result;
}

function sanitizeNeisParams_(params) {
  const result = {};
  if (!params || typeof params !== 'object') return result;
  Object.keys(params).forEach(function(key) {
    const safeKey = String(key).replace(/[^A-Z_]/g, '');
    const value = params[key];
    if (!safeKey || value === null || value === undefined || value === '') return;
    result[safeKey] = String(value).trim();
  });
  return result;
}

function fetchNeisFromOrigin_(endpoint, query) {
  const base = {
    KEY: getConfig_('NEIS_API_KEY'),
    Type: 'json',
    pIndex: 1,
    pSize: 1000,
    ATPT_OFCDC_SC_CODE: getConfig_('NEIS_ATPT_OFCDC_SC_CODE'),
    SD_SCHUL_CODE: getConfig_('NEIS_SD_SCHUL_CODE')
  };
  const merged = Object.assign({}, base, query);
  const queryString = Object.keys(merged).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(merged[key]);
  }).join('&');

  const response = UrlFetchApp.fetch(NEIS_BASE_URL + endpoint + '?' + queryString, { muteHttpExceptions: true });
  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('나이스 API 요청 실패 (HTTP ' + code + ')');
  }

  const body = JSON.parse(response.getContentText());
  const fetchedAt = new Date().toISOString();

  if (body[endpoint]) {
    const head = body[endpoint][0] && body[endpoint][0].head;
    const keep = NEIS_ROW_FIELDS[endpoint] || null;
    const rows = ((body[endpoint][1] && body[endpoint][1].row) || []).map(function(row) {
      if (!keep) return row;
      const slim = {};
      keep.forEach(function(field) { if (row[field] !== undefined) slim[field] = row[field]; });
      return slim;
    });
    return {
      ok: true,
      rows: rows,
      total: head && head[0] ? head[0].list_total_count : rows.length,
      fetchedAt: fetchedAt,
      message: ''
    };
  }

  const resultInfo = body.RESULT || {};
  if (resultInfo.CODE === 'INFO-200') {
    return { ok: true, rows: [], total: 0, fetchedAt: fetchedAt, message: '해당 기간의 데이터가 없습니다.' };
  }
  if (resultInfo.CODE === 'ERROR-290') {
    throw new Error('나이스 API 키가 올바르지 않아요. 관리자가 ⚙ 관리 정보 → 「처음 설정」에서 키를 다시 넣어 주세요.');
  }
  throw new Error('나이스 API 오류: ' + (resultInfo.CODE || '') + ' ' + (resultInfo.MESSAGE || JSON.stringify(body)));
}

function md5Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8)
    .map(function(byte) {
      const v = (byte + 256) % 256;
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
}

// =====================================================================
// 공휴일 — 구글 캘린더 "대한민국의 휴일"(공개 iCal) 연동
// =====================================================================
// - 정부가 임시공휴일/대체공휴일을 지정하면 구글 휴일 캘린더에 반영되므로,
//   이 함수를 주기적으로 실행해 최신 공휴일 목록을 유지합니다.
// - 저장 위치: 스크립트 속성(영구) + 24시간 TTL. 하루 1회 시간 기반 트리거로 자동 갱신하고,
//   앱이 로드될 때 24시간이 지났으면 즉시 재수집합니다. 수집 실패 시 마지막 성공 데이터를 그대로 사용합니다.
const PUBLIC_HOLIDAY_ICS_URL = 'https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics';
const PUBLIC_HOLIDAY_PROPERTY_KEY = 'PUBLIC_HOLIDAYS_V1';
const PUBLIC_HOLIDAY_TTL_MS = 24 * 60 * 60 * 1000;
const PUBLIC_HOLIDAY_REFRESH_HANDLER = 'refreshPublicHolidaysJob';
const PUBLIC_HOLIDAY_NAME_MAP = { '새해첫날': '신정', '크리스마스': '성탄절' };

/**
 * 프런트엔드에서 호출: 공휴일 목록을 반환합니다.
 * @param {boolean} force true면 캐시 무시 후 구글 캘린더에서 즉시 재수집
 * @returns {{holidays:Object<string,string>, fetchedAt:string, source:string, stale:boolean}}
 */
function getPublicHolidays(force) {
  // 자동 갱신 트리거는 여기서 몰래 설치하지 않습니다. 트리거는 "설치한 사람 계정"에 묶이므로
  // 관리자가 [관리 정보] 화면(또는 setupPublicHolidayTrigger)에서 직접 켭니다.
  // 트리거가 없어도 아래 24시간 TTL로 앱을 열 때 자동 갱신됩니다.
  const stored = readStoredPublicHolidays_();
  const isFresh = stored && stored.fetchedAt && (Date.now() - new Date(stored.fetchedAt).getTime()) < PUBLIC_HOLIDAY_TTL_MS;
  // 데모: 강제 새로고침은 10분에 한 번만 받아들입니다.
  if (force && stored && !demoThrottle_('holidayForce', 600)) force = false;
  if (stored && isFresh && !force) {
    return { holidays: stored.holidays, fetchedAt: stored.fetchedAt, source: 'stored', stale: false };
  }

  try {
    const fresh = fetchPublicHolidaysFromGoogle_();
    writeStoredPublicHolidays_(fresh);
    return { holidays: fresh.holidays, fetchedAt: fresh.fetchedAt, source: 'google', stale: false };
  } catch (error) {
    console.error('공휴일 수집 실패: ' + error);
    if (stored) {
      return { holidays: stored.holidays, fetchedAt: stored.fetchedAt, source: 'stored', stale: true, error: String(error.message || error) };
    }
    throw new Error('공휴일 정보를 가져오지 못했습니다: ' + (error.message || error));
  }
}

/**
 * 시간 기반 트리거가 매일 실행하는 작업. 구글 휴일 캘린더를 다시 읽어 저장합니다.
 */
function refreshPublicHolidaysJob() {
  // 데모: 이 함수는 이름이 공개되어 있어 화면에서도 부를 수 있으므로, 5분에 한 번만 실제로 실행합니다.
  if (!demoThrottle_('holidayJob', 300)) return null;
  const fresh = fetchPublicHolidaysFromGoogle_();
  writeStoredPublicHolidays_(fresh);
  console.log('공휴일 갱신 완료: ' + Object.keys(fresh.holidays).length + '건 (' + fresh.fetchedAt + ')');
  return fresh;
}

/**
 * 스크립트 편집기에서 한 번 실행하면 매일 새벽 공휴일 갱신 트리거를 설치합니다.
 * (앱의 [관리 정보] 화면에서 "자동 갱신 켜기"를 눌러도 같습니다.)
 */
function setupPublicHolidayTrigger() {
  requireOwnerRun_();
  const installed = ensurePublicHolidayTrigger_(true);
  return installed ? '공휴일 자동 갱신 트리거가 설치되어 있습니다(매일 04~05시).' : '트리거 설치에 실패했습니다. 실행 로그를 확인하세요.';
}

function ensurePublicHolidayTrigger_(throwOnError) {
  try {
    const exists = ScriptApp.getProjectTriggers().some(function(trigger) {
      return trigger.getHandlerFunction() === PUBLIC_HOLIDAY_REFRESH_HANDLER;
    });
    if (exists) return true;
    ScriptApp.newTrigger(PUBLIC_HOLIDAY_REFRESH_HANDLER)
      .timeBased()
      .everyDays(1)
      .atHour(4)
      .inTimezone('Asia/Seoul')
      .create();
    return true;
  } catch (error) {
    // 웹앱 사용자 권한으로는 트리거를 만들 수 없을 수 있습니다. 이 경우 24시간 TTL 방식으로만 갱신됩니다.
    console.warn('공휴일 트리거 설치 생략: ' + error);
    if (throwOnError) throw error;
    return false;
  }
}

function readStoredPublicHolidays_() {
  const raw = PropertiesService.getScriptProperties().getProperty(PUBLIC_HOLIDAY_PROPERTY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.holidays !== 'object') return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function writeStoredPublicHolidays_(data) {
  // 스크립트 속성은 값당 9KB 제한이 있으므로 작년~3년 뒤 범위만 저장합니다.
  const thisYear = new Date().getFullYear();
  const trimmed = {};
  Object.keys(data.holidays).sort().forEach(function(dateStr) {
    const year = Number(dateStr.slice(0, 4));
    if (year >= thisYear - 1 && year <= thisYear + 3) trimmed[dateStr] = data.holidays[dateStr];
  });
  PropertiesService.getScriptProperties().setProperty(
    PUBLIC_HOLIDAY_PROPERTY_KEY,
    JSON.stringify({ fetchedAt: data.fetchedAt, holidays: trimmed })
  );
}

function fetchPublicHolidaysFromGoogle_() {
  const response = UrlFetchApp.fetch(PUBLIC_HOLIDAY_ICS_URL, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('구글 휴일 캘린더 응답 오류 (HTTP ' + response.getResponseCode() + ')');
  }
  const holidays = parsePublicHolidayIcs_(response.getContentText());
  if (!Object.keys(holidays).length) {
    throw new Error('구글 휴일 캘린더에서 공휴일을 찾지 못했습니다.');
  }
  return { holidays: holidays, fetchedAt: new Date().toISOString() };
}

/**
 * iCal 텍스트에서 "공휴일"로 표시된 이벤트만 추려 { 'YYYY-MM-DD': '이름' } 형태로 반환합니다.
 * (기념일(식목일·어버이날 등)은 제외) 같은 날 여러 공휴일이면 ' · '로 연결합니다.
 */
function parsePublicHolidayIcs_(icsText) {
  const unfolded = String(icsText || '').replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n');
  const byDate = {};
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;
  while ((match = eventRegex.exec(unfolded)) !== null) {
    const block = match[1];
    const dateMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{4})(\d{2})(\d{2})/);
    const summaryMatch = block.match(/\nSUMMARY[^:\n]*:(.*)/);
    const descriptionMatch = block.match(/\nDESCRIPTION[^:\n]*:(.*)/);
    if (!dateMatch || !summaryMatch) continue;

    const description = (descriptionMatch ? descriptionMatch[1] : '').trim();
    const isPublicHoliday = /^(공휴일|Public holiday)/i.test(description);
    if (!isPublicHoliday) continue;

    const dateStr = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
    const name = normalizePublicHolidayName_(summaryMatch[1]);
    if (!byDate[dateStr]) byDate[dateStr] = [];
    if (byDate[dateStr].indexOf(name) === -1) byDate[dateStr].push(name);
  }

  const holidays = {};
  Object.keys(byDate).sort().forEach(function(dateStr) {
    holidays[dateStr] = byDate[dateStr].join(' · ');
  });
  return holidays;
}

function normalizePublicHolidayName_(rawName) {
  let name = String(rawName || '').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
  const substituteMatch = name.match(/^쉬는 날 (.+)$/);
  if (substituteMatch) {
    name = substituteMatch[1].replace(/ 연휴$/, '') + ' 대체공휴일';
  }
  Object.keys(PUBLIC_HOLIDAY_NAME_MAP).forEach(function(from) {
    name = name.replace(from, PUBLIC_HOLIDAY_NAME_MAP[from]);
  });
  return name;
}

// =====================================================================
// 관리 정보 — 담당자 인수인계용 점검 (앱 상단의 "⚙ 관리 정보")
// =====================================================================
// - 관리자 = ADMIN_EMAILS에 적힌 계정, 또는 이 스크립트 파일의 소유자.
// - API 키 같은 비밀값은 화면으로 내보내지 않고 끝 4자리와 출처(속성/기본값/없음)만 알려줍니다.
// - 트리거는 "설치한 사람 계정"으로 실행되고 다른 계정에서는 보이지 않으므로,
//   인계할 때 전임자는 [자동 갱신 끄기], 후임자는 [자동 갱신 켜기]를 각자 눌러야 합니다.
const ADMIN_SETTING_ITEMS = [
  { key: 'SCHOOL_NAME', label: '학교 이름', secret: false },
  { key: 'NEIS_API_KEY', label: '나이스 API 키', secret: true },
  { key: 'GEMINI_API_KEY', label: 'Gemini API 키', secret: true },
  { key: 'NEIS_ATPT_OFCDC_SC_CODE', label: '나이스 교육청 코드', secret: false },
  { key: 'NEIS_SD_SCHUL_CODE', label: '나이스 학교 코드', secret: false },
  { key: 'NEIS_SCHOOL_KIND', label: '학교 종류', secret: false },
  { key: 'PERIOD_TIMES', label: '교시 시간', secret: false },
  { key: 'FIREBASE_CONFIG', label: '데이터베이스(Firebase)', secret: false },
  { key: 'PLANNING_TEMPLATE_SPREADSHEET_ID', label: '계획 시트 템플릿 ID', secret: false },
  { key: 'ADMIN_EMAILS', label: '관리자 계정', secret: false },
  { key: 'OFFICE_DRIVE_FOLDER_ID', label: '온라인 교무실(데모) 폴더 ID', secret: false },
  { key: 'GEMINI_MODEL', label: 'AI 모델', secret: false },
  { key: 'DEMO_ADMIN_CODE', label: '관리자 암호', secret: true },
  { key: 'DEMO_AI_DAILY_LIMIT', label: '하루 AI 호출 한도', secret: false },
  { key: 'DEMO_UPLOAD_DAILY_FILES', label: '하루 업로드 파일 수 한도', secret: false },
  { key: 'DEMO_UPLOAD_DAILY_MB', label: '하루 업로드 용량 한도(MB)', secret: false },
  { key: 'DEMO_SHEET_DAILY_LIMIT', label: '하루 계획 시트 생성 한도', secret: false },
  { key: 'DEMO_TIMETABLE_SHEET_URL', label: '기본 시간표 시트 주소', secret: false }
];

/**
 * 프런트엔드에서 호출: 관리 정보(설정값 출처·트리거·소유자 등)를 반환합니다.
 * 관리자가 아니면 본인 계정과 안내 문구만 돌려줍니다.
 */
function getAdminStatus(adminCode) {
  const userEmail = getActiveUserEmailSafe_();
  const scriptFile = getDriveFileInfo_(ScriptApp.getScriptId());
  const byCode = isValidAdminCode_(adminCode);

  if (!byCode && !isAdminUser_(userEmail, scriptFile)) {
    return {
      isAdmin: false,
      isDemo: true,
      userEmail: userEmail,
      codeEnabled: !!getConfig_('DEMO_ADMIN_CODE'),
      codeRejected: !!String(adminCode || '').trim(),
      message: userEmail
        ? '이 계정은 관리자로 등록되어 있지 않습니다.'
        : '데모는 로그인 없이 열리므로 접속한 사람을 알 수 없습니다. 데모를 배포한 구글 계정으로 로그인한 브라우저에서 열거나, 관리자 암호를 입력하세요.'
    };
  }

  const properties = readAllScriptProperties_();
  const settings = ADMIN_SETTING_ITEMS.map(function(item) {
    const stored = String(properties[item.key] || '').trim();
    const fallback = String(CONFIG_DEFAULTS[item.key] || '');
    const value = stored || fallback;
    return {
      key: item.key,
      label: item.label,
      source: stored ? 'property' : (fallback ? 'default' : 'missing'),
      display: settingDisplay_(item, value)
    };
  });

  const storedHolidays = readStoredPublicHolidays_();
  const templateId = getConfig_('PLANNING_TEMPLATE_SPREADSHEET_ID');
  const firebase = readFirebaseConfig_();

  return {
    isAdmin: true,
    isDemo: true,
    adminBy: byCode ? 'code' : 'account',
    userEmail: userEmail,
    school: {
      name: getConfig_('SCHOOL_NAME'),
      kind: getConfig_('NEIS_SCHOOL_KIND'),
      atpt: getConfig_('NEIS_ATPT_OFCDC_SC_CODE'),
      code: getConfig_('NEIS_SD_SCHUL_CODE'),
      neisKeySet: !!getConfig_('NEIS_API_KEY'),
      geminiKeySet: !!getConfig_('GEMINI_API_KEY'),
      periodTimesText: getConfig_('PERIOD_TIMES'),
      adminCodeSet: !!getConfig_('DEMO_ADMIN_CODE')
    },
    database: firebase
      ? { mode: 'own', projectId: firebase.projectId }
      : { mode: 'shared', projectId: 'school-worklog-demo', dataSpace: sharedDataSpace_() },
    demo: {
      aiUsed: demoReadUsage_('ai'),
      aiLimit: getConfigNumber_('DEMO_AI_DAILY_LIMIT', 400),
      uploadFilesUsed: demoReadUsage_('uploadFiles'),
      uploadFilesLimit: getConfigNumber_('DEMO_UPLOAD_DAILY_FILES', 120),
      uploadMbUsed: Math.round(demoReadUsage_('uploadBytes') / 1024 / 1024),
      uploadMbLimit: getConfigNumber_('DEMO_UPLOAD_DAILY_MB', 500),
      sheetUsed: demoReadUsage_('sheet'),
      sheetLimit: getConfigNumber_('DEMO_SHEET_DAILY_LIMIT', 60),
      folderLinkShared: isFolderLinkShared_(getConfig_('OFFICE_DRIVE_FOLDER_ID')),
      parentFolderHint: DEMO_EXISTING_OFFICE_FOLDER_URL
    },
    runAsEmail: getEffectiveUserEmailSafe_(),
    webAppUrl: getWebAppUrlSafe_(),
    admins: getAdminEmails_(),
    scriptFile: scriptFile,
    templateFile: getDriveFileInfo_(templateId),
    settings: settings,
    holiday: {
      triggerInstalledByMe: findMyHolidayTriggers_().length > 0,
      fetchedAt: storedHolidays ? (storedHolidays.fetchedAt || '') : '',
      count: storedHolidays ? Object.keys(storedHolidays.holidays || {}).length : 0
    },
    timetableConfigCount: readTimetableConfigs_().length,
    office: {
      folder: getOfficeFolderInfo_(getConfig_('OFFICE_DRIVE_FOLDER_ID')),
      lastBackupAt: String(properties[OFFICE_BACKUP_PROPERTY_KEY] || '')
    },
    checkedAt: new Date().toISOString()
  };
}

/**
 * 관리자 전용: 공휴일 자동 갱신 트리거를 "내 계정"으로 설치합니다.
 */
function installHolidayTrigger(adminCode) {
  requireAdmin_(adminCode);
  ensurePublicHolidayTrigger_(true);
  return getAdminStatus(adminCode);
}

/**
 * 관리자 전용: "내 계정"으로 설치된 공휴일 자동 갱신 트리거를 삭제합니다. (인계 전 전임자가 실행)
 */
function removeMyHolidayTrigger(adminCode) {
  requireAdmin_(adminCode);
  findMyHolidayTriggers_().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  return getAdminStatus(adminCode);
}

function findMyHolidayTriggers_() {
  try {
    return ScriptApp.getProjectTriggers().filter(function(trigger) {
      return trigger.getHandlerFunction() === PUBLIC_HOLIDAY_REFRESH_HANDLER;
    });
  } catch (error) {
    console.warn('트리거 목록을 읽지 못했습니다: ' + error);
    return [];
  }
}

function requireAdmin_(adminCode) {
  const userEmail = getActiveUserEmailSafe_();
  if (isValidAdminCode_(adminCode)) return userEmail || '관리자(암호)';
  if (!isAdminUser_(userEmail, getDriveFileInfo_(ScriptApp.getScriptId()))) {
    throw new Error('관리자만 실행할 수 있습니다. 데모를 배포한 구글 계정으로 로그인하거나 관리자 암호를 입력하세요.');
  }
  return userEmail;
}

function isAdminUser_(userEmail, scriptFile) {
  const email = String(userEmail || '').trim().toLowerCase();
  if (!email) return false;
  if (getAdminEmails_().indexOf(email) !== -1) return true;
  return !!(scriptFile && scriptFile.ownerEmail && scriptFile.ownerEmail === email);
}

function getAdminEmails_() {
  return getConfig_('ADMIN_EMAILS')
    .split(/[\s,;]+/)
    .map(function(email) { return email.trim().toLowerCase(); })
    .filter(function(email) { return !!email; });
}

/**
 * 드라이브 파일의 이름·소유자를 조회합니다. 공유 드라이브에 있는 파일은 개인 소유자가 없습니다.
 * 접속한 계정에 파일 접근 권한이 없으면 accessible:false로 돌려줍니다.
 */
function getDriveFileInfo_(fileId) {
  const info = { id: String(fileId || ''), accessible: false, name: '', ownerEmail: '', inSharedDrive: false };
  if (!info.id) return info;
  try {
    const file = DriveApp.getFileById(info.id);
    const owner = file.getOwner();
    info.accessible = true;
    info.name = file.getName();
    info.ownerEmail = owner ? String(owner.getEmail() || '').toLowerCase() : '';
    info.inSharedDrive = !owner;
  } catch (error) {
    console.warn('드라이브 파일 정보를 읽지 못했습니다(' + info.id + '): ' + error);
  }
  return info;
}

function readAllScriptProperties_() {
  try {
    return PropertiesService.getScriptProperties().getProperties() || {};
  } catch (error) {
    return {};
  }
}

function settingDisplay_(item, value) {
  if (!value) return '';
  if (item.key === 'DEMO_ADMIN_CODE') return '설정됨(가려짐)';   // 짧을 수 있어 끝자리도 보여주지 않습니다
  if (item.key === 'FIREBASE_CONFIG') {
    const firebase = readFirebaseConfig_();
    return firebase ? '우리 학교 Firebase (' + firebase.projectId + ')' : '형식 오류 — 공용 체험 DB 사용 중';
  }
  return item.secret ? maskSecret_(value) : value;
}

function maskSecret_(value) {
  const text = String(value || '');
  return text.length <= 4 ? '••••' : '••••' + text.slice(-4);
}

function getEffectiveUserEmailSafe_() {
  try {
    return Session.getEffectiveUser().getEmail() || '';
  } catch (error) {
    return '';
  }
}

function getWebAppUrlSafe_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (error) {
    return '';
  }
}


// =====================================================================
// 온라인 교무실 — 부서별 자료 파일을 구글 드라이브에 보관
// =====================================================================
// - 파일은 OFFICE_DRIVE_FOLDER_ID 폴더(공유 드라이브 권장) 아래 부서별 하위 폴더에 저장합니다.
//   제목·섹션·연결된 일정 같은 "목록 정보"는 Firestore(officeSections / officeMaterials)에 둡니다.
// - 큰 파일도 올릴 수 있도록 브라우저가 파일을 5MB 조각으로 나눠 보내고,
//   서버가 드라이브 "재개 가능 업로드" 주소로 이어 붙입니다. 인증 토큰은 브라우저로 내보내지 않습니다.
// - 앱에서는 드라이브 파일을 지우지 않습니다. 자료를 삭제해도 파일은 폴더에 그대로 남습니다.
const OFFICE_DEPARTMENTS = ['교무부', '학생부', '연구정보부', '행정실', '기타'];
const OFFICE_FOLDER_MAP_PROPERTY_KEY = 'OFFICE_FOLDER_MAP_V1';
const OFFICE_BACKUP_PROPERTY_KEY = 'OFFICE_BACKUP_AT_V1';
const OFFICE_BACKUP_FOLDER_NAME = '_목록 백업';
const OFFICE_BACKUP_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;   // 목록 백업은 하루 1회면 충분
const OFFICE_BACKUP_KEEP = 60;
const OFFICE_BACKUP_MAX_CHARS = 8 * 1024 * 1024;
const OFFICE_UPLOAD_CACHE_PREFIX = 'officeUpload:';
const OFFICE_UPLOAD_CACHE_SECONDS = 6 * 60 * 60;
const OFFICE_CHUNK_UNIT = 256 * 1024;                        // 드라이브 규칙: 마지막 조각 외에는 256KB의 배수
const OFFICE_CHUNK_BYTES = 20 * OFFICE_CHUNK_UNIT;           // 5MB
const OFFICE_MAX_FILE_BYTES = DEMO_MAX_FILE_BYTES;           // 데모: 한 파일 20MB (실제 버전은 500MB)
const OFFICE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size';
const OFFICE_MIME_BY_EXTENSION = {
  hwp: 'application/x-hwp', hwpx: 'application/hwp+zip', pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', zip: 'application/zip', txt: 'text/plain'
};

/**
 * 프런트엔드에서 호출: 파일을 올릴 수 있는 상태인지 알려줍니다.
 */
function getOfficeConfig() {
  const folder = getOfficeFolderInfo_(getConfig_('OFFICE_DRIVE_FOLDER_ID'));
  const userEmail = getActiveUserEmailSafe_();
  return {
    ready: folder.accessible,
    reason: folder.accessible ? '' : (folder.id ? 'no-access' : 'not-set'),
    isAdmin: isAdminUser_(userEmail, getDriveFileInfo_(ScriptApp.getScriptId())),
    isDemo: true,
    chunkBytes: OFFICE_CHUNK_BYTES,
    maxFileBytes: OFFICE_MAX_FILE_BYTES,
    lastBackupAt: String(readAllScriptProperties_()[OFFICE_BACKUP_PROPERTY_KEY] || '')
  };
}

/**
 * 프런트엔드에서 호출: 파일 1개의 업로드를 시작하고 업로드 번호를 돌려줍니다.
 * meta = { name, size, mimeType, department }
 */
function officeStartUpload(meta) {
  const department = normalizeOfficeDepartment_(meta && meta.department);
  const name = sanitizeOfficeFileName_(meta && meta.name);
  const size = Number(meta && meta.size);
  if (!isFinite(size) || size <= 0 || Math.floor(size) !== size) throw new Error('빈 파일은 올릴 수 없습니다.');
  if (size > OFFICE_MAX_FILE_BYTES) {
    throw new Error('파일이 너무 큽니다. 한 파일은 ' + Math.floor(OFFICE_MAX_FILE_BYTES / 1024 / 1024) + 'MB까지 올릴 수 있습니다.');
  }
  const mimeType = resolveOfficeMimeType_(name, meta && meta.mimeType);
  const folderId = getOfficeDepartmentFolderId_(department);

  // 데모: 누구나 올릴 수 있으므로 하루에 올릴 수 있는 파일 수와 용량에 한도를 둡니다.
  demoUseQuota_('uploadFiles', 1, getConfigNumber_('DEMO_UPLOAD_DAILY_FILES', 120),
    '오늘 데모에서 올릴 수 있는 파일 수를 모두 썼습니다. 제목·설명·링크만으로 자료를 올려주세요.');
  demoUseQuota_('uploadBytes', size, getConfigNumber_('DEMO_UPLOAD_DAILY_MB', 500) * 1024 * 1024,
    '오늘 데모에서 올릴 수 있는 용량을 모두 썼습니다. 제목·설명·링크만으로 자료를 올려주세요.');

  const response = UrlFetchApp.fetch(OFFICE_UPLOAD_URL, {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(size)
    },
    payload: JSON.stringify({ name: name, parents: [folderId], mimeType: mimeType }),
    muteHttpExceptions: true
  });
  const sessionUrl = getHeaderIgnoreCase_(response.getHeaders(), 'Location');
  if (response.getResponseCode() !== 200 || !sessionUrl) {
    console.error('온라인 교무실 업로드 시작 실패: ' + response.getResponseCode() + ' ' + String(response.getContentText()).slice(0, 300));
    throw new Error('드라이브에 파일을 올릴 수 없습니다. 저장 폴더 권한을 확인해주세요. (오류 ' + response.getResponseCode() + ')');
  }

  const uploadId = Utilities.getUuid();
  CacheService.getScriptCache().put(
    OFFICE_UPLOAD_CACHE_PREFIX + uploadId,
    JSON.stringify({ url: sessionUrl, size: size, name: name }),
    OFFICE_UPLOAD_CACHE_SECONDS
  );
  return { uploadId: uploadId, chunkBytes: OFFICE_CHUNK_BYTES };
}

/**
 * 프런트엔드에서 호출: 파일 조각 1개를 이어 붙입니다.
 * 반환: 아직 남았으면 { done:false, nextOffset }, 끝났으면 { done:true, file }
 */
function officeUploadChunk(uploadId, offset, base64Data) {
  const session = readOfficeUploadSession_(uploadId);
  const start = Number(offset);
  const bytes = Utilities.base64Decode(String(base64Data || ''));
  const length = bytes.length;
  if (!isFinite(start) || start < 0 || !length) throw new Error('업로드 조각이 올바르지 않습니다.');
  if (length > OFFICE_CHUNK_BYTES) throw new Error('업로드 조각이 너무 큽니다.');
  const end = start + length - 1;
  if (end >= session.size) throw new Error('업로드 조각이 파일 크기를 넘었습니다.');
  const isLast = end === session.size - 1;
  if (!isLast && length % OFFICE_CHUNK_UNIT !== 0) throw new Error('업로드 조각 크기가 올바르지 않습니다.');

  const response = UrlFetchApp.fetch(session.url, {
    method: 'put',
    contentType: 'application/octet-stream',
    headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + session.size },
    payload: bytes,
    muteHttpExceptions: true,
    followRedirects: false
  });
  return readOfficeUploadResponse_(uploadId, session, response);
}

/**
 * 프런트엔드에서 호출: 중간에 끊겼을 때 드라이브가 어디까지 받았는지 확인합니다.
 */
function officeUploadStatus(uploadId) {
  const session = readOfficeUploadSession_(uploadId);
  const response = UrlFetchApp.fetch(session.url, {
    method: 'put',
    headers: { 'Content-Range': 'bytes */' + session.size },
    muteHttpExceptions: true,
    followRedirects: false
  });
  return readOfficeUploadResponse_(uploadId, session, response);
}

function readOfficeUploadSession_(uploadId) {
  const id = String(uploadId || '');
  const raw = /^[0-9a-fA-F-]{20,60}$/.test(id) ? CacheService.getScriptCache().get(OFFICE_UPLOAD_CACHE_PREFIX + id) : null;
  if (!raw) throw new Error('업로드 시간이 지났습니다. 파일을 다시 올려주세요.');
  return JSON.parse(raw);
}

function readOfficeUploadResponse_(uploadId, session, response) {
  const code = response.getResponseCode();
  if (code === 308) {
    // "Range: bytes=0-12345" = 12346바이트까지 받았다는 뜻. 헤더가 없으면 아직 아무것도 받지 못한 것.
    const range = getHeaderIgnoreCase_(response.getHeaders(), 'Range');
    const match = /bytes=0-(\d+)/.exec(String(range || ''));
    return { done: false, nextOffset: match ? Number(match[1]) + 1 : 0 };
  }
  if (code === 200 || code === 201) {
    const file = JSON.parse(response.getContentText() || '{}');
    if (!file.id) throw new Error('드라이브가 파일 정보를 돌려주지 않았습니다.');
    CacheService.getScriptCache().remove(OFFICE_UPLOAD_CACHE_PREFIX + uploadId);
    return {
      done: true,
      file: {
        id: file.id,
        name: file.name || session.name,
        mimeType: file.mimeType || '',
        size: Number(file.size || session.size),
        url: 'https://drive.google.com/file/d/' + file.id + '/view'
      }
    };
  }
  console.error('온라인 교무실 업로드 실패: ' + code + ' ' + String(response.getContentText()).slice(0, 300));
  throw new Error('파일을 올리는 중 문제가 생겼습니다. (오류 ' + code + ')');
}

/**
 * 프런트엔드에서 호출: 자료 목록(Firestore 내용)을 하루 1회 드라이브에 JSON으로 남깁니다.
 * 날짜별 파일로 쌓으므로, 잘못된 내용이 저장되어도 이전 날짜 백업은 그대로 남습니다.
 */
function saveOfficeBackup(jsonText) {
  const text = String(jsonText || '');
  if (!text || text.length > OFFICE_BACKUP_MAX_CHARS) throw new Error('백업 내용이 올바르지 않습니다.');
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.materials) || !Array.isArray(parsed.sections)) throw new Error('백업 형식이 올바르지 않습니다.');

  const properties = PropertiesService.getScriptProperties();
  const lastAt = Date.parse(properties.getProperty(OFFICE_BACKUP_PROPERTY_KEY) || '');
  if (lastAt && Date.now() - lastAt < OFFICE_BACKUP_MIN_INTERVAL_MS) {
    return { saved: false, lastBackupAt: new Date(lastAt).toISOString() };
  }

  const backupFolder = getOrCreateChildFolder_(getOfficeRootFolder_(), OFFICE_BACKUP_FOLDER_NAME);
  const now = new Date();
  const fileName = '온라인교무실-목록-' + Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd') + '.json';
  const sameDay = backupFolder.getFilesByName(fileName);
  if (sameDay.hasNext()) sameDay.next().setContent(text);
  else backupFolder.createFile(fileName, text, 'application/json');

  // 오래된 백업은 휴지통으로 (드라이브 휴지통에서 30일간 되살릴 수 있음)
  const files = [];
  const iterator = backupFolder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (/^온라인교무실-목록-\d{4}-\d{2}-\d{2}\.json$/.test(file.getName())) files.push(file);
  }
  files.sort(function(a, b) { return b.getName().localeCompare(a.getName()); });
  files.slice(OFFICE_BACKUP_KEEP).forEach(function(file) { file.setTrashed(true); });

  properties.setProperty(OFFICE_BACKUP_PROPERTY_KEY, now.toISOString());
  return { saved: true, lastBackupAt: now.toISOString() };
}

/**
 * 관리자 전용: 자료를 보관할 드라이브 폴더를 지정합니다. (폴더 주소 또는 ID)
 */
function setOfficeFolder(urlOrId, adminCode) {
  requireAdmin_(adminCode);
  const folderId = parseDriveFolderId_(urlOrId);
  const info = getOfficeFolderInfo_(folderId);
  if (!info.accessible) throw new Error('데모를 실행하는 계정으로는 그 폴더를 열 수 없습니다. 폴더가 맞는지, 권한이 있는지 확인해주세요.');
  storeOfficeFolderId_(folderId);
  return getAdminStatus(adminCode);
}

function parseDriveFolderId_(urlOrId) {
  const text = String(urlOrId || '').trim();
  const match = /\/folders\/([A-Za-z0-9_-]{10,})/.exec(text) || /[?&]id=([A-Za-z0-9_-]{10,})/.exec(text) || /^([A-Za-z0-9_-]{10,})$/.exec(text);
  if (!match) throw new Error('폴더 주소를 알아볼 수 없습니다. 드라이브에서 폴더를 연 뒤 주소창의 주소를 그대로 붙여넣어 주세요.');
  return match[1];
}

/**
 * 관리자 전용: 실행 계정의 내 드라이브에 보관 폴더를 새로 만들어 지정합니다.
 * (공유 드라이브를 쓸 수 있다면 공유 드라이브 안에 폴더를 만들고 setOfficeFolder로 지정하는 쪽이 낫습니다.)
 */
function createOfficeFolder(adminCode) {
  requireAdmin_(adminCode);
  if (getOfficeFolderInfo_(getConfig_('OFFICE_DRIVE_FOLDER_ID')).accessible) {
    throw new Error('이미 저장 폴더가 지정되어 있습니다.');
  }
  connectDemoFolder_(DriveApp.createFolder(DEMO_NEW_OFFICE_FOLDER_NAME));
  return getAdminStatus(adminCode);
}

function storeOfficeFolderId_(folderId) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('OFFICE_DRIVE_FOLDER_ID', folderId);
  properties.deleteProperty(OFFICE_FOLDER_MAP_PROPERTY_KEY);   // 부서 폴더는 새 위치에서 다시 만듭니다
  configCache_ = null;
}

function getOfficeRootFolder_() {
  const folderId = getConfig_('OFFICE_DRIVE_FOLDER_ID');
  if (!folderId) throw new Error('파일 저장 폴더가 아직 지정되지 않았습니다. 관리자가 ⚙ 관리 정보에서 지정해야 합니다.');
  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error('파일 저장 폴더를 열 수 없습니다. 폴더 권한을 확인해주세요.');
  }
}

/**
 * 부서별 하위 폴더 ID를 돌려줍니다. 없으면 만들고 스크립트 속성에 기억합니다.
 */
function getOfficeDepartmentFolderId_(department) {
  const properties = PropertiesService.getScriptProperties();
  const readMap = function() {
    try { return JSON.parse(properties.getProperty(OFFICE_FOLDER_MAP_PROPERTY_KEY) || '{}') || {}; }
    catch (error) { return {}; }
  };
  const usable = function(folderId) {
    if (!folderId) return false;
    try { return !DriveApp.getFolderById(folderId).isTrashed(); }
    catch (error) { return false; }
  };

  const known = readMap()[department];
  if (usable(known)) return known;

  const root = getOfficeRootFolder_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const map = readMap();   // 기다리는 동안 다른 사람이 만들었을 수 있음
    if (usable(map[department])) return map[department];
    map[department] = getOrCreateChildFolder_(root, department).getId();
    properties.setProperty(OFFICE_FOLDER_MAP_PROPERTY_KEY, JSON.stringify(map));
    return map[department];
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateChildFolder_(parent, name) {
  const found = parent.getFoldersByName(name);
  while (found.hasNext()) {
    const folder = found.next();
    if (!folder.isTrashed()) return folder;
  }
  return parent.createFolder(name);
}

function getOfficeFolderInfo_(folderId) {
  const info = { id: String(folderId || ''), accessible: false, name: '', ownerEmail: '', inSharedDrive: false, url: '' };
  if (!info.id) return info;
  try {
    const folder = DriveApp.getFolderById(info.id);
    if (folder.isTrashed()) return info;
    const owner = folder.getOwner();
    info.accessible = true;
    info.name = folder.getName();
    info.ownerEmail = owner ? String(owner.getEmail() || '').toLowerCase() : '';
    info.inSharedDrive = !owner;
    info.url = folder.getUrl();
  } catch (error) {
    console.warn('온라인 교무실 폴더 정보를 읽지 못했습니다(' + info.id + '): ' + error);
  }
  return info;
}

function normalizeOfficeDepartment_(department) {
  const value = String(department || '').trim();
  if (OFFICE_DEPARTMENTS.indexOf(value) === -1) throw new Error('부서가 올바르지 않습니다.');
  return value;
}

function sanitizeOfficeFileName_(name) {
  const cleaned = String(name || '').replace(/[\\/\u0000-\u001f]/g, '_').trim().slice(0, 200);
  if (!cleaned) throw new Error('파일 이름이 없습니다.');
  return cleaned;
}

function resolveOfficeMimeType_(name, mimeType) {
  const given = String(mimeType || '').trim();
  if (/^[\w.+-]+\/[\w.+-]+$/.test(given) && given !== 'application/octet-stream') return given;
  const extension = (/\.([A-Za-z0-9]+)$/.exec(name) || [])[1];
  return OFFICE_MIME_BY_EXTENSION[String(extension || '').toLowerCase()] || 'application/octet-stream';
}

function getHeaderIgnoreCase_(headers, name) {
  const target = String(name).toLowerCase();
  const keys = Object.keys(headers || {});
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === target) return headers[keys[i]];
  }
  return '';
}


// =====================================================================
// 데모 처음 설정 · 학교별 설정 · 초기화
// =====================================================================
// - setupDemo            : 스크립트 편집기에서 한 번 실행. 권한 승인 + 온라인 교무실 폴더 연결.
// - createDemoOfficeFolder: 붙여넣은 폴더 안에 '데모버전' 폴더를 만들어 연결(⚙ 관리 정보, 관리자 전용).
// - searchNeisSchools    : 학교 이름으로 나이스 학교 코드를 찾습니다(관리자 전용).
// - saveSchoolSettings   : 학교·나이스 키·Gemini 키·교시 시간·관리자 암호를 저장(관리자 전용, 키는 저장 전에 확인).
// - saveFirebaseConfig / useSharedDemoDatabase : 데이터베이스를 우리 학교 Firebase ↔ 공용 체험 DB로 바꿉니다.
// - demoGetSampleFiles   : 예시 데이터에 붙일 예시 PDF 3개를 데모 폴더에 준비합니다(이미 있으면 그대로 씁니다).
// - demoPrepareReset     : 관리자가 "데모 데이터 초기화"를 누를 때 서버 쪽 상태(시간표 설정)를 되돌립니다.
//   달력·성찰·자료 목록 같은 Firestore 데이터는 화면(index.html의 DemoService)에서 지우고 다시 채웁니다.

/**
 * ★ 스크립트 편집기에서 한 번 실행하세요. (처음 실행할 때 권한 승인 창이 뜹니다)
 * - 맨 위 DEMO_EXISTING_OFFICE_FOLDER_URL 에 주소가 있으면: 그 폴더 안에 '데모버전' 폴더를 만들어 연결
 * - 비어 있으면: 내 드라이브에 '온라인 교무실 (업무일지 데모)' 폴더를 새로 만들어 연결
 * 이미 연결된 폴더가 있으면 새로 만들지 않습니다. 실행 결과는 아래 "실행 로그"에 나옵니다.
 */
function setupDemo() {
  requireOwnerRun_();
  const parentText = String(DEMO_EXISTING_OFFICE_FOLDER_URL || '').trim()
    || String(PropertiesService.getScriptProperties().getProperty('DEMO_PARENT_FOLDER_URL') || '').trim();
  let result;
  let how;
  if (parentText) {
    result = createDemoFolderIn_(parentText);
    how = '붙여넣은 폴더 안에 \'' + DEMO_FOLDER_NAME + '\' 폴더를 연결했습니다.';
  } else {
    const current = getOfficeFolderInfo_(getConfig_('OFFICE_DRIVE_FOLDER_ID'));
    if (current.accessible) {
      result = { name: current.name, url: current.url, linkShared: isFolderLinkShared_(current.id) };
      how = '이미 연결된 폴더를 그대로 씁니다.';
    } else {
      result = connectDemoFolder_(DriveApp.createFolder(DEMO_NEW_OFFICE_FOLDER_NAME));
      how = '내 드라이브에 새 폴더를 만들어 연결했습니다.';
    }
  }
  const samples = demoGetSampleFiles();
  const lines = [
    '온라인 교무실 폴더 준비 완료 — ' + how,
    '· 폴더 이름: ' + result.name,
    '· 폴더 주소: ' + result.url,
    '· 실행 계정: ' + (getEffectiveUserEmailSafe_() || '확인되지 않음'),
    result.linkShared
      ? '· 공유: "링크가 있는 모든 사용자 - 뷰어" (로그인하지 않은 사람도 올라온 파일을 열 수 있습니다)'
      : '· 공유: "링크가 있는 모든 사용자"로 바꾸지 못했습니다. 기관 정책으로 막힌 것일 수 있습니다. 이 경우 로그인하지 않은 사람은 올라온 파일을 열 수 없습니다.',
    '· 예시 파일: ' + Object.keys(samples).length + '개 준비됨',
    '다음 순서: [배포] → [새 배포]로 웹 앱을 배포한 뒤, 앱의 ⚙ 관리 정보 → 「처음 설정」에서 학교와 키를 넣으세요.'
  ];
  console.log(lines.join('\n'));
  return lines.join('\n');
}

// ---------- 학교별 설정 (⚙ 관리 정보 → 처음 설정) ----------

/**
 * 관리자 전용: 학교 이름으로 나이스 학교 정보를 찾습니다.
 * 나이스 키가 아직 없어도 찾을 수 있지만, 그때는 나이스가 결과를 몇 개만 돌려줍니다.
 */
function searchNeisSchools(schoolName, adminCode) {
  requireAdmin_(adminCode);
  const name = String(schoolName || '').replace(/\s+/g, '').trim();
  if (name.length < 2) throw new Error('학교 이름을 두 글자 이상 입력해주세요. (예: 관산중)');
  if (name.length > 40) throw new Error('학교 이름이 너무 깁니다.');

  const key = getConfig_('NEIS_API_KEY');
  const params = { Type: 'json', pIndex: 1, pSize: 60, SCHUL_NM: name };
  if (key) params.KEY = key;
  const body = fetchNeisJson_('schoolInfo', params);
  if (body.schoolInfo) {
    const rows = (body.schoolInfo[1] && body.schoolInfo[1].row) || [];
    return {
      limited: !key,
      schools: rows.map(function(row) {
        return {
          atpt: String(row.ATPT_OFCDC_SC_CODE || ''),
          atptName: String(row.ATPT_OFCDC_SC_NM || ''),
          code: String(row.SD_SCHUL_CODE || ''),
          name: String(row.SCHUL_NM || ''),
          kind: String(row.SCHUL_KND_SC_NM || ''),
          address: String(row.ORG_RDNMA || '').trim()
        };
      })
    };
  }
  const result = body.RESULT || {};
  if (result.CODE === 'INFO-200') return { limited: !key, schools: [] };
  if (result.CODE === 'ERROR-290') throw new Error('저장된 나이스 API 키가 올바르지 않습니다. 키를 다시 넣어 주세요.');
  throw new Error('나이스에서 학교를 찾지 못했습니다: ' + (result.MESSAGE || '알 수 없는 응답'));
}

function fetchNeisJson_(endpoint, params) {
  const query = Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  const response = UrlFetchApp.fetch(NEIS_BASE_URL + endpoint + '?' + query, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('나이스에 연결하지 못했습니다 (HTTP ' + response.getResponseCode() + '). 잠시 뒤 다시 시도해주세요.');
  }
  return JSON.parse(response.getContentText());
}

/**
 * 관리자 전용: 학교별 설정을 저장합니다. 넘어온 항목만 바꿉니다.
 * settings = { school?: {atpt, code, name, kind}, neisKey?, geminiKey?, periodTimes?, newAdminCode? }
 * 키는 저장하기 전에 실제로 쓸 수 있는지 확인하고, 틀리면 저장하지 않습니다.
 */
function saveSchoolSettings(settings, adminCode) {
  requireAdmin_(adminCode);
  const s = settings || {};
  const properties = PropertiesService.getScriptProperties();
  const updates = {};
  let nextAdminCode = adminCode;

  if (s.school) {
    const atpt = String(s.school.atpt || '').trim().toUpperCase();
    const code = String(s.school.code || '').trim();
    const name = String(s.school.name || '').replace(/[<>]/g, '').trim().slice(0, 60);
    const kind = String(s.school.kind || '').replace(/[<>]/g, '').trim().slice(0, 20);
    if (!/^[A-Z]\d{2}$/.test(atpt) || !/^\d{7}$/.test(code) || !name) {
      throw new Error('학교 정보가 올바르지 않습니다. 「학교 찾기」 결과에서 골라 주세요.');
    }
    updates.NEIS_ATPT_OFCDC_SC_CODE = atpt;
    updates.NEIS_SD_SCHUL_CODE = code;
    updates.SCHOOL_NAME = name;
    updates.NEIS_SCHOOL_KIND = kind;
  }

  if (typeof s.neisKey === 'string' && s.neisKey.trim()) {
    const neisKey = s.neisKey.trim();
    if (!/^[A-Za-z0-9]{10,64}$/.test(neisKey)) throw new Error('나이스 API 키 형식이 아닙니다. 마이페이지 → 인증키 발급 내역의 키를 그대로 복사해 주세요.');
    const body = fetchNeisJson_('schoolInfo', { KEY: neisKey, Type: 'json', pIndex: 1, pSize: 1 });
    if (!body.schoolInfo) {
      const result = body.RESULT || {};
      throw new Error(result.CODE === 'ERROR-290'
        ? '나이스가 이 키를 받지 않습니다. 키를 다시 복사해 붙여넣어 주세요.'
        : '나이스 키를 확인하지 못했습니다: ' + (result.MESSAGE || '알 수 없는 응답'));
    }
    updates.NEIS_API_KEY = neisKey;
  }

  if (typeof s.geminiKey === 'string' && s.geminiKey.trim()) {
    const geminiKey = s.geminiKey.trim();
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(geminiKey)) throw new Error('Gemini API 키 형식이 아닙니다. AI Studio에서 복사한 키(AIza…)를 그대로 붙여넣어 주세요.');
    // 모델 목록 조회는 AI 사용량을 쓰지 않으면서 키가 살아 있는지 알려 줍니다.
    const response = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=' + encodeURIComponent(geminiKey), { muteHttpExceptions: true });
    const status = response.getResponseCode();
    if (status !== 200) {
      throw new Error(status === 400 || status === 401
        ? 'Gemini가 이 키를 받지 않습니다. 키를 다시 복사해 붙여넣어 주세요.'
        : 'Gemini 키를 확인하지 못했습니다 (HTTP ' + status + '). 키를 만든 프로젝트에서 Gemini API가 꺼져 있지 않은지 확인해 주세요.');
    }
    updates.GEMINI_API_KEY = geminiKey;
  }

  if (typeof s.periodTimes === 'string') {
    const text = s.periodTimes.trim();
    if (text && !parsePeriodTimes_(text)) {
      throw new Error('교시 시간 형식이 맞지 않습니다. 예) 08:50-09:35, 09:45-10:30, 10:40-11:25 처럼 쉼표로 이어 적어 주세요.');
    }
    if (text) updates.PERIOD_TIMES = text;
    else properties.deleteProperty('PERIOD_TIMES');
  }

  if (typeof s.newAdminCode === 'string' && s.newAdminCode.trim()) {
    const code = s.newAdminCode.trim();
    if (code.length < 4 || code.length > 40) throw new Error('관리자 암호는 4~40자로 정해 주세요.');
    updates.DEMO_ADMIN_CODE = code;
    nextAdminCode = code;
  }

  if (Object.keys(updates).length) properties.setProperties(updates);
  configCache_ = null;
  return getAdminStatus(nextAdminCode);
}

/**
 * 관리자 전용: 우리 학교 Firebase 설정을 저장해 데이터베이스를 바꿉니다.
 * Firebase 콘솔의 firebaseConfig 코드(또는 JSON)를 그대로 받아, 실제로 읽고 쓸 수 있는지 확인한 뒤 저장합니다.
 */
function saveFirebaseConfig(text, adminCode) {
  requireAdmin_(adminCode);
  const config = parseFirebaseConfigText_(text);
  checkFirebaseReachable_(config);
  PropertiesService.getScriptProperties().setProperty('FIREBASE_CONFIG', JSON.stringify(config));
  configCache_ = null;
  return getAdminStatus(adminCode);
}

/**
 * 관리자 전용: 공용 체험 DB로 되돌립니다. (우리 학교 Firebase에 저장된 데이터는 지우지 않습니다)
 */
function useSharedDemoDatabase(adminCode) {
  requireAdmin_(adminCode);
  PropertiesService.getScriptProperties().deleteProperty('FIREBASE_CONFIG');
  configCache_ = null;
  return getAdminStatus(adminCode);
}

function parseFirebaseConfigText_(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Firebase 설정을 붙여넣어 주세요.');
  if (raw.length > 4000) throw new Error('붙여넣은 내용이 너무 깁니다. firebaseConfig 부분만 붙여넣어 주세요.');
  let source = null;
  try { source = JSON.parse(raw); } catch (error) { source = null; }
  if (!source || typeof source !== 'object') {
    // 콘솔에 나오는 const firebaseConfig = { apiKey: "…", … }; 형태를 그대로 읽습니다.
    source = {};
    const pattern = /["']?(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId|measurementId)["']?\s*:\s*["']([^"']+)["']/g;
    let match;
    while ((match = pattern.exec(raw)) !== null) source[match[1]] = match[2];
  }
  const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
  const config = {};
  keys.forEach(function(key) {
    const value = String(source[key] || '').trim();
    if (value) {
      if (!/^[A-Za-z0-9:._-]{1,200}$/.test(value)) throw new Error('Firebase 설정의 ' + key + ' 값이 올바르지 않습니다.');
      config[key] = value;
    }
  });
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error('Firebase 설정에서 apiKey, projectId, appId를 찾지 못했습니다. 콘솔의 「SDK 설정 및 구성」에 나오는 firebaseConfig 부분을 통째로 붙여넣어 주세요.');
  }
  if (!config.authDomain) config.authDomain = config.projectId + '.firebaseapp.com';
  return config;
}

/**
 * 붙여넣은 Firebase에 데이터베이스가 있고 규칙이 열려 있는지 확인합니다. 문제가 있으면 무엇을 해야 하는지 알려 줍니다.
 */
function checkFirebaseReachable_(config) {
  // 앱이 실제로 쓰는 경로(demoMeta)에 작은 확인용 문서를 한 번 써 봅니다. 쓰기가 되면 읽기도 됩니다(같은 규칙).
  const path = ['artifacts', config.appId, 'public', 'data', 'demoMeta', 'connectionCheck'].map(encodeURIComponent).join('/');
  const url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(config.projectId)
    + '/databases/(default)/documents/' + path + '?key=' + encodeURIComponent(config.apiKey);
  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify({ fields: { checkedAt: { stringValue: new Date().toISOString() } } }),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const body = String(response.getContentText() || '');
  if (status === 200) return true;
  if (/does not exist|datastore\/setup|NOT_FOUND/i.test(body)) {
    throw new Error('이 Firebase 프로젝트에 아직 데이터베이스가 없습니다. Firebase 콘솔 → Firestore Database → 「데이터베이스 만들기」를 먼저 해 주세요.');
  }
  if (status === 403 && /Missing or insufficient permissions/i.test(body)) {
    throw new Error('데이터베이스 규칙이 아직 열려 있지 않습니다. Firebase 콘솔 → Firestore Database → 「규칙」 탭에 이 폴더의 firestore.rules 내용을 붙여넣고 「게시」를 눌러 주세요.');
  }
  if (status === 403 || status === 400) {
    throw new Error('이 Firebase 프로젝트에 연결할 수 없습니다. projectId가 맞는지, Firestore 데이터베이스를 만들었는지 확인해 주세요. (HTTP ' + status + ')');
  }
  console.warn('Firebase 확인 실패: ' + status + ' ' + body.slice(0, 300));
  throw new Error('Firebase에 연결하지 못했습니다 (HTTP ' + status + '). 잠시 뒤 다시 시도해 주세요.');
}

/**
 * 관리자 전용: 붙여넣은 폴더 "안에" '데모버전' 폴더를 만들어 연결합니다. (⚙ 관리 정보 화면)
 */
function createDemoOfficeFolder(parentUrlOrId, adminCode) {
  requireAdmin_(adminCode);
  createDemoFolderIn_(parentUrlOrId);
  return getAdminStatus(adminCode);
}

function createDemoFolderIn_(parentUrlOrId) {
  const parentId = parseDriveFolderId_(parentUrlOrId);
  const runAs = getEffectiveUserEmailSafe_() || '데모를 실행하는 계정';
  let parent;
  try {
    parent = DriveApp.getFolderById(parentId);
  } catch (error) {
    throw new Error(runAs + ' 계정으로는 그 폴더를 열 수 없습니다. 기존 온라인 교무실 폴더를 이 계정에 "편집자"로 공유한 뒤 다시 실행해주세요.');
  }
  if (parent.isTrashed()) {
    throw new Error('"' + parent.getName() + '" 폴더는 휴지통에 있습니다. 지금 쓰는 온라인 교무실 폴더 주소인지 확인해주세요.');
  }
  let demoFolder;
  try {
    demoFolder = getOrCreateChildFolder_(parent, DEMO_FOLDER_NAME);
  } catch (error) {
    throw new Error(runAs + ' 계정에는 "' + parent.getName() + '" 폴더 안에 새 폴더를 만들 권한이 없습니다. 이 계정을 "편집자"로 추가한 뒤 다시 실행해주세요.');
  }
  return connectDemoFolder_(demoFolder);
}

function connectDemoFolder_(demoFolder) {
  storeOfficeFolderId_(demoFolder.getId());
  return {
    id: demoFolder.getId(),
    name: demoFolder.getName(),
    url: demoFolder.getUrl(),
    linkShared: shareFolderByLink_(demoFolder)
  };
}

/**
 * 데모 폴더를 "링크가 있는 모든 사용자 - 뷰어"로 엽니다.
 * 로그인하지 않은 참가자가 올라온 파일을 열어 보려면 필요합니다. 데모 폴더에만 적용하고 상위 폴더는 건드리지 않습니다.
 */
function shareFolderByLink_(folder) {
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (error) {
    console.warn('데모 폴더를 링크 공개로 바꾸지 못했습니다(기관 정책일 수 있음): ' + error);
    return false;
  }
}

function isFolderLinkShared_(folderId) {
  if (!folderId) return false;
  try {
    const access = DriveApp.getFolderById(folderId).getSharingAccess();
    return access === DriveApp.Access.ANYONE_WITH_LINK || access === DriveApp.Access.ANYONE;
  } catch (error) {
    return false;
  }
}

/**
 * 관리자 전용: 데모 폴더를 다시 "링크가 있는 모든 사용자 - 뷰어"로 엽니다.
 */
function shareDemoFolderByLink(adminCode) {
  requireAdmin_(adminCode);
  if (!shareFolderByLink_(getOfficeRootFolder_())) {
    throw new Error('공유 설정을 바꾸지 못했습니다. 기관(교육청) 정책으로 외부 링크 공유가 막혀 있을 수 있습니다. 드라이브에서 폴더 공유를 직접 확인해주세요.');
  }
  return getAdminStatus(adminCode);
}

// 예시 데이터에 붙는 예시 파일. 내용은 모두 꾸며 낸 것입니다.
const DEMO_SAMPLE_FILES = [
  {
    key: 'plan',
    name: '학교교육계획서(예시).pdf',
    title: '학교교육계획서 (예시)',
    lines: [
      '이 문서는 온라인 교무실 데모용으로 만든 예시 파일입니다.',
      '1. 학교 교육 목표: 스스로 배우고 함께 성장하는 학교',
      '2. 중점 교육 활동: 깊이 있는 수업, 학생 자치, 마을 연계 교육',
      '3. 학사 일정: 달력 탭에서 확인합니다.',
      '4. 부서별 업무 분장: 교무부 · 학생부 · 연구정보부 · 행정실'
    ]
  },
  {
    key: 'form',
    name: '교외체험학습 신청서(예시).pdf',
    title: '교외체험학습 신청서 (예시)',
    lines: [
      '이 문서는 온라인 교무실 데모용으로 만든 예시 서식입니다.',
      '학년/반/번호:                이름:',
      '체험학습 기간:      년   월   일 ~    월   일 (  일간)',
      '체험학습 장소 및 내용:',
      '보호자 확인:                (서명)'
    ]
  },
  {
    key: 'vibe',
    name: '바이브코딩 연수 안내(예시).pdf',
    title: '바이브코딩 연수 안내',
    lines: [
      '일시: 2026년 11월 26일(목) 15:00 ~ 16:30',
      '장소: 장흥중학교 SW실',
      '내용: AI와 대화하며 학교 업무 도구 만들기 (업무일지 · 공유 달력 · 온라인 교무실)',
      '준비물: 노트북(또는 SW실 컴퓨터), 구글 계정',
      '지금 보고 계신 이 화면이 연수에서 함께 살펴볼 "업무일지 데모"입니다.'
    ]
  }
];

/**
 * 프런트엔드에서 호출: 예시 파일 정보를 돌려줍니다. 없으면 데모 폴더의 "_예시 자료"에 만들어 둡니다.
 * 이름이 같은 파일이 있으면 다시 만들지 않으므로 여러 번 불러도 파일이 늘지 않습니다.
 * @returns {Object<string,{id:string,name:string,mimeType:string,size:number,url:string}>}
 */
function demoGetSampleFiles() {
  let root;
  try {
    root = getOfficeRootFolder_();
  } catch (error) {
    return {};   // 데모 폴더가 아직 연결되지 않음 → 예시 자료는 파일 없이 제목·설명만 들어갑니다.
  }

  const lock = LockService.getScriptLock();
  let locked = false;
  try { locked = lock.tryLock(20000); } catch (error) { locked = false; }
  const result = {};
  try {
    const folder = getOrCreateChildFolder_(root, DEMO_SAMPLE_FOLDER_NAME);
    DEMO_SAMPLE_FILES.forEach(function(sample) {
      try {
        let file = null;
        const found = folder.getFilesByName(sample.name);
        while (found.hasNext()) {
          const candidate = found.next();
          if (!candidate.isTrashed()) { file = candidate; break; }
        }
        if (!file) {
          const pdf = Utilities.newBlob(buildSampleHtml_(sample), 'text/html', 'sample.html').getAs('application/pdf');
          pdf.setName(sample.name);
          file = folder.createFile(pdf);
        }
        result[sample.key] = {
          id: file.getId(),
          name: file.getName(),
          mimeType: 'application/pdf',
          size: file.getSize(),
          url: 'https://drive.google.com/file/d/' + file.getId() + '/view'
        };
      } catch (error) {
        console.warn('예시 파일을 준비하지 못했습니다(' + sample.name + '): ' + error);
      }
    });
  } catch (error) {
    console.warn('예시 자료 폴더를 준비하지 못했습니다: ' + error);
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (error) { /* ignore */ } }
  }
  return result;
}

function buildSampleHtml_(sample) {
  const escape = function(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  return '<html><head><meta charset="UTF-8"></head><body style="font-family: sans-serif; padding: 40px;">'
    + '<h1 style="font-size: 22pt; border-bottom: 2px solid #1E3A8A; padding-bottom: 8px;">' + escape(sample.title) + '</h1>'
    + sample.lines.map(function(line) { return '<p style="font-size: 12pt; line-height: 1.8;">' + escape(line) + '</p>'; }).join('')
    + '<p style="font-size: 9pt; color: #888; margin-top: 60px;">학교 업무일지 데모 · 예시 자료</p>'
    + '</body></html>';
}

/**
 * 관리자 전용: "데모 데이터 초기화"를 누르면 먼저 호출됩니다.
 * 서버에 있는 시간표 설정을 기본 상태로 되돌리고, 예시 파일 정보를 돌려줍니다.
 */
function demoPrepareReset(adminCode) {
  requireAdmin_(adminCode);

  let configs = [];
  const defaultUrl = getConfig_('DEMO_TIMETABLE_SHEET_URL');
  if (defaultUrl) {
    try {
      configs = [buildDefaultTimetableConfig_(defaultUrl)];
    } catch (error) {
      console.warn('기본 시간표 주소(DEMO_TIMETABLE_SHEET_URL)를 쓸 수 없습니다: ' + error);
    }
  }
  writeTimetableConfigs_(configs);

  return {
    ok: true,
    sampleFiles: demoGetSampleFiles(),
    timetableConfigCount: configs.length,
    resetAt: new Date().toISOString()
  };
}

function buildDefaultTimetableConfig_(sheetUrl) {
  const now = new Date();
  const month = Number(Utilities.formatDate(now, 'Asia/Seoul', 'M'));
  const year = Number(Utilities.formatDate(now, 'Asia/Seoul', 'yyyy'));
  const schoolYear = month >= 3 ? year : year - 1;
  const firstSemester = month >= 3 && month <= 8;
  return normalizeTimetableConfigPayload_({
    id: 'demo-default',
    label: schoolYear + '학년도 ' + (firstSemester ? '1' : '2') + '학기',
    startDate: firstSemester ? schoolYear + '-03-01' : schoolYear + '-09-01',
    endDate: firstSemester ? schoolYear + '-08-31' : (schoolYear + 1) + '-02-28',
    sheetUrl: sheetUrl
  }, '데모 기본값');
}
