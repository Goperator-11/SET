#!/usr/bin/env bash
# 야간근무 100일 — 배포 진단
#
#   ./doctor.sh
#
# 어디가 끊겼는지 순서대로 짚어준다. 고치지는 않고 알려만 준다.

cd "$(dirname "$0")"

B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; D=$'\033[2m'; N=$'\033[0m'
ok()   { echo "  ${G}✓${N} $*"; }
bad()  { echo "  ${R}✗${N} $*"; FAIL=1; }
warn() { echo "  ${Y}!${N} $*"; }
info() { echo "    ${D}$*${N}"; }
FAIL=0

echo
echo "${B}야간근무 100일 — 배포 진단${N}"
echo "────────────────────────────────────────────────"

# ── 1. 설정 ───────────────────────────────────────────────
echo
echo "${B}1. 설정 파일${N}"
if [ -f .env ]; then
  ok ".env 있음"
  set -a; . ./.env 2>/dev/null; set +a
  [ -n "${APP_ORIGIN:-}" ]   && ok "APP_ORIGIN=$APP_ORIGIN" || warn "APP_ORIGIN 이 비어 있음 (프록시 뒤라면 403 이 납니다)"
  [ "${COOKIE_SECURE:-}" = "true" ] && ok "COOKIE_SECURE=true" || warn "COOKIE_SECURE=${COOKIE_SECURE:-미설정} (HTTPS 라면 true 여야 합니다)"
  if [ -n "${TUNNEL_TOKEN:-}" ]; then
    ok "TUNNEL_TOKEN 있음 (${#TUNNEL_TOKEN}자)"
    TUNNEL_MODE=1
  else
    warn "TUNNEL_TOKEN 없음 — 터널을 안 쓰는 구성입니다"
    TUNNEL_MODE=0
  fi
else
  bad ".env 가 없습니다 — ./setup.sh 를 먼저 실행하세요"
  exit 1
fi

# ── 2. 컨테이너 ────────────────────────────────────────────
echo
echo "${B}2. 컨테이너 상태${N}"
if docker ps --format '{{.Names}}' | grep -qx nightshift; then
  ok "nightshift 실행 중  $(docker ps --filter name=^nightshift$ --format '{{.Status}}')"
else
  bad "nightshift 가 실행 중이 아닙니다"
  info "docker compose logs nightshift  로 원인을 확인하세요"
fi

if [ "$TUNNEL_MODE" = "1" ]; then
  if docker ps --format '{{.Names}}' | grep -qx nightshift-tunnel; then
    ok "nightshift-tunnel 실행 중  $(docker ps --filter name=^nightshift-tunnel$ --format '{{.Status}}')"
  else
    bad "nightshift-tunnel 이 실행 중이 아닙니다  ← 1033 오류의 가장 흔한 원인"
    if docker ps -a --format '{{.Names}}' | grep -qx nightshift-tunnel; then
      info "죽은 컨테이너가 있습니다. 마지막 로그:"
      docker logs --tail 15 nightshift-tunnel 2>&1 | sed 's/^/      /'
    else
      info "터널 오버레이 없이 띄운 것 같습니다. 이렇게 다시 올리세요:"
      info "docker compose -f docker-compose.yml -f docker-compose.cloudflared.yml up -d"
    fi
  fi
fi

# ── 3. 앱 응답 ─────────────────────────────────────────────
echo
echo "${B}3. 앱이 응답하는가${N}"
if docker exec nightshift node -e \
   "fetch('http://127.0.0.1:3000/api/config').then(r=>r.text()).then(t=>{console.log(t);process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})" \
   2>/dev/null | grep -q '"server":true'; then
  ok "컨테이너 내부에서 정상 응답"
else
  bad "앱이 응답하지 않습니다"
  info "docker compose logs --tail 30 nightshift"
fi

# ── 4. 터널 → 앱 경로 ──────────────────────────────────────
if [ "$TUNNEL_MODE" = "1" ] && docker ps --format '{{.Names}}' | grep -qx nightshift-tunnel; then
  echo
  echo "${B}4. 터널에서 앱까지 닿는가${N}"
  if docker exec nightshift-tunnel sh -c 'command -v wget >/dev/null && wget -qO- --timeout=5 http://nightshift:3000/api/config' 2>/dev/null | grep -q '"server":true'; then
    ok "터널 컨테이너에서 nightshift:3000 도달 가능"
  else
    warn "터널 컨테이너에서 직접 확인하지 못했습니다 (도구가 없을 수 있어 참고용)"
  fi

  echo
  echo "${B}5. Cloudflare 연결 상태${N}"
  LOG=$(docker logs --tail 200 nightshift-tunnel 2>&1)
  CONN=$(echo "$LOG" | grep -ci "Registered tunnel connection")
  if [ "$CONN" -gt 0 ]; then
    ok "Cloudflare 에 연결됨 (커넥션 $CONN 개)"
  else
    bad "Cloudflare 에 아직 연결되지 않았습니다  ← 1033 오류의 원인"
  fi

  if echo "$LOG" | grep -qi "Unauthorized\|invalid token\|failed to parse token"; then
    bad "터널 토큰이 잘못되었습니다"
    info "Cloudflare 대시보드에서 토큰을 다시 복사해 .env 의 TUNNEL_TOKEN 에 넣으세요"
  fi
  if echo "$LOG" | grep -qi "no such host\|connection refused\|dial tcp"; then
    warn "터널이 앱을 못 찾고 있습니다"
    info "Public hostname 의 Service URL 이 http://nightshift:3000 인지 확인하세요"
    info "(localhost:3000 으로 두면 이 오류가 납니다)"
  fi

  echo
  echo "  ${D}터널 최근 로그 ─────────────────────────${N}"
  echo "$LOG" | tail -12 | sed 's/^/    /'
fi

# ── 6. DNS ────────────────────────────────────────────────
if [ -n "${APP_ORIGIN:-}" ]; then
  HOSTNAME_ONLY=$(echo "$APP_ORIGIN" | sed -E 's#^https?://##; s#/.*##')
  echo
  echo "${B}6. DNS 레코드${N}"
  if command -v dig >/dev/null 2>&1; then
    CNAME=$(dig +short CNAME "$HOSTNAME_ONLY" 2>/dev/null)
    A=$(dig +short A "$HOSTNAME_ONLY" 2>/dev/null | head -3)
    if echo "$CNAME" | grep -qi "cfargotunnel.com"; then
      ok "터널 CNAME 확인:  $CNAME"
    elif [ -n "$A" ]; then
      # Cloudflare 프록시 대역이면 정상(프록시가 원본을 가림)
      if echo "$A" | grep -qE "^(104\.(1[6-9]|2[0-9]|3[01])\.|172\.6[4-9]\.|172\.7[0-1]\.|188\.114\.|162\.15[89]\.|198\.41\.|190\.93\.|197\.234\.)"; then
        ok "Cloudflare 프록시를 거치고 있습니다  ($(echo $A | tr '
' ' '))"
        info "프록시 뒤라 실제 대상은 가려집니다. 1033 이 뜬다면 Public hostname 이 없는 것입니다."
      else
        bad "Cloudflare 를 거치지 않는 A 레코드가 있습니다:  $(echo $A | tr '
' ' ')"
        info "터널을 쓸 때는 A 레코드를 직접 만들면 안 됩니다."
        info "Cloudflare DNS 탭에서 $HOSTNAME_ONLY 의 A 레코드를 지운 뒤,"
        info "Tunnel -> Public Hostname 에서 추가하면 CNAME 이 자동 생성됩니다."
      fi
    else
      bad "$HOSTNAME_ONLY 에 대한 DNS 응답이 없습니다"
      info "도메인 네임서버가 Cloudflare 로 넘어갔는지 확인하세요"
    fi
  else
    warn "dig 가 없어 DNS 를 확인하지 못했습니다  (sudo apt install dnsutils)"
  fi
fi

# ── 7. 바깥에서 ────────────────────────────────────────────
if [ -n "${APP_ORIGIN:-}" ]; then
  echo
  echo "${B}7. 바깥에서 접속${N}"
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$APP_ORIGIN/api/config" 2>/dev/null)
  case "$CODE" in
    200) ok "$APP_ORIGIN 정상 응답 (200)" ;;
    530|000) bad "$APP_ORIGIN 응답 없음 / 1033 (코드 $CODE) — 터널이 안 붙었습니다" ;;
    502|504) bad "$APP_ORIGIN 게이트웨이 오류 ($CODE) — 터널은 붙었으나 앱을 못 찾습니다"
             info "Public hostname 의 Service URL 을 http://nightshift:3000 으로 고치세요" ;;
    *)   warn "$APP_ORIGIN 응답 코드 $CODE" ;;
  esac
fi

echo
echo "────────────────────────────────────────────────"
if [ "$FAIL" = "0" ]; then
  echo "  ${G}${B}문제를 찾지 못했습니다.${N} 그래도 안 되면 이 출력을 그대로 공유해주세요."
else
  echo "  ${R}${B}위의 ✗ 항목부터 확인하세요.${N}"
  echo
  echo "  ${B}1033 오류 점검 순서${N}"
  echo "    1) nightshift-tunnel 컨테이너가 떠 있는가"
  echo "    2) 터널 로그에 'Registered tunnel connection' 이 있는가"
  echo "    3) Cloudflare 대시보드 → Tunnels 에서 상태가 ${G}HEALTHY${N} 인가"
  echo "    4) Public hostname 이 등록돼 있고 Service 가 http://nightshift:3000 인가"
fi
echo
