#!/bin/bash

# Kill all background processes on exit
trap "kill 0" EXIT

echo "Starting Cordverse..."

# Start backend
cd backend && npm run dev &

# Start frontend
cd frontend && npm run dev &

# Wait for all processes
wait
