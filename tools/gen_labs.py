#!/usr/bin/env python3
"""실전 랩용 로그 파일 생성기.

학습용 합성 로그를 만든다. 실제 침해 데이터가 아니라 전부 지어낸 것이고,
시드를 고정해서 언제 돌려도 같은 파일이 나온다. 그래서 문제의 정답이 항상 맞는다.

    python tools/gen_labs.py

정답 요약을 마지막에 출력하므로, 문제를 고칠 때 그 값을 그대로 쓰면 된다.
"""
import io, json, os, random, hashlib
from datetime import datetime, timedelta, timezone

random.seed(20260827)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "labs")
os.makedirs(ROOT, exist_ok=True)
UTC = timezone.utc
ANS = {}


def write(name, lines):
    p = os.path.join(ROOT, name)
    body = "\n".join(lines) + "\n"
    io.open(p, "w", encoding="utf-8", newline="\n").write(body)
    print("  %-26s %6d줄  %7.1f KB" % (name, len(lines), len(body.encode()) / 1024))


# ─────────────────────────────────────────────────────────────
# DAY 20 · 리눅스 침해 서버 (auth.log + access.log)
# ─────────────────────────────────────────────────────────────
def day20():
    base = datetime(2026, 3, 14, 0, 0, 0, tzinfo=UTC)
    host = "srv-web01"
    fmt = lambda t: t.strftime("%b %e %H:%M:%S").replace("  ", " ")

    noisy = ["203.0.113.44", "198.51.100.9", "192.0.2.201"]
    winner = "198.51.100.77"          # ← 침입에 성공하는 IP
    users = ["admin", "oracle", "postgres", "test", "ubuntu", "git", "jenkins", "ftpuser"]
    real = ["deploy", "webadmin"]
    ANS["day20_ip"] = winner
    ANS["day20_user"] = "deploy"
    ANS["day20_backdoor"] = "svc-monitor"

    lines, t, pid = [], base, 8000

    # 배경 소음: 하루 종일 여기저기서 두들긴다
    for _ in range(900):
        t += timedelta(seconds=random.randint(2, 55))
        pid += random.randint(1, 4)
        ip = random.choice(noisy)
        u = random.choice(users)
        if random.random() < 0.7:
            lines.append("%s %s sshd[%d]: Invalid user %s from %s port %d" %
                         (fmt(t), host, pid, u, ip, random.randint(30000, 61000)))
        else:
            lines.append("%s %s sshd[%d]: Failed password for invalid user %s from %s port %d ssh2" %
                         (fmt(t), host, pid, u, ip, random.randint(30000, 61000)))

    # 정상 로그인 몇 건
    for _ in range(6):
        t += timedelta(seconds=random.randint(200, 900))
        pid += 3
        lines.append("%s %s sshd[%d]: Accepted publickey for webadmin from 192.168.10.20 port %d ssh2: RSA SHA256:%s" %
                     (fmt(t), host, pid, random.randint(40000, 60000),
                      hashlib.sha256(str(pid).encode()).hexdigest()[:43]))

    # 03:1x — 진짜 공격. 존재하는 계정을 집중적으로 두들긴다
    t = base + timedelta(hours=3, minutes=11)
    for i in range(414):
        t += timedelta(seconds=random.randint(1, 3))
        pid += 2
        lines.append("%s %s sshd[%d]: Failed password for %s from %s port %d ssh2" %
                     (fmt(t), host, pid, "deploy", winner, random.randint(30000, 61000)))

    # 성공
    t += timedelta(seconds=2)
    pid += 2
    succ = t
    lines.append("%s %s sshd[%d]: Accepted password for deploy from %s port %d ssh2" %
                 (fmt(t), host, pid, winner, random.randint(30000, 61000)))
    lines.append("%s %s sshd[%d]: pam_unix(sshd:session): session opened for user deploy by (uid=0)" %
                 (fmt(t), host, pid))
    ANS["day20_time"] = succ.strftime("%H:%M:%S")

    # 침입 후 행동
    after = [
        ("sudo: deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/id", 12),
        ("sudo: deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/sbin/useradd -u 0 -o -g 0 -M -d /root -s /bin/bash svc-monitor", 41),
        ("useradd[9912]: new user: name=svc-monitor, UID=0, GID=0, home=/root, shell=/bin/bash", 2),
        ("sudo: deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/tee -a /root/.ssh/authorized_keys", 33),
        ("sudo: deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/crontab -e", 58),
        ("sudo: deploy : TTY=pts/0 ; PWD=/tmp ; USER=root ; COMMAND=/bin/systemctl stop auditd", 26),
    ]
    for msg, gap in after:
        t += timedelta(seconds=gap)
        lines.append("%s %s %s" % (fmt(t), host, msg))

    # 이후 평범한 소음으로 마무리
    for _ in range(120):
        t += timedelta(seconds=random.randint(20, 300))
        pid += 1
        lines.append("%s %s sshd[%d]: Invalid user %s from %s port %d" %
                     (fmt(t), host, pid, random.choice(users), random.choice(noisy),
                      random.randint(30000, 61000)))

    write("lab-auth.log", lines)

    # ── 웹 액세스 로그 ──
    wl = []
    t = base
    paths = ["/", "/index.php", "/about", "/products", "/api/items", "/static/app.css",
             "/static/logo.png", "/login", "/api/health"]
    uas = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0 Safari/537.36",
           "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"]
    for _ in range(1400):
        t += timedelta(seconds=random.randint(1, 40))
        wl.append('%s - - [%s] "GET %s HTTP/1.1" 200 %d "-" "%s"' % (
            "192.168.10.%d" % random.randint(30, 90),
            t.strftime("%d/%b/%Y:%H:%M:%S +0000"), random.choice(paths),
            random.randint(400, 9000), random.choice(uas)))

    # 01:40 — 디렉터리 브루트포싱 (404 폭증)
    t = base + timedelta(hours=1, minutes=40)
    words = ["admin", "backup", "wp-admin", "phpmyadmin", ".git/config", ".env", "config.php",
             "shell.php", "uploads", "test.php", "db.sql", "old", "cgi-bin", "administrator",
             "server-status", "console", "manager/html", "api/v1/debug", "backup.zip", "info.php"]
    for i in range(880):
        t += timedelta(milliseconds=random.randint(60, 400))
        w = words[i % len(words)] + ("" if i < len(words) else str(i // len(words)))
        wl.append('%s - - [%s] "GET /%s HTTP/1.1" 404 162 "-" "gobuster/3.6"' % (
            winner, t.strftime("%d/%b/%Y:%H:%M:%S +0000"), w))

    # 02:05 — 업로드 성공 후 웹셸 접근
    t = base + timedelta(hours=2, minutes=5, seconds=12)
    wl.append('%s - - [%s] "POST /upload.php HTTP/1.1" 200 41 "-" "python-requests/2.31.0"' %
              (winner, t.strftime("%d/%b/%Y:%H:%M:%S +0000")))
    for i, cmd in enumerate(["id", "uname+-a", "cat+/etc/passwd", "ls+-la+/var/www",
                             "cat+/var/www/html/config.php", "which+python3"]):
        t += timedelta(seconds=random.randint(4, 30))
        wl.append('%s - - [%s] "GET /uploads/img_2231.php?cmd=%s HTTP/1.1" 200 %d "-" "python-requests/2.31.0"' %
                  (winner, t.strftime("%d/%b/%Y:%H:%M:%S +0000"), cmd, random.randint(120, 3400)))
    ANS["day20_shell"] = "/uploads/img_2231.php"

    wl.sort(key=lambda x: datetime.strptime(x.split("[")[1].split("]")[0], "%d/%b/%Y:%H:%M:%S %z"))
    write("lab-access.log", wl)


# ─────────────────────────────────────────────────────────────
# DAY 40 · 네트워크 (Zeek conn.log + dns.log)
# ─────────────────────────────────────────────────────────────
def day40():
    base = datetime(2026, 4, 2, 9, 0, 0, tzinfo=UTC).timestamp()
    victim = "10.10.20.53"
    c2 = "203.0.113.187"
    scanner = "10.10.20.99"
    ANS["day40_c2"] = c2
    ANS["day40_victim"] = victim
    ANS["day40_beacon"] = "300"
    ANS["day40_scanner"] = scanner

    hdr = ["#separator \\x09", "#set_separator\t,", "#empty_field\t(empty)", "#unset_field\t-",
           "#path\tconn", "#open\t2026-04-02-09-00-00",
           "#fields\tts\tuid\tid.orig_h\tid.orig_p\tid.resp_h\tid.resp_p\tproto\tservice\tduration\torig_bytes\tresp_bytes\tconn_state",
           "#types\ttime\tstring\taddr\tport\taddr\tport\tenum\tstring\tinterval\tcount\tcount\tstring"]
    rows = []
    uid = lambda: "C" + "".join(random.choice("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(15))

    def row(ts, oh, op, rh, rp, proto, svc, dur, ob, rb, state):
        rows.append("%.6f\t%s\t%s\t%d\t%s\t%d\t%s\t%s\t%s\t%s\t%s\t%s" %
                    (ts, uid(), oh, op, rh, rp, proto, svc, dur, ob, rb, state))

    # 평범한 사내 트래픽
    for i in range(1100):
        ts = base + random.uniform(0, 7200)
        h = "10.10.20.%d" % random.randint(20, 90)
        dst = random.choice(["140.82.121.4", "142.250.207.14", "13.107.42.14", "151.101.1.140"])
        row(ts, h, random.randint(40000, 61000), dst, random.choice([443, 443, 443, 80]),
            "tcp", random.choice(["ssl", "ssl", "http"]), "%.3f" % random.uniform(0.2, 40),
            random.randint(300, 9000), random.randint(800, 400000), "SF")
    for i in range(300):
        ts = base + random.uniform(0, 7200)
        row(ts, "10.10.20.%d" % random.randint(20, 90), random.randint(40000, 61000),
            "10.10.20.10", 53, "udp", "dns", "%.3f" % random.uniform(0.001, 0.06),
            random.randint(30, 90), random.randint(40, 300), "SF")

    # 내부 포트 스캔 — SYN 만 있고 응답 없음(S0)
    ts = base + 1500
    for p in list(range(1, 1024)) + [1433, 1521, 3306, 3389, 5432, 5985, 6379, 8080, 8443, 9200, 27017]:
        ts += random.uniform(0.004, 0.03)
        row(ts, scanner, random.randint(40000, 61000), "10.10.20.53", p,
            "tcp", "-", "-", "0", "0", "S0")

    # C2 비컨 — 정확히 300초 주기, 크기도 거의 일정
    ts = base + 640
    for i in range(24):
        row(ts + i * 300 + random.uniform(-1.2, 1.2), victim, random.randint(40000, 61000),
            c2, 443, "tcp", "ssl", "%.3f" % random.uniform(0.6, 1.1),
            random.randint(1180, 1260), random.randint(430, 520), "SF")

    # 비컨이 전부 끝난 뒤 대량 업로드 — 유출
    # (비컨 구간 한가운데 두면 간격 분석이 흐려지므로 반드시 뒤에 붙인다)
    row(base + 7900, victim, 51122, c2, 443, "tcp", "ssl", "412.883",
        "418902144", "88231", "SF")
    ANS["day40_exfil_mb"] = "399"

    rows.sort(key=lambda r: float(r.split("\t")[0]))
    write("lab-conn.log", hdr + rows + ["#close\t2026-04-02-11-00-00"])

    # ── dns.log ──
    dhdr = ["#separator \\x09", "#set_separator\t,", "#empty_field\t(empty)", "#unset_field\t-",
            "#path\tdns", "#open\t2026-04-02-09-00-00",
            "#fields\tts\tuid\tid.orig_h\tquery\tqtype_name\trcode_name\tanswers",
            "#types\ttime\tstring\taddr\tstring\tstring\tstring\tstring"]
    drows = []
    normal = ["github.com", "www.google.com", "outlook.office365.com", "slack.com",
              "cdn.jsdelivr.net", "update.microsoft.com", "ntp.ubuntu.com", "api.company.co.kr"]
    for i in range(700):
        ts = base + random.uniform(0, 7200)
        drows.append("%.6f\t%s\t%s\t%s\tA\tNOERROR\t%s" % (
            ts, uid(), "10.10.20.%d" % random.randint(20, 90), random.choice(normal),
            "93.184.216.%d" % random.randint(1, 254)))

    # DGA — 존재하지 않는 도메인을 잔뜩 조회 (NXDOMAIN)
    ts = base + 600
    dga_hits = 0
    for i in range(148):
        ts += random.uniform(0.4, 3.5)
        name = "".join(random.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(random.randint(11, 16)))
        drows.append("%.6f\t%s\t%s\t%s.top\tA\tNXDOMAIN\t-" % (ts, uid(), victim, name))
        dga_hits += 1
    ANS["day40_nxdomain"] = str(dga_hits)

    # DNS 터널링 — 아주 긴 서브도메인, TXT
    ts = base + 3000
    tunnel = "sync-node7.telemetry-cdn.net"
    for i in range(96):
        ts += random.uniform(1.5, 4.0)
        blob = "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(52))
        drows.append("%.6f\t%s\t%s\t%s.%s\tTXT\tNOERROR\tTXT 1" % (ts, uid(), victim, blob, tunnel))
    ANS["day40_tunnel"] = tunnel

    drows.sort(key=lambda r: float(r.split("\t")[0]))
    write("lab-dns.log", dhdr + drows + ["#close\t2026-04-02-11-00-00"])


# ─────────────────────────────────────────────────────────────
# DAY 60 · 윈도우 엔드포인트 (Sysmon 요약 CSV)
# ─────────────────────────────────────────────────────────────
def day60():
    base = datetime(2026, 5, 11, 8, 30, 0, tzinfo=UTC)
    rows = ["UtcTime,EventID,Image,ParentImage,User,CommandLine,TargetImage,DestinationIp,QueryName"]
    host_user = "FINANCE\\\\j.park"

    def r(t, eid, img, parent="", cmd="", target="", ip="", dns=""):
        rows.append('%s,%d,%s,%s,%s,"%s",%s,%s,%s' % (
            t.strftime("%Y-%m-%d %H:%M:%S.000"), eid, img, parent, host_user, cmd, target, ip, dns))

    t = base
    common = [
        (r"C:\Windows\System32\svchost.exe", r"C:\Windows\System32\services.exe", "svchost.exe -k netsvcs"),
        (r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Windows\explorer.exe", "chrome.exe"),
        (r"C:\Windows\System32\RuntimeBroker.exe", r"C:\Windows\System32\svchost.exe", "RuntimeBroker.exe -Embedding"),
        (r"C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE", r"C:\Windows\explorer.exe", "OUTLOOK.EXE"),
    ]
    for _ in range(240):
        t += timedelta(seconds=random.randint(3, 40))
        img, par, cmd = random.choice(common)
        r(t, 1, img, par, cmd)

    # 09:14 — 첨부 문서에서 시작
    t = base + timedelta(minutes=44)
    r(t, 1, r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE",
      r"C:\Windows\explorer.exe", r'WINWORD.EXE /n "C:\Users\j.park\Downloads\3월_정산내역_확인요망.docm"')
    t += timedelta(seconds=8)
    r(t, 1, r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
      r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE",
      "powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA")
    ANS["day60_parent"] = "WINWORD.EXE"

    t += timedelta(seconds=3)
    r(t, 22, r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", dns="cdn-telemetry-sync.net")
    t += timedelta(seconds=1)
    r(t, 3, r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", ip="203.0.113.187")
    ANS["day60_c2"] = "cdn-telemetry-sync.net"

    # 페이로드 드롭 + 지속성
    t += timedelta(seconds=22)
    r(t, 11, r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
      target=r"C:\Users\j.park\AppData\Roaming\OneDriveSync.exe")
    t += timedelta(seconds=6)
    r(t, 13, r"C:\Windows\System32\reg.exe", r"C:\Windows\System32\cmd.exe",
      r'reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v OneDriveSync /d "C:\Users\j.park\AppData\Roaming\OneDriveSync.exe"',
      target=r"HKU\S-1-5-21\Software\Microsoft\Windows\CurrentVersion\Run\OneDriveSync")
    ANS["day60_persist"] = "OneDriveSync"

    # 자격증명 접근
    t += timedelta(minutes=4)
    r(t, 10, r"C:\Users\j.park\AppData\Roaming\OneDriveSync.exe", target=r"C:\Windows\system32\lsass.exe")
    ANS["day60_lsass"] = "OneDriveSync.exe"

    # 정찰 → 내부 이동
    for cmd in ["whoami /priv", "net group \"Domain Admins\" /domain", "nltest /dclist:finance.local"]:
        t += timedelta(seconds=random.randint(10, 60))
        r(t, 1, r"C:\Windows\System32\cmd.exe", r"C:\Users\j.park\AppData\Roaming\OneDriveSync.exe", cmd)
    t += timedelta(minutes=9)
    r(t, 1, r"C:\Windows\System32\wbem\WmiPrvSE.exe", r"C:\Windows\System32\svchost.exe", "WmiPrvSE.exe -Embedding")
    t += timedelta(seconds=2)
    r(t, 1, r"C:\Windows\System32\cmd.exe", r"C:\Windows\System32\wbem\WmiPrvSE.exe",
      r"cmd.exe /c copy \\SRV-FIN02\C$\temp\OneDriveSync.exe")

    # 백업 파괴 — 랜섬웨어 직전
    t += timedelta(minutes=18)
    r(t, 1, r"C:\Windows\System32\vssadmin.exe", r"C:\Windows\System32\cmd.exe",
      "vssadmin.exe delete shadows /all /quiet")
    ANS["day60_vss"] = t.strftime("%H:%M:%S")

    write("lab-sysmon.csv", rows)


# ─────────────────────────────────────────────────────────────
# DAY 120 · 클라우드 (AWS CloudTrail)
# ─────────────────────────────────────────────────────────────
def day120():
    base = datetime(2026, 6, 20, 2, 0, 0, tzinfo=UTC)
    events = []
    # 일부러 AWS 키 형식(AKIA + 영숫자 16자)을 벗어나게 만들었다.
    # 진짜처럼 생긴 문자열을 저장소에 넣으면 시크릿 스캐너가 푸시를 막고,
    # 그걸 우회하는 습관이 진짜 키 유출로 이어진다.
    key = "AKIA_EXAMPLE_C1D2E3F4"
    attacker_ip = "203.0.113.66"
    ANS["day120_key"] = key
    ANS["day120_ip"] = attacker_ip
    ANS["day120_bucket"] = "acme-customer-exports"

    def ev(t, name, src, user, ip, ua="aws-cli/2.15.30 Python/3.11", extra=None, err=None):
        e = {
            "eventTime": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "eventSource": src, "eventName": name, "awsRegion": "ap-northeast-2",
            "sourceIPAddress": ip, "userAgent": ua,
            "userIdentity": {"type": "IAMUser", "userName": user, "accessKeyId": key if user == "svc-ci" else "AKIA_EXAMPLE_NORMAL01"},
        }
        if extra: e["requestParameters"] = extra
        if err: e["errorCode"] = err
        events.append(e)

    # 평상시 CI 활동
    t = base
    for _ in range(60):
        t += timedelta(minutes=random.randint(3, 25))
        ev(t, random.choice(["PutObject", "GetObject", "ListBucket"]), "s3.amazonaws.com",
           "svc-ci", "52.78.%d.%d" % (random.randint(1, 254), random.randint(1, 254)),
           extra={"bucketName": "acme-ci-artifacts"})

    # 02:40 — 유출된 키가 낯선 IP에서 쓰이기 시작
    t = base + timedelta(minutes=40)
    ev(t, "GetCallerIdentity", "sts.amazonaws.com", "svc-ci", attacker_ip)
    t += timedelta(seconds=14)
    ev(t, "ListBuckets", "s3.amazonaws.com", "svc-ci", attacker_ip)
    t += timedelta(seconds=31)
    for n in ["ListAttachedUserPolicies", "GetUserPolicy", "ListRoles"]:
        t += timedelta(seconds=random.randint(3, 20))
        ev(t, n, "iam.amazonaws.com", "svc-ci", attacker_ip)

    # 권한 상승 시도 (실패) → 성공
    t += timedelta(seconds=25)
    ev(t, "AttachUserPolicy", "iam.amazonaws.com", "svc-ci", attacker_ip,
       extra={"userName": "svc-ci", "policyArn": "arn:aws:iam::aws:policy/AdministratorAccess"},
       err="AccessDenied")
    t += timedelta(seconds=48)
    ev(t, "CreateAccessKey", "iam.amazonaws.com", "svc-ci", attacker_ip,
       extra={"userName": "svc-ci"})
    ANS["day120_persist"] = "CreateAccessKey"

    # 로그 끄기 시도
    t += timedelta(minutes=2)
    ev(t, "StopLogging", "cloudtrail.amazonaws.com", "svc-ci", attacker_ip,
       extra={"name": "acme-org-trail"}, err="AccessDenied")
    ANS["day120_evade"] = "StopLogging"

    # 데이터 유출
    t += timedelta(minutes=3)
    for i in range(180):
        t += timedelta(seconds=random.uniform(0.4, 2.2))
        ev(t, "GetObject", "s3.amazonaws.com", "svc-ci", attacker_ip,
           extra={"bucketName": "acme-customer-exports",
                  "key": "exports/2026/customers_%04d.csv.gz" % i})

    events.sort(key=lambda e: e["eventTime"])
    p = os.path.join(ROOT, "lab-cloudtrail.json")
    body = json.dumps({"Records": events}, indent=1, ensure_ascii=False) + "\n"
    io.open(p, "w", encoding="utf-8", newline="\n").write(body)
    print("  %-26s %6d건  %7.1f KB" % ("lab-cloudtrail.json", len(events), len(body.encode()) / 1024))


if __name__ == "__main__":
    print("실전 랩 로그 생성 중...")
    day20(); day40(); day60(); day120()
    print("\n정답 요약")
    for k, v in sorted(ANS.items()):
        print("  %-22s %s" % (k, v))
