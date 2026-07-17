Write-Host "Starting Asset Management System..." -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# ==========================================
# 1. Frontend Setup
# ==========================================
Write-Host "`n[1/3] Setting up Frontend..." -ForegroundColor Yellow
Push-Location frontend
npm install
Pop-Location

# ==========================================
# 2. Backend Setup
# ==========================================
Write-Host "`n[2/3] Setting up Backend..." -ForegroundColor Yellow
Push-Location backend

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
}

# Activate virtual environment
$env:VIRTUAL_ENV = "$PWD\venv"
$env:PATH = "$PWD\venv\Scripts;$env:PATH"

Write-Host "Installing dependencies..."
pip install -r requirements.txt -q

if (-not (Test-Path ".env")) {
    Write-Host "Copying .env.example to .env..."
    Copy-Item .env.example .env
}

if (-not (Test-Path "migrations")) {
    Write-Host "Initializing database..."
    flask db init
    flask db migrate -m "Initial migration"
}
flask db upgrade

# ==========================================
# 3. Start Application
# ==========================================
Write-Host "`n[3/3] Starting servers in this window (Press CTRL+C to stop)..." -ForegroundColor Green
Write-Host "The application will automatically open in your browser." -ForegroundColor Cyan
Write-Host "Demo Credentials: admin@gppl.in | Admin@1234`n" -ForegroundColor Yellow

# Start backend in the CURRENT window so you can see all logs!
# (app.py is configured to automatically launch the frontend for us)
python app.py

Pop-Location
