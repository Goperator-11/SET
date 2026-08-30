/* SFSE — 공통 로직 */

/* 계급 15단계.
   t  그리스 소문자 글리프 (대문자 Α·Β 는 라틴 A·B 와 똑같이 보여서 소문자를 쓴다)
   n  한국어 이름        c  색 키 (style.css 의 .tg-* 와 짝)
   fx 시각 효과 등급 — 0 단색 · 1 그라데이션 · 2 그라데이션+발광 · 3 홀로그램+반짝임 */
const RANKS=[
 {xp:0,    t:"α",n:"알파",   c:"a",fx:0},
 {xp:540,  t:"β",n:"베타",   c:"b",fx:0},
 {xp:1360, t:"γ",n:"감마",   c:"g",fx:0},
 {xp:2780, t:"δ",n:"델타",   c:"d",fx:0},
 {xp:4130, t:"ε",n:"엡실론", c:"e",fx:0},
 {xp:5760, t:"ζ",n:"제타",   c:"z",fx:0},
 {xp:7250, t:"η",n:"에타",   c:"h",fx:0},
 {xp:8710, t:"θ",n:"세타",   c:"t",fx:0},
 {xp:10080,t:"ι",n:"이오타", c:"i",fx:0},
 {xp:11420,t:"κ",n:"카파",   c:"k",fx:0},
 {xp:12600,t:"λ",n:"람다",   c:"l",fx:1},
 {xp:13630,t:"μ",n:"뮤",     c:"m",fx:1},
 {xp:14560,t:"ν",n:"뉴",     c:"n",fx:1},
 {xp:15380,t:"ξ",n:"크시",   c:"x",fx:2},
 {xp:16280,t:"ω",n:"오메가", c:"o",fx:3}
];
const XP_CLEAR=5, XP_LAB=5, XP_Q1=15, XP_QN=6;

const BADGES=[
 {id:"first",n:"첫 야간근무",d:"Day 1을 해결했다"},
 {id:"s3",n:"습관의 시작",d:"3일 연속 학습"},
 {id:"s7",n:"일주일 버티기",d:"7일 연속 학습"},
 {id:"s30",n:"한 달의 증명",d:"30일 연속 학습"},
 {id:"a0",n:"리눅스 첫걸음",d:"ACT 0 클리어"},
 {id:"a1",n:"관제실 입문",d:"ACT 1 클리어"},
 {id:"a2",n:"패킷의 눈",d:"ACT 2 클리어"},
 {id:"a3",n:"엔드포인트 감시",d:"ACT 3 클리어"},
 {id:"a4",n:"탐지 엔지니어링",d:"ACT 4 클리어"},
 {id:"a5",n:"침해대응",d:"ACT 5 클리어"},
 {id:"a6",n:"클라우드와 컨테이너",d:"ACT 6 클리어"},
 {id:"a7",n:"위협 헌팅",d:"ACT 7 클리어"},
 {id:"boss3",n:"보스 헌터",d:"보스 문제 3개 해결"},
 {id:"lab3",n:"현장 감식",d:"실전 랩 3개 해결"},
 {id:"sharp",n:"정확한 눈",d:"첫 제출 정답 50개"},
 {id:"sharp2",n:"매의 눈",d:"첫 제출 정답 150개"},
 {id:"half",n:"반환점",d:"전체의 절반 해결"},
 {id:"night",n:"진짜 야간근무",d:"새벽 0~5시에 문제 해결"},
 {id:"done",n:"완주",d:"전 일차 해결"},
 {id:"war1",n:"첫 출전",d:"워게임 시나리오 1개 해결"},
 {id:"war4",n:"현장 분석관",d:"워게임 시나리오 4개 해결"},
 {id:"warall",n:"워게임 정복",d:"워게임 전 시나리오 해결"}
];


/* ---------- 상점 ----------
   XP 를 벌면 같은 양의 포인트가 함께 쌓인다. XP 는 계급을 정하고,
   포인트는 쓰는 돈이다. 그래서 치장을 사도 계급이 내려가지 않는다.
   need 는 필요한 최소 계급 단계(0부터). 높은 효과일수록 계급을 요구한다. */
const SHOP=[
 /* ── 닉네임 색 ── */
 {id:"c-cyan",  g:"색", n:"청록",    d:"차분한 청록색 닉네임",     p:400,  need:0, cls:"nc-cyan"},
 {id:"c-lime",  g:"색", n:"라임",    d:"눈에 띄는 연두색 닉네임",   p:400,  need:0, cls:"nc-lime"},
 {id:"c-amber", g:"색", n:"호박",    d:"따뜻한 주황색 닉네임",     p:400,  need:0, cls:"nc-amber"},
 {id:"c-rose",  g:"색", n:"장미",    d:"선명한 분홍색 닉네임",     p:400,  need:0, cls:"nc-rose"},
 {id:"c-violet",g:"색", n:"제비꽃",  d:"짙은 보라색 닉네임",       p:400,  need:0, cls:"nc-violet"},

 /* ── 그라데이션 ── */
 {id:"g-ocean", g:"그라데이션", n:"심해",   d:"파랑에서 청록으로 흐른다",   p:1200, need:2, cls:"ng-ocean"},
 {id:"g-sunset",g:"그라데이션", n:"노을",   d:"주황에서 분홍으로 흐른다",   p:1200, need:2, cls:"ng-sunset"},
 {id:"g-forest",g:"그라데이션", n:"숲",     d:"초록에서 연두로 흐른다",     p:1200, need:2, cls:"ng-forest"},
 {id:"g-ember", g:"그라데이션", n:"잔불",   d:"빨강에서 금색으로 흐른다",   p:1600, need:4, cls:"ng-ember"},

 /* ── 특수 효과 ── */
 {id:"fx-glow",   g:"효과", n:"네온",     d:"닉네임 주위가 은은하게 빛난다",           p:2000, need:3, cls:"nf-glow"},
 {id:"fx-shimmer",g:"효과", n:"반짝임",   d:"빛이 글자 위를 천천히 훑고 지나간다",     p:3000, need:5, cls:"nf-shimmer"},
 {id:"fx-rainbow",g:"효과", n:"무지개",   d:"색이 끊임없이 변한다",                   p:3500, need:6, cls:"nf-rainbow"},
 {id:"fx-holo",   g:"효과", n:"홀로그램", d:"무지개가 흐르고 그 위로 빛이 지나간다",   p:6000, need:9, cls:"nf-holo"},

 /* ── 칭호 ── 실제 군사·보안 현장에서 쓰는 약어를 그대로 썼다.
    낮은 것은 당직·1선 분석, 높은 것은 인텔리전스·최고 경계태세다. */
 {id:"t-watch", g:"칭호", n:"WATCHSTANDER", d:"당직 근무자 — 밤을 지키는 사람",           p:600,  need:0, title:"WATCHSTANDER"},
 {id:"t-tier1", g:"칭호", n:"TIER-1",       d:"SOC 1선 분석가 — 경보를 가장 먼저 받는다", p:1000, need:1, title:"TIER-1"},
 {id:"t-sigint",g:"칭호", n:"SIGINT",       d:"Signals Intelligence — 신호정보",          p:1500, need:3, title:"SIGINT"},
 {id:"t-dfir",  g:"칭호", n:"DFIR",         d:"Digital Forensics & Incident Response",    p:2200, need:5, title:"DFIR"},
 {id:"t-qrf",   g:"칭호", n:"QRF",          d:"Quick Reaction Force — 즉응 대기조",       p:3200, need:7, title:"QRF"},
 {id:"t-cti",   g:"칭호", n:"CTI",          d:"Cyber Threat Intelligence — 위협 인텔",    p:4000, need:9, title:"CTI"},
 {id:"t-ow",    g:"칭호", n:"OVERWATCH",    d:"상시 감시 — 위에서 전장을 내려다본다",      p:5000, need:11,title:"OVERWATCH"},
 {id:"t-dc1",   g:"칭호", n:"DEFCON 1",     d:"최고 경계태세 — 오메가의 증표",            p:6500, need:13,title:"DEFCON 1"}
];
const shopItem=id=>SHOP.find(x=>x.id===id);
const owns=id=>Array.isArray(S.shop&&S.shop.owned)&&S.shop.owned.includes(id);

/* 닉네임을 치장까지 입혀 그린다.
   cos 를 넘기면 남의 것도 그릴 수 있고(랭킹·팀), team 을 넘기면 앞에 태그가 붙는다. */
function nameHTML(username, cos, team){
  const c = cos || (S.shop||{});
  const sk = c.skin ? shopItem(c.skin) : null;
  const ti = c.title ? shopItem(c.title) : null;
  return (team&&team.tag ? '<span class="ttag" title="'+esc(team.name||"")+'">'+esc(team.tag)+'</span> ' : '')+
    '<span class="uname '+(sk&&sk.cls?sk.cls:"")+'" data-t="'+esc(username)+'">'+esc(username)+'</span>'+
    (ti&&ti.title ? ' <span class="utitle">'+esc(ti.title)+'</span>' : '');
}
/* 프로필로 가는 링크. 랭킹·팀 명단에서 닉네임을 누르면 열린다. */
const profileLink = (username, cos, team) =>
  '<a class="plink" href="profile.html?u='+encodeURIComponent(username)+'">'+
  nameHTML(username, cos, team)+'</a>';
/* 계급 뱃지 — 글리프+이름, 등급별 색과 효과 */
function tierHTML(i, withName){
  const r=RANKS[i];
  return '<span class="tg tg-'+r.c+' fx'+r.fx+'"><i>'+r.t+'</i>'+
    (withName?'<b>'+r.n+'</b>':'')+'</span>';
}

const DAYS=[]; ACTS.forEach(a=>a.days.forEach(d=>{d.act=a.n; DAYS.push(d)}));
const byDay=n=>DAYS.find(d=>d.d===n);
const actOf=n=>ACTS.find(a=>a.n===n);
const KEY="nightshift.v1";

const BLANK={ver:3,xp:0,pts:0,ptsAll:0,shop:{owned:[],skin:null,title:null},done:{},streak:0,best:0,last:"",cur:1,first:0,miss:[],badges:[],subs:[],hist:{},theme:""};
let S=Object.assign({},BLANK);

/* ---------- 저장소 ----------
   서버가 있으면 계정에 저장하고, 없으면(깃허브 Pages 등) 브라우저에만 저장한다.
   두 경우 모두 localStorage 를 캐시로 써서 오프라인에서도 화면이 뜬다.            */
const Store={mode:"local",user:null,dirty:false,state:"idle"};

const readLocal=()=>{try{const r=localStorage.getItem(KEY); if(r) return JSON.parse(r);}catch(e){} return null};
const writeLocal=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};

function setSync(state){
  Store.state=state;
  const d=document.getElementById("sync-dot");
  if(!d) return;
  d.className="sync-dot"+(state==="saving"?" saving":state==="error"?" err":"");
  d.title = state==="saving"?"저장 중":state==="error"?"서버 저장 실패 — 브라우저에는 보관됨":"서버에 저장됨";
}

let _pushTimer=null,_pushing=false;
async function pushNow(){
  if(Store.mode!=="server"||_pushing) return;
  _pushing=true; Store.dirty=false; setSync("saving");
  try{
    const r=await fetch("api/progress",{method:"PUT",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({state:S})});
    if(r.status===401){ location.replace("login.html"); return; }
    setSync(r.ok?"idle":"error");
  }catch(e){ setSync("error"); }
  finally{ _pushing=false; if(Store.dirty) _pushTimer=setTimeout(pushNow,400); }
}

/* 페이지 코드는 예전처럼 save() 만 부르면 된다 */
const save=()=>{
  writeLocal();
  if(Store.mode==="server"){
    Store.dirty=true;
    clearTimeout(_pushTimer);
    _pushTimer=setTimeout(pushNow,600);
  }
};

addEventListener("visibilitychange",()=>{ if(document.hidden&&Store.dirty) pushNow(); });
addEventListener("pagehide",()=>{
  if(Store.mode==="server"&&Store.dirty&&navigator.sendBeacon)
    navigator.sendBeacon("api/progress",
      new Blob([JSON.stringify({state:S})],{type:"application/json"}));
});

/* ACT 0(리눅스 기초 20일)이 앞에 들어가면서 기존 일차가 20씩 밀렸다.
   ver 표시가 없는 예전 저장 데이터는 일차 번호를 옮겨준다. 한 번만 실행된다. */
const STATE_VER=3;
let migrated=false;
function migrate(o){
  if(!o||o.ver>=STATE_VER) return o;
  migrated=true;
  const shift=k=>{const r={}; for(const n in k){ const v=+n; r[isNaN(v)?n:v+20]=k[n]; } return r;};
  if(!(o.ver>=2)){                       // ACT 0 삽입에 따른 일차 이동 — 한 번만
  if(o.done) o.done=shift(o.done);
  if(o.hist) o.hist=shift(o.hist);
  if(Array.isArray(o.miss)) o.miss=o.miss.map(m=>(m&&typeof m==="object"&&typeof m.d==="number")?Object.assign({},m,{d:m.d+20}):m);
  if(Array.isArray(o.subs)) o.subs=o.subs.map(m=>(m&&typeof m==="object"&&typeof m.d==="number")?Object.assign({},m,{d:m.d+20}):m);
  if(typeof o.cur==="number"&&o.cur>0) o.cur=Math.min(o.cur+20,160);
  }
  // 포인트 도입 — 그동안 번 XP 만큼 소급해서 넣어준다
  if(typeof o.pts!=="number") { o.pts=o.xp||0; o.ptsAll=o.xp||0; }
  if(!o.shop||typeof o.shop!=="object") o.shop={owned:[],skin:null,title:null};
  if(!Array.isArray(o.shop.owned)) o.shop.owned=[];
  o.ver=STATE_VER;
  return o;
}

function adopt(obj){
  obj=migrate(obj);
  S=Object.assign({},BLANK,obj||{});
  ["miss","badges","subs"].forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; });
  if(!S.hist||typeof S.hist!=="object") S.hist={};
  if(!S.done||typeof S.done!=="object") S.done={};
  if(!S.shop||typeof S.shop!=="object") S.shop={owned:[],skin:null,title:null};
  if(!Array.isArray(S.shop.owned)) S.shop.owned=[];
  if(typeof S.pts!=="number") S.pts=0;
  if(typeof S.ptsAll!=="number") S.ptsAll=S.pts;
}

/* 페이지마다 boot(콜백) 으로 시작한다 */
async function boot(run){
  const forceLocal = new URLSearchParams(location.search).get("local")==="1"
    || sessionStorage.getItem("ns_local")==="1";
  if(forceLocal){ try{sessionStorage.setItem("ns_local","1")}catch(e){} }

  const local=readLocal();
  adopt(local);
  if(migrated){ writeLocal(); Store.dirty=true; }
  if(S.theme) document.documentElement.setAttribute("data-theme",S.theme);

  if(!forceLocal){
    try{
      const r=await fetch("api/me",{headers:{Accept:"application/json"}});
      if(r.status===401){
        location.replace("login.html?next="+encodeURIComponent(location.pathname+location.search));
        return;
      }
      if(r.ok){
        Store.mode="server";
        Store.user=(await r.json()).user;
        const pr=await fetch("api/progress");
        if(pr.ok){
          const {state}=await pr.json();
          if(state&&Object.keys(state).length){ adopt(state); }
          else if(local){ adopt(local); Store.dirty=true; setTimeout(pushNow,0); } // 첫 로그인 — 기기에 있던 진도를 올린다
          writeLocal();
        }
      }
    }catch(e){ /* 서버 없음 — 로컬 모드 유지 */ }
  }

  if(S.theme) document.documentElement.setAttribute("data-theme",S.theme);
  run();
  setSync("idle");
}

const pad=(n,w)=>String(n).padStart(w||3,"0");
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1,2)+"-"+pad(d.getDate(),2);
const today=()=>ymd(new Date());
const hm=d=>pad(d.getHours(),2)+":"+pad(d.getMinutes(),2);
const dayDiff=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);

const st=n=>S.done[n]||(S.done[n]={lab:[],q:[],pick:[],tried:[],ok:0});
const isSolved=n=>{const d=byDay(n),s=S.done[n]; if(!d||!s)return false;
  return s.lab.filter(Boolean).length>=d.lab.length && s.q.filter(x=>x===1).length>=d.q.length};
const unlocked=n=>n===1||isSolved(n-1);
const TOTAL=()=>DAYS.length;
const nextDay=()=>{for(let i=1;i<=DAYS.length;i++) if(!isSolved(i)) return i; return DAYS.length};
const solvedCount=()=>DAYS.filter(d=>isSolved(d.d)).length;
const rankIdx=()=>{let i=0; for(let k=0;k<RANKS.length;k++) if(S.xp>=RANKS[k].xp) i=k; return i};
function accuracy(){let t=0,o=0; S.subs.forEach(s=>{t++; if(s.r===1)o++}); return t?Math.round(o/t*100):null}

/* ---------- 토스트 ---------- */
let _tt;
function toast(msg){
  let t=document.getElementById("toast");
  if(!t){t=document.createElement("div"); t.id="toast"; t.setAttribute("role","status");
    t.setAttribute("aria-live","polite"); document.body.appendChild(t)}
  t.innerHTML=msg; t.classList.add("show");
  clearTimeout(_tt); _tt=setTimeout(()=>t.classList.remove("show"),3000);
}

/* ---------- 진행 ---------- */
function addXP(n){
  if(!n) return;
  const b=rankIdx(); S.xp+=n; const a=rankIdx();
  S.pts=(S.pts||0)+n;                 // 포인트는 XP 와 같은 양으로 따로 쌓인다
  S.ptsAll=(S.ptsAll||0)+n;           // 누적(쓴 것 포함) — 통계용
  if(a>b) setTimeout(()=>toast('계급 상승 &nbsp;'+tierHTML(a,true)),420);
}
function buy(id){
  const it=shopItem(id);
  if(!it||owns(id)) return false;
  if(rankIdx()<it.need || (S.pts||0)<it.p) return false;
  S.pts-=it.p;
  if(!S.shop) S.shop={owned:[],skin:null,title:null};
  S.shop.owned.push(id);
  toast('구입 &nbsp;<b>'+esc(it.n)+'</b>');
  return true;
}
function equip(id){
  if(id && !owns(id)) return false;
  if(!S.shop) S.shop={owned:[],skin:null,title:null};
  const it=id?shopItem(id):null;
  if(it && it.g==="칭호") S.shop.title = (S.shop.title===id)?null:id;
  else                    S.shop.skin  = (S.shop.skin===id) ?null:id;
  return true;
}
function grantBadge(id){
  if(S.badges.includes(id)) return;
  S.badges.push(id);
  const b=BADGES.find(x=>x.id===id);
  setTimeout(()=>toast('배지 획득 &nbsp;<b>'+b.n+"</b>"),880);
}
function checkBadges(){
  const c=solvedCount();
  if(isSolved(1)) grantBadge("first");
  if(S.best>=3) grantBadge("s3");
  if(S.best>=7) grantBadge("s7");
  if(S.best>=30) grantBadge("s30");
  if(c>=Math.ceil(DAYS.length/2)) grantBadge("half");
  if(c>=DAYS.length) grantBadge("done");
  if(S.first>=50) grantBadge("sharp");
  if(S.first>=150) grantBadge("sharp2");
  ACTS.forEach(a=>{if(a.days.every(d=>isSolved(d.d))) grantBadge("a"+a.n)});
  if(DAYS.filter(d=>d.boss&&isSolved(d.d)).length>=3) grantBadge("boss3");
  if(DAYS.filter(d=>d.lab_mode&&isSolved(d.d)).length>=3) grantBadge("lab3");
}
function bumpStreak(){
  const t=today();
  S.hist[t]=(S.hist[t]||0)+1;
  if(S.last===t) return;
  S.streak = (S.last && dayDiff(S.last,t)===1) ? S.streak+1 : 1;
  S.last=t;
  if(S.streak>S.best) S.best=S.streak;
  if(new Date().getHours()<5) grantBadge("night");
}
function logSub(day,qi,result){
  S.subs.unshift({d:day,q:qi,r:result,t:Date.now()});
  if(S.subs.length>400) S.subs.pop();
}

/* ---------- 직접 입력형 채점 ----------
   명령어는 쓰는 방법이 여러 가지라, 표기 차이는 정규화해서 흡수하고
   정답은 문자열 후보(a)와 정규식 후보(re) 둘 다로 받는다.                     */
function normCmd(s){
  let v=String(s||"")
    .replace(/[‘’“”`]/g,"'")                         // 굽은 따옴표·백틱 통일
    .replace(/\\[\r\n]+/g," ")                       // 줄바꿈 이어쓰기
    .replace(/\s+/g," ")
    .trim()                                          // 앞뒤 공백을 먼저 없애야 아래 ^ 패턴이 걸린다
    .replace(/\s*;+$/,"")
    .trim();
  // 프롬프트 기호($ · #)와 sudo 를 걷어낸다. 대소문자를 가리지 않고,
  // "$ sudo ..." 처럼 겹쳐 있어도 더 걷힐 게 없을 때까지 반복한다.
  let prev;
  do{ prev=v; v=v.replace(/^[$#]\s*/,"").replace(/^sudo\s+/i,"").trim(); }while(v!==prev);
  return v;
}

function gradeInput(q,raw){
  const v=normCmd(raw);
  if(!v) return false;
  const lower=v.toLowerCase();
  if(Array.isArray(q.a) && q.a.some(x=>normCmd(x).toLowerCase()===lower)) return true;
  if(Array.isArray(q.re) && q.re.some(p=>{ try{ return new RegExp(p,"i").test(v); }catch(e){ return false } })) return true;
  return false;
}
const isInputQ=q=>q&&(q.k==="input"||q.k==="cmd");
const qKindLabel=q=>q.k==="cmd"?"명령어 입력":q.k==="input"?"답 입력":"객관식";

/* ---------- 네비 ---------- */
function renderNav(active){
  const i=rankIdx();
  document.querySelectorAll(".nav-menu a").forEach(a=>{
    a.classList.toggle("on", a.dataset.page===active);
  });
  const rank=document.getElementById("nav-user");
  // 단위까지 한 덩어리로 묶는다. 좁은 화면에서 숫자만 숨기면 "XP" 만 남아 어색하다.
  if(rank) rank.innerHTML=tierHTML(i,false)+
    '<span class="rk">'+RANKS[i].n+'</span>'+
    '<b class="mono">'+S.xp+' XP</b>'+
    '<span class="pt mono" title="상점 포인트">'+(S.pts||0)+' P</span>';

  const acct=document.getElementById("nav-account");
  if(acct){
    if(Store.mode==="server"){
      acct.innerHTML='<span class="sync-dot" id="sync-dot" title="서버에 저장됨"></span>'+
        '<b>'+esc(Store.user?Store.user.username:"")+'</b>'+
        '<button class="nav-btn" id="logout-btn" type="button">로그아웃</button>';
      const lo=document.getElementById("logout-btn");
      if(lo) lo.onclick=async()=>{
        try{ await fetch("api/logout",{method:"POST"}); }catch(e){}
        try{ sessionStorage.removeItem("ns_local"); localStorage.removeItem(KEY); }catch(e){}
        location.replace("login.html");
      };
    }else{
      acct.innerHTML='<span class="mode-chip" title="이 브라우저에만 저장됩니다">로컬</span>';
    }
  }

  // 랭킹·팀·프로필은 서로 비교하는 기능이라 서버가 있어야 뜻이 있다
  document.querySelectorAll('.nav-menu a[data-page="rank"],.nav-menu a[data-page="team"]')
    .forEach(a=>{ a.hidden = Store.mode!=="server"; });

  const tb=document.getElementById("theme-btn");
  if(tb) tb.onclick=()=>{
    const r=document.documentElement;
    const dark=r.getAttribute("data-theme")==="dark" ||
      (!r.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    r.setAttribute("data-theme",dark?"light":"dark");
    S.theme=dark?"light":"dark"; save();
  };
}
/* ---------- 요약 카드 ---------- */
function summaryHTML(){
  const i=rankIdx(), cur=RANKS[i], nx=RANKS[i+1];
  const c=solvedCount(), acc=accuracy();
  const pct = nx ? Math.min(100,(S.xp-cur.xp)/(nx.xp-cur.xp)*100) : 100;
  return '<div class="summary">'+
    '<div class="card rank"><div class="k">계급</div>'+
      '<div class="tierline">'+tierHTML(i,false)+'<span class="v">'+cur.n+'</span>'+
        '<span class="lvchip">LV.'+(i+1)+'</span></div>'+
      '<div class="pbar"><i style="width:'+pct+'%"></i></div>'+
      '<div class="pmeta"><span class="mono">'+S.xp+' XP</span><span class="mono">'+
        (nx?"다음 "+nx.n+"까지 "+(nx.xp-S.xp):"최고 계급")+'</span></div></div>'+
    '<div class="card"><div class="k">해결</div><div class="v">'+c+'<small>/'+TOTAL()+'</small></div>'+
      '<div class="pbar ac"><i style="width:'+(c/TOTAL()*100)+'%"></i></div>'+
      '<div class="pmeta"><span>진행률</span><span class="mono">'+Math.round(c/TOTAL()*100)+'%</span></div></div>'+
    '<div class="card"><div class="k">연속 학습</div><div class="v">'+S.streak+'<small>일</small></div>'+
      '<div class="pmeta" style="margin-top:11px"><span>최고 기록</span><span class="mono">'+S.best+'일</span></div></div>'+
    '<div class="card"><div class="k">정답률</div><div class="v">'+(acc===null?"—":acc+'<small>%</small>')+'</div>'+
      '<div class="pmeta" style="margin-top:11px"><span>제출</span><span class="mono">'+S.subs.length+'회</span></div></div>'+
  '</div>';
}

/* ---------- 잔디 ---------- */
function grassHTML(weeks){
  weeks=weeks||18;
  const end=new Date(); end.setHours(0,0,0,0);
  end.setDate(end.getDate()+(6-end.getDay()));
  const cells=weeks*7;
  const start=new Date(end); start.setDate(start.getDate()-cells+1);
  let h='<div class="grass">';
  for(let w=0;w<weeks;w++){
    h+='<div class="gcol">';
    for(let dd=0;dd<7;dd++){
      const cur=new Date(start); cur.setDate(start.getDate()+w*7+dd);
      const k=ymd(cur), v=S.hist[k]||0;
      const lv = v>=3?"l3":v===2?"l2":v===1?"l1":"";
      h+='<span class="gcell '+lv+'" title="'+k+' · '+v+'문제"></span>';
    }
    h+='</div>';
  }
  h+='</div><div class="glegend"><span>적음</span><span class="gcell"></span>'+
     '<span class="gcell l1"></span><span class="gcell l2"></span><span class="gcell l3"></span><span>많음</span></div>';
  return h;
}
