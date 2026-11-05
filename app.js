(() => {
  'use strict';

  const APP_VERSION = '6.3.1';
  const STORAGE_KEY = 'score-atlas-v6';
  const DB_NAME = 'score-atlas-fenji';
  const DB_STORE = 'app-state';
  const DB_VERSION = 1;
  const THEME_KEY = 'fenji-theme-preference';
  let storageMode = 'initializing';
  let activeDatabase = null;
  let storageWarning = '';
  let didMigrateLegacy = false;
  let lastWarningAt = 0;
  const LEGACY_STORAGE_KEYS = ['score-atlas-v5','score-atlas-v4','score-atlas-v3'];
  const PALETTE = ['#EAF5FF','#E8FFF7','#FFF4D8','#F0E9FF','#E6FBFD','#FFEAF4','#FFF0E7','#F4E9FF','#EBFAF5','#FFF7DF','#EAF0FF','#FDECF0'];
  const DARK_PALETTE = ['#43A5F5','#00D6A0','#FFB800','#9B72F2','#20C7D9','#F35FA7','#FF8A3D','#FF5C5C','#C793FF'];
  const PAGE_META = {
    home: ['走向','把每一次考试，连成看得见的进步。'],
    scores: ['成绩','完整记录每一次得分，支持筛选、编辑和回看。'],
    trends: ['趋势','从进退步、稳定度与高低点读懂学习节奏。'],
    exam: ['中考预备','按近期表现换算目标分值，并保存每一次总分估算。'],
    profile: ['我的','管理数据、分层标准与学科设置。']
  };


  // 2026 长宁区升学定位库。
  // 普高：长宁区现有高中名单 + 2026 统一招生（1—15志愿）最低录取线。
  // 中职：长宁区属上海市现代职业技术学校，采用上海市教育考试院公布的
  // 2026 中本贯通 / 中高职贯通专业最低录取线；普通中专 300 分为市级控制线，非校线。
  const CHANGNING_SCHOOL_TARGETS = [
    {id:'hs_yanan',kind:'high',school:'上海市延安中学',short:'延安中学',cutoff:694,level:'市实验性示范性高中',code:'052002',lineType:'2026 统一招生线'},
    {id:'hs_fudan',kind:'high',school:'上海市复旦中学',short:'复旦中学',cutoff:690,level:'市实验性示范性高中',code:'053004',lineType:'2026 统一招生线'},
    {id:'hs_girls3',kind:'high',school:'上海市第三女子中学',short:'市三女中',cutoff:685.5,level:'市实验性示范性高中',code:'052001',lineType:'2026 统一招生线'},
    {id:'hs_tianshan',kind:'high',school:'华东师范大学附属天山学校',short:'华师天山',cutoff:662.5,level:'区实验性示范性高中',code:'053003',lineType:'2026 统一招生线'},
    {id:'hs_jianqing',kind:'high',school:'上海市建青实验学校',short:'建青实验',cutoff:653,level:'区实验性示范性高中',code:'053005',lineType:'2026 统一招生线'},
    {id:'hs_huazheng',kind:'high',school:'华东政法大学附属中学',short:'华政附中',cutoff:645,level:'区实验性示范性高中 / 市特色普通高中',code:'054013',lineType:'2026 统一招生线'},
    {id:'hs_xianxia',kind:'high',school:'上海市仙霞高级中学',short:'仙霞高级',cutoff:635.5,level:'区实验性示范性高中',code:'054030',lineType:'2026 统一招生线'},
    {id:'hs_xijiao',kind:'high',school:'上海市西郊学校',short:'西郊学校',cutoff:616,level:'普通高中',code:'054010',lineType:'2026 统一招生线'},
    {id:'hs_xinhongqiao',kind:'high',school:'上海市民办新虹桥中学',short:'民办新虹桥',cutoff:503,level:'民办普通高中',code:'054043',lineType:'2026 统一招生线'},
    {id:'voc_bachelor_auto',kind:'vocational',school:'上海市现代职业技术学校',short:'现代汽服',program:'汽车服务工程',path:'中本贯通',college:'上海师范大学天华学院',cutoff:621,code:'413401',lineType:'2026 中本贯通专业线'},
    {id:'voc_airport',kind:'vocational',school:'上海市现代职业技术学校',short:'现代机场',program:'机场运行服务与管理',path:'中高职贯通',college:'上海民航职业技术学院',cutoff:555.5,code:'413502',lineType:'2026 中高职贯通专业线'},
    {id:'voc_aviation',kind:'vocational',school:'上海市现代职业技术学校',short:'现代航空',program:'航空物流管理',path:'中高职贯通',college:'上海民航职业技术学院',cutoff:545.5,code:'413503',lineType:'2026 中高职贯通专业线'},
    {id:'voc_game',kind:'vocational',school:'上海市现代职业技术学校',short:'现代游戏',program:'游戏艺术设计',path:'中高职贯通',college:'上海思博职业技术学院',cutoff:495,code:'413504',lineType:'2026 中高职贯通专业线'},
    {id:'voc_newenergy',kind:'vocational',school:'上海市现代职业技术学校',short:'现代新汽',program:'新能源汽车技术',path:'中高职贯通',college:'上海济光职业技术学院',cutoff:484,code:'413501',lineType:'2026 中高职贯通专业线'},
    {id:'voc_ad',kind:'vocational',school:'上海市现代职业技术学校',short:'现代广告',program:'广告艺术设计',path:'中高职贯通',college:'上海思博职业技术学院',cutoff:477.5,code:'413505',lineType:'2026 中高职贯通专业线'},
    {id:'voc_regular_control',kind:'vocational',school:'上海市现代职业技术学校',short:'普通中专控制线',program:'普通中专',path:'统一招生参考',college:'',cutoff:300,code:'413',lineType:'2026 上海普通中专最低投档控制线',isControl:true}
  ];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const round = (n, digits = 1) => Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
  const esc = (value='') => String(value).replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
  const uid = (prefix='id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const todayISO = () => new Date().toISOString().slice(0,10);
  const fmtDate = (dateStr, short=false) => {
    if (!dateStr) return '—';
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return short ? `${d.getMonth()+1}/${d.getDate()}` : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const fmtDateTime = (ts) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };
  const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
  const stddev = arr => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a,b)=>a + (b-m)**2,0)/arr.length);
  };

  function dateDaysAgo(days, offset=0) {
    const d = new Date();
    d.setHours(12,0,0,0);
    d.setDate(d.getDate() - days + offset);
    return d.toISOString().slice(0,10);
  }


  function buildShanghaiExamScheme() {
    const now=Date.now();
    return [
      {id:'sh_chinese',label:'语文',group:'语数外',subjectId:'chinese',max:150,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_math',label:'数学',group:'语数外',subjectId:'math',max:150,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_english_written',label:'外语笔试',group:'外语',subjectId:'english',max:140,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_english_speaking',label:'外语听说',group:'外语',subjectId:'listening',max:10,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_politics_exam',label:'道德与法治统一考试',group:'道法',subjectId:'politics',max:30,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_politics_daily',label:'道德与法治日常考核',group:'道法',subjectId:null,max:30,mode:'manual',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_history_exam',label:'历史统一考试',group:'历史',subjectId:'history',max:30,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_history_daily',label:'历史日常考核',group:'历史',subjectId:null,max:30,mode:'manual',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_sport_daily',label:'体育日常考核',group:'体育',subjectId:null,max:15,mode:'manual',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_sport_test',label:'体育统一测试',group:'体育',subjectId:null,max:15,mode:'manual',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_physics',label:'物理试题',group:'综合测试',subjectId:'physics',max:70,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_chemistry',label:'化学试题',group:'综合测试',subjectId:'chemistry',max:50,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_cross',label:'跨学科案例分析',group:'综合测试',subjectId:'cross',max:15,mode:'auto',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_physics_lab',label:'物理实验操作',group:'综合测试',subjectId:null,max:10,mode:'manual',manual:null,manualUpdatedAt:0,official:true},
      {id:'sh_chemistry_lab',label:'化学实验操作',group:'综合测试',subjectId:null,max:5,mode:'manual',manual:null,manualUpdatedAt:0,official:true}
    ];
  }

  function buildDefaultState() {
    // Public GitHub Pages release intentionally starts empty: never publish private grades.
    // Existing browser data and user-imported backups are still supported.
    const subjectDefs = [
      ['chinese','语文'],['math','数学'],['english','英语'],['physics','物理'],['chemistry','化学'],
      ['politics','道德与法治'],['history','历史'],['listening','听说'],['cross','跨学科']
    ];
    const subjects = subjectDefs.map(([id,name],i)=>({id,name,color:PALETTE[i],dark:DARK_PALETTE[i]}));
    const records = [];

    const examScheme = buildShanghaiExamScheme();
    const initialExamVersions = {};
    examScheme.forEach(e => {
      if (e.mode === 'auto' && e.subjectId) {
        const latest = records.filter(r=>r.subjectId===e.subjectId).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt).at(-1);
        initialExamVersions[e.id] = latest?.id || `manual:${e.manualUpdatedAt||0}:${e.manual??''}`;
      } else initialExamVersions[e.id] = `manual:${e.manualUpdatedAt||0}:${e.manual??''}`;
    });
    return {
      version:APP_VERSION,
      createdAt:Date.now(),
      sourceInfo:null,
      subjects,records,
      settings:{tiers:{excellent:90,good:80,normal:70,pass:60},subjectTiers:{},recentWindow:3,volatilityWindow:5,homeSubject:'math',chartSpacing:'date',theme:'dark'},
      exam:{standard:'shanghai-2026',recentWindow:3,scheme:examScheme,snapshots:[],schoolView:'high',schoolTargetId:'hs_yanan'}
    };
  }

  let state;
  let currentPage = 'home';
  let scoreFilter = 'all';
  let scoreSearch = '';
  let trendSort = 'default';
  let trendMetric = 'recent';
  let homeConstellationMetric = 'recentAvg';
  let examExistingOpen = false;
  let modalScrollRestore = null;
  let modalCloseTimer = null;


  function resolvedTheme(pref=state?.settings?.theme||'system') {
    if(pref==='dark'||pref==='light') return pref;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  function applyTheme(pref=state?.settings?.theme||'system',persist=false) {
    const safe=['light','dark','system'].includes(pref)?pref:'system';
    if(state?.settings) state.settings.theme=safe;
    const actual=resolvedTheme(safe);
    document.documentElement.dataset.theme=actual;
    document.documentElement.dataset.themePref=safe;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.content=actual==='dark'?'#18191B':'#F5F6F8';
    // Only the small non-sensitive theme preference uses localStorage.
    try { localStorage.setItem(THEME_KEY,safe); } catch (_) {}
    if(persist) saveState({autoSnapshot:false});
  }
  function setTheme(pref) { applyTheme(pref,true); if(currentPage==='home'){const subject=getSubject(state.settings.homeSubject);requestAnimationFrame(()=>drawLineChart($('#homeChart'),subject?recordsFor(subject.id):[],state.settings.chartSpacing,subject?.dark||'#43A5F5'));} }
  function cycleTheme() { setTheme(resolvedTheme()==='dark'?'light':'dark'); }

  // Primary storage: IndexedDB. A single transaction stores the complete
  // settings/subjects/grades/snapshot state; no multi-store partial updates.
  function openIndexedDatabase() {
    return new Promise((resolve,reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB 不受支持')); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('无法打开 IndexedDB'));
      request.onblocked = () => reject(new Error('IndexedDB 升级被其他页面阻止，请关闭旧标签页'));
    });
  }

  function readIndexedState(db) {
    return new Promise((resolve,reject) => {
      const transaction = db.transaction(DB_STORE,'readonly');
      const request = transaction.objectStore(DB_STORE).get(STORAGE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB 读取失败'));
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB 读取事务失败'));
    });
  }

  function writeIndexedState(db, snapshot) {
    return new Promise((resolve,reject) => {
      // Create the transaction synchronously: browser will serialize writes
      // on this object store in the same order as user actions.
      const transaction = db.transaction(DB_STORE,'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB 写入失败'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB 写入被取消'));
      transaction.objectStore(DB_STORE).put(snapshot,STORAGE_KEY);
    });
  }

  function readLegacyState() {
    // Read-only migration: never delete the user's previous localStorage copy.
    // Corrupt newer entries must not prevent recovery from older keys.
    for (const key of [STORAGE_KEY,...LEGACY_STORAGE_KEYS]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.records) || !Array.isArray(parsed.subjects)) continue;
        return normalizeState(parsed);
      } catch (err) { console.warn(`旧存储 ${key} 无法解析，继续查找备份`,err); }
    }
    return null;
  }

  async function loadState() {
    let legacy = null;
    try {
      const db = await openIndexedDatabase();
      activeDatabase = db;
      db.onversionchange = () => {
        db.close();
        activeDatabase = null;
        storageMode = 'unavailable';
        storageWarning = '本地数据库已被其他页面升级，请重新打开应用并导出备份';
        showStorageWarning();
      };
      // Existing IndexedDB is authoritative. Never overwrite it with stale
      // localStorage data after an upgrade, or after a deliberate reset.
      const saved = await readIndexedState(db);
      if (saved !== undefined) {
        if (!saved || !Array.isArray(saved.records) || !Array.isArray(saved.subjects)) {
          throw new Error('IndexedDB 内的数据格式不正确，请先导出备份');
        }
        storageMode = 'indexeddb';
        return normalizeState(saved);
      }
      legacy = readLegacyState();
      const initial = legacy || buildDefaultState();
      // Mark migration complete only after the IndexedDB commit succeeds.
      await writeIndexedState(db, initial);
      didMigrateLegacy = !!legacy;
      storageMode = 'indexeddb';
      return initial;
    } catch (err) {
      console.error('IndexedDB 初始化失败，尝试兼容存储',err);
      activeDatabase?.close();
      activeDatabase = null;
      storageMode = 'localStorage';
      storageWarning = 'IndexedDB 无法访问，已临时使用容量较小的 localStorage，请及时导出 JSON 备份';
      return legacy || readLegacyState() || buildDefaultState();
    }
  }

  function showStorageWarning() {
    if (!storageWarning || !state || Date.now()-lastWarningAt < 15000) return;
    lastWarningAt = Date.now();
    toast(storageWarning, 'error');
    const note = document.querySelector('.storage-indicator small');
    if (note) note.textContent = storageWarning;
  }

  function refreshStorageIndicator() {
    const headline = document.querySelector('.storage-indicator strong');
    const subline = document.querySelector('.storage-indicator small');
    if (headline) headline.textContent = storageMode==='indexeddb'?'IndexedDB 本地存储':'本地存储降级';
    if (subline) subline.textContent = storageMode==='indexeddb'
      ? '成绩和设置保存在本设备 IndexedDB；请定期导出 JSON 备份'
      : 'IndexedDB 不可用，建议立即导出 JSON 备份';
  }

  function normalizeState(input) {
    const fallback = buildDefaultState();
    if (!input || typeof input !== 'object') return fallback;
    const merged = {
      ...fallback,
      ...input,
      settings:{...fallback.settings,...(input.settings||{}),tiers:{...fallback.settings.tiers,...(input.settings?.tiers||{})},subjectTiers:{...(input.settings?.subjectTiers||{})}},
      exam:{...fallback.exam,...(input.exam||{})}
    };
    merged.subjects = Array.isArray(input.subjects) && input.subjects.length ? [...input.subjects] : fallback.subjects;
    if (!merged.subjects.some(s=>s.id==='listening'||s.name==='听说'||s.name==='外语听说')) {
      const i=merged.subjects.length;
      merged.subjects=[...merged.subjects,{id:'listening',name:'听说',color:PALETTE[i%PALETTE.length],dark:DARK_PALETTE[i%DARK_PALETTE.length]}];
    }
    if (!merged.subjects.some(s=>s.id==='cross'||s.name==='跨学科')) {
      const i=merged.subjects.length; merged.subjects.push({id:'cross',name:'跨学科',color:PALETTE[i%PALETTE.length],dark:DARK_PALETTE[i%DARK_PALETTE.length]});
    }
    merged.records = Array.isArray(input.records) ? input.records.map(r=>({...r,fullMark:Number(r.fullMark),score:Number(r.score)})).filter(validRecord) : fallback.records;
    const legacyExam = !input.exam?.standard;
    merged.exam.standard = legacyExam ? 'shanghai-2026' : input.exam.standard;
    merged.exam.scheme = legacyExam ? buildShanghaiExamScheme() : (Array.isArray(input.exam?.scheme) && input.exam.scheme.length ? input.exam.scheme : fallback.exam.scheme);
    const pendingByDefaultIds=new Set(['sh_english_speaking','sh_politics_daily','sh_history_daily','sh_sport_daily','sh_sport_test','sh_cross','sh_physics_lab','sh_chemistry_lab']);
    const legacySeedManual={sh_english_speaking:8.5,sh_politics_daily:28,sh_history_daily:27,sh_sport_daily:14,sh_sport_test:13,sh_cross:12.5,sh_physics_lab:9,sh_chemistry_lab:4.5};
    const stateCreatedAt=Number(input.createdAt||merged.createdAt||0);
    merged.exam.scheme=merged.exam.scheme.map(entry=>{
      const next={...entry};
      // v5 once shipped illustrative "ordinary" scores for manual Shanghai items.
      // Treat those exact pre-creation timestamps as seed data, not user records.
      const updatedAt=Number(next.manualUpdatedAt||0), seed=legacySeedManual[next.id];
      const isLegacySeed=Number.isFinite(seed)&&Number(next.manual)===seed&&stateCreatedAt>0&&updatedAt>0&&updatedAt<stateCreatedAt&&(stateCreatedAt-updatedAt)<=7*86400000;
      // 数据迁移只清理明确来自 v5 的示例种子；用户已保存的分数永不重新清空。
      if(pendingByDefaultIds.has(next.id) && isLegacySeed && String(input.version||'').startsWith('5.')){next.manual=null;next.manualUpdatedAt=0;}
      return next;
    });
    const speakingEntry=merged.exam.scheme.find(e=>e.id==='sh_english_speaking');
    if (speakingEntry && !speakingEntry.subjectId) speakingEntry.subjectId='listening';
    if (speakingEntry && recordsForState(merged,'listening').length && speakingEntry.mode==='manual' && (speakingEntry.manual==null||speakingEntry.manual==='') && String(input.version||'').startsWith('5.')) speakingEntry.mode='auto';
    const crossEntry=merged.exam.scheme.find(e=>e.id==='sh_cross');
    if(crossEntry && (!crossEntry.subjectId || !merged.subjects.some(s=>s.id===crossEntry.subjectId))) crossEntry.subjectId=merged.subjects.find(s=>s.id==='cross'||s.name==='跨学科')?.id||'cross';
    // 尊重用户选择的手动 / 自动模式；只有旧版无明确模式时补齐。
    merged.exam.scheme.forEach(e=>{if(!['manual','auto'].includes(e.mode))e.mode=e.subjectId?'auto':'manual';});
    merged.settings.theme = ['light','dark','system'].includes(input.settings?.theme) ? input.settings.theme : 'system';
    merged.exam.snapshots = Array.isArray(input.exam?.snapshots) ? input.exam.snapshots : [];
    merged.exam.schoolView = ['high','vocational'].includes(input.exam?.schoolView) ? input.exam.schoolView : 'high';
    merged.exam.schoolTargetId = CHANGNING_SCHOOL_TARGETS.some(x=>x.id===input.exam?.schoolTargetId) ? input.exam.schoolTargetId : 'hs_yanan';
    return merged;
  }

  function recordsForState(st, subjectId){ return (st.records||[]).filter(r=>r.subjectId===subjectId); }

  function validRecord(r) {
    return r && r.id && r.subjectId && r.date && Number.isFinite(Number(r.fullMark)) && Number(r.fullMark)>0 && Number.isFinite(Number(r.score));
  }

  function persistState() {
    // Snapshot immediately: later state mutations must never change a queued
    // write, especially after rapid edits, imports and resets.
    const snapshot = JSON.parse(JSON.stringify(state));
    if (storageMode === 'indexeddb' && activeDatabase) {
      return writeIndexedState(activeDatabase, snapshot).catch(err => {
        console.error('IndexedDB 保存失败',err);
        // Never silently switch storage after a failed write. The in-memory
        // state remains usable for export while the user resolves the error.
        storageWarning = 'IndexedDB 保存失败，本次更改可能未保存。请立即导出 JSON 备份';
        showStorageWarning();
        return false;
      });
    }
    if (storageMode === 'localStorage') {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); return Promise.resolve(true); }
      catch (err) { console.error('兼容存储保存失败',err); }
    }
    storageWarning = '数据尚未安全保存，请立即导出 JSON 备份';
    showStorageWarning();
    return Promise.resolve(false);
  }

  function saveState({autoSnapshot=true}={}) {
    state.version = APP_VERSION;
    // Snapshot changes and grades are committed atomically in one transaction.
    if (autoSnapshot) maybeAutoSnapshot();
    return persistState();
  }

  function getSubject(id) { return state.subjects.find(s=>s.id===id); }
  function percentOf(record) { return record.fullMark > 0 ? record.score / record.fullMark * 100 : 0; }
  function recordsFor(subjectId) { return state.records.filter(r=>r.subjectId===subjectId).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt); }
  function recentRecords(subjectId,n=state.settings.recentWindow) { return recordsFor(subjectId).slice(-n); }
  function latestRecord(subjectId) { const r=recordsFor(subjectId); return r[r.length-1]||null; }
  function subjectAverage(subjectId) { return mean(recordsFor(subjectId).map(percentOf)); }
  function recentAverage(subjectId,n=state.settings.recentWindow) { return mean(recentRecords(subjectId,n).map(percentOf)); }
  function subjectVolatility(subjectId,n=state.settings.volatilityWindow) { return stddev(recordsFor(subjectId).slice(-n).map(percentOf)); }
  function lastTwoMomentum(subjectId) { const r=recordsFor(subjectId); return r.length>=2?percentOf(r.at(-1))-percentOf(r.at(-2)):0; }
  function subjectTierSettings(subjectId) { return state.settings.subjectTiers?.[subjectId] || state.settings.tiers; }
  function validTiers(t) { return [t.excellent,t.good,t.normal,t.pass].every(Number.isFinite) && t.excellent<=100 && t.excellent>t.good && t.good>t.normal && t.normal>t.pass && t.pass>=0; }

  function momentum(subjectId, n=state.settings.recentWindow) {
    const arr = recordsFor(subjectId).map(percentOf);
    if (arr.length < 2) return 0;
    const recent = arr.slice(-n);
    const prev = arr.slice(-n*2,-n);
    if (!prev.length) return arr[arr.length-1]-arr[0];
    return mean(recent)-mean(prev);
  }

  function momentumLevel(value) {
    const abs = Math.abs(value);
    if (abs <= 4) return {label:'稳定',className:'flat'};
    if (abs <= 7) return {label:value>0?'明显进步':'明显退步',className:value>0?'up':'down'};
    return {label:value>0?'大幅进步':'大幅退步',className:value>0?'up':'down'};
  }

  function gradeTier(pct,subjectId=null) {
    const t = subjectTierSettings(subjectId);
    if (pct >= t.excellent) return {key:'excellent',label:'优秀',bg:'#e1f3e8',ink:'#255d3f'};
    if (pct >= t.good) return {key:'good',label:'较好',bg:'#e0ebfb',ink:'#315b86'};
    if (pct >= t.normal) return {key:'normal',label:'一般',bg:'#f7edcf',ink:'#796022'};
    if (pct >= t.pass) return {key:'pass',label:'合格',bg:'#f8dfc9',ink:'#7f522c'};
    return {key:'fail',label:'不合格',bg:'#f4d9dd',ink:'#833d49'};
  }

  function allSubjectStats() {
    return state.subjects.map(subject => {
      const recs = recordsFor(subject.id);
      const pcts = recs.map(percentOf);
      return {
        subject,
        count:recs.length,
        latest:recs.length ? pcts[pcts.length-1] : null,
        latestRecord:recs[recs.length-1]||null,
        recentAvg:recentAverage(subject.id),
        avg:mean(pcts),
        high:pcts.length?Math.max(...pcts):null,
        low:pcts.length?Math.min(...pcts):null,
        volatility:subjectVolatility(subject.id),
        stability:pcts.length?Math.max(0,100-subjectVolatility(subject.id)*8):null,
        momentum:momentum(subject.id),
        lastTwoMomentum:lastTwoMomentum(subject.id),
        momentumAvailable:recs.length>=2
      };
    }).filter(x=>x.count>0);
  }

  function aggregateMomentum() {
    const vals = allSubjectStats().map(x=>x.momentum);
    return vals.length ? mean(vals) : 0;
  }

  function toast(message, type='success') {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(8px)'; setTimeout(()=>el.remove(),250); },2800);
  }

  function lockModalBackground() {
    if(modalScrollRestore!==null)return;
    const y=window.scrollY||window.pageYOffset||0;
    modalScrollRestore=y;
    document.body.style.position='fixed';
    document.body.style.top=`-${y}px`;
    document.body.style.width='100%';
    document.body.classList.add('has-modal-open');
    document.documentElement.classList.add('has-modal-open');
  }
  function unlockModalBackground() {
    if(modalScrollRestore===null)return;
    const y=modalScrollRestore;modalScrollRestore=null;
    document.body.style.position='';document.body.style.top='';document.body.style.width='';
    document.body.classList.remove('has-modal-open');document.documentElement.classList.remove('has-modal-open');
    // Avoid document-level smooth scrolling when returning from a detail dialog.
    window.scrollTo({top:y,left:0,behavior:'instant'});
  }
  function openModal(html, extraClass='') {
    if(modalCloseTimer!==null){clearTimeout(modalCloseTimer);modalCloseTimer=null;}
    lockModalBackground();
    const backdrop = $('#modalBackdrop'), modal=$('#modal');
    const isScoreDetail = extraClass.includes('score-modal-wide');
    const isSubjectDetail = extraClass.includes('subject-modal-wide');
    const isFastDetail = isScoreDetail || isSubjectDetail;
    if (isFastDetail && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    modal.className=`modal${extraClass?` ${extraClass}`:''}`;
    modal.innerHTML = html;
    backdrop.classList.toggle('score-detail-open',isScoreDetail);
    backdrop.classList.toggle('subject-detail-open',isSubjectDetail);
    backdrop.classList.toggle('fast-detail-open',isFastDetail);
    /* Force the pre-open frame to commit before opacity changes. This avoids the
       brief background recomposition flash some Chromium/Android GPUs show. */
    if (isFastDetail) void backdrop.offsetWidth;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden','false');
    enhanceSelects(modal);
    if (!isFastDetail) setTimeout(()=>$('#modal input, #modal button:not(.custom-select-trigger)')?.focus({preventScroll:true}),80);
  }
  function closeModal() {
    const backdrop = $('#modalBackdrop'), modal=$('#modal');
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden','true');
    unlockModalBackground();
    modalCloseTimer=setTimeout(()=>{modal.className='modal';backdrop.classList.remove('score-detail-open','subject-detail-open','fast-detail-open');modalCloseTimer=null;},190);
  }

  function navigate(page) {
    if (!PAGE_META[page]) return;
    currentPage = page;
    $$('.page').forEach(p=>p.classList.remove('active'));
    $(`#page-${page}`).classList.add('active');
    $$('.nav-item,.mobile-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    $('#pageTitle').textContent=PAGE_META[page][0];
    $('#pageSubtitle').textContent=PAGE_META[page][1];
    renderPage(page);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderPage(page) {
    if (page==='home') renderHome();
    if (page==='scores') renderScores();
    if (page==='trends') renderTrends();
    if (page==='exam') renderExam();
    if (page==='profile') renderProfile();
    enhanceSelects($(`#page-${page}`));
  }

  function restoreCustomSelectMenu(wrap) {
    if (!wrap) return;
    const menu=wrap.__portalMenu;
    if (menu && menu.parentElement!==wrap) wrap.appendChild(menu);
    if (menu) {
      menu.classList.remove('custom-select-menu-portal','portal-open','opens-up','modal-select-portal');
      menu.style.left='';menu.style.top='';menu.style.bottom='';menu.style.width='';menu.style.maxHeight='';menu.style.visibility='';
    }
    wrap.__portalMenu=null;
  }

  function closeOneCustomSelect(wrap) {
    if(!wrap)return;
    wrap.classList.remove('open');
    wrap.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded','false');
    restoreCustomSelectMenu(wrap);
  }

  function closeCustomSelects(except=null) {
    $$('.custom-select.open').forEach(el=>{if(el!==except)closeOneCustomSelect(el);});
  }

  function placePortalSelectMenu(wrap, trigger, menu) {
    const rect=trigger.getBoundingClientRect();
    const viewportH=window.innerHeight||document.documentElement.clientHeight;
    const viewportW=window.innerWidth||document.documentElement.clientWidth;
    const margin=12,gap=7;
    const isScoreFilter=!!wrap.closest('.score-filter-panel');
    const menuWidth=isScoreFilter
      ? (viewportW<=820?Math.max(220,viewportW-margin*2):Math.max(rect.width,260))
      : Math.max(rect.width,190);
    const safeWidth=Math.min(menuWidth,viewportW-margin*2);
    document.body.appendChild(menu);
    wrap.__portalMenu=menu;
    menu.classList.add('custom-select-menu-portal');
    menu.classList.toggle('modal-select-portal',!!wrap.closest('#modal'));
    menu.style.visibility='hidden';
    menu.style.width=`${safeWidth}px`;
    menu.style.left=`${clamp(rect.left,margin,Math.max(margin,viewportW-safeWidth-margin))}px`;
    menu.style.top='0px';menu.style.bottom='auto';menu.style.maxHeight='none';
    // The select lives in the scores content. Its overlay must never cover the
    // sticky page heading (including on phones and when the list opens upward).
    const headerBottom=isScoreFilter?Math.max(margin,($('#pageTitle')?.closest('.topbar')?.getBoundingClientRect().bottom||0)+8):margin;
    const desired=Math.min(menu.scrollHeight+2,560);
    const below=Math.max(0,viewportH-rect.bottom-gap-margin);
    const above=Math.max(0,rect.top-gap-headerBottom);
    const openUp=below<Math.min(desired,270)&&above>below;
    const usable=openUp?above:below;
    const finalH=Math.max(1,Math.min(desired,usable));
    menu.style.maxHeight=`${finalH}px`;
    menu.style.top=`${openUp?Math.max(headerBottom,rect.top-gap-finalH):rect.bottom+gap}px`;
    menu.style.bottom='auto';
    menu.classList.toggle('opens-up',openUp);
    menu.style.visibility='visible';
    requestAnimationFrame(()=>menu.classList.add('portal-open'));
  }

  function enhanceSelects(root=document) {
    $$('select.select:not([data-enhanced-select])',root).forEach(select=>{
      select.dataset.enhancedSelect='1';
      select.classList.add('native-select-hidden');
      select.tabIndex=-1;
      const wrap=document.createElement('div');
      wrap.className=`custom-select${select.classList.contains('compact-select')?' compact':''}`;
      const trigger=document.createElement('button');
      trigger.type='button';trigger.className='custom-select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
      const menu=document.createElement('div');menu.className='custom-select-menu';menu.setAttribute('role','listbox');
      const refresh=()=>{
        const opt=select.options[select.selectedIndex]||select.options[0];
        trigger.innerHTML=`<span>${esc(opt?.textContent||'请选择')}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>`;
        menu.innerHTML=[...select.options].map(o=>`<button type="button" class="custom-select-option ${o.selected?'selected':''}" role="option" aria-selected="${o.selected?'true':'false'}" data-value="${esc(o.value)}"><span>${esc(o.textContent)}</span>${o.selected?'<i>✓</i>':''}</button>`).join('');
      };
      refresh();wrap.append(trigger,menu);select.insertAdjacentElement('afterend',wrap);
      trigger.addEventListener('click',e=>{
        e.stopPropagation();
        const willOpen=!wrap.classList.contains('open');
        closeCustomSelects(wrap);
        if(!willOpen){closeOneCustomSelect(wrap);return;}
        wrap.classList.add('open');trigger.setAttribute('aria-expanded','true');
        placePortalSelectMenu(wrap,trigger,menu);
      });
      menu.addEventListener('click',e=>{
        const b=e.target.closest('[data-value]');if(!b)return;
        e.stopPropagation();
        const value=b.dataset.value;
        closeOneCustomSelect(wrap);
        select.value=value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
      });
      select.addEventListener('change',refresh);
    });
  }
  document.addEventListener?.('click',()=>closeCustomSelects());
  window.addEventListener?.('resize',()=>closeCustomSelects());
  window.addEventListener?.('scroll',e=>{if(e.target===document||e.target===document.documentElement||e.target===document.body)closeCustomSelects();},{passive:true});

  function sparklineSvg(records,color='#667085',height=36) {
    const values=(records||[]).map(percentOf);
    if(!values.length) return `<svg class="micro-spark" viewBox="0 0 160 ${height}" aria-hidden="true"><path d="M2 ${height/2} H158" stroke="var(--divider)" stroke-width="1" stroke-dasharray="4 5"/></svg>`;
    const lo=Math.max(40,Math.min(...values)-7), hi=Math.min(100,Math.max(88,Math.max(...values)+5));
    const range=Math.max(10,hi-lo), w=160, pad=5;
    const pts=values.map((v,i)=>({x:values.length===1?w/2:pad+i/(values.length-1)*(w-pad*2),y:pad+(hi-v)/range*(height-pad*2)}));
    const d=pts.map((p,i)=>`${i?'L':'M'}${round(p.x,2)} ${round(p.y,2)}`).join(' ');
    const area=`M${pts[0].x} ${height-pad} ${d.replace(/^M/,'L')} L${pts.at(-1).x} ${height-pad} Z`;
    const nodes=pts.map((p,i)=>`<circle class="micro-node" cx="${round(p.x,2)}" cy="${round(p.y,2)}" r="${i===pts.length-1?3.2:2.1}" fill="var(--card)" stroke="${color}" stroke-width="${i===pts.length-1?2:1.5}"/>`).join('');
    return `<svg class="micro-spark" viewBox="0 0 ${w} ${height}" aria-hidden="true"><path d="${area}" fill="${color}" opacity=".08"/><path class="micro-spark-line" d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${nodes}</svg>`;
  }

  function radialGaugeSvg(value,color,label='近期均分') {
    const v=clamp(Number(value)||0,0,100), r=25.5, c=2*Math.PI*r, dash=c*v/100;
    return `<svg class="pulse-gauge-svg" viewBox="0 0 68 68" role="img" aria-label="${esc(label)} ${round(v,1)} 分">
      <circle class="pulse-gauge-track" cx="34" cy="34" r="25.5" />
      <circle class="pulse-gauge-value" cx="34" cy="34" r="25.5" pathLength="100" style="--gauge:${v};--gauge-color:${color}" />
      <text class="pulse-gauge-number" x="34" y="33" text-anchor="middle">${round(v,0)}</text>
      <text class="pulse-gauge-label" x="34" y="44" text-anchor="middle">均分</text>
    </svg>`;
  }

  function polarPerformanceSvg(stats,metric='recentAvg',caption='近期均分') {
    if(!stats.length)return emptyHtml('缺少星图数据','添加成绩后展示各学科的可视化轮廓。');
    const w=420,h=330,cx=210,cy=164,r=108,n=stats.length;
    const isMomentum=metric==='momentum'||metric==='lastTwoMomentum';
    const val=s=>Number(s[metric]??0);
    // 动量映射到 -20 ~ +20 的星图半径，零动量位于 50% 圈。
    const normalize=s=>isMomentum?clamp(50+val(s)*2.5,0,100):clamp(val(s),0,100);
    const pt=(radius,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [cx+Math.cos(a)*radius,cy+Math.sin(a)*radius,a]};
    const rings=(isMomentum?[0,25,50,75,100]:[20,40,60,80,100]).map(v=>`<polygon points="${stats.map((_,i)=>pt(r*v/100,i).slice(0,2).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
    const axes=stats.map((_,i)=>{const [x,y]=pt(r,i);return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`}).join('');
    const points=stats.map((s,i)=>pt(r*normalize(s)/100,i).slice(0,2));
    const xy=points.map(p=>p.join(',')).join(' ');
    const dots=stats.map((s,i)=>`<circle class="polar-dot chart-reveal-item" style="--delay:${i*45}ms" cx="${points[i][0]}" cy="${points[i][1]}" r="4" fill="${s.subject.dark}" stroke="var(--panel)" stroke-width="2"><title>${esc(s.subject.name)} ${val(s)>0&&isMomentum?'+':''}${round(val(s),1)}</title></circle>`).join('');
    const labels=stats.map((s,i)=>{const [x,y,a]=pt(r+24,i),anchor=Math.cos(a)>.25?'start':Math.cos(a)<-.25?'end':'middle';return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" class="polar-label">${esc(s.subject.name)}</text>`}).join('');
    return `<svg class="polar-chart polar-chart-v5" data-chart-reveal viewBox="0 0 ${w} ${h}" role="img" aria-label="各学科${esc(caption)}星图">${rings}${axes}<polygon class="polar-area" points="${xy}"/><polyline class="polar-line" points="${xy} ${points[0].join(',')}"/>${dots}${labels}</svg>`;
  }
  const CONSTELLATION_METRICS = [
    {key:'recentAvg',label:'近期均分',description:''},
    {key:'latest',label:'最新成绩',description:''},
    {key:'lastTwoMomentum',label:'近两次动量',description:'0 为无变化，向外表示上升'},
    {key:'momentum',label:'近期动量',description:'最近成绩均分与此前成绩的变化；0 为无变化'}
  ];
  function constellationSwitcherHtml(stats) {
    const selected=CONSTELLATION_METRICS.find(m=>m.key===homeConstellationMetric)||CONSTELLATION_METRICS[0];
    return `<section class="panel visual-panel constellation-card constellation-switcher">
      <div class="panel-header"><div><h2 class="panel-title">能力星图</h2></div></div>
      <div class="constellation-tabs" id="constellationTabs" role="group" aria-label="切换能力星图指标">${CONSTELLATION_METRICS.map(m=>`<button type="button" data-constellation="${m.key}" class="${m.key===selected.key?'active':''}" aria-pressed="${m.key===selected.key}">${m.label}</button>`).join('')}</div>
      <div class="polar-wrap" id="constellationPlot">${polarPerformanceSvg(stats,selected.key,selected.label)}</div>
      <p class="constellation-hint" id="constellationHint" ${selected.description?'':'hidden'}>${selected.description}</p>
    </section>`;
  }

  function heatMatrixHtml(stats) {
    return `<div class="heat-matrix" data-chart-reveal>${stats.map((s,rowIndex)=>{const recs=recordsFor(s.subject.id).slice(-6);return `<div class="heat-row chart-reveal-item" style="--delay:${rowIndex*55}ms"><div class="heat-subject"><span class="subject-dot" style="background:${s.subject.dark}"></span>${esc(s.subject.name)}</div><div class="heat-cells">${Array.from({length:6},(_,i)=>{const r=recs[i],delay=rowIndex*55+i*28;if(!r)return `<span class="heat-cell empty chart-reveal-item" style="--delay:${delay}ms" aria-hidden="true"></span>`;const p=percentOf(r),tier=gradeTier(p,r.subjectId);return `<button type="button" class="heat-cell tier-${tier.key} chart-reveal-item" style="--delay:${delay}ms" title="${esc(r.name)} · ${fmtDate(r.date)} · ${round(p,1)} 分" aria-label="${esc(s.subject.name)} ${esc(r.name)} ${round(p,1)} 分"><span>${round(p,0)}</span></button>`}).join('')}</div><div class="heat-row-score">${round(s.recentAvg,1)}</div></div>`}).join('')}<div class="heat-axis chart-reveal-item" style="--delay:360ms"><span>较早</span><span>最近 6 次 →</span></div></div>`;
  }

  function trendQuadrantSvg(stats) {
    if(!stats.length) return '';
    const w=780,h=420,p={l:72,r:34,t:46,b:62};
    const x=v=>p.l+(clamp(v,-15,15)+15)/30*(w-p.l-p.r);
    const y=v=>p.t+(100-clamp(v,55,100))/45*(h-p.t-p.b);
    const plotW=w-p.l-p.r, plotH=h-p.t-p.b;
    const zones=`
      <rect x="${p.l}" y="${p.t}" width="${x(0)-p.l}" height="${y(78)-p.t}" class="quad-zone q-high-down" rx="18"/>
      <rect x="${x(0)}" y="${p.t}" width="${w-p.r-x(0)}" height="${y(78)-p.t}" class="quad-zone q-high-up" rx="18"/>
      <rect x="${p.l}" y="${y(78)}" width="${x(0)-p.l}" height="${h-p.b-y(78)}" class="quad-zone q-low-down" rx="18"/>
      <rect x="${x(0)}" y="${y(78)}" width="${w-p.r-x(0)}" height="${h-p.b-y(78)}" class="quad-zone q-low-up" rx="18"/>
      <rect x="${x(-4)}" y="${p.t}" width="${x(4)-x(-4)}" height="${plotH}" class="quad-stable-v5" rx="15"/>`;
    const yTicks=[60,70,80,90,100].map(v=>`<g><line x1="${p.l}" y1="${y(v)}" x2="${w-p.r}" y2="${y(v)}" class="quad-grid"/><text x="${p.l-13}" y="${y(v)+4}" text-anchor="end" class="quad-axis">${v}</text></g>`).join('');
    const xTicks=[-15,-7,-4,0,4,7,15].map(v=>`<g><line x1="${x(v)}" y1="${p.t}" x2="${x(v)}" y2="${h-p.b}" class="quad-grid ${v===0?'major':''}"/><text x="${x(v)}" y="${h-33}" text-anchor="middle" class="quad-axis">${v>0?'+':''}${v}</text></g>`).join('');
    const labels=`<g class="quad-zone-labels"><text x="${p.l+18}" y="${p.t+24}">高分 · 回撤</text><text x="${w-p.r-18}" y="${p.t+24}" text-anchor="end">高分 · 上升</text><text x="${p.l+18}" y="${h-p.b-18}">低分 · 承压</text><text x="${w-p.r-18}" y="${h-p.b-18}" text-anchor="end">低分 · 回升</text></g>`;
    const baseOffsets=[-58,58,-46,46,-70,70];
    const pts=stats.map((s,i)=>{const cx=x(s.momentum),cy=y(s.recentAvg??0),rr=s.momentumAvailable?8:6;const dx=s.momentumAvailable?0:baseOffsets[i%baseOffsets.length];const labelX=clamp(cx+dx,p.l+38,w-p.r-38);const labelY=cy<86?cy+31:cy-22;const stateLabel=s.momentumAvailable?`${s.momentum>0?'+':''}${round(s.momentum,1)} 动量`:'仅 1 次记录';const leader=!s.momentumAvailable?`<path class="quad-leader" d="M ${cx} ${cy} L ${labelX} ${labelY+(labelY>cy?-11:11)}"/>`:'';return `<g class="quad-point-v5 chart-reveal-item ${s.momentumAvailable?'':'is-baseline'}" style="--delay:${i*80}ms">${leader}<circle class="quad-halo" cx="${cx}" cy="${cy}" r="19" fill="${s.subject.dark}"/><circle class="quad-dot" cx="${cx}" cy="${cy}" r="${rr}" fill="${s.momentumAvailable?s.subject.dark:'var(--panel)'}" stroke="${s.subject.dark}" stroke-width="${s.momentumAvailable?3:2}"><title>${esc(s.subject.name)} · 近期均分 ${round(s.recentAvg,1)} · ${stateLabel}</title></circle><g class="quad-chip" transform="translate(${labelX},${labelY})"><rect x="-31" y="-11" width="62" height="22" rx="11"/><text text-anchor="middle" y="3">${esc(s.subject.name)} ${s.momentumAvailable?`${s.momentum>0?'+':''}${round(s.momentum,1)}`:'· 基线'}</text></g></g>`}).join('');
    return `<svg class="quadrant-chart-v5" data-chart-reveal viewBox="0 0 ${w} ${h}" role="img" aria-label="各学科近期均分与动量象限图"><rect x="${p.l}" y="${p.t}" width="${plotW}" height="${plotH}" class="quad-shell" rx="22"/>${zones}${labels}${yTicks}${xTicks}<line x1="${p.l}" y1="${y(78)}" x2="${w-p.r}" y2="${y(78)}" class="quad-threshold"/><text x="${p.l}" y="22" class="quad-caption-v5">近期均分</text><text x="${w-p.r}" y="${h-8}" text-anchor="end" class="quad-caption-v5">近期动量（分）</text>${pts}</svg>`;
  }

  function quadrantMobileHtml(stats){
    const groups=[
      {key:'high-down',title:'高分 · 回撤',test:s=>(s.recentAvg??0)>=78&&s.momentum<0},
      {key:'high-up',title:'高分 · 上升',test:s=>(s.recentAvg??0)>=78&&s.momentum>=0},
      {key:'low-down',title:'低分 · 承压',test:s=>(s.recentAvg??0)<78&&s.momentum<0},
      {key:'low-up',title:'低分 · 回升',test:s=>(s.recentAvg??0)<78&&s.momentum>=0}
    ];
    return `<div class="quadrant-mobile-v5">${groups.map(g=>{const rows=stats.filter(g.test);return `<section class="qm-zone ${g.key}"><div class="qm-title">${g.title}</div><div class="qm-subjects">${rows.length?rows.map(s=>`<span style="--dot:${s.subject.dark}"><i></i><b>${esc(s.subject.name)}</b><em>${round(s.recentAvg,1)}</em><small>${s.momentum>0?'+':''}${round(s.momentum,1)}</small></span>`).join(''):'<p>暂无学科</p>'}</div></section>`}).join('')}</div>`;
  }

  function subjectDetailCurveSvg(recs,color) {
    if(!recs.length) return `<div class="detail-empty">暂无成绩</div>`;
    const w=760,h=250,p={l:38,r:20,t:18,b:40},vals=recs.map(percentOf),lo=Math.max(50,Math.floor((Math.min(...vals)-6)/5)*5),hi=Math.min(100,Math.ceil((Math.max(...vals)+5)/5)*5),range=Math.max(10,hi-lo);
    const x=i=>p.l+(recs.length===1?.5:i/(recs.length-1))*(w-p.l-p.r);
    const y=v=>p.t+(hi-v)/range*(h-p.t-p.b);
    const grid=[];for(let v=Math.ceil(lo/10)*10;v<=hi;v+=10)grid.push(`<g><line x1="${p.l}" y1="${y(v)}" x2="${w-p.r}" y2="${y(v)}" class="detail-grid"/><text x="${p.l-9}" y="${y(v)+4}" text-anchor="end" class="detail-axis">${v}</text></g>`);
    const pts=recs.map((r,i)=>`${x(i)},${y(percentOf(r))}`).join(' ');
    const area=recs.length>1?`${p.l},${h-p.b} ${pts} ${x(recs.length-1)},${h-p.b}`:'';
    const dots=recs.map((r,i)=>`<g><circle cx="${x(i)}" cy="${y(percentOf(r))}" r="5" fill="${color}" stroke="var(--panel)" stroke-width="3"><title>${esc(r.name)} · ${round(percentOf(r),1)} 分</title></circle><text x="${x(i)}" y="${h-18}" text-anchor="middle" class="detail-axis">${fmtDate(r.date,true)}</text></g>`).join('');
    return `<svg class="detail-curve chart-line-reveal" data-chart-reveal viewBox="0 0 ${w} ${h}" role="img" aria-label="学科历史成绩曲线">${grid.join('')}${recs.length>1?`<polygon points="${area}" fill="${color}" opacity=".07"/><polyline class="detail-curve-line" points="${pts}" style="--curve-color:${color}"/>`:`<line x1="${p.l}" y1="${y(percentOf(recs[0]))}" x2="${w-p.r}" y2="${y(percentOf(recs[0]))}" class="score-single-baseline"/>`}${dots}</svg>`;
  }

  function activateViewAnimations(root=document) {
    const bars=$$('[data-animate-bar]',root), charts=$$('[data-chart-reveal]',root);
    if(!bars.length&&!charts.length)return;
    if(!('IntersectionObserver' in window)){bars.forEach(n=>n.classList.add('is-visible'));charts.forEach(n=>n.classList.add('is-chart-visible'));return;}
    const registry=window.__fenjiViewObservers||(window.__fenjiViewObservers=[]);
    if(bars.length){
      const groups=new Map();bars.forEach(n=>{const witness=n.parentElement||n;if(!groups.has(witness))groups.set(witness,[]);groups.get(witness).push(n)});
      const barOb=new IntersectionObserver(entries=>{entries.forEach(e=>{if(!e.isIntersecting)return;(groups.get(e.target)||[]).forEach(n=>n.classList.add('is-visible'));barOb.unobserve(e.target);});},{threshold:.08,rootMargin:'0px 0px -2% 0px'});
      registry.push(barOb);groups.forEach((_,w)=>barOb.observe(w));
    }
    if(charts.length){
      const chartOb=new IntersectionObserver(entries=>{entries.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add('is-chart-visible');chartOb.unobserve(e.target);});},{threshold:.12,rootMargin:'0px 0px -3% 0px'});
      registry.push(chartOb);charts.forEach(n=>chartOb.observe(n));
    }
  }

  function subjectMomentumCurveSvg(recs,color='#43A5F5') {
    if(recs.length<2)return `<div class="momentum-chart-empty">至少记录两次成绩后显示动量曲线</div>`;
    const n=state.settings.recentWindow;
    const series=recs.map((r,i)=>{
      if(i===0)return 0; // First exam is the explicitly labelled momentum baseline.
      const history=recs.slice(0,i+1).map(percentOf);
      const recent=history.slice(-n),previous=history.slice(-2*n,-n);
      return previous.length?mean(recent)-mean(previous):history.at(-1)-history[0];
    });
    const maxAbs=Math.max(...series.map(Math.abs));
    const bound=Math.max(5,Math.ceil(maxAbs/5)*5);
    const w=760,h=250,p={l:49,r:25,t:23,b:46};
    const x=i=>p.l+i*(w-p.l-p.r)/Math.max(1,recs.length-1);
    const y=v=>p.t+(bound-v)/(2*bound)*(h-p.t-p.b);
    const zero=y(0);
    const valid=series.map((v,i)=>({v,i,x:x(i),y:y(v)}));
    const axis=[bound,bound/2,0,-bound/2,-bound].map(v=>`<g><line class="momentum-chart-grid ${v===0?'zero':''}" x1="${p.l}" x2="${w-p.r}" y1="${y(v)}" y2="${y(v)}"/><text class="momentum-chart-axis" x="${p.l-9}" y="${y(v)+4}" text-anchor="end">${v>0?'+':''}${round(v,1)}</text></g>`).join('');
    const path=valid.map(a=>`${a.x},${a.y}`).join(' ');
    const segments=valid.slice(1).map((a,i)=>{const prev=valid[i];return `<line x1="${prev.x}" y1="${prev.y}" x2="${a.x}" y2="${a.y}" stroke="${a.v>=0?'var(--success)':'var(--danger)'}" stroke-width="2.7" stroke-linecap="round"/>`}).join('');
    const ticks=recs.map((r,i)=>i===0||i===recs.length-1||(recs.length<=7&&i>0)?`<text class="momentum-chart-axis" x="${x(i)}" y="${h-17}" text-anchor="middle">${fmtDate(r.date,true)}</text>`:'').join('');
    const dots=valid.map((a,i)=>`<circle class="momentum-chart-dot chart-reveal-item" style="--delay:${i*55}ms" cx="${a.x}" cy="${a.y}" r="${i===0?3:i===valid.length-1?5.5:4}" fill="${i===0?'var(--muted)':a.v>=0?'var(--success)':'var(--danger)'}" stroke="var(--panel)" stroke-width="2.5"><title>${esc(recs[a.i].name)} · ${fmtDate(recs[a.i].date)} · ${i===0?'初次成绩，动量基线':'动量'} ${a.v>0?'+':''}${round(a.v,1)} 分</title></circle>`).join('');
    return `<svg class="subject-momentum-chart" data-chart-reveal viewBox="0 0 ${w} ${h}" role="img" aria-label="逐次考试动量变化曲线">${axis}<polyline class="momentum-chart-trail" points="${path}" stroke="${color}"/><g class="momentum-chart-signed">${segments}</g>${dots}${ticks}<text class="momentum-chart-axis" x="${w-p.r}" y="${zero-9}" text-anchor="end">0 基线</text></svg>`;
  }

  function showSubjectDetail(subjectId) {
    const stat=allSubjectStats().find(x=>x.subject.id===subjectId);if(!stat)return;
    const recs=recordsFor(subjectId), latest=recs.at(-1),info=momentumLevel(stat.momentum);
    const recent=recs.slice(-6).reverse();
    openModal(`<div class="subject-detail-modal">
      <div class="modal-title-row subject-detail-title"><div><h3 id="modalTitle"><span class="subject-dot" style="background:${stat.subject.dark}"></span>${esc(stat.subject.name)} · 学科详情</h3></div><button class="modal-close" data-close-modal aria-label="关闭">×</button></div>
      <div class="subject-detail-hero">
        <div class="detail-score-card"><span>最新成绩</span><strong>${round(stat.latest,1)}</strong><small>${latest?`${esc(latest.name)} · ${fmtDate(latest.date)}`:'暂无记录'}</small></div>
        <div class="detail-stat"><span>近期均分</span><strong>${round(stat.recentAvg,1)}</strong><div class="detail-mini-track"><i data-animate-bar style="--w:${clamp(stat.recentAvg,0,100)}%;--bar:${stat.subject.dark}"></i></div></div>
        <div class="detail-stat"><span>近期动量</span><strong class="${info.className}">${stat.momentum>0?'+':''}${round(stat.momentum,1)}</strong><small>${info.label}</small></div>
        <div class="detail-stat"><span>稳定度</span><strong>${round(stat.stability,0)}</strong><small>波动 ${round(stat.volatility,1)} 分</small></div>
      </div>
      <section class="detail-section"><div class="detail-section-head"><strong>历史成绩曲线</strong><span>${recs.length} 次记录</span></div>${subjectDetailCurveSvg(recs,stat.subject.dark)}</section>
      <section class="detail-section subject-momentum-panel"><div class="detail-section-head"><strong>动量曲线</strong><span>逐次变化 · 分</span></div>${subjectMomentumCurveSvg(recs,stat.subject.dark)}</section>
      <div class="subject-detail-grid">
        <section class="detail-section"><div class="detail-section-head"><strong>近期成绩</strong></div><div class="recent-score-list">${recent.map((r,i)=>{const pct=percentOf(r);return `<div class="recent-score-item"><div><strong>${esc(r.name)}</strong><small>${fmtDate(r.date)} · ${round(r.score,1)} / ${round(r.fullMark,1)}</small></div><div class="recent-score-value">${round(pct,1)}</div><div class="recent-score-track"><i data-animate-bar style="--w:${clamp(pct,0,100)}%;--bar:${stat.subject.dark};--delay:${i*55}ms"></i></div></div>`}).join('')}</div></section>
        <section class="detail-section detail-momentum-card"><div class="detail-section-head"><strong>动量解释</strong><span>${info.label}</span></div><div class="momentum-spectrum"><span>-15</span><div class="momentum-spectrum-track"><i class="stable-zone"></i><b class="momentum-pin" style="--pos:${clamp((stat.momentum+15)/30*100,0,100)}%;--pin:${stat.subject.dark}"></b></div><span>+15</span></div><div class="detail-insight"><strong>${stat.momentum>0?'近期节奏向上':stat.momentum<0?'近期有回撤':'近期保持稳定'}</strong><p>最近 ${state.settings.recentWindow} 次与此前同长度成绩相比，变化 ${stat.momentum>0?'+':''}${round(stat.momentum,1)} 分。±4 分以内视为稳定区。</p></div></section>
      </div>
      <div class="subject-detail-extra">
        <section class="detail-section"><div class="detail-section-head"><strong>历史成绩分层画像</strong><span>按本学科独立分层标准</span></div><div class="subject-tier-visual">${['excellent','good','normal','pass','fail'].map((key,i)=>{const count=recs.filter(r=>gradeTier(percentOf(r),subjectId).key===key).length;return `<div class="score-tier-item"><span>${['优秀','较好','一般','合格','不合格'][i]}</span><div class="snapshot-track"><i data-animate-bar style="--w:${recs.length?count/recs.length*100:0}%;--bar:${['#00D6A0','#43A5F5','#FFB800','#FF8A3D','#FF5C5C'][i]}"></i></div><strong>${count}</strong></div>`}).join('')}</div></section>
      </div>
    </div>`,'modal-wide subject-modal-wide');
    $$('[data-close-modal]', $('#modal')).forEach(b=>b.addEventListener('click',closeModal));
    activateViewAnimations($('#modal'));
  }
  function subjectPulseCardHtml(stat,index=0) {
    const avg=stat.recentAvg??stat.avg??0, m=stat.momentum, info=momentumLevel(m);
    const latest=stat.latestRecord;
    return `<button type="button" class="subject-pulse-card" data-chart-reveal data-subject-detail="${stat.subject.id}" style="--subject-color:${stat.subject.dark};animation-delay:${Math.min(index*32,180)}ms" aria-label="查看 ${esc(stat.subject.name)} 详情">
      <div class="pulse-head"><div class="pulse-title"><span class="subject-dot" style="background:${stat.subject.dark}"></span><span>${esc(stat.subject.name)}</span></div><div class="pulse-latest"><small>最新</small><strong>${round(stat.latest,1)}</strong></div></div>
      <div class="pulse-body-v4">
        ${radialGaugeSvg(avg,stat.subject.dark)}
        <div class="pulse-metrics-v4"><div><small>动量</small><strong class="${info.className}">${m>0?'+':''}${round(m,1)}</strong></div><div><small>波动</small><strong>${round(stat.volatility,1)}</strong></div><div><small>稳定度</small><strong>${round(stat.stability,0)}</strong></div></div>
      </div>
      <div class="pulse-spark-v4">${sparklineSvg(recordsFor(stat.subject.id).slice(-8),stat.subject.dark,38)}</div>
      <div class="pulse-footer-v4"><span>${latest?esc(latest.name):'暂无考试'}</span><span>查看详情 <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></span></div>
    </button>`;
  }

  function overallAverageBarHtml(value, stats){
    const safe=clamp(Number(value)||0,0,100);
    const marks=stats.slice(0,8).map(s=>`<span class="avg-subject-mark" style="--x:${clamp(s.recentAvg??0,0,100)}%;--c:${s.subject.dark}" title="${esc(s.subject.name)} ${round(s.recentAvg,1)}"></span>`).join('');
    return `<div class="overall-average-v6" data-chart-reveal><div class="overall-average-scale"><span>0</span><span>50</span><span>100</span></div><div class="overall-average-track"><i data-animate-bar class="overall-average-fill" style="--w:${safe}%;--delay:90ms"></i>${marks}<b class="overall-average-pin chart-reveal-item" style="--x:${safe}%;--delay:520ms"></b></div><div class="overall-average-caption"><span>近期各科平均</span><strong>${round(safe,1)} / 100</strong></div></div>`;
  }

  function renderHome() {
    const stats = allSubjectStats();
    const homeSubject = getSubject(state.settings.homeSubject) || stats[0]?.subject || state.subjects[0];
    if (homeSubject) state.settings.homeSubject = homeSubject.id;
    const recs = homeSubject ? recordsFor(homeSubject.id) : [];
    const pcts = recs.map(percentOf);
    const mom = aggregateMomentum(), momInfo = momentumLevel(mom);
    const count7 = state.records.filter(r => (Date.now()-new Date(`${r.date}T12:00:00`).getTime()) <= 7*86400000).length;
    const recentAvg = homeSubject ? recentAverage(homeSubject.id) : null;
    const hi = pcts.length ? Math.max(...pcts) : null, low = pcts.length ? Math.min(...pcts) : null;
    const latestAcross=stats.map(x=>x.latest).filter(Number.isFinite), recentAcross=stats.map(x=>x.recentAvg).filter(Number.isFinite);
    const overallRecent=mean(recentAcross)||0, bestMom=stats.length?[...stats].sort((a,b)=>b.momentum-a.momentum)[0]:null, stabilityTop=stats.length?[...stats].sort((a,b)=>(b.stability??0)-(a.stability??0))[0]:null;
    const tiers={excellent:0,good:0,normal:0,pass:0,fail:0}; state.records.forEach(r=>tiers[gradeTier(percentOf(r),r.subjectId).key]++); const total=Math.max(1,state.records.length);
    const dist=[['优秀','excellent','#00D6A0'],['较好','good','#43A5F5'],['一般','normal','#FFB800'],['合格','pass','#FF8A3D'],['不合格','fail','#FF5C5C']].map(([label,key,color])=>({label,key,color,count:tiers[key],pct:tiers[key]/total*100}));
    const page = $('#page-home');
    page.innerHTML = `
      <div class="hero-metrics">
        <div class="hero-metric metric-featured metric-average-v6" style="--metric-accent:var(--blue)"><div class="hero-metric-top"><small>近期综合均分</small><span class="hero-metric-icon"><svg viewBox="0 0 24 24"><path d="M4 16h3v4H4zM10.5 10h3v10h-3zM17 5h3v15h-3z"/></svg></span></div><strong>${round(overallRecent,1)}<span>分</span></strong>${overallAverageBarHtml(overallRecent,stats)}<div class="hero-metric-foot">${stats.length} 个有记录学科 · 每个圆点代表一科近期均分</div></div>
        <div class="hero-metric" style="--metric-accent:var(--green)"><div class="hero-metric-top"><small>近期动量最佳</small><span class="hero-metric-icon"><svg viewBox="0 0 24 24"><path d="M6 15l5-5 3 3 4-6"/><path d="M15 7h3v3"/></svg></span></div><strong>${bestMom?esc(bestMom.subject.name):'—'}<span>${bestMom?`${bestMom.momentum>=0?'+':''}${round(bestMom.momentum,1)}`:''}</span></strong><div class="hero-metric-foot">${bestMom?momentumLevel(bestMom.momentum).label:'暂无数据'}</div></div>
        <div class="hero-metric" style="--metric-accent:var(--cyan)"><div class="hero-metric-top"><small>稳定度最高</small><span class="hero-metric-icon"><svg viewBox="0 0 24 24"><path d="M4 12h3l2-5 4 10 2-5h5"/></svg></span></div><strong>${stabilityTop?esc(stabilityTop.subject.name):'—'}<span>${stabilityTop?round(stabilityTop.stability,0):''}</span></strong><div class="hero-metric-foot">近期波动 ${stabilityTop?round(stabilityTop.volatility,1):'—'} 分</div></div>
        <div class="hero-metric" style="--metric-accent:var(--yellow)"><div class="hero-metric-top"><small>近 7 天记录</small><span class="hero-metric-icon"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M7 11h10"/></svg></span></div><strong>${count7}<span>条</span></strong><div class="hero-metric-foot">累计 ${state.records.length} 条成绩</div></div>
      </div>
      <div class="dashboard-grid">
        <section class="panel chart-panel">
          <div class="panel-header"><div><h2 class="panel-title">单科成绩曲线</h2></div></div>
          <div class="subject-picker" id="homeSubjectPicker">${state.subjects.map(s=>`<button type="button" data-subject="${s.id}" class="subject-picker-btn ${s.id===homeSubject?.id?'active':''}"><span style="background:${s.dark}"></span>${esc(s.name)}</button>`).join('')}</div>
          <div class="chart-toolbar-v4"><div class="segmented" id="spacingToggle"><button data-spacing="date" class="${state.settings.chartSpacing==='date'?'active':''}">真实日期</button><button data-spacing="index" class="${state.settings.chartSpacing==='index'?'active':''}">次数平均</button></div><span class="chart-current">当前：${esc(homeSubject?.name||'—')}</span></div>
          <div class="chart-wrap"><canvas id="homeChart"></canvas><div id="homeChartTooltip" class="chart-tooltip"></div><div id="homeChartEmpty" class="chart-empty" style="display:none">该学科还没有成绩记录</div></div>
          <div class="chart-summary"><div class="chart-summary-item"><small>近期平均</small><strong>${recentAvg==null?'—':round(recentAvg,1)}</strong></div><div class="chart-summary-item high"><small>历史最高</small><strong>${hi==null?'—':round(hi,1)}</strong></div><div class="chart-summary-item low"><small>历史最低</small><strong>${low==null?'—':round(low,1)}</strong></div></div>
        </section>
        <aside class="panel momentum-panel" style="--momentum-color:${mom>4?'var(--green)':mom<-4?'var(--red)':'var(--blue)'}"><div class="panel-header"><div><h2 class="panel-title">近期动量</h2><p class="panel-subtitle">最近 ${state.settings.recentWindow} 次均分与此前同长度区间比较。</p></div><span class="momentum-pill ${momInfo.className}">${momInfo.label}</span></div><div class="momentum-orbit" data-chart-reveal style="--momentum-p:${clamp(50+mom/15*50,4,96)}"><div class="momentum-core chart-reveal-item" style="--delay:240ms"><strong class="${mom>0?'up':mom<0?'down':''}">${mom>0?'+':''}${round(mom,1)}</strong><small>整体变化 / 分</small></div></div><div class="momentum-spectrum mini" data-chart-reveal><span>-15</span><div class="momentum-spectrum-track"><i class="stable-zone"></i><b class="momentum-pin momentum-pin-reveal" style="--pos:${clamp((mom+15)/30*100,0,100)}%;--pin:var(--momentum-color);--delay:280ms"></b></div><span>+15</span></div><div class="mini-stat-grid"><div class="mini-stat"><small>最新成绩范围</small><strong>${latestAcross.length?`${round(Math.min(...latestAcross),0)}–${round(Math.max(...latestAcross),0)}`:'—'}</strong></div><div class="mini-stat"><small>有记录学科</small><strong>${stats.length}</strong></div></div></aside>
      </div>
      <section class="panel subject-state-panel"><div class="panel-header"><div><h2 class="panel-title">各科状态</h2></div></div><div class="subject-visual-grid">${stats.length?stats.map(subjectPulseCardHtml).join(''):emptyHtml('还没有成绩','先记录一次成绩，首页就会开始形成趋势。')}</div></section>
      <div class="home-insight-grid">
        ${constellationSwitcherHtml(stats)}
        <section class="panel visual-panel"><div class="panel-header"><div><h2 class="panel-title">近期成绩热力矩阵</h2></div><span class="count-badge">最近 6 次</span></div>${heatMatrixHtml(stats)}</section>
      </div>
      <section class="panel distribution-panel"><div><h2 class="panel-title">成绩层级分布</h2><p class="panel-subtitle">按当前“我的 → 成绩分层标准”统计全部历史记录。</p><div class="distribution-donut-wrap" data-chart-reveal style="margin-top:16px"><div class="distribution-donut chart-reveal-item" style="--delay:80ms;--a:${dist[0].pct};--b:${dist[1].pct};--c:${dist[2].pct};--d:${dist[3].pct};--e:${dist[4].pct}"><strong>${state.records.length}</strong><small>总记录</small></div><div class="distribution-legend">${dist.map((x,i)=>`<div class="legend-row chart-reveal-item" style="--delay:${150+i*45}ms"><i class="legend-dot" style="background:${x.color}"></i><span>${x.label}</span><strong>${x.count}</strong></div>`).join('')}</div></div></div><div class="distribution-bars">${dist.map((x,i)=>`<div class="distribution-bar-row"><span>${x.label}</span><div class="distribution-bar-track"><span data-animate-bar class="distribution-bar-fill" style="--w:${x.pct}%;--delay:${i*70}ms;background:${x.color}"></span></div><strong>${round(x.pct,0)}%</strong></div>`).join('')}</div></section>`;
    $('#constellationTabs')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-constellation]');
      if(!b||b.dataset.constellation===homeConstellationMetric)return;
      const selected=CONSTELLATION_METRICS.find(m=>m.key===b.dataset.constellation);
      if(!selected)return;
      homeConstellationMetric=selected.key;
      $$('#constellationTabs button').forEach(x=>{
        const active=x.dataset.constellation===selected.key;
        x.classList.toggle('active',active);
        x.setAttribute('aria-pressed',String(active));
      });
      const plot=$('#constellationPlot'),hint=$('#constellationHint');
      plot.innerHTML=polarPerformanceSvg(stats,selected.key,selected.label);
      if(hint){hint.textContent=selected.description;hint.hidden=!selected.description;}
      activateViewAnimations(plot);
    });
    $('#homeSubjectPicker')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-subject]');if(!b||b.classList.contains('active'))return;
      state.settings.homeSubject=b.dataset.subject;saveState({autoSnapshot:false});
      $$('#homeSubjectPicker [data-subject]').forEach(x=>x.classList.toggle('active',x===b));
      const subject=getSubject(b.dataset.subject), rows=subject?recordsFor(subject.id):[], vals=rows.map(percentOf);
      const summary=$$('.chart-summary-item strong',page);
      if(summary[0])summary[0].textContent=rows.length?round(recentAverage(subject.id),1):'—';
      if(summary[1])summary[1].textContent=vals.length?round(Math.max(...vals),1):'—';
      if(summary[2])summary[2].textContent=vals.length?round(Math.min(...vals),1):'—';
      const current=$('.chart-current',page);if(current)current.textContent=`当前：${subject?.name||'—'}`;
      const canvas=$('#homeChart');canvas?.getAnimations?.().forEach(a=>a.cancel());if(canvas){canvas.style.animation='none';void canvas.offsetWidth;canvas.style.animation='';}
      requestAnimationFrame(()=>drawLineChart(canvas,rows,state.settings.chartSpacing,subject?.dark||'#43A5F5'));
    });
    $('#spacingToggle')?.addEventListener('click', e=>{
      const b=e.target.closest('button');if(!b||b.classList.contains('active'))return;
      state.settings.chartSpacing=b.dataset.spacing;saveState({autoSnapshot:false});
      $$('#spacingToggle button').forEach(x=>x.classList.toggle('active',x===b));
      const subject=getSubject(state.settings.homeSubject),rows=subject?recordsFor(subject.id):[];
      requestAnimationFrame(()=>drawLineChart($('#homeChart'),rows,state.settings.chartSpacing,subject?.dark||'#43A5F5'));
    });
    $$('.subject-pulse-card',page).forEach(card=>card.addEventListener('click',()=>showSubjectDetail(card.dataset.subjectDetail)));
    activateViewAnimations(page);
    requestAnimationFrame(()=>drawLineChart($('#homeChart'), recs, state.settings.chartSpacing, homeSubject?.dark||'#5b63e8'));
  }

  function drawLineChart(canvas, records, spacing='date', subject=null) {
    const empty = $('#homeChartEmpty');
    const tooltip = $('#homeChartTooltip');
    if (!canvas) return;
    if (!records || !records.length) { if(empty) empty.style.display='grid'; return; }
    if(empty) empty.style.display='none';
    const wrap = canvas.parentElement;
    const dpr = Math.max(1,Math.min(2,window.devicePixelRatio||1));
    const rect = wrap.getBoundingClientRect();
    const cssW=Math.max(300,rect.width), cssH=Math.max(220,rect.height);
    canvas.width = cssW*dpr; canvas.height = cssH*dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const w=cssW,h=cssH,pad={l:40,r:18,t:18,b:34};
    const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
    ctx.clearRect(0,0,w,h);
    const pcts=records.map(percentOf);
    const minPct=Math.min(...pcts);
    const minY=clamp(Math.floor((minPct-7)/10)*10,0,70);
    const maxY=100;
    const range=Math.max(20,maxY-minY);
    const times=records.map(r=>new Date(`${r.date}T12:00:00`).getTime());
    const minT=Math.min(...times), maxT=Math.max(...times);
    const xFor=(i)=> records.length===1 ? pad.l+iw/2 : (spacing==='date'&&maxT>minT ? pad.l+(times[i]-minT)/(maxT-minT)*iw : pad.l+i/(records.length-1)*iw);
    const yFor=p=>pad.t+(maxY-clamp(p,minY,maxY))/range*ih;
    const points=records.map((r,i)=>({x:xFor(i),y:yFor(pcts[i]),pct:pcts[i],r}));
    const css=getComputedStyle(document.documentElement);
    const cLine=css.getPropertyValue('--line').trim()||'#e5e9ef';
    const cLineStrong=css.getPropertyValue('--line-strong').trim()||'#d8dee8';
    const cMuted=css.getPropertyValue('--muted').trim()||'#747d8d';
    const cPanel=css.getPropertyValue('--panel').trim()||'#ffffff';
    const cInk=css.getPropertyValue('--ink').trim()||'#141821';
    const ticks=5;
    ctx.font='10px system-ui';ctx.textBaseline='middle';
    for(let i=0;i<ticks;i++){
      const v=maxY-(range/(ticks-1))*i, y=pad.t+(ih/(ticks-1))*i;
      ctx.strokeStyle=i===0?cLineStrong:cLine;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
      ctx.fillStyle=cMuted;ctx.textAlign='right';ctx.fillText(`${Math.round(v)}`,pad.l-8,y);
    }
    const subjectColor=typeof subject==='string'?subject:(subject?.dark||'#43A5F5');
    [60,80,90].forEach(v=>{if(v<=minY||v>=maxY)return;const y=yFor(v);ctx.setLineDash([4,5]);ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle=subjectColor;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.restore();ctx.setLineDash([]);});
    const lineColor=subjectColor;
    const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+ih);const isDark=document.documentElement.dataset.theme==='dark';grad.addColorStop(0,isDark?'rgba(67,165,245,.18)':'rgba(67,165,245,.14)');grad.addColorStop(.55,isDark?'rgba(67,165,245,.065)':'rgba(67,165,245,.05)');grad.addColorStop(1,'rgba(67,165,245,0)');
    ctx.beginPath();ctx.moveTo(points[0].x,pad.t+ih);points.forEach((p,i)=>{if(i===0)ctx.lineTo(p.x,p.y);else{const prev=points[i-1];const dx=(p.x-prev.x)*.42;ctx.bezierCurveTo(prev.x+dx,prev.y,p.x-dx,p.y,p.x,p.y);}});ctx.lineTo(points.at(-1).x,pad.t+ih);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();points.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else{const prev=points[i-1],dx=(p.x-prev.x)*.42;ctx.bezierCurveTo(prev.x+dx,prev.y,p.x-dx,p.y,p.x,p.y);}});ctx.strokeStyle=lineColor;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
    points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,i===points.length-1?4.8:3.4,0,Math.PI*2);ctx.fillStyle=cPanel;ctx.fill();ctx.strokeStyle=lineColor;ctx.lineWidth=i===points.length-1?2.4:1.8;ctx.stroke();});
    const labelIndices=new Set([0,points.length-1]); if(points.length>4) labelIndices.add(Math.floor((points.length-1)/2)); else points.forEach((_,i)=>labelIndices.add(i));
    ctx.font='9px system-ui';ctx.fillStyle=cMuted;ctx.textAlign='center';ctx.textBaseline='top';labelIndices.forEach(i=>ctx.fillText(fmtDate(points[i].r.date,true),points[i].x,h-22));
    const last=points.at(-1);const text=`${round(last.pct,1)}`;ctx.font='700 10px system-ui';const tw=ctx.measureText(text).width+14;const bx=clamp(last.x-tw/2,pad.l,w-pad.r-tw),by=Math.max(3,last.y-31);ctx.fillStyle=cInk;roundRect(ctx,bx,by,tw,22,8);ctx.fill();ctx.fillStyle=cPanel;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,bx+tw/2,by+11);

    const showTip=(pt)=>{if(!tooltip)return;tooltip.innerHTML=`<span>${esc(pt.r.name||'成绩记录')} · ${fmtDate(pt.r.date,true)}</span><strong>${round(pt.pct,1)} 分</strong><span>${round(pt.r.score,1)} / ${round(pt.r.fullMark,1)}</span>`;tooltip.style.left=`${clamp(pt.x,66,w-66)}px`;tooltip.style.top=`${Math.max(58,pt.y)}px`;tooltip.classList.add('show');};
    const hideTip=()=>tooltip?.classList.remove('show');
    const nearest=(clientX)=>{const r=canvas.getBoundingClientRect(),x=clientX-r.left;return points.reduce((best,p)=>Math.abs(p.x-x)<Math.abs(best.x-x)?p:best,points[0]);};
    canvas.addEventListener('mousemove',e=>showTip(nearest(e.clientX)));
    canvas.addEventListener('mouseleave',hideTip);
    canvas.addEventListener('click',e=>showTip(nearest(e.clientX)));
  }

  function roundRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }

  function renderScores() {
    const page = $('#page-scores');
    const subjectsWithCounts = state.subjects.map(s=>({...s,count:recordsFor(s.id).length}));
    let records=[...state.records].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
    if(scoreFilter!=='all') records=records.filter(r=>r.subjectId===scoreFilter);
    if(scoreSearch.trim()) { const q=scoreSearch.trim().toLowerCase(); records=records.filter(r=>(r.name||'').toLowerCase().includes(q)||getSubject(r.subjectId)?.name.toLowerCase().includes(q)); }
    page.innerHTML=`
      <div class="section-title"><div><h2>成绩档案</h2><p>点击任意成绩卡进入本次考试详情；编辑和删除保持独立操作。</p></div><span class="count-badge">显示 ${records.length} / ${state.records.length}</span></div>
      <div class="panel score-filter-panel"><div class="toolbar"><label class="select-shell"><span>学科</span><select id="scoreFilterSelect" class="select compact-select"><option value="all">全部学科</option>${subjectsWithCounts.map(s=>`<option value="${s.id}" ${scoreFilter===s.id?'selected':''}>${esc(s.name)} · ${s.count}</option>`).join('')}</select></label><label class="search-shell"><span class="search-icon">⌕</span><input id="scoreSearch" class="input" placeholder="搜索考试名称" value="${esc(scoreSearch)}" /></label><button id="clearScoreFilter" class="ghost-btn">重置筛选</button></div></div>
      <section class="panel score-filter-summary"><div class="score-filter-kpis"><div><small>平均得分率</small><strong>${records.length?round(mean(records.map(percentOf)),1):'—'}%</strong></div><div><small>最高得分率</small><strong>${records.length?round(Math.max(...records.map(percentOf)),1):'—'}%</strong></div><div><small>最近一条</small><strong>${records.length?round(percentOf(records[0]),1):'—'}%</strong></div></div></section>
      ${records.length?`<div class="score-grid score-grid-v5">${records.map(r=>scoreCardHtml(r)).join('')}</div>`:emptyHtml('没有匹配的成绩','换一个筛选条件，或者新增一条成绩记录。')}`;
    $('#scoreFilterSelect')?.addEventListener('change',e=>{scoreFilter=e.target.value;renderScores();});
    $('#scoreSearch')?.addEventListener('input',e=>{scoreSearch=e.target.value;renderScores();setTimeout(()=>{const el=$('#scoreSearch');el?.focus();el?.setSelectionRange(el.value.length,el.value.length)},0);});
    $('#clearScoreFilter')?.addEventListener('click',()=>{scoreFilter='all';scoreSearch='';renderScores();});
    $$('.score-card-v5').forEach(card=>{card.addEventListener('click',()=>{card.blur();showScoreDetail(card.dataset.scoreDetail);});card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.blur();showScoreDetail(card.dataset.scoreDetail);}})});
    $$('.score-card-v5 [data-edit]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openScoreModal(b.dataset.edit)}));
    $$('.score-card-v5 [data-delete]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();confirmDeleteScore(b.dataset.delete)}));
    enhanceSelects(page);
  }

  function scoreCardHtml(r) {
    const subject=getSubject(r.subjectId)||{name:'未知',color:'#eceff3',dark:'#647080'};
    const pct=percentOf(r), tier=gradeTier(pct,r.subjectId), single=scoreFilter!=='all';
    const tierAccent={excellent:'#00D6A0',good:'#43A5F5',normal:'#FFB800',pass:'#FF8A3D',fail:'#FF5C5C'}[tier.key];
    const accent=single?tierAccent:subject.dark;
    return `<article class="score-card score-card-v5 score-row-v611" tabindex="0" role="button" data-score-detail="${r.id}" style="--score-accent:${accent};--score-bg:var(--card);--score-ink:var(--ink)" aria-label="查看 ${esc(subject.name)} ${esc(r.name||'成绩记录')} 详情">
      <div class="score-row-primary">
        <div class="score-row-title" title="${esc(r.name||'未命名记录')}">${esc(r.name||'未命名记录')}</div>
        <div class="score-row-meta"><span class="score-subject"><i style="background:${subject.dark}"></i>${esc(subject.name)}</span><span class="score-date">${fmtDate(r.date)}</span></div>
      </div>
      <div class="score-row-raw"><strong>${round(r.score,1)}</strong><span>/ ${round(r.fullMark,1)}</span></div>
      <div class="score-row-percent"><small>百分制</small><strong>${round(pct,1)}%</strong></div>
      <div class="score-row-tier"><span class="tier-pill">${tier.label}</span><span class="detail-hint">详情 <b>→</b></span></div>
      <div class="card-actions"><button class="mini-btn" data-edit="${r.id}" title="编辑" aria-label="编辑"><svg viewBox="0 0 24 24"><path d="M5 19h4l10-10-4-4L5 15v4Z"/><path d="m13.8 6.2 4 4"/></svg></button><button class="mini-btn danger-mini" data-delete="${r.id}" title="删除" aria-label="删除"><svg viewBox="0 0 24 24"><path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12"/></svg></button></div>
    </article>`;
  }

  function scoreDetailHistorySvg(recs,currentId,color){
    if(!recs.length)return '';
    const w=760,h=260,p={l:42,r:24,t:24,b:42},vals=recs.map(percentOf),lo=Math.max(45,Math.floor((Math.min(...vals)-7)/5)*5),hi=Math.min(100,Math.ceil((Math.max(...vals)+7)/5)*5),range=Math.max(10,hi-lo);
    const x=i=>p.l+(recs.length===1?.5:i/(recs.length-1))*(w-p.l-p.r),y=v=>p.t+(hi-v)/range*(h-p.t-p.b);
    const pts=recs.map((r,i)=>`${x(i)},${y(percentOf(r))}`).join(' '), currentIndex=Math.max(0,recs.findIndex(r=>r.id===currentId));
    const grid=[];for(let v=Math.ceil(lo/10)*10;v<=hi;v+=10)grid.push(`<g><line x1="${p.l}" y1="${y(v)}" x2="${w-p.r}" y2="${y(v)}" class="detail-grid"/><text x="${p.l-9}" y="${y(v)+4}" text-anchor="end" class="detail-axis">${v}</text></g>`);
    const area=recs.length>1?`${p.l},${h-p.b} ${pts} ${x(recs.length-1)},${h-p.b}`:'';
    const marks=recs.map((r,i)=>`<g class="chart-reveal-item" style="--delay:${i*70}ms"><circle cx="${x(i)}" cy="${y(percentOf(r))}" r="${r.id===currentId?7:4}" fill="${r.id===currentId?color:'var(--panel)'}" stroke="${color}" stroke-width="${r.id===currentId?3:2}"><title>${esc(r.name)} · ${round(percentOf(r),1)}</title></circle>${r.id===currentId?`<text x="${x(i)}" y="${y(percentOf(r))-15}" text-anchor="middle" class="score-current-label">本次</text>`:''}</g>`).join('');
    const shape=recs.length>1?`<polygon class="score-detail-area" points="${area}" style="--curve-color:${color}"/><polyline class="score-detail-line" points="${pts}" style="--curve-color:${color}"/>`:`<line x1="${p.l}" y1="${y(percentOf(recs[0]))}" x2="${w-p.r}" y2="${y(percentOf(recs[0]))}" class="score-single-baseline"/><text x="${w-p.r}" y="${y(percentOf(recs[0]))-10}" text-anchor="end" class="score-single-caption">单次记录基线</text>`;
    return `<svg class="score-detail-chart" data-chart-reveal viewBox="0 0 ${w} ${h}" role="img" aria-label="本学科历史成绩曲线">${grid.join('')}${shape}${marks}</svg>`;
  }

  function showScoreDetail(id){
    const r=state.records.find(x=>x.id===id);if(!r)return;const subject=getSubject(r.subjectId);if(!subject)return;
    const recs=recordsFor(r.subjectId),idx=recs.findIndex(x=>x.id===r.id),pct=percentOf(r),prev=idx>0?percentOf(recs[idx-1]):null,recent=mean(recs.slice(Math.max(0,idx-2),idx+1).map(percentOf)),avg=mean(recs.map(percentOf)),best=Math.max(...recs.map(percentOf)),tier=gradeTier(pct,r.subjectId),delta=prev==null?null:pct-prev;
    const percentile=recs.length?Math.round(recs.filter(x=>percentOf(x)<=pct).length/recs.length*100):0;
    const comps=[['本次',pct,subject.dark],['近3次',recent??pct,'var(--accent)'],['历史均分',avg??pct,'var(--cyan)'],['历史最高',best,'var(--success)']];
    openModal(`<div class="score-detail-modal">
      <div class="modal-title-row score-detail-title"><div><h3 id="modalTitle">${esc(r.name||'成绩详情')}</h3><p><span class="subject-dot" style="background:${subject.dark}"></span>${esc(subject.name)} · ${fmtDate(r.date)} · ${round(r.score,1)} / ${round(r.fullMark,1)}</p></div><button class="modal-close" data-close-score-detail aria-label="关闭">×</button></div>
      <div class="score-detail-hero-v5"><div class="score-detail-orb" style="--p:${clamp(pct,0,100)};--orb:${subject.dark}"><div><strong>${round(pct,1)}</strong><span>百分制</span></div></div><div class="score-detail-metrics"><article><small>成绩层级</small><strong>${tier.label}</strong></article><article><small>较上一次</small><strong class="${delta==null?'flat':delta>=0?'up':'down'}">${delta==null?'—':`${delta>=0?'+':''}${round(delta,1)}`}</strong><span>${delta==null?'暂无上一条记录':'百分制变化'}</span></article><article><small>历史位置</small><strong>${percentile}%</strong><span>高于或等于本学科 ${percentile}% 记录</span></article></div></div>
      <section class="detail-section score-history-panel"><div class="detail-section-head"><div><strong>本次在历史曲线中的位置</strong></div></div>${scoreDetailHistorySvg(recs,r.id,subject.dark)}</section>
      <div class="score-detail-grid-v5"><section class="detail-section"><div class="detail-section-head"><strong>四维对照</strong></div><div class="compare-bars-v5">${comps.map((c,i)=>`<div class="compare-row-v5"><div><span>${c[0]}</span><strong>${round(c[1],1)}</strong></div><div class="compare-track-v5"><i data-animate-bar style="--w:${clamp(c[1],0,100)}%;--bar:${c[2]};--delay:${i*90}ms"></i><b style="left:${clamp(c[1],0,100)}%"></b></div></div>`).join('')}</div></section>
      <section class="detail-section"><div class="detail-section-head"><strong>本次解读</strong><span>${tier.label}</span></div><div class="score-insight-v5"><div class="insight-big">${delta==null?'首条记录':delta>=4?'明显进步':delta<=-4?'明显回撤':'基本稳定'}</div><p>${delta==null?'这是该学科当前档案中的第一条成绩，可作为后续趋势基线。':`与上一条成绩相比 ${delta>=0?'提升':'下降'} ${Math.abs(round(delta,1))} 分；本次比历史均分 ${pct>=(avg??pct)?'高':'低'} ${Math.abs(round(pct-(avg??pct),1))} 分。`}</p></div><div class="score-mini-facts"><span><i>最高</i><b>${round(best,1)}</b></span><span><i>均分</i><b>${round(avg??pct,1)}</b></span><span><i>近期</i><b>${round(recent??pct,1)}</b></span></div></section></div>
      <div class="score-detail-visual-row"><section class="detail-section score-position-panel"><div class="detail-section-head"><strong>历史位置</strong><span>按本学科全部记录排序</span></div><div class="score-position-scale"><div class="score-position-band"><span>低位</span><span>中位</span><span>高位</span></div><div class="score-position-track"><i data-animate-bar style="--w:${percentile}%;--bar:${subject.dark}"></i><b class="score-position-marker chart-reveal-item" style="left:${percentile}%;--delay:260ms"></b></div><div class="score-position-copy"><strong>${percentile}%</strong><span>当前记录位于历史分布的第 ${percentile} 百分位</span></div></div></section><section class="detail-section recent-strip-panel"><div class="detail-section-head"><strong>最近成绩序列</strong></div><div class="recent-score-columns">${recs.slice(-6).map((x,i)=>{const p=percentOf(x);return `<div class="recent-score-column"><div class="recent-score-barbox"><i data-animate-bar class="vertical-bar" style="--h:${clamp(p,0,100)}%;--bar:${x.id===r.id?subject.dark:'var(--muted-2)'};--delay:${i*70}ms"></i></div><strong>${round(p,0)}</strong><span>${fmtDate(x.date,true)}</span></div>`}).join('')}</div></section></div>
      <div class="form-actions"><button class="ghost-btn" data-close-score-detail>关闭</button><button class="primary-btn" data-edit-from-detail="${r.id}">编辑这条成绩</button></div>
    </div>`,'modal-wide score-modal-wide');
    $$('[data-close-score-detail]',$('#modal')).forEach(b=>b.addEventListener('click',closeModal));
    $('[data-edit-from-detail]',$('#modal'))?.addEventListener('click',()=>{closeModal();setTimeout(()=>openScoreModal(r.id),80)});
    activateViewAnimations($('#modal'));
  }

  function openScoreModal(recordId=null) {
    const existing=recordId?state.records.find(r=>r.id===recordId):null;
    const defaultSubject = existing?.subjectId || state.settings.homeSubject || state.subjects[0]?.id;
    openModal(`
      <div class="modal-title-row"><h3 id="modalTitle">${existing?'编辑成绩':'记录成绩'}</h3><button class="modal-close" data-close>×</button></div>
      <form id="scoreForm">
        <div class="form-grid">
          <div class="field"><label>学科</label><select name="subjectId" class="select" required>${state.subjects.map(s=>`<option value="${s.id}" ${s.id===defaultSubject?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label>日期</label><input name="date" class="input" type="date" required value="${existing?.date||todayISO()}" /></div>
          <div class="field"><label>满分</label><input name="fullMark" class="input" type="number" step="0.1" min="0.1" required value="${existing?.fullMark??100}" /></div>
          <div class="field"><label>得分</label><input name="score" class="input" type="number" step="0.1" min="0" required value="${existing?.score??''}" placeholder="例如 88" /></div>
          <div class="field field-full"><label>名称</label><input name="name" class="input" maxlength="50" value="${esc(existing?.name||'')}" placeholder="例如：十月月考 / Unit 3 测验" /></div>
          <div class="field-full percent-preview"><span class="muted">自动换算百分制</span><strong id="percentPreview">${existing?round(percentOf(existing),1):'—'}</strong></div>
        </div>
        <div class="form-actions"><button type="button" class="ghost-btn" data-close>取消</button><button type="submit" class="primary-btn">${existing?'保存修改':'添加记录'}</button></div>
      </form>`);
    $$('[data-close]',$('#modal')).forEach(b=>b.addEventListener('click',closeModal));
    const form=$('#scoreForm');
    const refreshPreview=()=>{const full=Number(form.fullMark.value),score=Number(form.score.value);$('#percentPreview').textContent=full>0&&Number.isFinite(score)?round(score/full*100,1):'—';};
    form.fullMark.addEventListener('input',refreshPreview);form.score.addEventListener('input',refreshPreview);
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const fd=new FormData(form);const fullMark=Number(fd.get('fullMark')),score=Number(fd.get('score'));
      if(!Number.isFinite(fullMark)||fullMark<=0||!Number.isFinite(score)||score<0){toast('请检查满分和得分','error');return;}
      if(score>fullMark*1.2){if(!confirm('得分明显高于满分，仍要保存吗？'))return;}
      const item={id:existing?.id||uid('score'),subjectId:String(fd.get('subjectId')),date:String(fd.get('date')),fullMark,score,name:String(fd.get('name')||'').trim()||'未命名记录',createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()};
      if(existing){Object.assign(existing,item);}else state.records.push(item);
      state.settings.homeSubject=item.subjectId;
      saveState();closeModal();renderPage(currentPage);toast(existing?'成绩已更新':'成绩已记录');
    });
  }

  function confirmDeleteScore(id) {
    const r=state.records.find(x=>x.id===id);if(!r)return;
    const subject=getSubject(r.subjectId);
    if(confirm(`删除 ${subject?.name||''}「${r.name||'这条记录'}」？此操作不能撤销。`)){
      state.records=state.records.filter(x=>x.id!==id);saveState();renderPage(currentPage);toast('记录已删除');
    }
  }

  function renderTrends() {
    let stats=allSubjectStats();
    const by=(key,desc=true)=>[...stats].sort((a,b)=>(desc?1:-1)*((b[key]??-Infinity)-(a[key]??-Infinity)));
    const highLow=(key)=>{const arr=stats.filter(x=>x[key]!=null);if(!arr.length)return[null,null];return [[...arr].sort((a,b)=>b[key]-a[key])[0],[...arr].sort((a,b)=>a[key]-b[key])[0]];};
    const momHL=highLow('momentum'), avgHL=highLow('avg'), stableHL=highLow('stability');
    const allP=state.records.map(r=>({r,p:percentOf(r),s:getSubject(r.subjectId)})), histHigh=allP.length?[...allP].sort((a,b)=>b.p-a.p)[0]:null, histLow=allP.length?[...allP].sort((a,b)=>a.p-b.p)[0]:null;
    if(trendSort==='momentum') stats=by(trendMetric==='lastTwo'?'lastTwoMomentum':'momentum'); if(trendSort==='volatility') stats=[...stats].sort((a,b)=>a.volatility-b.volatility); if(trendSort==='average') stats=by('avg');
    const improving=stats.filter(s=>s.momentum>4).length, declining=stats.filter(s=>s.momentum<-4).length, stable=stats.length-improving-declining;
    const page=$('#page-trends');
    page.innerHTML=`
      <div class="trend-card-grid trend-card-grid-v6">
        ${pairHtml('近期动量',momHL[0],momHL[1],'momentum','进步最大','退步最大','分','trend-card-momentum')}
        ${historyPairHtml('历史单次',histHigh,histLow)}
        ${pairHtml('平均成绩',avgHL[0],avgHL[1],'avg','平均最高','平均最低','分','trend-card-average')}
        ${pairHtml('稳定度',stableHL[0],stableHL[1],'stability','最稳定','最易波动','','trend-card-stability')}
      </div>
      <div class="trend-analysis-grid trend-analysis-grid-v5">
        <section class="panel quadrant-panel-v5"><div class="panel-header"><div><h2 class="panel-title">动量 × 成绩象限</h2><p class="panel-subtitle">同时看“当前水平”和“近期方向”。四个象限直接标注语义，中间紫色带为 ±4 分稳定区。</p></div><div class="quadrant-legend-v5"><span><i class="q-up"></i>上升 ${improving}</span><span><i class="q-flat"></i>稳定 ${stable}</span><span><i class="q-down"></i>回撤 ${declining}</span></div></div><div class="quadrant-wrap-v5">${trendQuadrantSvg(stats)}</div>${quadrantMobileHtml(stats)}</section>
        <aside class="panel movement-composition-v5"><div class="panel-header"><div><h2 class="panel-title">趋势结构</h2></div></div><div class="movement-rings-v5" data-chart-reveal><div class="movement-ring-main" style="--up:${stats.length?improving/stats.length*100:0};--stable:${stats.length?stable/stats.length*100:0}"><div><strong>${stats.length}</strong><small>活跃学科</small></div></div><div class="movement-stats-v5"><div class="move-stat up"><span>上升</span><strong>${improving}</strong><i style="--w:${stats.length?improving/stats.length*100:0}%" data-animate-bar></i></div><div class="move-stat stable"><span>稳定</span><strong>${stable}</strong><i style="--w:${stats.length?stable/stats.length*100:0}%" data-animate-bar></i></div><div class="move-stat down"><span>回撤</span><strong>${declining}</strong><i style="--w:${stats.length?declining/stats.length*100:0}%" data-animate-bar></i></div></div></div></aside>
      </div>
      <section class="panel trend-radar-panel-v5"><div class="panel-header"><div><h2 class="panel-title">各科趋势雷达</h2></div><div class="trend-radar-toolbar"><div class="trend-sort-segment" id="trendMetric"><button data-metric="recent" class="${trendMetric==='recent'?'active':''}">近期动量</button><button data-metric="lastTwo" class="${trendMetric==='lastTwo'?'active':''}">近两次成绩动量</button></div><div class="trend-sort-segment" id="trendSort"><button data-sort="default" class="${trendSort==='default'?'active':''}">默认</button><button data-sort="momentum" class="${trendSort==='momentum'?'active':''}">动量</button><button data-sort="average" class="${trendSort==='average'?'active':''}">均分</button><button data-sort="volatility" class="${trendSort==='volatility'?'active':''}">稳定</button></div></div></div><div class="trend-scale-head-v5"><span>大幅回撤</span><span>明显回撤</span><span>稳定区</span><span>明显上升</span><span>大幅上升</span></div><div class="trend-list-v5">${stats.map((s,i)=>trendRowHtml(s,i)).join('')||emptyHtml('暂无趋势数据','至少记录两个时间点，趋势会更有参考价值。')}</div></section>
      ${trendMomentumCompareHtml(stats)}`;
    $('#trendSort')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-sort]');if(!b||b.classList.contains('active'))return;trendSort=b.dataset.sort;
      $$('#trendSort [data-sort]').forEach(x=>x.classList.toggle('active',x===b));
      let next=allSubjectStats();
      if(trendSort==='momentum')next=[...next].sort((a,b)=>b[trendMetric==='lastTwo'?'lastTwoMomentum':'momentum']-a[trendMetric==='lastTwo'?'lastTwoMomentum':'momentum']);
      if(trendSort==='average')next=[...next].sort((a,b)=>(b.avg??-Infinity)-(a.avg??-Infinity));
      if(trendSort==='volatility')next=[...next].sort((a,b)=>a.volatility-b.volatility);
      const list=$('.trend-list-v5',page);if(list){list.innerHTML=next.map((s,i)=>trendRowHtml(s,i)).join('')||emptyHtml('暂无趋势数据','至少记录两个时间点，趋势会更有参考价值。');activateViewAnimations(list);}
    });
    $('#trendMetric')?.addEventListener('click',e=>{
      const btn=e.target.closest('[data-metric]');if(!btn||btn.dataset.metric===trendMetric)return;
      trendMetric=btn.dataset.metric;renderTrends();
    });
    activateViewAnimations(page);
  }

  function trendMomentumCompareHtml(stats){
    return `<section class="panel trend-momentum-compare"><div class="panel-header"><div><h2 class="panel-title">近期动量 × 近两次动量对照</h2><p class="panel-subtitle">条形以中线 0 为起点；向左代表回撤，向右代表上升。</p></div></div><div class="momentum-dual-legend"><span><i style="background:var(--blue)"></i>近期动量</span><span><i style="background:var(--green)"></i>近两次动量</span></div><div class="momentum-dual-grid">${stats.map(x=>`<div class="momentum-dual-card"><div class="momentum-dual-head"><strong><i style="background:${x.subject.dark}"></i>${esc(x.subject.name)}</strong><span>${x.count} 次成绩</span></div>${[['近期',x.momentum,'var(--blue)'],['近两次',x.lastTwoMomentum,'var(--green)']].map(([label,v,color])=>{const pct=clamp(Math.abs(v)/20*50,0,50);return `<div class="momentum-dual-row"><small>${label}</small><div class="momentum-dual-track"><span class="momentum-dual-zero"></span><i data-animate-bar class="${v<0?'negative':'positive'}" style="left:${v<0?50-pct:50}%;width:${Math.max(pct,0.4)}%;--bar:${color}"></i></div><strong>${x.count<2?'—':`${v>0?'+':''}${round(v,1)}`}</strong></div>`}).join('')}</div>`).join('')}</div></section>`;
  }

  function pairHtml(title, hi, lo, key, hiLabel, loLabel, unit='', extra='') {
    const value=x=>x?`${key==='momentum'&&x[key]>0?'+':''}${round(x[key],1)}${unit}`:'—';
    const [highColor,lowColor]=['var(--green)','var(--red)'];
    return `<section class="insight-pair-card-v6 ${extra}" style="--hi:${highColor};--lo:${lowColor}"><div class="pair-head-v6"><div><h2>${title}</h2></div></div><div class="pair-horizontal-v6"><div class="pair-side-v6 high"><div class="pair-side-label"><i></i><span>${hiLabel}</span></div><div class="pair-value-row"><strong>${value(hi)}</strong><small>${esc(hi?.subject?.name||'—')}</small></div></div><div class="pair-divider-v6" aria-hidden="true"></div><div class="pair-side-v6 low"><div class="pair-side-label"><i></i><span>${loLabel}</span></div><div class="pair-value-row"><strong>${value(lo)}</strong><small>${esc(lo?.subject?.name||'—')}</small></div></div></div></section>`;
  }
  function historyPairHtml(title,hi,lo){return `<section class="insight-pair-card-v6 trend-card-history" style="--hi:var(--green);--lo:var(--red)"><div class="pair-head-v6"><div><h2>${title}</h2></div></div><div class="pair-horizontal-v6"><div class="pair-side-v6 high"><div class="pair-side-label"><i></i><span>历史最高</span></div><div class="pair-value-row"><strong>${hi?round(hi.p,1):'—'}分</strong><small>${esc(hi?.s?.name||'—')}${hi?` · ${fmtDate(hi.r.date,true)}`:''}</small></div></div><div class="pair-divider-v6" aria-hidden="true"></div><div class="pair-side-v6 low"><div class="pair-side-label"><i></i><span>历史最低</span></div><div class="pair-value-row"><strong>${lo?round(lo.p,1):'—'}分</strong><small>${esc(lo?.s?.name||'—')}${lo?` · ${fmtDate(lo.r.date,true)}`:''}</small></div></div></div></section>`;}
  function trendRowHtml(s,index=0){
    const value=trendMetric==='lastTwo'?s.lastTwoMomentum:s.momentum;
    const m=clamp(value,-15,15),pos=clamp((m+15)/30*100,2,98),info=momentumLevel(value),color=m>4?'var(--success)':m<-4?'var(--danger)':'var(--accent)';
    const start=Math.min(50,pos),width=Math.max(0.5,Math.abs(pos-50));
    return `<article class="trend-signal-card"><div class="trend-signal-head"><div class="trend-signal-subject"><span class="subject-dot" style="background:${s.subject.dark}"></span><div><strong>${esc(s.subject.name)}</strong><small>近期均分 ${round(s.recentAvg,1)} · ${trendMetric==='lastTwo'?'近两次差值':'近期动量'} · 稳定度 ${round(s.stability,0)}</small></div></div><div class="trend-signal-value ${info.className}"><strong>${value>0?'+':''}${round(value,1)}</strong><span>${s.momentumAvailable?info.label:'不足 2 次'}</span></div></div><div class="signal-visual-v5" data-chart-reveal style="--marker:${color};--end:${pos}%;--delay:${Math.min(index*70,490)}ms"><div class="signal-zones"><span class="z1"></span><span class="z2"></span><span class="z3"></span><span class="z4"></span><span class="z5"></span></div><div class="signal-zero"></div><div class="signal-path ${m<0?'is-negative':'is-positive'}" style="left:${start}%;width:${width}%"><i data-animate-bar style="--w:100%;--bar:${color};--delay:${Math.min(index*70,490)}ms"></i></div><b class="signal-marker" style="left:${pos}%;--delay:${Math.min(index*70+220,720)}ms"></b><div class="signal-ticks"><span>-15</span><span>-7</span><span>-4</span><span>0</span><span>+4</span><span>+7</span><span>+15</span></div></div></article>`;
  }

  function examEntryValue(entry) {
    if(entry.mode==='manual' || !entry.subjectId){return entry.manual!==null&&entry.manual!==''&&Number.isFinite(Number(entry.manual))?clamp(Number(entry.manual),0,Number(entry.max)||0):0;}
    const avg=recentAverage(entry.subjectId,state.exam.recentWindow);
    if(avg==null) return entry.manual!==null&&entry.manual!==''&&Number.isFinite(Number(entry.manual))?clamp(Number(entry.manual),0,Number(entry.max)||0):0;
    return clamp(avg/100*Number(entry.max||0),0,Number(entry.max||0));
  }
  function examTotals() {
    const values=state.exam.scheme.map(e=>({entry:e,value:examEntryValue(e)}));
    return {values,total:values.reduce((a,x)=>a+x.value,0),max:state.exam.scheme.reduce((a,e)=>a+Number(e.max||0),0)};
  }
  function currentExamVersions() {
    const v={};
    state.exam.scheme.forEach(e=>{
      if(e.mode==='auto'&&e.subjectId){const r=latestRecord(e.subjectId);v[e.id]=r?.id||`manual:${e.manualUpdatedAt||0}:${e.manual??''}`;}
      else v[e.id]=`manual:${e.manualUpdatedAt||0}:${e.manual??''}`;
    });
    return v;
  }
  function maybeAutoSnapshot() {
    if(!state.exam?.scheme?.length)return;
    const current=currentExamVersions();
    const last=[...state.exam.snapshots].sort((a,b)=>b.createdAt-a.createdAt)[0];
    if(!last)return;
    const previous=last.versions||{};
    const allChanged=state.exam.scheme.every(e=>current[e.id] && current[e.id]!==previous[e.id]);
    if(allChanged){
      const t=examTotals();
      state.exam.snapshots.push(makeExamSnapshot(t,'自动更新',current));
      if(currentPage==='exam')setTimeout(()=>{renderExam();toast('所有中考项目数据已翻新，已自动记录总分快照');},0);
    }
  }
  function makeExamSnapshot(t,type,versions){
    return {id:uid('snap'),total:round(t.total,1),max:t.max,type,createdAt:Date.now(),versions,
      items:t.values.map(({entry,value})=>({id:entry.id,label:entry.label,group:entry.group||'其他',subjectId:entry.subjectId,mode:entry.mode,value:round(value,2),max:Number(entry.max),hasData:examEntryHasData(entry)}))};
  }
  function addExamSnapshot(type='手动更新') {
    const t=examTotals();
    state.exam.snapshots.push(makeExamSnapshot(t,type,currentExamVersions()));
    saveState({autoSnapshot:false});renderExam();toast('已记录一次中考总分估算');
  }

  function examGroupSummary(values) {
    const order=['语数外','外语','道法','历史','体育','综合测试'];
    const aliases={'语数外':'语文 / 数学','外语':'外语','道法':'道德与法治','历史':'历史','体育':'体育与健身','综合测试':'综合测试'};
    const colors=['#9B72F2','#43A5F5','#00D6A0','#FFB800','#F35FA7','#20C7D9'];
    return order.map((group,i)=>{
      const rows=values.filter(x=>x.entry.group===group);
      return {group,label:aliases[group],color:colors[i],value:rows.reduce((a,x)=>a+x.value,0),max:rows.reduce((a,x)=>a+Number(x.entry.max||0),0)};
    }).filter(x=>x.max>0);
  }

  function snapshotChartSvg(snaps) {
    const rows=[...snaps].sort((a,b)=>a.createdAt-b.createdAt).slice(-9);
    if(rows.length<2) return `<svg viewBox="0 0 260 120" aria-hidden="true"><path d="M8 86 H252" stroke="var(--line)" stroke-dasharray="4 5"/><text x="130" y="60" text-anchor="middle" fill="var(--muted)" font-size="9">记录两次以上快照后显示趋势</text></svg>`;
    const vals=rows.map(x=>x.total), min=Math.max(0,Math.min(...vals)-18), max=Math.max(Math.max(...vals)+12,750*.82), range=Math.max(40,max-min);
    const pts=rows.map((r,i)=>({x:12+i/(rows.length-1)*236,y:10+(max-r.total)/range*88,r}));
    const d=pts.map((p,i)=>`${i?'L':'M'}${round(p.x,1)} ${round(p.y,1)}`).join(' ');
    const area=`${d} L${round(pts.at(-1).x,1)} 104 L${round(pts[0].x,1)} 104 Z`;
    return `<svg viewBox="0 0 260 120" aria-hidden="true"><defs><linearGradient id="snapArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f87f5" stop-opacity=".22"/><stop offset="1" stop-color="#7f87f5" stop-opacity="0"/></linearGradient></defs><path d="M8 104 H252" stroke="var(--line)"/><path d="${area}" fill="url(#snapArea)"/><path d="${d}" fill="none" stroke="#7f87f5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===pts.length-1?3.7:2.5}" fill="var(--panel)" stroke="#7f87f5" stroke-width="2"/>`).join('')}<text x="12" y="117" fill="var(--muted)" font-size="7">${fmtDateTime(rows[0].createdAt)}</text><text x="248" y="117" text-anchor="end" fill="var(--muted)" font-size="7">${fmtDateTime(rows.at(-1).createdAt)}</text></svg>`;
  }

  function examEntryHasData(entry){
    if(entry.mode==='auto' && entry.subjectId) return recentAverage(entry.subjectId,state.exam.recentWindow)!=null;
    return entry.manual!==null && entry.manual!=='' && Number.isFinite(Number(entry.manual));
  }

  function schoolTargetLabel(item){
    if(!item) return '未设置';
    if(item.kind==='high') return `${item.school} · ${item.cutoff}分`;
    return `${item.school} · ${item.short}${item.program?` / ${item.program}`:''} · ${item.cutoff}分`;
  }

  function schoolMatchData(total, kind='high'){
    const rows=CHANGNING_SCHOOL_TARGETS.filter(x=>x.kind===kind&&!x.isControl).sort((a,b)=>b.cutoff-a.cutoff);
    const reachable=rows.filter(x=>total>=x.cutoff);
    return {rows,reachable,highestReachable:reachable[0]||null};
  }

  function schoolTargetGapTrend(total,target){
    const snaps=[...state.exam.snapshots].filter(s=>Number.isFinite(Number(s.total))).sort((a,b)=>b.createdAt-a.createdAt);
    let previous=snaps[0]||null;
    if(previous && Math.abs(Number(previous.total)-Number(total))<0.05) previous=snaps[1]||null;
    if(!previous) return null;
    const previousGap=round(Number(target.cutoff)-Number(previous.total),1);
    const currentGap=round(Number(target.cutoff)-Number(total),1);
    const scoreMove=round(Number(total)-Number(previous.total),1);
    let text='与上一次持平',tone='steady';
    if(Math.abs(scoreMove)>=0.05){
      if(currentGap>0){text=`较上一次差距${scoreMove>0?'缩小':'扩大'} ${Math.abs(scoreMove)} 分`;tone=scoreMove>0?'better':'worse';}
      else if(previousGap<=0){text=`较上一次领先${scoreMove>0?'扩大':'缩小'} ${Math.abs(scoreMove)} 分`;tone=scoreMove>0?'better':'worse';}
      else{text=`较上一次提升 ${Math.abs(scoreMove)} 分，已越过目标线`;tone='better';}
    }
    return {previous,currentGap,previousGap,scoreMove,text,tone};
  }

  function schoolMatchPanelHtml(total,missingCount){
    const target=CHANGNING_SCHOOL_TARGETS.find(x=>x.id===state.exam.schoolTargetId)||CHANGNING_SCHOOL_TARGETS[0];
    const kind=target.kind==='vocational'?'vocational':'high';
    const data=schoolMatchData(total,kind);
    const current=data.highestReachable;
    const currentName=current?(current.kind==='high'?current.school:`${current.short} · ${current.program||current.school}`):(kind==='high'?'暂未达到区内高中校线':'暂未达到已收录贯通专业线');
    const currentMeta=current?`${round(current.cutoff,1)} 分线 · 当前估分 ${round(total,1)}`:`当前估分 ${round(total,1)} · 补全项目后自动更新`;
    const gap=round(Number(target.cutoff)-Number(total),1), reached=gap<=0, gapAbs=Math.abs(gap);
    const targetName=target.kind==='high'?target.school:`${target.short} · ${target.program||target.school}`;
    const trend=schoolTargetGapTrend(total,target);
    const pct=clamp(total/target.cutoff*100,0,100);
    const targetMeta=target.kind==='high'?`${target.level} · ${target.lineType}`:`${target.path}${target.college?` · ${target.college}`:''} · ${target.lineType}`;
    return `<section class="school-match-panel-v621">
      <div class="school-match-head"><div><h2 class="panel-title">长宁升学定位</h2><p class="panel-subtitle">只保留“现在能上的”和“固定目标差距”。${missingCount?`仍有 ${missingCount} 个项目待补，当前估分偏保守。`:'当前项目数据已完整。'}</p></div><div class="school-source-badge">750 分制</div></div>
      <div class="school-focus-grid-v621">
        <article class="school-current-card-v621"><div class="school-focus-label"><span>现在能上的</span><b>${kind==='high'?'高中':'贯通专业'}</b></div><strong>${esc(currentName)}</strong><p>${esc(currentMeta)}</p></article>
        <article class="school-target-lock-v621 ${reached?'is-reached':'is-short'}">
          <div class="school-target-lock-head"><div><div class="school-focus-label"><span>固定目标</span><b>已固定</b></div><h3>${esc(targetName)}</h3><p>${esc(targetMeta)}</p></div><button type="button" class="school-target-edit-btn" id="editSchoolTarget">修改目标</button></div>
          <div class="school-gap-hero-v621"><span>${reached?'已高出目标线':'距离目标还差'}</span><div><strong>${round(gapAbs,1)}</strong><em>分</em></div></div>
          <div class="school-gap-trend-v621 ${trend?.tone||'steady'}"><i></i><span>${trend?trend.text:'记录两次中考总分快照后，将显示较上一次的差距变化'}</span></div>
          <div class="school-target-meter-v621"><div><span>当前 ${round(total,1)}</span><span>目标 ${round(target.cutoff,1)}</span></div><div class="target-meter-track"><i data-animate-bar style="--w:${pct}%;--delay:100ms"></i><b style="left:${pct}%"></b></div></div>
        </article>
      </div>
      <div class="school-target-editor-v621" id="schoolTargetEditor" hidden>
        <div><strong>修改固定目标</strong><span>选择后会立即保存，并继续按新目标计算差距。</span></div>
        <label class="select-shell school-target-select"><span>目标学校 / 专业</span><select id="schoolTargetSelect" class="select">${CHANGNING_SCHOOL_TARGETS.filter(x=>!x.isControl).map(x=>`<option value="${x.id}" ${x.id===target.id?'selected':''}>${esc(schoolTargetLabel(x))}</option>`).join('')}</select></label>
        <button type="button" class="ghost-btn" id="cancelSchoolTargetEdit">取消</button>
      </div>
      <div class="school-data-footnote">高中分数采用 2026 长宁区统一招生线汇总；现代职校采用上海市教育考试院公布的贯通专业线。该模块只做定位参考，不展开完整学校排行榜；实际录取仍受志愿、计划和同分排序影响。</div>
    </section>`;
  }

  function bindSchoolMatchInteractions(page){
    const editor=$('#schoolTargetEditor',page), editBtn=$('#editSchoolTarget',page), cancel=$('#cancelSchoolTargetEdit',page);
    editBtn?.addEventListener('click',()=>{editor.hidden=false;editBtn.setAttribute('aria-expanded','true');requestAnimationFrame(()=>editor.classList.add('is-open'));});
    cancel?.addEventListener('click',()=>{editor.classList.remove('is-open');editor.hidden=true;editBtn?.setAttribute('aria-expanded','false');});
    $('#schoolTargetSelect',page)?.addEventListener('change',e=>{
      state.exam.schoolTargetId=e.target.value; saveState({autoSnapshot:false});
      const old=$('.school-match-panel-v621',page); if(!old)return;
      old.outerHTML=schoolMatchPanelHtml(examTotals().total,examTotals().values.filter(x=>!examEntryHasData(x.entry)).length);
      bindSchoolMatchInteractions(page); enhanceSelects($('.school-match-panel-v621',page)); activateViewAnimations($('.school-match-panel-v621',page));
    });
  }

  function renderExam() {
    const t=examTotals(),pct=t.max?t.total/t.max*100:0,snaps=[...state.exam.snapshots].sort((a,b)=>b.createdAt-a.createdAt),prev=snaps[1]||null,delta=prev?round(t.total-prev.total,1):null;
    const missing=t.values.filter(x=>!examEntryHasData(x.entry)), existing=t.values.filter(x=>examEntryHasData(x.entry));
    const page=$('#page-exam');
    page.innerHTML=`
      <div class="exam-hero-v6">
        <section class="estimate-card-v6"><div class="estimate-copy-v5"><div class="estimate-label">Shanghai entrance estimate</div><div class="estimate-total-row"><span class="estimate-total">${round(t.total,1)}</span><span class="estimate-outof">/ ${round(t.max,1)}</span></div><div class="estimate-rule-grid"><span><i>自动</i>有成绩的项目按最近 ${state.exam.recentWindow} 次均分换算</span><span><i>待补</i>${missing.length} 个项目仍需要成绩或手动数据</span>${delta==null?'':`<span><i>变化</i>较上一快照 ${delta>=0?'+':''}${delta} 分</span>`}</div></div><div class="progress-ring-v5" style="--p:${clamp(pct,0,100)}"><div><strong>${round(pct,0)}%</strong><small>总分完成度</small></div></div></section>
        <aside class="exam-control-panel-v6"><div class="panel-header"><div><h2 class="panel-title">估算控制</h2><p class="panel-subtitle">换算窗口只影响自动项目，不修改原始成绩。</p></div></div><label class="select-shell exam-window-shell"><span>自动换算窗口</span><select id="examWindow" class="select">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${state.exam.recentWindow===n?'selected':''}>最近 ${n} 次</option>`).join('')}</select></label><div class="exam-action-stack"><button id="manualSnapshot" class="primary-btn">更新并记录总分</button><button id="editExamScheme" class="ghost-btn">管理计分项目</button></div></aside>
      </div>
      ${schoolMatchPanelHtml(t.total,missing.length)}
      <section class="panel exam-breakdown-panel"><div class="panel-header"><div><h2 class="panel-title">中考估分结构与科目贡献</h2><p class="panel-subtitle">每组显示目前已估计分值在该组总分中的比例，随手动和自动输入实时更新。</p></div></div><div class="exam-breakdown-grid">${examGroupSummary(t.values).map((g,i)=>`<div class="exam-breakdown-item"><div><strong>${esc(g.label)}</strong><span>${round(g.value,1)} / ${round(g.max,1)}</span></div><div class="snapshot-track"><i data-animate-bar style="--w:${clamp(g.max?g.value/g.max*100:0,0,100)}%;--bar:${g.color};--delay:${i*65}ms"></i></div><small>${round(g.max?g.value/g.max*100:0,1)}% 组内得分率 · 占总分 ${round(t.max?g.value/t.max*100:0,1)}%</small></div>`).join('')}</div></section>
      <div class="exam-content-grid-v6"><section class="exam-items-panel-v6"><div class="panel-header"><div><h2 class="panel-title">待补充项目</h2><p class="panel-subtitle">默认只显示当前没有可用数据的项目；填写后会自动移入“已有数据”。</p></div><span class="count-badge">${missing.length} 项待补</span></div><div class="exam-list-v6 ${missing.length?'':'is-empty'}">${missing.length?missing.map(({entry,value},i)=>examRowHtml(entry,value,i)).join(''):emptyHtml('项目数据已经完整','所有项目均已有可用数据，可以在下方展开修改。')}</div>
      <details class="exam-existing-v6" ${examExistingOpen?'open':''}><summary><span>查看并修改已有数据</span><strong>${existing.length} 项</strong><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><div class="exam-list-v6 existing">${existing.map(({entry,value},i)=>examRowHtml(entry,value,i+missing.length)).join('')}</div></details></section>
      <aside class="exam-history-panel-v6"><div class="panel-header"><div><h2 class="panel-title">总分历史</h2><p class="panel-subtitle">每次手动更新都会保存估算轨迹。</p></div><span class="count-badge">${snaps.length} 次</span></div><div class="snapshot-chart chart-line-reveal" data-chart-reveal>${snapshotChartSvg(snaps)}</div><div class="snapshot-list">${snaps.length?snaps.map(s=>`<div class="snapshot-item" role="button" tabindex="0" data-snap-detail="${s.id}" aria-label="查看 ${fmtDateTime(s.createdAt)} 中考估分详情"><div><strong>${round(s.total,1)} / ${round(s.max,1)}</strong><div class="snapshot-meta">${fmtDateTime(s.createdAt)}</div></div><span class="snapshot-type">${esc(s.type||'记录')}</span><button class="mini-btn" data-del-snap="${s.id}" title="删除快照">×</button></div>`).join(''):emptyHtml('还没有总分快照','点击“更新并记录总分”保存第一次估算。')}</div></aside></div>`;
    $('.exam-existing-v6',page)?.addEventListener('toggle',e=>{examExistingOpen=e.target.open;});
    $('#examWindow')?.addEventListener('change',e=>{state.exam.recentWindow=Number(e.target.value);saveState({autoSnapshot:false});renderExam();});
    $('#manualSnapshot')?.addEventListener('click',()=>addExamSnapshot('手动更新'));$('#editExamScheme')?.addEventListener('click',openExamSchemeModal);
    $$('.exam-row-v5',page).forEach(row=>{const id=row.dataset.examId,entry=state.exam.scheme.find(e=>e.id===id);if(!entry)return;row.querySelector('[data-exam-mode]')?.addEventListener('change',e=>{entry.mode=e.target.value;if(entry.mode==='auto'&&!entry.subjectId)entry.mode='manual';entry.manualUpdatedAt=Date.now();saveState();renderExam();});row.querySelector('[data-exam-manual]')?.addEventListener('change',e=>{const raw=e.target.value.trim();entry.manual=raw===''?null:clamp(Number(raw)||0,0,Number(entry.max)||0);entry.manualUpdatedAt=Date.now();saveState();renderExam();});});
    $$('[data-snap-detail]',page).forEach(card=>{const open=()=>showExamSnapshotDetail(card.dataset.snapDetail);card.addEventListener('click',e=>{if(!e.target.closest('[data-del-snap]'))open();});card.addEventListener('keydown',e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open();}});});
    $$('[data-del-snap]',page).forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();if(confirm('删除这条总分快照？')){state.exam.snapshots=state.exam.snapshots.filter(s=>s.id!==b.dataset.delSnap);saveState({autoSnapshot:false});renderExam();}}));
    bindSchoolMatchInteractions(page);
    enhanceSelects(page);activateViewAnimations(page);
  }

  function showExamSnapshotDetail(id){
    const snaps=[...state.exam.snapshots].sort((a,b)=>a.createdAt-b.createdAt);
    const pos=snaps.findIndex(s=>s.id===id), snap=snaps[pos];if(!snap)return;
    const previous=pos>0?snaps[pos-1]:null, diff=previous?round(snap.total-previous.total,1):null;
    const items=Array.isArray(snap.items)?snap.items:[];
    const groups=[...new Set(items.map(x=>x.group||'其他'))].map(group=>{
      const list=items.filter(x=>(x.group||'其他')===group);
      return {group,score:list.reduce((n,x)=>n+x.value,0),max:list.reduce((n,x)=>n+x.max,0)};
    });
    const ordered=[...items].sort((a,b)=>(b.max?b.value/b.max:0)-(a.max?a.value/a.max:0));
    const pct=snap.max?clamp(snap.total/snap.max*100,0,100):0;
    const prevItems=new Map((previous?.items||[]).map(x=>[x.id,x]));
    const ranked=items.filter(x=>x.hasData).length;
    openModal(`<div class="exam-snapshot-detail">
      <div class="modal-title-row"><div><h3 id="modalTitle">中考成绩记录详情</h3><p class="panel-subtitle">${fmtDateTime(snap.createdAt)} · ${esc(snap.type||'历史记录')} · 数据保存于该次快照</p></div><button class="modal-close" data-close-snapshot>×</button></div>
      <div class="snapshot-detail-hero"><div><small>当次总估分</small><strong>${round(snap.total,1)} <em>/ ${round(snap.max,1)}</em></strong><span>${round(pct,1)}% 达成率</span></div><div class="snapshot-detail-gauge" style="--snap-p:${pct}"><strong>${round(pct,0)}%</strong></div><div><small>较前次快照</small><strong class="${diff==null?'flat':diff>=0?'up':'down'}">${diff==null?'—':`${diff>=0?'+':''}${diff}`}</strong><span>${previous?`相对 ${fmtDateTime(previous.createdAt)}`:'首条快照'}</span></div></div>
      <div class="snapshot-mini-grid"><div><small>有数据项目</small><strong>${items.length?ranked:'—'} <em>/ ${items.length||'—'}</em></strong></div><div><small>得分占比</small><strong>${round(pct,1)}%</strong></div><div><small>自动计分项</small><strong>${items.length?items.filter(x=>x.mode==='auto').length:'—'}</strong></div><div><small>手动计分项</small><strong>${items.length?items.filter(x=>x.mode!=='auto').length:'—'}</strong></div></div>
      <section class="detail-section"><div class="detail-section-head"><strong>总分历史轨迹</strong></div><div class="snapshot-detail-chart" data-chart-reveal>${snapshotChartSvg(snaps.slice(0,pos+1))}</div></section>
      ${items.length?`<div class="snapshot-detail-grid"><section class="detail-section"><div class="detail-section-head"><strong>各组贡献结构</strong><span>按当时方案</span></div><div class="snapshot-group-list">${groups.map((g,i)=>`<div class="snapshot-progress-row"><div><strong>${esc(g.group)}</strong><span>${round(g.score,1)} / ${round(g.max,1)}</span></div><div class="snapshot-track"><i data-animate-bar style="--w:${clamp(g.max?g.score/g.max*100:0,0,100)}%;--bar:${['#43A5F5','#00D6A0','#9B72F2','#FFB800','#F35FA7','#20C7D9'][i%6]};--delay:${i*70}ms"></i></div></div>`).join('')}</div></section><section class="detail-section"><div class="detail-section-head"><strong>计分项百分比排名</strong><span>${ranked} 项有数据</span></div><div class="snapshot-group-list">${ordered.map((x,i)=>`<div class="snapshot-progress-row"><div><strong>${esc(x.label)}</strong><span>${x.hasData?round(x.max?x.value/x.max*100:0,1)+'%':'未填写'}</span></div><div class="snapshot-track"><i data-animate-bar style="--w:${x.hasData?clamp(x.max?x.value/x.max*100:0,0,100):0}%;--bar:var(--blue);--delay:${i*32}ms"></i></div></div>`).join('')}</div></section></div>
      <section class="detail-section"><div class="detail-section-head"><strong>项目得分与变化</strong><span>保留当次分数与模式</span></div><div class="snapshot-item-grid">${items.map(x=>{const old=prevItems.get(x.id),change=old?round(x.value-old.value,1):null;return `<div class="snapshot-score-chip"><strong>${esc(x.label)}</strong><span>${x.hasData?round(x.value,1):'待补'} / ${round(x.max,1)}</span><small>${x.mode==='auto'?'自动换算':'手动记录'}${change==null?'':` · ${change>=0?'+':''}${change}分`}</small></div>`}).join('')}</div></section>`:`<section class="detail-section"><div class="detail-section-head"><strong>历史快照说明</strong></div><p class="panel-subtitle">该记录建立于旧版本，当时仅保存总分和时间，未保存分科明细；无法准确恢复当次的项目数据。新版生成的记录将保存完整项目、来源和分数组成。</p></section>`}
      <div class="form-actions"><button class="primary-btn" data-close-snapshot>关闭</button></div></div>`, 'modal-wide exam-snapshot-modal');
    $$('[data-close-snapshot]',$('#modal')).forEach(x=>x.addEventListener('click',closeModal));
    activateViewAnimations($('#modal'));
  }

  function examRowHtml(e,value,index=0){
    const hasSubject=!!e.subjectId&&!!getSubject(e.subjectId),avg=hasSubject?recentAverage(e.subjectId,state.exam.recentWindow):null,autoPossible=hasSubject&&avg!=null,hasData=examEntryHasData(e),showManual=e.mode==='manual'||!autoPossible,subject=getSubject(e.subjectId),sourceText=e.mode==='auto'&&autoPossible?`${subject?.name||''} · 最近 ${state.exam.recentWindow} 次均分 ${round(avg,1)}%`:(hasSubject?`${subject?.name||''} 暂无成绩，可先手动填写`:'需要手动填写该项目分数'),ratio=hasData&&Number(e.max)>0?clamp(value/Number(e.max)*100,0,100):0,color=subject?.dark||(['var(--blue)','var(--green)','var(--yellow)','var(--pink)','var(--cyan)'][index%5]),scoreText=hasData?round(value,1):'—',ratioText=hasData?`${round(ratio,0)}%`:'待记录';
    return `<article class="exam-row-v5 ${hasData?'has-data':'is-missing'}" data-exam-id="${e.id}" style="--subject-color:${color}"><div class="exam-row-v5-head"><div><span class="exam-group-dot" style="background:${color}"></span><strong>${esc(e.label)}</strong></div><span class="exam-score-v5 ${hasData?'':'is-empty'}">${scoreText} <small>/ ${round(Number(e.max),1)}</small></span></div><div class="exam-source-v5"><span>${e.mode==='auto'&&autoPossible?'自动换算':hasData?'手动记录':'待记录'}</span><p>${sourceText}</p></div><div class="exam-progress-v5 ${hasData?'':'is-empty'}"><i ${hasData?'data-animate-bar':''} style="--w:${ratio}%;--bar:${color};--delay:${Math.min(index*55,550)}ms"></i><b>${ratioText}</b></div><div class="exam-controls-v5">${hasSubject?`<label class="select-shell"><span>数据方式</span><select data-exam-mode class="select"><option value="auto" ${e.mode==='auto'?'selected':''}>自动换算</option><option value="manual" ${e.mode==='manual'?'selected':''}>手动输入</option></select></label>`:`<div class="exam-fixed-mode"><span>数据方式</span><strong>手动输入</strong></div>`}${showManual?`<label class="field"><span>当前得分</span><input data-exam-manual class="input" type="number" step="0.1" min="0" max="${Number(e.max)}" value="${e.manual!==null&&e.manual!==''&&Number.isFinite(Number(e.manual))?Number(e.manual):''}" placeholder="尚未记录 · 0 - ${Number(e.max)}" /></label>`:`<div class="exam-auto-chip"><span>自动值</span><strong>${round(value,1)}</strong></div>`}</div></article>`;
  }

  function openExamSchemeModal(){
    openModal(`
      <div class="modal-title-row"><div><h3 id="modalTitle">管理中考项目</h3><p class="panel-subtitle">可修改名称、数据来源和满分，也可添加本地区特殊项目。</p></div><button class="modal-close" data-close>×</button></div>
      <div id="schemeEditorList" class="settings-list">
        ${state.exam.scheme.map((e,i)=>schemeEditorRow(e,i)).join('')}
      </div>
      <div class="divider"></div>
      <button id="addExamItem" class="secondary-btn" style="width:100%">＋ 添加中考项目</button>
      <div class="form-actions"><button type="button" class="ghost-btn" data-close>取消</button><button type="button" id="saveExamScheme" class="primary-btn">保存方案</button></div>`);
    $$('[data-close]',$('#modal')).forEach(b=>b.addEventListener('click',closeModal));
    $('#addExamItem')?.addEventListener('click',()=>{
      const list=$('#schemeEditorList');
      const temp={id:uid('ex'),label:'新项目',subjectId:null,max:50,mode:'manual',manual:null,manualUpdatedAt:0};
      list.insertAdjacentHTML('beforeend',schemeEditorRow(temp,list.children.length,true));
      bindSchemeDeleteButtons();
    });
    bindSchemeDeleteButtons();
    $('#saveExamScheme')?.addEventListener('click',()=>{
      const rows=$$('.scheme-editor-row',$('#schemeEditorList'));
      const next=[];
      for(const row of rows){
        const label=row.querySelector('[data-label]').value.trim();
        const max=Number(row.querySelector('[data-max]').value);
        const source=row.querySelector('[data-source]').value;
        if(!label||!Number.isFinite(max)||max<=0){toast('请检查项目名称和满分','error');return;}
        const old=state.exam.scheme.find(e=>e.id===row.dataset.id);
        next.push({
          id:row.dataset.id||uid('ex'), label, max,
          subjectId:source==='manual'?null:source,
          mode:source==='manual'?'manual':old?.subjectId===source&&old?.mode==='manual'?'manual':'auto',
          manual:old?.manual??null,
          manualUpdatedAt:old?.manualUpdatedAt||0,
          group:old?.group||'其他',official:old?.official||false
        });
      }
      if(!next.length){toast('至少保留一个中考项目','error');return;}
      state.exam.scheme=next;
      state.exam.standard='custom';
      saveState({autoSnapshot:false});
      closeModal();renderExam();toast('中考项目方案已保存');
    });
  }

  function schemeEditorRow(e,index,isNew=false){
    const source=e.subjectId||'manual';
    return `<div class="setting-block scheme-editor-row" data-id="${e.id||uid('ex')}">
      <div class="grid" style="grid-template-columns:1.2fr 1fr .65fr auto;gap:8px;align-items:end">
        <div class="field"><label>项目名称</label><input data-label class="input" value="${esc(e.label||'')}" maxlength="18"></div>
        <div class="field"><label>数据来源</label><select data-source class="select"><option value="manual" ${source==='manual'?'selected':''}>手动输入</option>${state.subjects.map(s=>`<option value="${s.id}" ${source===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label>满分</label><input data-max class="input" type="number" min="1" step="1" value="${Number(e.max)||100}"></div>
        <button type="button" class="danger-btn" data-remove-scheme title="删除项目">删除</button>
      </div>
    </div>`;
  }

  function bindSchemeDeleteButtons(){
    $$('[data-remove-scheme]',$('#schemeEditorList')).forEach(b=>b.onclick=()=>b.closest('.scheme-editor-row')?.remove());
  }

  function renderProfile() {
    const avgAll=mean(state.records.map(percentOf))||0;
    const activeSubjects=state.subjects.filter(s=>recordsFor(s.id).length).length;
    const t=state.settings.tiers;
    const themeLabel={light:'浅色',dark:'深色',system:'跟随系统'}[state.settings.theme]||'跟随系统';
    const page=$('#page-profile');
    page.innerHTML=`
      <div class="profile-hero">
        <div class="profile-stat primary"><small>记录总条数</small><strong>${state.records.length}</strong><span>条</span></div>
        <div class="profile-stat"><small>有成绩学科</small><strong>${activeSubjects}</strong><span>科</span></div>
        <div class="profile-stat"><small>全部记录均分</small><strong>${round(avgAll,1)}</strong><span>分</span></div>
        <div class="profile-stat"><small>上海中考基准</small><strong>750</strong><span>分</span></div>
      </div>
      <div class="settings-layout">
        <div class="settings-stack">
          <section class="panel">
            <div class="panel-header"><div><h2 class="panel-title">成绩分层标准</h2><p class="panel-subtitle">按百分制下限判断：优秀 → 较好 → 一般 → 合格 → 不合格。</p></div></div>
            <form id="tierForm" class="tier-grid">
              <div class="field"><label>优秀 ≥</label><input class="input" name="excellent" type="number" min="1" max="100" value="${t.excellent}"></div>
              <div class="field"><label>较好 ≥</label><input class="input" name="good" type="number" min="1" max="100" value="${t.good}"></div>
              <div class="field"><label>一般 ≥</label><input class="input" name="normal" type="number" min="1" max="100" value="${t.normal}"></div>
              <div class="field"><label>合格 ≥</label><input class="input" name="pass" type="number" min="1" max="100" value="${t.pass}"></div>
              <button class="primary-btn" type="submit">保存分层标准</button>
            </form>
            <div class="divider"></div>
            <div class="setting-head"><div><strong>分学科成绩分层</strong><p>可为每门学科设置独立百分制界限；选择“使用全局标准”即可继承上方分层。</p></div></div>
            <div class="subject-tier-toolbar"><label class="field"><span>选择学科</span><select id="tierSubjectSelect" class="select">${state.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label class="field"><span>分层方案</span><select id="tierSubjectMode" class="select"><option value="global">使用全局标准</option><option value="custom">该学科独立标准</option></select></label></div>
            <form id="subjectTierForm" class="tier-grid subject-tier-form">${['excellent','good','normal','pass'].map((k,i)=>`<div class="field"><label>${['优秀','较好','一般','合格'][i]} ≥</label><input class="input" data-tier-key="${k}" type="number" min="0" max="100" step="0.1"></div>`).join('')}<button type="submit" class="primary-btn">保存当前学科分层</button></form>
            <div class="divider"></div>
            <div class="setting-head"><div><strong>分析窗口</strong><p>影响近期动量、近期均分与波动统计，修改后立即应用到所有分析页。</p></div></div>
            <div class="grid grid-2"><div class="field"><label>近期对比长度</label><select id="recentWindow" class="select">${[2,3,4,5,6].map(n=>`<option value="${n}" ${state.settings.recentWindow===n?'selected':''}>${n} 次</option>`).join('')}</select></div><div class="field"><label>波动统计长度</label><select id="volWindow" class="select">${[3,4,5,6,8,10].map(n=>`<option value="${n}" ${state.settings.volatilityWindow===n?'selected':''}>${n} 次</option>`).join('')}</select></div></div>
          </section>
          <section class="panel">
            <div class="panel-header"><div><h2 class="panel-title">学科管理</h2><p class="panel-subtitle">新增自定义学科；已有成绩或被中考项目引用的学科需要先解除关联后才能删除。</p></div></div>
            <div class="subject-manager-list">${state.subjects.map(s=>`<span class="subject-chip"><span class="subject-dot" style="background:${s.dark}"></span>${esc(s.name)}<button data-remove-subject="${s.id}" title="删除学科">×</button></span>`).join('')}</div>
            <form id="subjectForm" class="inline-form"><input name="name" class="input" maxlength="12" placeholder="新增学科，例如：信息技术" required><button class="primary-btn">添加学科</button></form>
          </section>
        </div>
        <aside class="panel">
          <div class="panel-header"><div><h2 class="panel-title">显示与数据</h2></div></div>
          <div class="settings-list">
            <div class="setting-block"><div class="setting-head"><div><strong>外观模式</strong><p>当前：${themeLabel}。支持浅色、深色以及跟随设备系统主题。</p></div></div><div class="theme-choice"><button type="button" data-theme-choice="light" class="${state.settings.theme==='light'?'active':''}">浅色</button><button type="button" data-theme-choice="dark" class="${state.settings.theme==='dark'?'active':''}">深色</button><button type="button" data-theme-choice="system" class="${state.settings.theme==='system'?'active':''}">跟随系统</button></div></div>
            <div class="setting-block"><div class="setting-head"><div><strong>完整数据备份</strong><p>包含成绩、学科、显示设置、中考方案和历史快照。iPhone 请用系统分享菜单「存储到文件」保存 JSON 备份；主屏幕应用的数据可能与 Safari 分开存储。</p></div></div><div class="toolbar"><button id="exportBtn" class="primary-btn">导出全部数据</button><button id="importBtn" class="secondary-btn">导入数据</button></div></div>
            <div class="setting-block"><div class="setting-head"><div><strong>恢复初始设置</strong><p>重置为 9 个预设学科、空白成绩和默认上海中考方案；操作前请先导出备份。</p></div></div><button id="resetDemoBtn" class="ghost-btn">恢复初始设置</button></div>
            <div class="setting-block"><div class="setting-head"><div><strong>清空成绩</strong><p>保留设置和学科，仅删除成绩记录以及中考历史快照。</p></div></div><button id="clearDataBtn" class="danger-btn">清空记录</button></div>
          </div>
        </aside>
      </div>
      <section class="panel profile-tier-matrix-panel"><div class="panel-header"><div><h2 class="panel-title">分学科成绩层级矩阵</h2><p class="panel-subtitle">每行一科，按照该科对应的分层规则统计全部历史成绩。修改标准后此处自动更新。</p></div></div><div class="profile-tier-legend">${['优秀','较好','一般','合格','不合格'].map((v,i)=>`<span><i style="background:${['#00D6A0','#43A5F5','#FFB800','#FF8A3D','#FF5C5C'][i]}"></i>${v}</span>`).join('')}</div><div class="profile-tier-matrix">${state.subjects.map(s=>{const recs=recordsFor(s.id),counts=['excellent','good','normal','pass','fail'].map(key=>recs.filter(r=>gradeTier(percentOf(r),s.id).key===key).length);return `<div class="profile-tier-line"><strong>${esc(s.name)}</strong><div class="profile-tier-stack">${counts.map((count,i)=>`<span style="width:${recs.length?count/recs.length*100:0}%;background:${['#00D6A0','#43A5F5','#FFB800','#FF8A3D','#FF5C5C'][i]}" title="${count} 条 ${['优秀','较好','一般','合格','不合格'][i]}"></span>`).join('')}${recs.length?'':'<em>暂无成绩</em>'}</div><small>${recs.length} 条</small></div>`}).join('')}</div></section>
      <p class="profile-footer">分迹 ${APP_VERSION} · ${storageMode==='indexeddb'?'IndexedDB 本地数据库':'本地存储兼容模式'} · 深浅色主题 · 上海 2026 中考 750 分基准</p>`;

    const syncSubjectTier=()=>{
      const id=$('#tierSubjectSelect')?.value;if(!id)return;
      const custom=state.settings.subjectTiers?.[id];
      const mode=$('#tierSubjectMode');if(mode)mode.value=custom?'custom':'global';
      const values=custom||state.settings.tiers;
      $$('[data-tier-key]',$('#subjectTierForm')).forEach(field=>{field.value=values[field.dataset.tierKey];field.disabled=!custom;});
    };
    $('#tierSubjectSelect')?.addEventListener('change',syncSubjectTier);
    $('#tierSubjectMode')?.addEventListener('change',e=>{
      const on=e.target.value==='custom';
      $$('[data-tier-key]',$('#subjectTierForm')).forEach(field=>{field.disabled=!on;field.value=(on?state.settings.subjectTiers?.[$('#tierSubjectSelect').value]||state.settings.tiers:state.settings.tiers)[field.dataset.tierKey];});
    });
    $('#subjectTierForm')?.addEventListener('submit',e=>{
      e.preventDefault();const id=$('#tierSubjectSelect').value;
      if($('#tierSubjectMode').value==='global')delete state.settings.subjectTiers[id];
      else {const t={};$$('[data-tier-key]',e.target).forEach(x=>t[x.dataset.tierKey]=Number(x.value));if(!validTiers(t)){toast('请按优秀 > 较好 > 一般 > 合格设置阈值','error');return;}state.settings.subjectTiers[id]=t;}
      saveState({autoSnapshot:false});syncSubjectTier();toast('该学科分层已保存');
    });
    syncSubjectTier();
    $('#tierForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const next={excellent:Number(f.get('excellent')),good:Number(f.get('good')),normal:Number(f.get('normal')),pass:Number(f.get('pass'))};if(!validTiers(next)){toast('标准需要按“优秀 > 较好 > 一般 > 合格”递减','error');return;}state.settings.tiers=next;saveState({autoSnapshot:false});toast('分层标准已保存');renderProfile();});
    $('#recentWindow')?.addEventListener('change',e=>{state.settings.recentWindow=Number(e.target.value);saveState({autoSnapshot:false});});
    $('#volWindow')?.addEventListener('change',e=>{state.settings.volatilityWindow=Number(e.target.value);saveState({autoSnapshot:false});});
    $$('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.themeChoice)));
    $('#exportBtn')?.addEventListener('click',exportData);$('#importBtn')?.addEventListener('click',()=>$('#importFile').click());
    $('#resetDemoBtn')?.addEventListener('click',()=>{if(confirm('确定恢复空白初始状态并覆盖当前所有数据吗？请先导出备份。')){state=buildDefaultState();applyTheme(state.settings.theme,false);saveState({autoSnapshot:false});renderProfile();toast('已恢复初始设置');}});
    $('#clearDataBtn')?.addEventListener('click',()=>{if(confirm('确定清空全部成绩记录和中考历史快照吗？此操作不能撤销。')){state.records=[];state.exam.snapshots=[];saveState({autoSnapshot:false});renderProfile();toast('成绩记录已清空');}});
    $('#subjectForm')?.addEventListener('submit',e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;if(state.subjects.some(s=>s.name===name)){toast('已存在同名学科','error');return;}const i=state.subjects.length%PALETTE.length;const s={id:uid('sub'),name,color:PALETTE[i%PALETTE.length],dark:DARK_PALETTE[i%DARK_PALETTE.length]};state.subjects.push(s);saveState({autoSnapshot:false});renderProfile();toast(`已添加学科：${name}`);});
    $$('[data-remove-subject]').forEach(b=>b.addEventListener('click',()=>removeSubject(b.dataset.removeSubject)));
    enhanceSelects(page);
  }

  function removeSubject(id){const s=getSubject(id);if(!s)return;if(recordsFor(id).length){toast('该学科已有成绩，请先删除相关记录','error');return;}if(state.exam.scheme.some(e=>e.subjectId===id)){toast('中考预备中仍引用该学科，请先调整中考方案','error');return;}if(confirm(`删除学科「${s.name}」？`)){state.subjects=state.subjects.filter(x=>x.id!==id);delete state.settings.subjectTiers[id];saveState({autoSnapshot:false});renderProfile();toast('学科已删除');}}

  async function exportData() {
    const payload={app:'分迹 Score Atlas',exportedAt:new Date().toISOString(),version:APP_VERSION,data:state};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const filename=`分迹-成绩备份-${todayISO()}.json`;
    // iOS standalone web apps are more reliable when exporting via the native
    // share sheet. Select “Save to Files” to keep a restorable backup.
    const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
    if (isIOS && typeof File!=='undefined' && navigator.share && navigator.canShare) {
      const file=new File([blob],filename,{type:'application/json'});
      try {
        if (navigator.canShare({files:[file]})) {
          await navigator.share({files:[file],title:'分迹成绩备份'});
          toast('分享已完成，请确认已存储到「文件」或其他安全位置');
          return;
        }
      } catch (err) {
        if (err?.name==='AbortError') { toast('已取消分享，备份尚未保存'); return; }
        console.warn('系统分享失败，改用浏览器下载',err);
      }
    }
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    toast('已发起备份下载，请检查「文件」或浏览器下载列表');
  }

  function parseGradeFlowBackup(json){
    if(!json||json.app!=='GradeFlow'||!Array.isArray(json.records))return null;
    const aliases={'语文':'chinese','数学':'math','英语':'english','外语':'english','物理':'physics','化学':'chemistry','道法':'politics','道德与法治':'politics','历史':'history','地理':'geography','生物':'biology','听说':'listening','外语听说':'listening','英语听说':'listening'};
    const names=Array.isArray(json.subjects)?json.subjects:[];
    const allNames=[...new Set([...names,...json.records.map(r=>r.subject).filter(Boolean)])];
    const used=new Set(), subjects=[];
    allNames.forEach((name,i)=>{let id=aliases[name]||`gf_${String(name).replace(/\s+/g,'_').toLowerCase()}`;let base=id,n=2;while(used.has(id))id=`${base}_${n++}`;used.add(id);subjects.push({id,name:name==='道法'?'道德与法治':String(name),color:PALETTE[i%PALETTE.length],dark:DARK_PALETTE[i%DARK_PALETTE.length],gradeflowName:String(name)});});
    if(!subjects.some(s=>s.id==='listening')){const i=subjects.length;subjects.push({id:'listening',name:'听说',color:PALETTE[i%PALETTE.length],dark:DARK_PALETTE[i%DARK_PALETTE.length],gradeflowName:'听说'});used.add('listening');}
    const subjectIdByName=new Map(subjects.map(s=>[s.gradeflowName||s.name,s.id]));
    const records=json.records.map((r,i)=>({id:`gf_${r.id||uid('record')}`,subjectId:subjectIdByName.get(r.subject),name:String(r.name||'未命名记录'),date:String(r.date||todayISO()),score:Number(r.score),fullMark:Number(r.total),createdAt:new Date(`${r.date||todayISO()}T12:00:00`).getTime()+i,sourceMeta:{source:'GradeFlow',type:r.type||'',className:r.className||'',semester:r.semester||'',tags:Array.isArray(r.tags)?r.tags:[],notes:r.notes||''}})).filter(validRecord);
    if(!records.length)throw new Error('GradeFlow 文件里没有可用成绩');
    const fallback=buildDefaultState();
    return normalizeState({...fallback,subjects:subjects.map(({gradeflowName,...x})=>x),records,sourceInfo:{kind:'GradeFlow',version:json.version??null,exportedAt:json.exportedAt||null,recordCount:records.length},exam:{...fallback.exam,snapshots:[]}});
  }

  async function importData(file) {
    if(!file)return;
    try{const text=await file.text();const json=JSON.parse(text);let incoming;
      if(json?.app==='GradeFlow') incoming=parseGradeFlowBackup(json);
      else { const raw=json.data||json;if(!raw||!Array.isArray(raw.records)||!Array.isArray(raw.subjects))throw new Error('格式不正确');incoming=normalizeState(raw); }
      if(!confirm(`已识别 ${json?.app==='GradeFlow'?'GradeFlow':'分迹'} 数据：${incoming.records.length} 条成绩、${incoming.subjects.length} 个学科。将覆盖当前数据，继续吗？`))return;
      state=incoming;applyTheme(state.settings.theme,false);
      const saved=await saveState({autoSnapshot:false});
      renderPage(currentPage);toast(saved===false?'数据已导入但保存失败，请立即导出 JSON 备份':'数据导入成功',saved===false?'error':undefined);
    }catch(err){console.error(err);toast(`导入失败：${err.message||'文件格式不兼容'}`,'error');}
    finally{$('#importFile').value='';}
  }

  function emptyHtml(title,desc){return `<div class="empty-state"><div><div class="empty-icon">·</div><strong>${title}</strong><p>${desc}</p></div></div>`;}

  function bindGlobalEvents() {
    $$('.nav-item,.mobile-nav-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
    $('#addScoreBtn')?.addEventListener('click',()=>openScoreModal());
    $('#themeToggleBtn')?.addEventListener('click',cycleTheme);
    $('#quickExportBtn')?.addEventListener('click',exportData);
    $('#modalBackdrop')?.addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openScoreModal();}});
    $('#importFile')?.addEventListener('change',e=>importData(e.target.files?.[0]));
    const media=window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change',()=>{if(state.settings.theme==='system'){applyTheme('system',false);renderPage(currentPage);}});
    let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(currentPage==='home')renderHome();},180);});
  }

  // Expose a tiny diagnostics surface for manual testing without making app internals global.
  window.ScoreAtlas = {
    version:APP_VERSION,
    getState:()=>JSON.parse(JSON.stringify(state)),
    storageMode:()=>storageMode,
    migratedLegacy:()=>didMigrateLegacy,
    percentOf,
    momentum,
    lastTwoMomentum,
    gradeTier,
    polarPerformanceSvg,
    examTotals,
    parseGradeFlowBackup,
    schoolTargets:()=>JSON.parse(JSON.stringify(CHANGNING_SCHOOL_TARGETS))
  };

  async function initializeApp() {
    state = await loadState();
    applyTheme(state.settings.theme,false);
    bindGlobalEvents();
    renderHome();
    enhanceSelects(document);
    refreshStorageIndicator();
    if (storageWarning) showStorageWarning();
    else if (didMigrateLegacy) toast('已将旧版本地成绩安全迁移至 IndexedDB，原备份仍保留');
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('./sw.js').catch(()=>{});
    }
  }

  initializeApp().catch(err => {
    console.error('应用启动失败',err);
    const region = document.querySelector('#page-home');
    if (region) region.innerHTML = '<div class="empty-state"><strong>本地数据无法加载</strong><p>请刷新页面或检查 Safari 的网站数据设置。不要清除旧版数据。</p></div>';
  });
})();
