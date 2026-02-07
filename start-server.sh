#!/bin/bash

# Default to port 80 if not specified
PORT=${1:-80}

echo "Starting Cordverse Server on port $PORT..."

# Ensure frontend is built
echo "Building frontend..."
cd frontend && npm run build
cd ..

# Run backend with the specified port
echo "Starting backend..."
export PORT=$PORT
cd backend && node src/index.js
