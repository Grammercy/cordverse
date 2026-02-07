#!/bin/bash

# Default to port 80 if not specified
PORT=${1:-80}

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
cd ..

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "PM2 not found. Installing globally..."
    npm install -g pm2
fi

# Start or Restart using PM2, passing the PORT environment variable
# --update-env ensures the new PORT (if changed) is picked up
PORT=$PORT pm2 startOrRestart ecosystem.config.js --env production --update-env

# Save list
pm2 save

echo "Server started in background. Use 'pm2 logs cordverse' to view logs."
pm2 list
