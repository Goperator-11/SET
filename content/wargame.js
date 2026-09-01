/* 워게임 — 힌트 없이 실전 로그를 분석해 답(플래그)을 제출하는 모드.
   문제집이 '배우는 곳'이라면 워게임은 '검증하는 곳'이다.

   id     고유 번호        t 제목        lv 난이도 1~5
   pts    배점            files 첨부 파일
   brief  상황 설명(HTML)
   tasks  [{q:질문, a:[정답후보], re:[정규식], hint:힌트(감점), e:해설}]
   need   선행 조건 (앞 워게임 id 배열)                                   */
const WARGAMES=[

{id:1,t:"새벽 3시의 로그인",lv:1,pts:100,
 files:[{n:"lab-auth.log",p:"labs/lab-auth.log",d:"리눅스 서버 인증 로그"}],
 brief:"<p>월요일 아침, 인터넷에 노출된 웹서버 한 대의 인증 로그를 받았습니다. "+
       "주말 사이 뭔가 있었다는 제보만 있고 상세는 없습니다.</p>"+
       "<p><b>이 로그 하나로 침입 여부를 판단하고, 침입했다면 누가 어떻게 들어왔는지 밝혀내세요.</b></p>"+
       "<p class='muted'>필요한 건 ACT 1 에서 다 배웠습니다. grep, awk, sort, uniq 면 충분합니다.</p>",
 tasks:[
  {q:"침입에 성공한 공격자의 IP 주소는?",a:["198.51.100.77"],re:["^198\\.51\\.100\\.77$"],
   hint:"성공한 로그인을 먼저 찾고, 실패 횟수 상위 IP와 대조하세요.",
   e:"<code>grep 'Accepted password' lab-auth.log</code> 한 줄이면 나옵니다. 이 IP는 414회 실패 후 성공했습니다."},
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
 files:[{n:"lab-access.log",p:"labs/lab-access.log",d:"같은 서버의 웹 액세스 로그"}],
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
 files:[{n:"lab-conn.log",p:"labs/lab-conn.log",d:"Zeek 연결 로그 (2,468줄)"}],
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
 files:[{n:"lab-dns.log",p:"labs/lab-dns.log",d:"Zeek DNS 로그 (953줄)"}],
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
 files:[{n:"lab-sysmon.csv",p:"labs/lab-sysmon.csv",d:"윈도우 Sysmon 이벤트 (254건)"}],
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
 files:[{n:"lab-cloudtrail.json",p:"labs/lab-cloudtrail.json",d:"AWS CloudTrail (248건)"}],
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
 files:[{n:"lab-auth.log",p:"labs/lab-auth.log",d:"리눅스 인증 로그"},
        {n:"lab-access.log",p:"labs/lab-access.log",d:"웹 액세스 로그"},
        {n:"lab-conn.log",p:"labs/lab-conn.log",d:"Zeek 연결 로그"},
        {n:"lab-dns.log",p:"labs/lab-dns.log",d:"Zeek DNS 로그"},
        {n:"lab-sysmon.csv",p:"labs/lab-sysmon.csv",d:"Sysmon 이벤트"},
        {n:"lab-cloudtrail.json",p:"labs/lab-cloudtrail.json",d:"CloudTrail"}],
 brief:"<p><b>최종 단계입니다.</b> 지금까지의 모든 로그가 한자리에 있습니다.</p>"+
       "<p>리눅스 서버, 내부 네트워크, 윈도우 엔드포인트, 클라우드 — <b>네 개의 전선</b>을 하나의 이야기로 엮으세요.</p>"+
       "<p>이번엔 개별 사실이 아니라 <b>전체 구조</b>를 묻습니다.</p>",
 tasks:[
  {q:"전체 사건에서 가장 먼저 일어난 활동은 어느 로그에 있는가? (파일명)",
   a:["lab-access.log","access.log"],re:["access\\.log$"],
   hint:"각 로그에서 가장 이른 악성 활동의 시각을 비교하세요.",
   e:"<b>lab-access.log</b> — 01:40의 디렉터리 브루트포싱이 모든 것의 시작입니다."},
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
/* ═══════════ 공격(레드팀) 워게임 — track:"red" ═══════════
   첨부 파일 없이 브리핑 안의 데이터를 분석해 푸는 자립형 CTF. */

{id:101,t:"열린 문을 찾아라",lv:1,pts:100,track:"red",files:[],
 brief:"<p>모의해킹 계약을 따냈습니다. 허가된 표적 <code>10.10.10.50</code> 을 스캔했더니 아래 결과가 나왔습니다.</p>"+
   "<pre class='term'>PORT     STATE SERVICE VERSION\n"+
   "21/tcp   open  ftp     vsftpd 2.3.4\n"+
   "22/tcp   open  ssh     OpenSSH 7.2p2\n"+
   "80/tcp   open  http    Apache httpd 2.4.49\n"+
   "3306/tcp open  mysql   MySQL 5.7.33</pre>"+
   "<p><b>어디부터, 어떻게 뚫을지 판단하세요.</b> ACT 0 정찰이면 충분합니다.</p>",
 tasks:[
  {q:"알려진 백도어가 있는 것으로 악명 높은 FTP 서비스의 버전은?",
   a:["vsftpd 2.3.4","2.3.4"],re:["vsftpd\\s*2\\.3\\.4","^2\\.3\\.4$"],
   hint:"이 버전의 vsftpd 는 소스에 백도어가 심겨 배포된 사건으로 유명합니다.",
   e:"<b>vsftpd 2.3.4</b> — 아이디에 <code>:)</code> 를 넣으면 6200 포트에 백도어 셸이 열리는 버전입니다. <code>searchsploit vsftpd 2.3.4</code> 로 바로 나옵니다."},
  {q:"포트 80의 Apache httpd 2.4.49 에 있는 경로 순회·RCE 취약점의 CVE 번호는?",
   a:["CVE-2021-41773"],re:["^cve[-\\s]?2021[-\\s]?41773$"],
   hint:"2021년 Apache 2.4.49 의 path traversal → RCE. 검색하면 바로 나옵니다.",
   e:"<b>CVE-2021-41773</b> — <code>/cgi-bin/.%2e/.%2e/etc/passwd</code> 같은 인코딩된 경로 순회로 파일 읽기·RCE 가 됩니다. 버전 하나가 곧 CVE 하나입니다."},
  {q:"전 포트를 빠짐없이 스캔하기 위해 nmap 에 줘야 하는 옵션은?",
   a:["-p-"],re:["^-p-$"],
   hint:"잘 알려진 1000개만 보면 8080·8443 을 놓칩니다.",
   e:"<b>-p-</b> — 1~65535 전 포트. 이 스캔이 잘 알려진 포트만 봤다면 숨은 서비스를 놓쳤을 수 있습니다."}]},

{id:102,t:"이중으로 감싼 것",lv:2,pts:150,track:"red",need:[101],files:[],
 brief:"<p>웹 취약점으로 설정 파일을 탈취했습니다. 그 안에 아래 문자열이 있었습니다. <b>두 번 인코딩</b>되어 있습니다.</p>"+
   "<pre class='term'>55305a545258746b4d324d775a444e666447677a58324e6f4e44467566513d3d</pre>"+
   "<p>같은 파일 아래쪽엔 이런 값도 있었습니다:</p>"+
   "<pre class='term'>admin_hash = 5f4dcc3b5aa765d61d8327deb882cf99</pre>"+
   "<p><b>CyberChef 나 <code>xxd</code>·<code>base64</code> 로 벗겨내세요.</b> ACT 0·1 의 인코딩 지식이면 됩니다.</p>",
 tasks:[
  {q:"위 문자열은 hex 입니다. 디코드하면 Base64 가 나오고, 그것을 또 디코드하면 나오는 최종 평문(플래그)은?",
   a:["SFSE{d3c0d3_th3_ch41n}"],re:["^SFSE\\{d3c0d3_th3_ch41n\\}$"],
   hint:"hex → 텍스트 → base64 → 텍스트. echo '...' | xxd -r -p | base64 -d",
   e:"<b>SFSE{d3c0d3_th3_ch41n}</b> — hex 를 디코드하면 <code>U0ZTRXt...</code>(Base64), 그걸 또 디코드하면 플래그입니다. 인코딩은 암호가 아니라 <b>겹겹이 벗기는 포장</b>일 뿐입니다."},
  {q:"admin_hash 값 5f4dcc3b5aa765d61d8327deb882cf99 의 해시 알고리즘은? (길이로 판단)",
   a:["MD5","md5"],re:["^md5$"],
   hint:"32자리 16진수입니다.",
   e:"<b>MD5</b> — 32자. 40자면 SHA1, 64자면 SHA256. 길이만으로 종류를 구분합니다."},
  {q:"그 MD5 해시의 평문은? (아주 흔한, 워드리스트 맨 앞에 있는 비밀번호)",
   a:["password"],re:["^password$"],
   hint:"rockyou.txt 의 단골이고, ACT 에서도 예시로 나온 유명한 값입니다.",
   e:"<b>password</b> — <code>5f4dcc3b...</code> 는 md5(\"password\") 입니다. <code>hashcat -m 0</code> 나 온라인 조회로 즉시 나옵니다. 약한 비밀번호 + 약한 해시의 전형입니다."}]},

{id:103,t:"한 줄이면 열린다",lv:2,pts:150,track:"red",need:[102],files:[],
 brief:"<p>관리자 로그인 폼을 발견했습니다. 소스를 탈취해보니 백엔드 쿼리가 이렇게 만들어집니다:</p>"+
   "<pre class='term'>SELECT * FROM users\nWHERE username='$user' AND password='$pass'</pre>"+
   "<p>그리고 상품 페이지 <code>/item?id=1</code> 도 같은 방식으로 취약합니다.</p>"+
   "<p><b>비밀번호를 몰라도 admin 으로 로그인하고, DB 를 통째로 뽑아내세요.</b></p>",
 tasks:[
  {q:"아이디 칸에 무엇을 넣으면 비밀번호 없이 admin 으로 로그인되는가? (SQL 주석을 이용한 가장 짧은 형태)",
   a:["admin'--"],re:["^admin'\\s*(--|#)"],
   hint:"admin 뒤에 따옴표로 문자열을 닫고, 주석으로 뒤의 password 조건을 무력화합니다.",
   e:"<b>admin'--</b> — 쿼리가 <code>...username='admin'--' AND password='x'</code> 가 되어 <code>--</code> 뒤가 무시됩니다. admin 으로 비밀번호 없이 로그인."},
  {q:"/item?id=1 에서 UNION 으로 데이터를 뽑기 전, 원래 쿼리의 열 개수를 알아내는 데 쓰는 SQL 절은? (두 단어)",
   a:["ORDER BY","order by"],re:["order\\s+by"],
   hint:"1, 2, 3... 늘려가다 오류가 나기 직전 숫자가 열 개수입니다.",
   e:"<b>ORDER BY</b> — <code>' ORDER BY 4--</code> 에서 오류가 나면 열은 3개. UNION 은 양쪽 열 개수가 같아야 하니 먼저 이걸 맞춥니다."},
  {q:"테이블·열 이름을 모를 때, DB 구조를 알아내려 조회하는 표준 메타데이터 스키마의 이름은?",
   a:["information_schema"],re:["information_schema"],
   hint:"거의 모든 관계형 DB 에 있는, 테이블·열 목록을 담은 시스템 스키마입니다.",
   e:"<b>information_schema</b> — <code>UNION SELECT table_name FROM information_schema.tables</code> 로 테이블을, columns 로 열을 알아냅니다. DB 의 지도입니다."}]},

{id:104,t:"로그가 말해주는 침투",lv:3,pts:200,track:"red",need:[103],files:[],
 brief:"<p>이번엔 <b>공격자의 시점</b>에서 웹 로그를 읽습니다. 다른 팀이 남긴 침투 흔적입니다. "+
   "무슨 취약점을 어떻게 썼는지 재구성하세요.</p>"+
   "<pre class='term'>10.0.0.5 - - [10/Mar/2026:14:22:01] \"GET /view?page=../../../../etc/passwd HTTP/1.1\" 200 1840\n"+
   "10.0.0.5 - - [10/Mar/2026:14:25:33] \"GET /view?page=php://filter/convert.base64-encode/resource=config HTTP/1.1\" 200 620\n"+
   "10.0.0.5 - - [10/Mar/2026:14:31:12] \"POST /upload HTTP/1.1\" 200 45 \"python-requests/2.28\"\n"+
   "10.0.0.5 - - [10/Mar/2026:14:31:20] \"GET /uploads/x.php?c=id HTTP/1.1\" 200 54 \"curl/7.81\"</pre>",
 tasks:[
  {q:"첫 두 요청이 악용한 취약점의 약어는? (영문 3글자)",
   a:["LFI"],re:["^lfi$"],
   hint:"page 파라미터로 서버의 임의 파일을 읽고(include) 있습니다.",
   e:"<b>LFI</b>(Local File Inclusion) — <code>../</code> 로 <code>/etc/passwd</code> 를 읽고, php filter 로 소스까지 읽었습니다. 단순 파일 읽기를 넘어 실행으로 이어지는 취약점입니다."},
  {q:"두 번째 요청에서 config 소스를 실행하지 않고 읽어내기 위해 쓴 PHP 래퍼는?",
   a:["php://filter"],re:["php://filter"],
   hint:"convert.base64-encode 로 파일을 인코딩해 원본 소스를 뽑아냅니다.",
   e:"<b>php://filter</b> — <code>convert.base64-encode/resource=config</code> 로 config 를 실행 대신 Base64 로 읽습니다. 여기서 DB 비밀번호가 새어나갔을 겁니다."},
  {q:"공격자가 업로드해 명령을 실행한 웹셸의 경로는?",
   a:["/uploads/x.php"],re:["^/?uploads/x\\.php$"],
   hint:"POST /upload 직후, 200 을 받은 .php 경로에 ?c= 가 붙어 있습니다.",
   e:"<b>/uploads/x.php</b> — 업로드 → 실행. <code>?c=</code> 파라미터로 명령을 받는 전형적 웹셸입니다."},
  {q:"마지막 요청에서 웹셸로 실행한 명령은?",
   a:["id"],re:["^id$"],
   hint:"?c= 뒤의 값입니다.",
   e:"<b>id</b> — 현재 사용자·권한을 확인하는 첫 명령입니다(보통 www-data). RCE 를 확인했으니 다음은 리버스 셸·권한 상승입니다."}]},

{id:105,t:"서명 없는 통행증",lv:3,pts:200,track:"red",need:[104],files:[],
 brief:"<p>로그인 후 브라우저에 이런 JWT 토큰이 저장되어 있었습니다:</p>"+
   "<pre class='term'>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.\n"+
   "eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciIsImlkIjoxMDAyfQ.\n"+
   "Xq9f2b7c1d...(서명)</pre>"+
   "<p><b>이 토큰을 관리자 것으로 위조하세요.</b> 페이로드는 암호화가 아니라 인코딩일 뿐입니다.</p>",
 tasks:[
  {q:"가운데 페이로드를 Base64 디코드했을 때, 현재 role 값은?",
   a:["user"],re:["^user$"],
   hint:"echo 'eyJ1c2Vy...' | base64 -d 하면 JSON 이 보입니다.",
   e:"<b>user</b> — 디코드하면 <code>{\"user\":\"guest\",\"role\":\"user\",\"id\":1002}</code>. JWT 페이로드는 <b>누구나 읽습니다</b> — 서명만 검증할 뿐 암호화가 아닙니다."},
  {q:"관리자 권한을 얻으려면 role 을 무엇으로 바꿔야 하는가?",
   a:["admin"],re:["^admin$"],
   hint:"흔한 관리자 역할 이름입니다.",
   e:"<b>admin</b> — 페이로드의 role 을 admin 으로 바꾸면 됩니다. 문제는 서명인데, 다음 문항이 그 우회입니다."},
  {q:"서버가 서명 검증을 아예 건너뛰게 만드는, JWT 헤더의 alg 값을 무엇으로 바꾸는 공격인가? (그 값)",
   a:["none"],re:["^none$"],
   hint:"'알고리즘 없음'을 뜻하는 값입니다.",
   e:"<b>none</b> — <code>alg:none</code> 을 서버가 받아들이면 서명 검증이 사라져, role 을 admin 으로 바꾼 위조 토큰이 통과합니다. jwt_tool 로 자동화합니다."}]},

{id:106,t:"서버를 심부름꾼으로",lv:4,pts:300,track:"red",need:[105],files:[],
 brief:"<p>URL 미리보기 기능을 발견했습니다. 서버가 우리가 준 주소를 대신 가져와 보여줍니다.</p>"+
   "<pre class='term'>POST /api/fetch\n{\"url\":\"https://example.com/logo.png\"}</pre>"+
   "<p>이 표적은 <b>AWS</b> 위에서 돕니다. <b>서버를 심부름꾼 삼아 내부와 클라우드를 노리세요.</b></p>",
 tasks:[
  {q:"서버 자신의 내부 관리 페이지가 8080 포트에 있다. url 에 넣을 호스트:포트는? (루프백 주소 사용)",
   a:["127.0.0.1:8080","localhost:8080"],re:["(127\\.0\\.0\\.1|localhost):8080"],
   hint:"서버 자기 자신을 가리키는 주소 + 포트입니다.",
   e:"<b>127.0.0.1:8080</b> (또는 localhost:8080) — 방화벽 밖에선 못 닿는 내부 관리자를, 서버가 대신 가져다 줍니다. SSRF 의 기본기입니다."},
  {q:"AWS 임시 자격증명을 훔치기 위해 SSRF 로 접근하는 메타데이터 서비스의 IP 주소는?",
   a:["169.254.169.254"],re:["^169\\.254\\.169\\.254$"],
   hint:"클라우드 인스턴스라면 어디서나 같은 이 링크-로컬 주소로 메타데이터가 나옵니다.",
   e:"<b>169.254.169.254</b> — <code>/latest/meta-data/iam/security-credentials/</code> 로 IAM 임시 키가 통째로 나옵니다. SSRF 의 정점 — 웹 취약점 하나로 클라우드 계정을 장악합니다."},
  {q:"필터가 문자열 '127.0.0.1' 을 차단한다. 같은 주소를 뜻하는 32비트 정수(10진수) 표기는?",
   a:["2130706433"],re:["^2130706433$"],
   hint:"127.0.0.1 을 4바이트 정수로 환산: 127*256^3 + 0 + 0 + 1.",
   e:"<b>2130706433</b> — <code>http://2130706433/</code> 은 <code>http://127.0.0.1/</code> 과 같습니다. 문자열 필터는 같은 의미의 다른 표기로 우회됩니다."}]},

{id:107,t:"관통",lv:5,pts:400,track:"red",need:[101,103,105],files:[],
 brief:"<p><b>최종 시험.</b> 정찰부터 클라우드 장악까지, 작은 것들을 사슬로 엮어 인프라 전체를 관통합니다.</p>"+
   "<p>표적을 훑던 중 웹 루트에서 노출된 버전관리 폴더를 발견했습니다. 여기서 사슬이 시작됩니다:</p>"+
   "<pre class='term'>[발견] http://target/____/config   (노출된 저장소)\n"+
   "[소스] 역직렬화되는 쿠키 발견: O:4:\"User\":...\n"+
   "[셸]   웹셸 획득 (www-data)\n"+
   "[다음] root 로 올라가야 한다</pre>",
 tasks:[
  {q:"웹 루트에 실수로 노출되면 전체 소스·과거 커밋(비밀 포함)이 복원되는, 점으로 시작하는 폴더 이름은?",
   a:[".git"],re:["^/?\\.git/?$"],
   hint:"버전관리 도구가 저장소 루트에 만드는 숨김 폴더입니다.",
   e:"<b>.git</b> — 웹에 노출되면 저장소 전체가 새어나갑니다. 소스와 과거 커밋의 비밀번호·키까지."},
  {q:"노출된 .git 에서 전체 소스와 커밋 이력을 복원하는 데 쓰는 대표 도구는?",
   a:["git-dumper","gitdumper"],re:["git[-_]?dumper"],
   hint:"이름 그대로 git 을 통째로 덤프합니다.",
   e:"<b>git-dumper</b> — <code>git-dumper http://target/.git/ ./src</code> 로 소스를 복원하고, 거기서 다음 취약점을 코드로 찾습니다."},
  {q:"쿠키의 O:4:\"User\": 는 PHP 직렬화입니다. 이 역직렬화 취약점을 노릴 PHP 가젯체인 자동 생성 도구는?",
   a:["phpggc"],re:["^phpggc$"],
   hint:"PHP Generic Gadget Chains 의 약자입니다. (Java 는 ysoserial)",
   e:"<b>phpggc</b> — <code>phpggc Monolog/RCE1 system id</code> 로 가젯체인을 만들어 역직렬화 지점에 주입하면 RCE 입니다."},
  {q:"www-data 웹셸을 얻었다. root 로 올라가는, 이 코스 다음 ACT 의 주제(공격 단계)는? (한글 네 글자 또는 영문)",
   a:["권한 상승","권한상승","privilege escalation","privesc"],
   re:["권한\\s*상승","privilege\\s*escalation","privesc"],
   hint:"낮은 권한(www-data)에서 root/administrator 로 올라가는 단계입니다.",
   e:"<b>권한 상승(Privilege Escalation)</b> — 웹으로 발판을 얻었으니, 다음은 SUID·커널·오설정을 노려 root 로. 정확히 다음 ACT 의 주제입니다. 관통 완료 — 축하합니다."}]},

];
