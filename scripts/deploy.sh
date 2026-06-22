#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/root/projects/rogame/ro-game-api}"
PM2_NAME="${PM2_APP_NAME:-ro-game-api}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "${APP_DIR}"

echo ">>> Pulling ${BRANCH}..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo ">>> Installing dependencies..."
npm install

echo ">>> Building..."
npm run build

echo ">>> Restarting PM2 (${PM2_NAME})..."
if pm2 describe "${PM2_NAME}" > /dev/null 2>&1; then
  pm2 restart "${PM2_NAME}"
else
  pm2 start dist/server.js --name "${PM2_NAME}"
fi

pm2 save

echo ">>> Done."
