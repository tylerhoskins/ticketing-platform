#!/bin/bash

# Frontend Startup Script
# This script sets up and starts the Next.js frontend application

echo "🎟️  Starting Flicket Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Navigate to frontend directory
cd frontend || {
    echo "❌ Frontend directory not found. Make sure you're in the project root."
    exit 1
}

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Frontend setup may be incomplete."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
fi

# Check if .env.local exists, create if not
if [ ! -f ".env.local" ]; then
    echo "🔧 Creating .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
fi

# Start the development server
echo "🚀 Starting Next.js development server..."
echo "Frontend will be available at: http://localhost:3000"
echo "Make sure the backend is running at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev