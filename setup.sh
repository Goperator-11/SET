#!/usr/bin/env bash
# 야간근무 100일 — 서버 설치 도우미
#
#   ./setup.sh
#
# 물어보는 것에 답하면 .env 를 만들고 컨테이너를 띄운다.
# 이미 .env 가 있으면 건드리지 않고 그대로 쓴다.

set -euo pipefail
cd "$(dirname "$0")"

B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'
ok()   { echo "  ${G}✓${N} $*"; }
warn() { echo "  ${Y}!${N} $*"; }
die()  { echo "  ${R}✗${N} $*" >&2; exit 1; }

echo
echo "${B}야간근무 100일 — 서버 설치${N}"
echo "────────────────────────────────────────"

# ── 1. 사전 점검 ───────────────────────────────────────────
echo
echo "${B}1. 환경 확인${N}"

command -v docker >/dev/null 2>&1 || die "도커가 없습니다.  curl -fsSL https://get.docker.com | sh"
ok "docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  die "docker compose 를 찾을 수 없습니다. 도커를 최신 버전으로 올려주세요."
fi
ok "$COMPOSE"

# 터널 오버레이가 쓰는 !override 는 Compose v2.24+ 부터 지원한다
CV=$($COMPOSE version --short 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
CV_MAJOR=${CV%%.*}; CV_MINOR=${CV##*.}
if [ -n "$CV" ] && [ "${CV_MAJOR:-0}" -eq 2 ] && [ "${CV_MINOR:-0}" -lt 24 ]; then
  warn "Compose $CV 는 조금 낡았습니다. Cloudflare Tunnel 모드가 안 되면 도커를 업데이트하세요."
fi

docker info >/dev/null 2>&1 || die "도커 데몬에 접근할 수 없습니다.
     서비스가 꺼져 있다면:  sudo systemctl start docker
     권한 문제라면:         sudo usermod -aG docker \$USER   (그리고 다시 로그인)"
ok "도커 데몬 정상"

# ── 2. 설정 ────────────────────────────────────────────────
echo
echo "${B}2. 설정${N}"

if [ -f .env ]; then
  ok ".env 가 이미 있습니다. 그대로 씁니다."
  warn "설정을 바꾸려면 .env 를 직접 편집한 뒤 이 스크립트를 다시 실행하세요."
else
  echo
  echo "  ${B}접속 방식을 고르세요.${N}"
  echo "    1) Cloudflare Tunnel  — 도메인 + HTTPS, 포트포워딩 불필요 ${G}(추천)${N}"
  echo "    2) 포트로 직접        — http://서버IP:3000 으로만 접속"
  echo
  read -rp "  선택 [1/2] (기본 1): " MODE
  MODE=${MODE:-1}

  INVITE=$(head -c 9 /dev/urandom | base64 | tr -d '/+=' | head -c 12)

  if [ "$MODE" = "1" ]; then
    echo
    echo "  Cloudflare 대시보드에서 터널을 만들고 토큰을 받아오세요."
    echo "    Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared"
    echo "    Public hostname 의 Service 는  ${B}http://nightshift:3000${N}  으로 지정합니다."
    echo
    read -rp "  터널 토큰 붙여넣기: " TUNNEL_TOKEN
    [ -n "$TUNNEL_TOKEN" ] || die "토큰이 비어 있습니다."
    read -rp "  접속할 도메인 (예: study.example.com): " DOMAIN
    [ -n "$DOMAIN" ] || die "도메인이 비어 있습니다."

    cat > .env <<EOF
# Cloudflare Tunnel 구성
HOST_PORT=3000
INVITE_CODE=$INVITE
COOKIE_SECURE=true
APP_ORIGIN=https://$DOMAIN
TUNNEL_TOKEN=$TUNNEL_TOKEN
EOF
    USE_TUNNEL=1
  else
    read -rp "  사용할 포트 (기본 3000): " PORT
    PORT=${PORT:-3000}
    cat > .env <<EOF
# 포트 직접 노출 구성
HOST_PORT=$PORT
INVITE_CODE=$INVITE
COOKIE_SECURE=false
APP_ORIGIN=
EOF
    USE_TUNNEL=0
  fi
  chmod 600 .env
  ok ".env 생성 (권한 600)"
  ok "초대코드: ${B}$INVITE${N}   ← 다른 사람을 받을 때 알려줄 코드입니다"
fi

# .env 를 읽어 터널 사용 여부 판단
set -a; . ./.env; set +a
USE_TUNNEL=${USE_TUNNEL:-0}
[ -n "${TUNNEL_TOKEN:-}" ] && USE_TUNNEL=1

# ── 3. 기동 ────────────────────────────────────────────────
echo
echo "${B}3. 빌드하고 띄우기${N}"

FILES="-f docker-compose.yml"
[ "$USE_TUNNEL" = "1" ] && FILES="$FILES -f docker-compose.cloudflared.yml"

$COMPOSE $FILES up -d --build
ok "컨테이너 기동"

# ── 4. 확인 ────────────────────────────────────────────────
echo
echo "${B}4. 동작 확인${N}"

for i in $(seq 1 20); do
  if docker exec nightshift node -e \
      "fetch('http://127.0.0.1:3000/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
    ok "서버 응답 정상"
    break
  fi
  [ "$i" = "20" ] && { echo; warn "서버가 응답하지 않습니다. 로그를 확인하세요:"; echo "     $COMPOSE logs nightshift"; exit 1; }
  sleep 1
done

if [ "$USE_TUNNEL" = "1" ]; then
  sleep 3
  if docker logs nightshift-tunnel 2>&1 | grep -qi "Registered tunnel connection"; then
    ok "Cloudflare 터널 연결됨"
  else
    warn "터널 연결을 아직 확인하지 못했습니다. 잠시 뒤 확인하세요:"
    echo "     docker logs nightshift-tunnel"
  fi
fi

echo
echo "────────────────────────────────────────"
if [ "$USE_TUNNEL" = "1" ]; then
  echo "  ${G}${B}${APP_ORIGIN}${N} 으로 접속하세요."
else
  IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  echo "  ${G}${B}http://${IP:-서버IP}:${HOST_PORT}${N} 으로 접속하세요."
fi
echo
echo "  처음 만드는 계정이 ${B}관리자${N}가 됩니다."
echo "  그 뒤로는 초대코드를 아는 사람만 가입할 수 있습니다."
echo
echo "  로그 보기   : $COMPOSE $FILES logs -f"
echo "  업데이트    : git pull && ./setup.sh"
echo "  진도 백업   : docker run --rm -v nightshift-data:/d -v \"\$PWD:/o\" alpine tar czf /o/backup.tar.gz -C /d ."
echo
