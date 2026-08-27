# 야간근무 100일

블루팀(SOC / DFIR) 보안 엔지니어가 되기 위한 **문제 풀이형 학습 사이트**.
하루 30분씩 100일, 백준처럼 문제를 하나씩 풀어 나갑니다.

**→ https://goperator-11.github.io/SET/** (체험판 · 브라우저에만 저장)

내 서버에 올리면 **계정 로그인**이 붙고 진도가 서버 DB에 저장되어, 회사 PC·집·폰 어디서 접속해도 이어집니다.

---

## 무엇인가

보안 로드맵은 널려 있지만 대부분 "이걸 공부하세요" 목록에서 끝납니다.
이 사이트는 그 로드맵을 **매일 풀 수 있는 문제 100개**로 쪼갠 것입니다.

하루 한 문제, 30분:

| 구간 | 시간 | 내용 |
|---|---|---|
| 개념 | 10분 | 그날의 핵심 하나를 실무 맥락으로 설명 |
| 실습 | 15분 | 직접 쳐 보는 명령어 · 과제 (체크하면 XP) |
| 확인 문제 | 5분 | 객관식 채점 — 맞았습니다!! / 틀렸습니다 |

실습과 문제를 모두 마쳐야 **해결** 처리되고, 그래야 다음 문제가 열립니다.

## 커리큘럼

100일 · 205문제 · 411개 실습 과제. 20 / 40 / 60 / 80 / 100일차는 **보스 문제**(종합 시나리오)입니다.

| ACT | 일차 | 주제 | 다루는 것 |
|---|---|---|---|
| 1 | 1–20 | 관제실 입문 | 리눅스 로그, `grep`·`awk` 파이프라인, journalctl, SSH 브루트포스, 지속성, 정규식 |
| 2 | 21–40 | 패킷의 눈 | tcpdump·BPF, Wireshark, 포트 스캔 지문, DNS 터널링, DGA, C2 비컨, JA3, Zeek, Suricata |
| 3 | 41–60 | 엔드포인트 감시 | MITRE ATT&CK, 이벤트 로그, Logon Type, Sysmon, PowerShell 로깅, LOLBins, AD·Kerberos, 랜섬웨어 킬체인 |
| 4 | 61–80 | 탐지 엔지니어링 | SIEM 파이프라인, ELK·KQL, Splunk SPL, ECS, **Sigma 룰 작성**, 오탐 튜닝, Atomic Red Team, Pyramid of Pain |
| 5 | 81–100 | 침해대응과 포렌식 | IR 라이프사이클, 증거 보전, KAPE, `$MFT`, 타임라인, 레지스트리, 메모리 포렌식, 멀웨어 트리아지, 클라우드, 커리어 |

## 게임 요소

- **XP와 계급** — 신입 관제원 → 로그 판독병 → 티어1 분석가 → … → SOC 아키텍트 (10단계)
- **연속 학습일** — 잔디로 표시
- **배지 15종** — 액트 클리어, 연속 학습, 보스 처치, 첫 제출 정답 누적 등
- **채점 현황** — 제출 기록 전체와 정답률
- **오답 노트** — 틀린 문제는 자동으로 모여서 다시 볼 수 있습니다

## 두 가지 모드

같은 코드가 두 방식으로 돕니다. 서버 API가 있으면 서버 모드, 없으면 로컬 모드로 **자동 전환**됩니다.

| | 로컬 모드 | 서버 모드 |
|---|---|---|
| 어디서 | GitHub Pages, 파일 직접 열기 | 내 서버 (Docker) |
| 로그인 | 없음 | 계정 로그인 |
| 진도 저장 | 브라우저 `localStorage` | 서버 SQLite |
| 기기 간 이어보기 | ✗ (수동 백업/복원) | ✓ |
| 랭킹 | ✗ | ✓ |

로컬 모드는 브라우저에만 저장되므로, 기기를 바꾸거나 방문 기록을 지우면 사라집니다.
**내 정보 → 데이터 백업 → 내보내기**로 받은 문자열을 보관해 두세요.

---

## 내 서버에 올리기 (Docker)

서버컴에서 딱 이것만 하면 됩니다.

```bash
git clone https://github.com/Goperator-11/SET.git && cd SET && cp .env.example .env
```

`.env`를 열어 세 줄을 채웁니다.

```
HOST_PORT=3000
INVITE_CODE=              # 혼자 쓰면 비워두세요
COOKIE_SECURE=false       # 도메인에 https 를 붙였으면 true
```

띄웁니다.

```bash
docker compose up -d --build
```

브라우저에서 `http://서버주소:3000` 으로 들어가 **첫 계정을 만들면 그 계정이 관리자**가 됩니다.
그다음부터는 `INVITE_CODE`를 아는 사람만 가입할 수 있고, 비워두면 가입이 완전히 닫힙니다.

**업데이트할 때**

```bash
git pull && docker compose up -d --build
```

진도는 `nightshift-data` 볼륨에 있어서 다시 빌드해도 그대로 남습니다.

**백업**

```bash
docker run --rm -v nightshift-data:/data -v "$PWD:/out" alpine tar czf /out/nightshift-backup.tar.gz -C /data .
```

### 도메인 붙이기

컨테이너는 평문 HTTP를 3000번 포트로 냅니다. 앞에 리버스 프록시를 두고 HTTPS를 붙이세요.
인증서까지 자동으로 받아주는 Caddy가 제일 간단합니다. `Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

HTTPS를 붙였다면 **`.env`의 `COOKIE_SECURE=true`로 바꾸고 다시 올리세요.** 쿠키가 암호화된 연결에서만 오갑니다.

## 보안

혼자 쓰는 학습 사이트지만 인터넷에 열리는 이상 기본은 지켰습니다.

- 비밀번호는 **scrypt + 무작위 salt**로 해시해 저장합니다. 평문은 어디에도 남지 않습니다
- 세션은 무작위 토큰이며 쿠키는 `HttpOnly` · `SameSite=Strict`, HTTPS면 `Secure`
- 로그인 8회 실패 시 10분 잠금
- 다른 사이트에서 오는 변경 요청은 Origin 검사로 차단 (CSRF)
- 정적 파일은 경로 탈출(`../`)을 막습니다
- 컨테이너는 root가 아닌 전용 사용자로 돕니다
- **외부 npm 패키지를 하나도 쓰지 않습니다.** Node 24 내장 기능만으로 만들어 공급망 위험이 없습니다

## 구조

```
Dockerfile              Node 24 alpine, 의존성 없음
docker-compose.yml      서비스 + 데이터 볼륨
.env.example            설정 (복사해서 .env 로)

server/server.js        HTTP 라우팅 · API · 정적 파일
server/db.js            SQLite 스키마 · 비밀번호 해시 · 세션

public/index.html       문제집 (문제 목록 · 요약 · 잔디)
public/problem.html     문제 페이지  ?day=1..100
public/status.html      채점 현황 · 오답 노트
public/user.html        내 정보 (계급 · 배지 · 백업)
public/rank.html        랭킹 (서버 모드 전용)
public/login.html       로그인 · 회원가입
public/assets/style.css 스타일
public/assets/data.js   커리큘럼 100일치 데이터
public/assets/app.js    상태 · 서버 동기화 · XP · 배지
```

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/config` | 가입 가능 여부 (로그인 불필요) |
| GET | `/api/me` | 내 계정 |
| POST | `/api/register` | 가입 (첫 계정은 자유, 이후 초대코드) |
| POST | `/api/login` / `/api/logout` | 로그인 · 로그아웃 |
| POST | `/api/password` | 비밀번호 변경 (다른 기기 세션 전부 해제) |
| GET · PUT | `/api/progress` | 진도 불러오기 · 저장 |
| GET | `/api/ranking` | 랭킹 |

## 서버 없이 그냥 보기

```bash
git clone https://github.com/Goperator-11/SET.git && cd SET/public && python -m http.server 8000
```

커리큘럼을 고치려면 `assets/data.js`의 해당 일차 객체만 수정하면 됩니다.

```js
{ d: 16,                      // 일차
  t: "제목",
  g: "그날의 목표 한 줄",
  c: "<p>개념 본문 HTML</p>",
  term: "예시 출력 (선택)",
  lab: ["실습 과제", ...],
  q: [{ t:"질문", o:["보기",...], a:0, e:"해설" }],
  boss: true                  // 보스 문제만
}
```

## 참고

이 사이트는 학습 자료입니다. 실습 중 스캔·공격 도구를 다룰 때는 **반드시 본인 소유의
격리된 환경(VM)에서만** 실행하세요. 남의 시스템을 대상으로 하면 불법입니다.

## 라이선스

MIT
