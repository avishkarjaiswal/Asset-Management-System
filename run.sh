#!/bin/bash

echo "🚀 Starting Asset Management System..."

# Function to handle cleanup on script exit
cleanup() {
    echo "🛑 Stopping servers..."
    # Kill the background processes
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT) and terminal close to run cleanup
trap cleanup EXIT INT TERM

# ==========================================
# 1. Backend Setup & Start
# ==========================================
echo "📦 Setting up and starting Backend..."
cd backend || exit

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment (handles both Windows/GitBash and Mac/Linux)
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install requirements
pip install -r requirements.txt -q

# Copy .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
fi

# Run migrations
flask db upgrade

# Start backend in the background
python app.py &
BACKEND_PID=$!
cd ..

# ==========================================
# 2. Frontend Setup & Start
# ==========================================
echo "🎨 Setting up and starting Frontend..."
cd frontend || exit

# Install frontend dependencies
npm install

# Start frontend in the background
npm run dev &
FRONTEND_PID=$!
cd ..

echo "=========================================="
echo "✅ Both servers are starting up!"
echo "📡 Backend API will be available at: http://localhost:5000"
echo "🖥️  Frontend UI will be available at: http://localhost:5173"
echo "🔑 Demo Credentials -> admin@gppl.in | Admin@1234"
echo "🛑 Press Ctrl+C to stop both servers."
echo "=========================================="

# Wait for both processes to keep the script running
wait $BACKEND_PID $FRONTEND_PID
