# 외부 의존성 없음 — Node 24 내장 node:sqlite / node:crypto / node:http 만 사용
FROM node:24-alpine

RUN apk add --no-cache tini && addgroup -g 10001 app && adduser -u 10001 -G app -D app

WORKDIR /app
COPY server/ ./server/
COPY public/ ./public/

RUN mkdir -p /data && chown -R app:app /data /app
USER app

ENV NODE_ENV=production PORT=3000 DB_PATH=/data/nightshift.db
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","server/server.js"]
