/* 워게임 — 힌트 없이 실전 로그를 분석해 답(플래그)을 제출하는 모드.
   문제집이 '배우는 곳'이라면 워게임은 '검증하는 곳'이다.

   id     고유 번호        t 제목        lv 난이도 1~5
   pts    배점            files 첨부 파일
   brief  상황 설명(HTML)
   tasks  [{q:질문, a:[정답후보], re:[정규식], hint:힌트(감점), e:해설}]
   need   선행 조건 (앞 워게임 id 배열)                                   */
const WARGAMES=[

{id:1,t:"새벽 3시의 로그인",lv:1,pts:100,
 files:[{n:"day20-auth.log",p:"labs/day20-auth.log",d:"리눅스 서버 인증 로그"}],
 brief:"<p>월요일 아침, 인터넷에 노출된 웹서버 한 대의 인증 로그를 받았습니다. "+
       "주말 사이 뭔가 있었다는 제보만 있고 상세는 없습니다.</p>"+
       "<p><b>이 로그 하나로 침입 여부를 판단하고, 침입했다면 누가 어떻게 들어왔는지 밝혀내세요.</b></p>"+
       "<p class='muted'>필요한 건 ACT 1 에서 다 배웠습니다. grep, awk, sort, uniq 면 충분합니다.</p>",
 tasks:[
  {q:"침입에 성공한 공격자의 IP 주소는?",a:["198.51.100.77"],re:["^198\\.51\\.100\\.77$"],
   hint:"성공한 로그인을 먼저 찾고, 실패 횟수 상위 IP와 대조하세요.",
   e:"<code>grep 'Accepted password' day20-auth.log</code> 한 줄이면 나옵니다. 이 IP는 414회 실패 후 성공했습니다."},
  {q:"뚫린 계정 이름은?",a:["deploy"],re:["^deploy$"],
   hint:"같은 Accepted password 줄에 있습니다.",
   e:"<b>deploy</b> — 배포용 계정입니다. 공격자는 먼저 <code>Invalid user</code> 로 계정을 탐색하다가, 실재하는 이 계정을 찾은 뒤 집중 공격했습니다."},
  {q:"공격자가 침입 후 만든 백도어 계정 이름은?",a:["svc-monitor"],re:["^svc-monitor$"],
   hint:"침입 시각 이후의 useradd 기록을 보세요.",
   e:"<b>svc-monitor</b> — UID 0 으로 만들어져 이름만 다를 뿐 root 입니다."},
  {q:"공격자가 중지시킨 보안 관련 서비스의 이름은?",a:["auditd"],re:["^auditd$"],
   hint:"sudo 로 systemctl stop 을 실행한 기록을 찾으세요.",
   e:"<b>auditd</b> — 감사 로그 데몬을 껐습니다. 이후 행적이 안 남게 하려는 것이고, <b>이 행위 자체가 강력한 침해 지표</b>입니다."}]},

{id:2,t:"업로드 폴더의 이미지",lv:2,pts:150,need:[1],
 files:[{n:"day20-access.log",p:"labs/day20-access.log",d:"같은 서버의 웹 액세스 로그"}],
 brief:"<p>SSH 침입을 밝혀냈지만, 팀장이 묻습니다. <b>\"그 전에 웹으로 먼저 들어온 거 아니야?\"</b></p>"+
       "<p>같은 서버의 웹 로그를 받았습니다. 시간을 보면 SSH 성공(03:24)보다 <b>이른</b> 활동이 있습니다.</p>"+
       "<p><b>최초 침투가 정말 SSH였는지 확인하세요.</b></p>",
 tasks:[
  {q:"디렉터리 브루트포싱에 사용된 도구 이름은? (User-Agent에 그대로 있습니다)",
   a:["gobuster"],re:["^gobuster(/[\\d.]+)?$"],
   hint:"404를 대량으로 낸 요청들의 12번째 필드를 보세요.",
   e:"<b>gobuster</b> — 워드리스트로 경로를 대입하는 도구입니다. 880회 404가 그 흔적입니다."},
  {q:"공격자가 업로드해 실행한 웹셸의 경로는?",a:["/uploads/img_2231.php"],re:["^/?uploads/img_2231\\.php$"],
   hint:"200 응답을 받은 .php 경로 중 정상 페이지가 아닌 것. ?cmd= 파라미터가 붙어 있습니다.",
   e:"<b>/uploads/img_2231.php</b> — 이미지처럼 위장했습니다. <b>업로드 폴더에서 PHP가 실행되는 설정</b>이 근본 원인입니다."},
  {q:"웹셸을 통해 실행된 명령 중, 설정 파일을 읽으려 한 것의 대상 파일 경로는?",
   a:["/var/www/html/config.php"],re:["config\\.php$"],
   hint:"cmd= 파라미터 값들을 디코딩해서 보세요. + 는 공백입니다.",
   e:"<b>/var/www/html/config.php</b> — DB 접속 정보를 노렸습니다. 여기서 얻은 자격증명이 SSH 침입으로 이어졌을 가능성이 큽니다."},
  {q:"최초 침투 경로는 SSH인가 웹인가? (한 글자로: 웹 또는 SSH)",
   a:["웹","web"],re:["^(웹|web)$"],
   hint:"두 로그의 시각을 나란히 놓고 비교하세요.",
   e:"<b>웹</b>입니다. 01:40 디렉터리 스캔 → 02:05 웹셸 업로드가 SSH 성공(03:24)보다 앞섭니다. "+
     "<b>최초 벡터를 잘못 짚으면 그 구멍을 안 막아 똑같이 다시 뚫립니다.</b>"}]},

{id:3,t:"5분마다 울리는 신호",lv:3,pts:200,need:[2],
 files:[{n:"day40-conn.log",p:"labs/day40-conn.log",d:"Zeek 연결 로그 (2,468줄)"}],
 brief:"<p>내부망 전체의 연결 로그입니다. 어딘가에 감염된 호스트가 있다는 첩보만 있습니다.</p>"+
       "<p><b>주의:</b> C2는 <b>연결 횟수로 정렬하면 절대 안 보입니다.</b> "+
       "정상 사이트가 200회 넘게 통신하는 동안 C2는 25회밖에 안 합니다.</p>"+
       "<p><b>다른 방법을 찾아야 합니다.</b></p>",
 tasks:[
  {q:"내부 포트 스캔을 수행한 호스트의 IP는?",a:["10.10.20.99"],re:["^10\\.10\\.20\\.99$"],
   hint:"conn_state가 S0(SYN만 보내고 응답 없음)인 연결의 출발지를 세어보세요.",
   e:"<b>10.10.20.99</b> — 1034개 포트를 훑었습니다. S0가 스캔의 지문입니다."},
  {q:"C2 서버로 의심되는 외부 IP는?",a:["203.0.113.187"],re:["^203\\.0\\.113\\.187$"],
   hint:"목적지별로 연결 시각의 간격을 구하고, 그 간격의 표준편차÷평균(변동계수)이 가장 작은 곳을 찾으세요.",
   e:"<b>203.0.113.187</b> — 변동계수 0.04. 정상 트래픽은 약 0.99이니 25배 차이입니다. "+
     "<b>사람의 행동은 불규칙하고 자동화는 규칙적입니다.</b>"},
  {q:"C2 통신 주기는 약 몇 초인가? (숫자만)",a:["300"],re:["^300(초|s)?$"],
   hint:"그 목적지로 간 연결들의 시각 차이를 나열해보세요.",
   e:"<b>300초</b>(5분). ±1초 정도 흔들리는 게 공격 도구의 jitter 설정입니다."},
  {q:"감염된 내부 호스트의 IP는?",a:["10.10.20.53"],re:["^10\\.10\\.20\\.53$"],
   hint:"C2와 통신한 쪽입니다.",
   e:"<b>10.10.20.53</b> — 이 호스트가 스캔의 대상이기도 했고 C2와 통신도 했습니다."},
  {q:"유출된 것으로 보이는 데이터 용량은 약 몇 MB인가? (정수)",a:["399"],re:["^399$"],
   hint:"orig_bytes(보낸 양)가 가장 큰 연결을 찾아 1024로 두 번 나누세요.",
   e:"<b>399MB</b>. 받은 건 88KB인데 보낸 게 399MB — <b>업로드가 압도적</b>인 이 비율이 유출의 명확한 신호입니다."}]},

{id:4,t:"길어진 이름들",lv:3,pts:180,need:[3],
 files:[{n:"day40-dns.log",p:"labs/day40-dns.log",d:"Zeek DNS 로그 (953줄)"}],
 brief:"<p>같은 시간대의 DNS 로그입니다. 여기에는 <b>두 종류의 악성 활동</b>이 섞여 있습니다.</p>"+
       "<p>하나는 <b>존재하지 않는 도메인을 잔뜩 조회</b>하고, 다른 하나는 <b>데이터를 실어 나릅니다.</b></p>"+
       "<p class='muted'>질의 횟수로 정렬하면 정상 도메인에 묻힙니다. 다른 각도가 필요합니다.</p>",
 tasks:[
  {q:"NXDOMAIN 응답을 받은 질의는 총 몇 건인가? (숫자만)",a:["148"],re:["^148$"],
   hint:"rcode_name 필드가 NXDOMAIN인 줄을 세세요.",
   e:"<b>148건</b> — 알고리즘이 만든 도메인을 순서대로 찔러본 흔적(DGA)입니다. 대부분 등록되어 있지 않으니 NXDOMAIN이 쏟아집니다."},
  {q:"DNS 터널링에 사용된 등록 도메인은?",a:["telemetry-cdn.net","sync-node7.telemetry-cdn.net"],
   re:["telemetry-cdn\\.net$"],
   hint:"등록 도메인별로 '고유 서브도메인 개수'를 세보세요. 또는 질의 길이가 50자를 넘는 것을 찾으세요.",
   e:"<b>telemetry-cdn.net</b> — 고유 서브도메인이 96개인데 정상 도메인은 전부 1개입니다. "+
     "질의 수로 보면 outlook(92회)·ntp(91회)와 비슷해 안 보이지만, <b>고유 이름 수로 보면 96대 1</b>입니다."},
  {q:"터널링에 사용된 DNS 레코드 타입은? (영문 대문자)",a:["TXT"],re:["^txt$"],
   hint:"해당 도메인 질의들의 qtype_name 필드를 보세요.",
   e:"<b>TXT</b> — 임의 문자열을 담을 수 있어 페이로드 운반에 적합합니다."}]},

{id:5,t:"3월 정산내역 확인요망",lv:4,pts:250,need:[4],
 files:[{n:"day60-sysmon.csv",p:"labs/day60-sysmon.csv",d:"윈도우 Sysmon 이벤트 (254건)"}],
 brief:"<p>재무팀 직원 PC에서 백신이 뭔가를 격리했습니다. 하지만 격리된 건 <b>체인의 마지막 조각</b>일 뿐입니다.</p>"+
       "<p><b>알럿 시각에서 거슬러 올라가</b> 어떻게 들어왔고, 그 사이 무엇이 일어났는지 전부 밝히세요.</p>"+
       "<p class='muted'>CSV라 <code>awk -F,</code> 로 다룰 수 있습니다. 2번째 필드가 EventID입니다.</p>",
 tasks:[
  {q:"최초 악성 실행의 부모 프로세스 이름은? (확장자 포함)",a:["WINWORD.EXE"],re:["^winword\\.exe$"],
   hint:"powershell.exe를 자식으로 낳은 프로세스를 찾으세요. 4번째 필드가 ParentImage입니다.",
   e:"<b>WINWORD.EXE</b> — 매크로 악성 문서입니다. 오피스가 셸을 낳는 건 정상 업무에서 나올 수 없는 계보입니다."},
  {q:"C2로 사용된 도메인은?",a:["cdn-telemetry-sync.net"],re:["^cdn-telemetry-sync\\.net$"],
   hint:"EventID 22(DNS Query) 행의 마지막 필드입니다.",
   e:"<b>cdn-telemetry-sync.net</b> — CDN·텔레메트리를 흉내낸 이름입니다. 이름만으로는 못 거르고, <b>조회한 프로세스가 무엇인지</b>를 봐야 합니다."},
  {q:"지속성 확보를 위해 드롭된 실행 파일의 이름은? (확장자 포함)",
   a:["OneDriveSync.exe"],re:["^onedrivesync\\.exe$"],
   hint:"EventID 11(파일 생성)을 보세요.",
   e:"<b>OneDriveSync.exe</b> — 진짜 OneDrive처럼 보이지만 <code>AppData\\Roaming</code>에서 실행됩니다."},
  {q:"자격증명 탈취를 위해 접근한 시스템 프로세스는? (확장자 포함)",
   a:["lsass.exe"],re:["^lsass\\.exe$"],
   hint:"EventID 10(ProcessAccess)의 TargetImage입니다.",
   e:"<b>lsass.exe</b> — 성공했다면 <b>그 PC에 로그온했던 모든 계정</b>의 자격증명이 유출된 것으로 봐야 합니다."},
  {q:"내부 이동에 사용된 대상 서버 이름은?",a:["SRV-FIN02"],re:["^srv-fin02$"],
   hint:"WmiPrvSE.exe를 부모로 가진 프로세스의 커맨드라인을 보세요.",
   e:"<b>SRV-FIN02</b> — WMI 원격 실행으로 옆으로 번졌습니다. 재무 서버라는 점에서 목표가 분명합니다."},
  {q:"랜섬웨어 직전 단계에서 실행된, 백업을 삭제하는 명령의 프로그램 이름은?",
   a:["vssadmin","vssadmin.exe"],re:["^vssadmin(\\.exe)?$"],
   hint:"섀도 복사본을 지우는 도구입니다.",
   e:"<b>vssadmin</b> — <code>delete shadows /all /quiet</code>. 최초 침투로부터 <b>33분</b> 만입니다. "+
     "이 명령에 대한 자동 대응이 없으면 사람이 개입할 시간이 없습니다."}]},

{id:6,t:"새벽 2시 40분의 API 호출",lv:4,pts:250,need:[5],
 files:[{n:"day120-cloudtrail.json",p:"labs/day120-cloudtrail.json",d:"AWS CloudTrail (248건)"}],
 brief:"<p>GuardDuty가 낯선 IP에서 API 호출이 있었다고 알렸습니다. CloudTrail 원본을 받았습니다.</p>"+
       "<p><b>키가 언제 어디서 유출됐고, 무엇을 가져갔는지</b> 밝히세요.</p>"+
       "<p class='muted'><code>jq</code>가 있으면 편합니다. 없으면 <code>python3 -c</code>로도 됩니다. 구조는 <code>{\"Records\":[...]}</code>입니다.</p>",
 tasks:[
  {q:"공격자의 소스 IP 주소는?",a:["203.0.113.66"],re:["^203\\.0\\.113\\.66$"],
   hint:"sourceIPAddress를 세어 평소 대역과 다른 것을 찾으세요.",
   e:"<b>203.0.113.66</b> — 정상 CI는 52.78.x.x(AWS 서울)에서 오는데 이것만 다른 대역입니다. "+
     "<b>같은 키가 갑자기 다른 IP에서</b> 쓰이는 것이 유출의 전형적 신호입니다."},
  {q:"공격자가 권한 상승을 시도했다가 실패한 IAM API 이름은?",
   a:["AttachUserPolicy"],re:["^attachuserpolicy$"],
   hint:"errorCode가 있는 이벤트 두 건 중 IAM 쪽입니다.",
   e:"<b>AttachUserPolicy</b> — AdministratorAccess를 자기 자신에게 붙이려다 막혔습니다. "+
     "<b>실패 로그가 의도를 가장 잘 드러냅니다.</b>"},
  {q:"권한 상승에 실패한 뒤, 재접속 수단을 확보하려 호출한 API 이름은?",
   a:["CreateAccessKey"],re:["^createaccesskey$"],
   hint:"실패 직후의 IAM 호출을 보세요.",
   e:"<b>CreateAccessKey</b> — 이걸 놓치면 원래 키를 비활성화해도 침해가 계속됩니다."},
  {q:"데이터가 유출된 S3 버킷 이름은?",a:["acme-customer-exports"],re:["^acme-customer-exports$"],
   hint:"공격자 IP의 GetObject 이벤트에서 bucketName을 세보세요.",
   e:"<b>acme-customer-exports</b> — 180개 객체. 이 숫자를 셀 수 있는 건 <b>데이터 이벤트가 켜져 있었기</b> 때문입니다."},
  {q:"흔적을 지우려다 실패한 CloudTrail API 이름은?",a:["StopLogging"],re:["^stoplogging$"],
   hint:"errorCode가 있는 나머지 한 건입니다.",
   e:"<b>StopLogging</b> — 감사 로그를 끄려던 시도입니다. 실패했기 때문에 이 조사가 가능했습니다. "+
     "<b>로그를 끌 권한은 아무에게도 주면 안 됩니다.</b>"}]},

{id:7,t:"네 개의 전선",lv:5,pts:400,need:[3,5,6],
 files:[{n:"day20-auth.log",p:"labs/day20-auth.log",d:"리눅스 인증 로그"},
        {n:"day20-access.log",p:"labs/day20-access.log",d:"웹 액세스 로그"},
        {n:"day40-conn.log",p:"labs/day40-conn.log",d:"Zeek 연결 로그"},
        {n:"day40-dns.log",p:"labs/day40-dns.log",d:"Zeek DNS 로그"},
        {n:"day60-sysmon.csv",p:"labs/day60-sysmon.csv",d:"Sysmon 이벤트"},
        {n:"day120-cloudtrail.json",p:"labs/day120-cloudtrail.json",d:"CloudTrail"}],
 brief:"<p><b>최종 단계입니다.</b> 지금까지의 모든 로그가 한자리에 있습니다.</p>"+
       "<p>리눅스 서버, 내부 네트워크, 윈도우 엔드포인트, 클라우드 — <b>네 개의 전선</b>을 하나의 이야기로 엮으세요.</p>"+
       "<p>이번엔 개별 사실이 아니라 <b>전체 구조</b>를 묻습니다.</p>",
 tasks:[
  {q:"전체 사건에서 가장 먼저 일어난 활동은 어느 로그에 있는가? (파일명)",
   a:["day20-access.log","access.log"],re:["access\\.log$"],
   hint:"각 로그에서 가장 이른 악성 활동의 시각을 비교하세요.",
   e:"<b>day20-access.log</b> — 01:40의 디렉터리 브루트포싱이 모든 것의 시작입니다."},
  {q:"공격자가 리눅스 서버에서 재접속용으로 심어둔, 파일 기반 지속성 수단은? (파일 경로)",
   a:["/root/.ssh/authorized_keys","authorized_keys","~/.ssh/authorized_keys"],
   re:["authorized_keys$"],
   hint:"auth.log의 sudo 명령 기록을 보세요. tee로 뭔가에 덧붙였습니다.",
   e:"<b>authorized_keys</b> — 공개키를 넣어두면 <b>비밀번호를 바꿔도</b> 계속 들어옵니다. 조사 체크리스트에서 빠지면 안 되는 항목입니다."},
  {q:"윈도우 침해와 네트워크 로그에서 공통으로 나타나는 C2 IP는?",
   a:["203.0.113.187"],re:["^203\\.0\\.113\\.187$"],
   hint:"Sysmon EventID 3의 목적지 IP와 conn.log의 비컨 목적지를 비교하세요.",
   e:"<b>203.0.113.187</b> — 서로 다른 두 데이터 소스가 <b>같은 인프라</b>를 가리킵니다. "+
     "이렇게 교차 확인되면 오탐 가능성이 사실상 사라집니다."},
  {q:"이 사건 전체에서 '탐지했다면 가장 큰 피해를 막을 수 있었던' 단일 명령은? (프로그램 이름)",
   a:["vssadmin","vssadmin.exe"],re:["^vssadmin(\\.exe)?$"],
   hint:"암호화 직전에 반드시 실행되며, 정상 업무에서는 거의 쓰이지 않는 것입니다.",
   e:"<b>vssadmin</b>입니다. 오탐이 거의 없고, 실행 시점이 암호화 직전이라 <b>대응 가능한 마지막 지점</b>입니다. "+
     "블루팀이라면 이 룰 하나는 반드시 갖고 있어야 합니다."},
  {q:"공격자가 감사 로그를 무력화하려 시도한 곳은 리눅스와 클라우드 두 곳이다. 리눅스에서 중지시킨 데몬 이름은?",
   a:["auditd"],re:["^auditd$"],
   hint:"1번 워게임에서 이미 찾았습니다.",
   e:"<b>auditd</b>입니다. 클라우드에서는 <code>StopLogging</code>을 시도했고요. "+
     "<b>플랫폼이 달라도 공격자의 사고방식은 같습니다</b> — 기록부터 지운다."}]},
];
