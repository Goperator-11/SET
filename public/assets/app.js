/* SFSE — 공통 로직 */

const RANKS=[
 {xp:0,n:"Α",t:"Α"},
 {xp:540,n:"Β",t:"Β"},
 {xp:1360,n:"Γ",t:"Γ"},
 {xp:2780,n:"Δ",t:"Δ"},
 {xp:4130,n:"Ε",t:"Ε"},
 {xp:5760,n:"Ζ",t:"Ζ"},
 {xp:7250,n:"Η",t:"Η"},
 {xp:8710,n:"Θ",t:"Θ"},
 {xp:10080,n:"Ι",t:"Ι"},
 {xp:11420,n:"Κ",t:"Κ"},
 {xp:12600,n:"Λ",t:"Λ"},
 {xp:13630,n:"Μ",t:"Μ"},
 {xp:14560,n:"Ν",t:"Ν"},
 {xp:15380,n:"Ξ",t:"Ξ"},
 {xp:16280,n:"Ω",t:"Ω"}
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

const DAYS=[]; ACTS.forEach(a=>a.days.forEach(d=>{d.act=a.n; DAYS.push(d)}));
const byDay=n=>DAYS.find(d=>d.d===n);
const actOf=n=>ACTS.find(a=>a.n===n);
const KEY="nightshift.v1";

const BLANK={ver:2,xp:0,done:{},streak:0,best:0,last:"",cur:1,first:0,miss:[],badges:[],subs:[],hist:{},theme:""};
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
const STATE_VER=2;
let migrated=false;
function migrate(o){
  if(!o||o.ver>=STATE_VER) return o;
  migrated=true;
  const shift=k=>{const r={}; for(const n in k){ const v=+n; r[isNaN(v)?n:v+20]=k[n]; } return r;};
  if(o.done) o.done=shift(o.done);
  if(o.hist) o.hist=shift(o.hist);
  if(Array.isArray(o.miss)) o.miss=o.miss.map(m=>(m&&typeof m==="object"&&typeof m.d==="number")?Object.assign({},m,{d:m.d+20}):m);
  if(Array.isArray(o.subs)) o.subs=o.subs.map(m=>(m&&typeof m==="object"&&typeof m.d==="number")?Object.assign({},m,{d:m.d+20}):m);
  if(typeof o.cur==="number"&&o.cur>0) o.cur=Math.min(o.cur+20,160);
  o.ver=STATE_VER;
  return o;
}

function adopt(obj){
  obj=migrate(obj);
  S=Object.assign({},BLANK,obj||{});
  ["miss","badges","subs"].forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; });
  if(!S.hist||typeof S.hist!=="object") S.hist={};
  if(!S.done||typeof S.done!=="object") S.done={};
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
  if(a>b) setTimeout(()=>toast('레벨 업 &nbsp;<b>LV.'+(a+1)+" "+RANKS[a].n+"</b>"),420);
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
  if(rank) rank.innerHTML='<span class="tier">'+RANKS[i].t+'</span>'+
    '<span class="rk">LV.'+(i+1)+'</span> <b class="mono">'+S.xp+'</b> XP';

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

  const rk=document.querySelector('.nav-menu a[data-page="rank"]');
  if(rk) rk.hidden = Store.mode!=="server";

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
      '<div class="tierline"><span class="tierbadge">LV.'+(i+1)+'</span><span class="v">'+cur.n+'</span></div>'+
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
