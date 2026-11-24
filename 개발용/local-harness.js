// 업무일지 데모버전 로컬 점검 도구 (앱스 스크립트에 붙여넣는 파일이 아닙니다)
// - code.gs 를 Node vm 에서 그대로 실행하고, 구글 서비스(PropertiesService·DriveApp 등)는 메모리 모형으로 대신합니다.
// - index.html 의 <?!= bootJson ?> 자리를 code.gs 의 getBootJson_() 결과로 채우고,
//   google.script.run 대역을 끼워 /gas 로 서버 함수를 부릅니다.
// - Firestore 는 화면이 고른 실제 프로젝트(기본: 공용 체험 DB school-worklog-demo의 "SCRIPT_ID" 칸)에 연결됩니다.
// - 나이스·Firestore REST 는 실제로 호출하고(curl), Gemini 는 모의 응답을 돌려줍니다.
//
// 실행:  node 개발용/local-harness.js        → http://localhost:8765
//   ?as=admin  배포 계정으로 로그인한 상태 / ?as=anon  로그인 안 한 참가자(기본)
// 환경 변수: PORT, HARNESS_PROPS(처음 스크립트 속성 JSON, 예: {"DEMO_ADMIN_CODE":"demo-pass"})
// 상태 보기: /__state   설정 바꾸기: /__set?ai=busy|ok, /__set?prop=KEY&value=V, /__set?delprop=KEY
const vm = require('vm');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8765);
const OWNER = 'deployer@example.com';   // 모의 배포 계정
const TEMPLATE_ID = '1xjy8TmTk30SvYeOg5bgU8GkqTMtdWAav480PJBlRiNY';
const EXISTING_OFFICE_ID = 'EXISTINGOFFICEFOLDER123';

// ---------- 상태(요청 사이에 유지) ----------
const scriptProps = JSON.parse(process.env.HARNESS_PROPS || '{}');
const cacheStore = new Map();
const triggers = [];
const calls = [];           // 호출 기록 (검증용)
let aiMode = 'ok';          // 'ok' | 'busy'

// ---------- 드라이브 모형 ----------
const nodes = new Map();
let seq = 1000;
function newId(prefix) { seq += 1; return `${prefix}_${seq}_abcdefghij`; }
function addNode(node) { nodes.set(node.id, node); return node; }
addNode({ id: 'SCRIPT_ID', type: 'file', name: '업무일지 데모', parent: null, owner: OWNER, trashed: false, size: 1 });
addNode({ id: TEMPLATE_ID, type: 'file', name: '계획시트 기본틀', parent: null, owner: OWNER, trashed: false, size: 1 });
addNode({ id: EXISTING_OFFICE_ID, type: 'folder', name: '2026 온라인 교무실(기존)', parent: null, owner: 'teacher@example.org', trashed: false, sharing: 'PRIVATE' });
addNode({ id: 'TRASHEDFOLDER12345', type: 'folder', name: '옛 폴더', parent: null, owner: OWNER, trashed: true, sharing: 'PRIVATE' });

function iter(list) {
  let i = 0;
  return { hasNext: () => i < list.length, next: () => list[i++] };
}
function wrap(node) {
  return node.type === 'folder' ? new FolderMock(node) : new FileMock(node);
}
class BaseMock {
  constructor(node) { this.n = node; }
  getId() { return this.n.id; }
  getName() { return this.n.name; }
  isTrashed() { return !!this.n.trashed; }
  setTrashed(v) { this.n.trashed = !!v; return this; }
  getOwner() { return this.n.owner ? { getEmail: () => this.n.owner } : null; }
  setSharing(access, permission) { this.n.sharing = access; this.n.permission = permission; return this; }
  getSharingAccess() { return this.n.sharing || 'PRIVATE'; }
}
class FolderMock extends BaseMock {
  getUrl() { return 'https://drive.google.com/drive/folders/' + this.n.id; }
  children(type) { return [...nodes.values()].filter(c => c.parent === this.n.id && c.type === type); }
  getFoldersByName(name) { return iter(this.children('folder').filter(c => c.name === name).map(wrap)); }
  getFilesByName(name) { return iter(this.children('file').filter(c => c.name === name).map(wrap)); }
  getFiles() { return iter(this.children('file').map(wrap)); }
  createFolder(name) { return wrap(addNode({ id: newId('FOLDER'), type: 'folder', name, parent: this.n.id, owner: OWNER, trashed: false, sharing: 'PRIVATE' })); }
  createFile(a, b, c) {
    if (a && typeof a === 'object' && a.__blob) {
      return wrap(addNode({ id: newId('FILE'), type: 'file', name: a.name, parent: this.n.id, owner: OWNER, trashed: false, size: a.bytes.length, mime: a.type }));
    }
    return wrap(addNode({ id: newId('FILE'), type: 'file', name: a, parent: this.n.id, owner: OWNER, trashed: false, size: Buffer.byteLength(String(b)), mime: c, content: String(b) }));
  }
}
class FileMock extends BaseMock {
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.n.id + '/edit'; }
  getSize() { return this.n.size || 0; }
  setContent(text) { this.n.content = String(text); return this; }
  makeCopy(name, folder) {
    return wrap(addNode({ id: newId('COPY'), type: 'file', name, parent: folder ? folder.getId() : null, owner: OWNER, trashed: false, size: 1 }));
  }
}
const DriveApp = {
  Access: { ANYONE: 'ANYONE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', PRIVATE: 'PRIVATE' },
  Permission: { VIEW: 'VIEW', EDIT: 'EDIT' },
  getFolderById(id) {
    const node = nodes.get(id);
    if (!node || node.type !== 'folder') throw new Error('No item with the given ID could be found.');
    return wrap(node);
  },
  getFileById(id) {
    const node = nodes.get(id);
    if (!node || node.type !== 'file') throw new Error('No item with the given ID could be found.');
    return wrap(node);
  },
  createFolder(name) { return wrap(addNode({ id: newId('FOLDER'), type: 'folder', name, parent: null, owner: OWNER, trashed: false, sharing: 'PRIVATE' })); }
};

// ---------- 스프레드시트 모형(무엇을 불러도 통과) ----------
function universal(overrides = {}) {
  const target = function () {};
  const proxy = new Proxy(target, {
    get(_, prop) {
      if (prop in overrides) return overrides[prop];
      if (prop === 'then') return undefined;
      return (...args) => proxy;
    },
    apply() { return proxy; }
  });
  return proxy;
}
function sheetMock(name) {
  return universal({
    getName: () => name,
    getBackgrounds: () => [['#fff', '#fff', '#fff', '#fff']],
    getFontColors: () => [['#000', '#000', '#000', '#000']],
    getRowHeight: () => 21
  });
}
const SpreadsheetApp = {
  CopyPasteType: { PASTE_NORMAL: 'PASTE_NORMAL' },
  flush() {},
  openById(id) {
    return universal({
      getId: () => id,
      getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
      getSheets: () => [sheetMock('월중계획'), sheetMock('주간계획')]
    });
  }
};

// ---------- UrlFetchApp ----------
const uploads = new Map();
function response(code, body, headers = {}) {
  return { getResponseCode: () => code, getContentText: () => body, getHeaders: () => headers };
}
function realFetch(url, options = {}) {
  const args = ['-s', '-L', '--max-time', '25', '-w', '\n%{http_code}'];
  const method = String(options.method || 'get').toUpperCase();
  if (method !== 'GET') args.push('-X', method);
  if (options.contentType) args.push('-H', 'Content-Type: ' + options.contentType);
  if (options.payload !== undefined) args.push('--data-binary', String(options.payload));
  args.push(url);
  const out = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const cut = out.lastIndexOf('\n');
  return response(Number(out.slice(cut + 1)), out.slice(0, cut));
}
const UrlFetchApp = {
  fetch(url, options = {}) {
    if (url.includes('generativelanguage.googleapis.com') && /\/models\?/.test(url)) {
      // 키 확인용 모델 목록: AIza 로 시작하는 30자 이상이면 통과로 봅니다(모의).
      const key = decodeURIComponent((/[?&]key=([^&]+)/.exec(url) || [])[1] || '');
      calls.push({ type: 'geminiKeyCheck' });
      return /^AIza[A-Za-z0-9_-]{26,}$/.test(key) ? response(200, '{"models":[]}') : response(400, '{"error":{"status":"INVALID_ARGUMENT"}}');
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      calls.push({ type: 'gemini', url: url.replace(/key=.*/, 'key=***') });
      if (aiMode === 'busy') return response(429, '{"error":"rate"}');
      const prompt = JSON.parse(options.payload).contents[0].parts[0].text;
      const today = new Date().toISOString().slice(0, 10);
      const text = prompt.includes('달력 일정 JSON')
        ? JSON.stringify({ events: [{ startDate: today, endDate: today, startTime: '16:00', endTime: '17:00', description: '[AI 입력 테스트] 교직원 회의', target: '전 교직원', eventLocation: '교무실', taskManager: '테스트', department: '교무부', isExternal: false, includeInMonthlyPlan: false }] })
        : '(모의 AI 응답) 요청하신 내용을 요약했습니다. 프롬프트 길이 ' + prompt.length + '자.';
      return response(200, JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
    }
    if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files')) {
      const meta = JSON.parse(options.payload);
      const id = crypto.randomUUID();
      uploads.set(id, { meta, received: 0, size: Number(options.headers['X-Upload-Content-Length']) });
      calls.push({ type: 'uploadStart', name: meta.name, parent: meta.parents[0] });
      return response(200, '', { Location: 'https://upload.mock/session/' + id });
    }
    if (url.startsWith('https://upload.mock/session/')) {
      const session = uploads.get(url.split('/').pop());
      const range = options.headers['Content-Range'];
      const match = /bytes (\d+)-(\d+)\/(\d+)/.exec(range);
      if (match) session.received = Number(match[2]) + 1;
      if (session.received >= session.size) {
        const node = addNode({ id: newId('UPLOADED'), type: 'file', name: session.meta.name, parent: session.meta.parents[0], owner: OWNER, trashed: false, size: session.size, mime: session.meta.mimeType });
        return response(200, JSON.stringify({ id: node.id, name: node.name, mimeType: node.mime, size: String(node.size) }));
      }
      return response(308, '', session.received ? { Range: 'bytes=0-' + (session.received - 1) } : {});
    }
    return realFetch(url, options);
  }
};

// ---------- 그 밖의 서비스 ----------
function buildSandbox(activeEmail) {
  const PropertiesService = {
    getScriptProperties: () => ({
      getProperties: () => ({ ...scriptProps }),
      getProperty: (k) => (k in scriptProps ? scriptProps[k] : null),
      setProperty: (k, v) => { scriptProps[k] = String(v); },
      setProperties: (obj, deleteAllOthers) => { if (deleteAllOthers) Object.keys(scriptProps).forEach(k => delete scriptProps[k]); Object.keys(obj).forEach(k => { scriptProps[k] = String(obj[k]); }); },
      deleteProperty: (k) => { delete scriptProps[k]; }
    }),
    getUserProperties: () => ({ getProperty: () => null, setProperty() {}, deleteProperty() {} })
  };
  const CacheService = {
    getScriptCache: () => ({
      get(k) { const e = cacheStore.get(k); if (!e) return null; if (e.exp < Date.now()) { cacheStore.delete(k); return null; } return e.value; },
      put(k, v, seconds) { cacheStore.set(k, { value: String(v), exp: Date.now() + (seconds || 600) * 1000 }); },
      remove(k) { cacheStore.delete(k); }
    })
  };
  const Utilities = {
    DigestAlgorithm: { MD5: 'md5' },
    Charset: { UTF_8: 'utf8' },
    getUuid: () => crypto.randomUUID(),
    computeDigest: (algo, text) => [...crypto.createHash('md5').update(String(text), 'utf8').digest()].map(b => (b > 127 ? b - 256 : b)),
    base64Decode: (text) => [...Buffer.from(String(text), 'base64')],
    formatDate(date, tz, format) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(p => [p.type, p.value]));
      return format.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day).replace(/^M$/, String(Number(parts.month)));
    },
    newBlob(data, type, name) {
      const blob = { __blob: true, bytes: Buffer.from(String(data)), type, name };
      blob.getAs = (mime) => { const out = Utilities.newBlob('%PDF-mock ' + data, mime, name); return out; };
      blob.setName = (n) => { blob.name = n; return blob; };
      return blob;
    }
  };
  const ScriptApp = {
    getScriptId: () => 'SCRIPT_ID',
    getOAuthToken: () => 'mock-token',
    getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/DEMO_DEPLOYMENT/exec' }),
    getProjectTriggers: () => triggers.map(t => ({ getHandlerFunction: () => t.handler, __t: t })),
    deleteTrigger: (trigger) => { const i = triggers.indexOf(trigger.__t); if (i >= 0) triggers.splice(i, 1); },
    newTrigger: (handler) => universal({ create: () => { triggers.push({ handler }); } })
  };
  // newTrigger(...).timeBased().everyDays(1)...create() : 마지막 create 가 기록하도록 체인 전체에 create 를 둡니다.
  ScriptApp.newTrigger = (handler) => {
    const chain = universal({ create: () => { triggers.push({ handler }); } });
    return chain;
  };
  return {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    PropertiesService, CacheService, Utilities, ScriptApp, DriveApp, SpreadsheetApp, UrlFetchApp,
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    Session: {
      getActiveUser: () => ({ getEmail: () => activeEmail }),
      getEffectiveUser: () => ({ getEmail: () => OWNER })
    },
    HtmlService: {}
  };
}

function runGas(fn, args, as, internal = false) {
  // 끝이 _ 인 함수는 GAS 에서도 화면에서 부를 수 없습니다(internal 은 하네스 자신이 doGet 대신 부를 때만).
  if (!internal && !/^[A-Za-z][A-Za-z0-9]*$/.test(fn)) throw new Error('호출할 수 없는 함수: ' + fn);
  const context = vm.createContext(buildSandbox(as === 'admin' ? OWNER : ''));
  vm.runInContext(fs.readFileSync(ROOT + '/code.gs', 'utf8'), context, { filename: 'code.gs' });
  if (typeof context[fn] !== 'function') throw new Error('Script function not found: ' + fn);
  const result = context[fn](...args);
  return result === undefined ? null : JSON.parse(JSON.stringify(result));
}

const SHIM = `<script>
(function () {
  var as = new URLSearchParams(location.search).get('as') || 'anon';
  function runner(success, failure) {
    return new Proxy({}, { get: function (_, prop) {
      if (prop === 'withSuccessHandler') return function (fn) { return runner(fn, failure); };
      if (prop === 'withFailureHandler') return function (fn) { return runner(success, fn); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        fetch('/gas?as=' + as, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: prop, args: args }) })
          .then(function (r) { return r.json(); })
          .then(function (res) { if (res.ok) { if (success) success(res.result); } else if (failure) failure(new Error(res.error)); })
          .catch(function (err) { if (failure) failure(err); });
      };
    } });
  }
  window.google = { script: { run: runner(null, null), host: { origin: location.origin, base: '' } } };
})();
</script>`;

function readBody(req) {
  return new Promise((resolve) => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      const boot = runGas('getBootJson_', [], url.searchParams.get('as'), true);
      const html = fs.readFileSync(ROOT + '/index.html', 'utf8')
        .replace('<?!= bootJson ?>', () => boot)
        .replace('<head>', '<head>' + SHIM);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    } else if (req.method === 'POST' && url.pathname === '/gas') {
      const { fn, args } = JSON.parse(await readBody(req));
      calls.push({ type: 'gas', fn, as: url.searchParams.get('as') });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      try {
        res.end(JSON.stringify({ ok: true, result: runGas(fn, args || [], url.searchParams.get('as')) }));
      } catch (error) {
        res.end(JSON.stringify({ ok: false, error: String(error && error.message ? error.message : error) }));
      }
    } else if (url.pathname === '/__state') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ scriptProps: { ...scriptProps, GEMINI_API_KEY: '***' }, nodes: [...nodes.values()].map(n => ({ id: n.id, type: n.type, name: n.name, parent: n.parent, sharing: n.sharing, trashed: n.trashed, size: n.size })), triggers, calls: calls.slice(-80) }, null, 1));
    } else if (url.pathname === '/__set') {
      if (url.searchParams.has('ai')) aiMode = url.searchParams.get('ai');
      if (url.searchParams.has('prop')) scriptProps[url.searchParams.get('prop')] = url.searchParams.get('value') || '';
      if (url.searchParams.has('delprop')) delete scriptProps[url.searchParams.get('delprop')];
      res.writeHead(200); res.end('ok');
    } else {
      res.writeHead(404); res.end('not found');
    }
  } catch (error) {
    res.writeHead(500); res.end(String(error && error.stack ? error.stack : error));
  }
}).listen(PORT, () => console.log('demo harness on http://localhost:' + PORT));

module.exports = { runGas };
