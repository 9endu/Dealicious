# install.ps1 - PowerShell installation script
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AI Group Buy - Backend Installation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  Running as non-admin. Some packages might need admin rights." -ForegroundColor Yellow
}

# Clean up previous installations
Write-Host "🧹 Cleaning up previous installation..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Remove-Item package-lock.json -ErrorAction SilentlyContinue
}

# Step 1: Install core packages
Write-Host "`n📦 Step 1: Installing core dependencies..." -ForegroundColor Green
npm install --legacy-peer-deps express cors helmet compression dotenv bcryptjs jsonwebtoken

# Step 2: Install database packages
Write-Host "`n🗄️  Step 2: Installing database packages..." -ForegroundColor Green
npm install --legacy-peer-deps typeorm pg redis reflect-metadata

# Step 3: Install AI packages (install separately to avoid conflicts)
Write-Host "`n🤖 Step 3: Installing AI packages..." -ForegroundColor Green

# Install TensorFlow first (most problematic)
Write-Host "   Installing TensorFlow.js..." -ForegroundColor Gray
npm install --legacy-peer-deps @tensorflow/tfjs@4.10.0 --no-audit --fund=false

Write-Host "   Installing TensorFlow Node..." -ForegroundColor Gray
npm install --legacy-peer-deps @tensorflow/tfjs-node@4.10.0 --no-audit --fund=false

Write-Host "   Installing TensorFlow models..." -ForegroundColor Gray
npm install --legacy-peer-deps @tensorflow-models/universal-sentence-encoder@1.3.3 --no-audit --fund=false

# Install other AI packages
Write-Host "   Installing OCR and NLP..." -ForegroundColor Gray
npm install --legacy-peer-deps tesseract.js@4.0.2 compromise@14.12.3 natural@6.5.0 brain.js@2.0.0-beta.18 --no-audit --fund=false

# Step 4: Install remaining packages
Write-Host "`n📚 Step 4: Installing remaining packages..." -ForegroundColor Green
npm install --legacy-peer-deps `
    axios cheerio sharp `
    multer uuid moment `
    joi class-validator class-transformer `
    socket.io bull nodemailer `
    --no-audit --fund=false

# Step 5: Install dev dependencies
Write-Host "`n🔧 Step 5: Installing dev dependencies..." -ForegroundColor Green
npm install --legacy-peer-deps --save-dev `
    typescript ts-node-dev `
    @types/node @types/express @types/cors `
    @types/bcryptjs @types/jsonwebtoken `
    --no-audit --fund=false

# Verify installation
Write-Host "`n✅ Verification..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "✓ node_modules created successfully" -ForegroundColor Green
} else {
    Write-Host "✗ node_modules creation failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run dev     - Start development server" -ForegroundColor White
Write-Host "2. Run: npm run build   - Build for production" -ForegroundColor White
Write-Host "3. Run: npm start       - Start production server" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan

pause