# SFSE

> **S**ite **F**or **S**ecurity **E**ngineering

블루팀(SOC / DFIR) 보안 엔지니어가 되기 위한 **문제 풀이형 학습 사이트**.
하루 30분씩 160일, 백준처럼 문제를 하나씩 풀어 나갑니다.
**터미널을 한 번도 안 열어봤어도 ACT 0(리눅스 기초 20일)부터 시작하면 됩니다.**

**→ https://goperator-11.github.io/SET/** (체험판 · 브라우저에만 저장)

내 서버에 올리면 **계정 로그인**이 붙고 진도가 서버 DB에 저장되어, 회사 PC·집·폰 어디서 접속해도 이어집니다.

---

## 무엇인가

보안 로드맵은 널려 있지만 대부분 "이걸 공부하세요" 목록에서 끝납니다.
이 사이트는 그 로드맵을 **매일 풀 수 있는 문제 160개**로 쪼갠 것입니다.

하루 한 문제, 30분:

| 구간 | 시간 | 내용 |
|---|---|---|
| 개념 | 10분 | 그날의 핵심 하나를 실무 맥락으로 설명 |
| 실습 | 15분 | 직접 쳐 보는 명령어 · 과제 (체크하면 XP) |
| 확인 문제 | 5분 | 객관식·**명령어 직접 입력**·**CTF 유형** — 맞았습니다!! / 틀렸습니다 |

실습과 문제를 모두 마쳐야 **해결** 처리되고, 그래야 다음 문제가 열립니다.

## 커리큘럼

160일 · **651문항** · 1,145개 실습 과제. 20 / 40 / 60 / 80 / 100 / 120 / 140 / 160일차는 **보스 문제**이고,
그중 40 · 60 · 80 · 140 · 160일차는 실제 로그를 내려받아 분석하는 **실전 랩**입니다.

| ACT | 일차 | 주제 | 다루는 것 |
|---|---|---|---|
| **0** | **1–20** | **리눅스 첫걸음** | 터미널·셸, 폴더 구조, `cat`·`less`·`tail`, 파일 조작, 경로, 권한·`chmod`, `sudo`, 리다이렉션, **파이프**, `find`, 편집기, 프로세스, `apt`, `systemctl`, 네트워크 기본, `tar`, 셸 스크립트 |
| 1 | 21–40 | 관제실 입문 | 리눅스 로그, `grep`·`awk` 파이프라인, journalctl, SSH 브루트포스, 지속성, 정규식 |
| 2 | 41–60 | 패킷의 눈 | tcpdump·BPF, Wireshark, 포트 스캔 지문, DNS 터널링, DGA, C2 비컨, JA3, Zeek, Suricata |
| 3 | 61–80 | 엔드포인트 감시 | MITRE ATT&CK, 이벤트 로그, Logon Type, Sysmon, PowerShell 로깅, LOLBins, AD·Kerberos, 랜섬웨어 킬체인 |
| 4 | 81–100 | 탐지 엔지니어링 | SIEM 파이프라인, ELK·KQL, Splunk SPL, ECS, **Sigma 룰 작성**, 오탐 튜닝, Atomic Red Team, Pyramid of Pain |
| 5 | 101–120 | 침해대응과 포렌식 | IR 라이프사이클, 증거 보전, KAPE, `$MFT`, 타임라인, 레지스트리, 메모리 포렌식, 멀웨어 트리아지 |
| 6 | 121–140 | 클라우드와 컨테이너 | IAM 권한 상승, CloudTrail, S3 노출, 컨테이너 런타임·탈출, 쿠버네티스 RBAC·감사 로그, Falco, IaC 보안 |
| 7 | 141–160 | 위협 헌팅과 자동화 | 헌팅 방법론, 스택 카운팅, 이상치 탐지, Jupyter, 상관 규칙, 위험 점수, UEBA, 로그 파이프라인, 퍼플팀, 허니토큰 |

## 게임 요소

- **XP와 계급 15단계** — **α 알파**부터 **ω 오메가**까지, 단계마다 고유한 색.
  람다부터 그라데이션, 크시는 발광, 오메가는 홀로그램이 흐른다
- **상점** — 문제를 풀면 XP 와 같은 양의 **포인트**가 쌓인다(계급은 그대로).
  닉네임 색·그라데이션·네온·반짝임·무지개·홀로그램과 칭호를 산다.
  칭호는 실제 군사·보안 약어다 — `WATCHSTANDER` `TIER-1` `SIGINT` `DFIR`
  `QRF` `CTI` `OVERWATCH` `DEFCON 1`. 비싼 것은 계급 조건이 붙는다
- **팀** — 같이 공부하는 사람을 묶는다. 태그를 정하면 랭킹에서 닉네임 앞에
  `SOC` 처럼 붙고, 팀 XP 는 팀원 합계로 따로 순위가 매겨진다.
  팀장이 나가면 다음 사람에게 넘어가고, 아무도 없으면 팀은 사라진다
- **프로필** — 랭킹·팀 명단에서 아이디를 누르면 열린다.
  계급·소속·액트별 진행·배지를 한 화면에서 본다
- **워게임 7종** — 힌트 없이 실전 로그를 분석해 답을 제출하는 CTF 모드 (1,530점)
- **도구 레퍼런스 38종** — 설치 명령, 첫 실행 5분, 명령어 311개 치트시트
- **연속 학습일** — 잔디로 표시
- **배지 22종** — 액트 클리어, 연속 학습, 보스 처치, 실전 랩 해결, 첫 제출 정답 누적 등
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

서버에서 이 세 줄이면 끝납니다.

```bash
git clone https://github.com/Goperator-11/SET.git && cd SET && ./setup.sh
```

`setup.sh` 가 도커 확인 → 설정 파일 생성 → 빌드 → 기동 → 동작 확인까지 합니다.
초대코드는 자동으로 만들어 화면에 보여줍니다.

브라우저로 들어가 **첫 계정을 만들면 그 계정이 관리자**가 됩니다.
그 뒤로는 초대코드를 아는 사람만 가입할 수 있고, 코드를 비우면 가입이 완전히 닫힙니다.

### Cloudflare Tunnel (권장)

집이나 사무실 서버라면 포트를 여는 대신 **터널**을 쓰는 편이 낫습니다.

- 공유기 포트포워딩이 필요 없습니다
- 집 IP 가 노출되지 않습니다
- 방화벽에 구멍을 내지 않습니다
- HTTPS 인증서를 Cloudflare 가 알아서 처리합니다
- 통신사가 공인 IP 를 주지 않는 환경(CGNAT)에서도 됩니다

**1. 터널 만들기** — Cloudflare 대시보드에서

```
Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared
```

이름을 아무거나 정하고 **토큰을 복사**합니다.

**2. Public hostname 설정** — 같은 화면에서

| 항목 | 값 |
|---|---|
| Subdomain | 원하는 이름 (예: `study`) |
| Domain | 보유한 도메인 |
| Type | `HTTP` |
| URL | **`nightshift:3000`** |

URL 이 `localhost:3000` 이 아니라 **`nightshift:3000`** 인 점이 중요합니다.
cloudflared 가 컨테이너 안에서 돌기 때문에, 같은 도커 네트워크의 컨테이너 이름으로 찾아갑니다.

**3. 실행**

```bash
./setup.sh
```

1번(Cloudflare Tunnel)을 고르고 토큰과 도메인을 넣으면 됩니다.
직접 하고 싶다면 `.env` 에 `TUNNEL_TOKEN` 과 `APP_ORIGIN` 을 채우고:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflared.yml up -d --build
```

### 리버스 프록시 뒤에 둘 때 꼭 맞춰야 하는 두 가지

Cloudflare 든 nginx 든 앞에 뭔가를 두면 이 둘을 놓치기 쉽습니다.

| 설정 | 값 | 안 맞추면 |
|---|---|---|
| `COOKIE_SECURE` | HTTPS 면 `true` | 로그인이 계속 풀립니다 |
| `APP_ORIGIN` | `https://내도메인` | 로그인·저장 요청이 403 으로 막힙니다 |

`APP_ORIGIN` 이 필요한 이유는, 프록시가 `Host` 헤더를 내부 이름(`nightshift:3000`)으로 바꿔
전달하는 경우가 있어서입니다. 그러면 브라우저가 보낸 `Origin`(진짜 도메인)과 달라져
CSRF 검사에 걸립니다. `APP_ORIGIN` 을 지정하면 그 값만 믿습니다.

막혔을 때는 에러 메시지에 실제 값이 찍히니 그대로 맞추면 됩니다.

```
허용되지 않은 출처입니다. (요청 study.example.com / 설정 nightshift:3000)
```

### 자주 쓰는 명령

```bash
docker compose logs -f nightshift
```

| 하고 싶은 것 | 명령 |
|---|---|
| 업데이트 | `git pull && ./setup.sh` |
| 상태 확인 | `docker compose ps` |
| 터널 로그 | `docker logs nightshift-tunnel` |
| 재시작 | `docker compose restart` |
| 진도 백업 | `docker run --rm -v nightshift-data:/d -v "$PWD:/o" alpine tar czf /o/backup.tar.gz -C /d .` |

진도는 `nightshift-data` 볼륨에 있어서 다시 빌드해도 남습니다.

## 보안

혼자 쓰는 학습 사이트지만 인터넷에 열리는 이상 기본은 지켰습니다.

- 비밀번호는 **scrypt + 무작위 salt**로 해시해 저장합니다. 평문은 어디에도 남지 않습니다
- 세션은 무작위 토큰이며 쿠키는 `HttpOnly` · `SameSite=Strict`, HTTPS면 `Secure`
- 로그인 8회 실패 시 10분 잠금 (프록시 뒤에서도 `CF-Connecting-IP` 로 사람별 구분)
- 다른 사이트에서 오는 변경 요청은 Origin 검사로 차단 (CSRF). 프록시 뒤에서는 `APP_ORIGIN` 으로 고정
- 정적 파일은 경로 탈출(`../`)을 막습니다
- 컨테이너는 root가 아닌 전용 사용자로 돕니다
- **외부 npm 패키지를 하나도 쓰지 않습니다.** Node 24 내장 기능만으로 만들어 공급망 위험이 없습니다

## 구조

```
setup.sh                    설치 도우미 (이것만 실행하면 됨)
Dockerfile                  Node 24 alpine, 의존성 없음
docker-compose.yml          서비스 + 데이터 볼륨
docker-compose.cloudflared.yml  Cloudflare Tunnel 오버레이
.env.example                설정 (복사해서 .env 로)

server/server.js        HTTP 라우팅 · API · 정적 파일
server/db.js            SQLite 스키마 · 비밀번호 해시 · 세션

public/index.html       문제집 (문제 목록 · 요약 · 잔디)
public/problem.html     문제 페이지  ?d=1..160
public/status.html      채점 현황 · 오답 노트
public/user.html        내 정보 (계급 · 배지 · 백업)
public/wargame.html     워게임 (실전 시나리오 7종)
public/tools.html       도구 레퍼런스 (38종)
public/shop.html        상점 (포인트로 닉네임 치장·칭호 구입)
public/team.html        팀 (만들기·가입·팀 랭킹, 서버 모드 전용)
public/profile.html     프로필 (남의 기록 보기, 서버 모드 전용)
public/rank.html        랭킹 (계급·치장 표시, 서버 모드 전용)
public/login.html       로그인 · 회원가입
public/assets/style.css 스타일
public/assets/data.js   커리큘럼 160일치 데이터 (빌드 결과물)
public/labs/            실전 랩 로그 파일
content/act0~7.js       커리큘럼 원본 (act0 = 리눅스 기초)
tools/                  빌드·검증·랩 생성 스크립트
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

---

## 커리큘럼 수정하기

`public/assets/data.js` 는 **빌드 결과물이라 직접 고치면 안 됩니다.** 원본은 `content/` 에 있습니다.

```bash
python tools/build_data.py
```

이 명령이 `content/act1~7.js` 를 파싱하고 `tools/patches*.py` 를 병합해 `data.js` 를 만듭니다.
빌드하면서 **정답 인덱스, 보기 중복, 해설 누락, 정규식 오류, 첨부 파일 존재 여부**를 검사하고,
직접입력형 문제는 **모범 답안이 자기 정규식에 실제로 매칭되는지**까지 확인합니다. 하나라도 걸리면 빌드가 멈춥니다.

HTML 의 `assets/...?v=` 버전 값도 이때 자동으로 갱신되어, 업데이트 후 낡은 JS 가 캐시에 남는 문제를 막습니다.

- `content/act1~7.js` — 일차별 본문·실습·문제
- `tools/patches.py`, `tools/patches_b.py` — 1~100일 실습 추가분
- `tools/patches_q.py` — 직접입력형 문제, 실전 랩 첨부 파일 지정
- `tools/gen_labs.py` — 실전 랩용 로그 파일 생성 (시드 고정, 언제 돌려도 같은 결과)
- `content/tools.js` — 도구 레퍼런스 데이터
- `content/wargame.js` — 워게임 시나리오와 정답

## 문제 유형

| 유형 | `k` | 채점 |
|---|---|---|
| 객관식 | 없음 | 보기 인덱스 일치 |
| 명령어 입력 | `"cmd"` | 표기 정규화 후 문자열·정규식 대조 |
| 답 입력 | `"input"` | 같음 |

명령어 채점은 **`sudo` 접두사, 대소문자, 굽은 따옴표, 여분 공백, 줄바꿈 이어쓰기**를 정규화해 흡수합니다.
`grep -c 'Failed password' ...` 와 `sudo GREP -c "Failed password" ...` 는 같은 답으로 처리됩니다.

## 실전 랩

40 · 60 · 80 · 140 · 160일차는 **실제 로그 파일을 내려받아 분석**합니다.
전부 합성 데이터이고 시드가 고정되어 있어, 문제의 정답이 로그에서 실제로 도출됩니다.

| 일차 | 파일 | 찾아야 하는 것 |
|---|---|---|
| 40 | `lab-auth.log`, `lab-access.log` | 침입 성공 IP·계정, UID 0 백도어, 웹셸 경로 |
| 60 | Zeek `lab-conn.log`, `lab-dns.log` | 스캐너, C2 비컨(간격 변동계수), 터널링 도메인, 유출량 |
| 80 | Sysmon 이벤트 | 최초 실행 부모, C2 도메인, 지속성 키, lsass 접근 프로세스 |
| 140 | CloudTrail | 공격자 IP, 지속성 API, 유출 버킷, 로그 삭제 시도 |
| 160 | 위 전부 | 네 전선을 하나의 타임라인으로 |
