#!/usr/bin/env bash
# Corre los tests de integración de forma autónoma:
# 1) arranca el backend en un puerto de test con throttle OFF (DISABLE_THROTTLE=1)
# 2) espera healthcheck
# 3) corre jest apuntando a ese server
# 4) mata el backend de test
set -e
cd "$(dirname "$0")/.."

PORT=4100
export DISABLE_THROTTLE=1
export PORT

# build por si acaso
npm run build >/dev/null 2>&1 || true

echo "Arrancando backend de test en :$PORT (throttle off)..."
node dist/src/main.js > /tmp/gf_test_backend.log 2>&1 &
BACK_PID=$!

# healthcheck
for i in $(seq 1 20); do
  if curl -s -o /dev/null http://localhost:$PORT/api/dishes; then break; fi
  sleep 1
done

cleanup() { kill $BACK_PID 2>/dev/null || true; }
trap cleanup EXIT

API_BASE="http://localhost:$PORT" npx jest --config jest.config.js --runInBand "$@"
