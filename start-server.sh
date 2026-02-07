#!/bin/bash

# Default to port 80 if not specified
PORT=${1:-80}

echo "============================================"
echo "Cordverse Deployment Script"
echo "Current Commit: $(git log -1 --format='%h - %s')"
echo "============================================"

echo "Starting Cordverse Server on port $PORT..."

# Ensure frontend is built
echo "Building frontend..."
cd frontend
rm -rf dist
npm install
npm run build
cd ..

# Run backend using PM2
echo "Starting backend with PM2..."
cd backend
npm install
PORT=$PORT npx pm2 startOrRestart ecosystem.config.js --env production --update-env
npx pm2 save
cd ..

echo "Server started in background. Use 'npx pm2 logs cordverse' to view logs."
npx pm2 list
