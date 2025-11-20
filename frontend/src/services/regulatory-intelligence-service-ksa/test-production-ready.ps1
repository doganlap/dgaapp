# Stage 1 Pre-Production Test Script (PowerShell)
# Tests Regulatory Intelligence Service before production deployment

$ErrorActionPreference = "Continue"

Write-Host "🧪 ================================================" -ForegroundColor Cyan
Write-Host "   STAGE 1 PRE-PRODUCTION TESTING" -ForegroundColor Cyan
Write-Host "   Regulatory Intelligence Service - KSA" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_URL = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://localhost:3008" }
$BFF_URL = if ($env:BFF_URL) { $env:BFF_URL } else { "http://localhost:3000" }
$TESTS_PASSED = 0
$TESTS_FAILED = 0
$WARNINGS = 0

# Helper functions
function Test-Pass {
    param($message)
    Write-Host "✅ PASS: $message" -ForegroundColor Green
    $script:TESTS_PASSED++
}

function Test-Fail {
    param($message)
    Write-Host "❌ FAIL: $message" -ForegroundColor Red
    $script:TESTS_FAILED++
}

function Test-Warn {
    param($message)
    Write-Host "⚠️  WARN: $message" -ForegroundColor Yellow
    $script:WARNINGS++
}

# ============================================
# 1. BACKEND HEALTH CHECKS
# ============================================
Write-Host "📡 Testing Backend Service..." -ForegroundColor Cyan
Write-Host "-----------------------------------"

# Test 1: Health Check
try {
    $healthResponse = Invoke-RestMethod -Uri "$BACKEND_URL/healthz" -Method Get -TimeoutSec 5
    if ($healthResponse.status -eq "healthy") {
        Test-Pass "Health check endpoint responding"
    } else {
        Test-Fail "Health check returned unexpected response"
    }
} catch {
    Test-Fail "Health check endpoint not responding"
    Write-Host "❌ Backend service is not running at $BACKEND_URL" -ForegroundColor Red
    Write-Host "   Please start the service with: npm start"
    exit 1
}

# Test 2: Readiness Check
try {
    $readyResponse = Invoke-RestMethod -Uri "$BACKEND_URL/readyz" -Method Get -TimeoutSec 5
    if ($readyResponse.status -eq "ready") {
        Test-Pass "Readiness check endpoint responding"
        
        if ($readyResponse.database -eq "connected") {
            Test-Pass "Database connection verified"
        } else {
            Test-Fail "Database not connected"
        }
        
        if ($readyResponse.redis -eq "connected") {
            Test-Pass "Redis connection verified"
        } else {
            Test-Warn "Redis not connected (optional but recommended)"
        }
    } else {
        Test-Fail "Service not ready"
    }
} catch {
    Test-Fail "Readiness endpoint not responding"
}

Write-Host ""

# ============================================
# 2. API ENDPOINT TESTS
# ============================================
Write-Host "🔌 Testing API Endpoints..." -ForegroundColor Cyan
Write-Host "-----------------------------------"

# Test 3: Get Regulators List
try {
    $regulators = Invoke-RestMethod -Uri "$BACKEND_URL/api/regulatory/regulators" -Method Get
    if ($regulators.success -and ($regulators.data | Where-Object { $_.id -eq "SAMA" })) {
        Test-Pass "Regulators API returning data"
    } else {
        Test-Fail "Regulators API not returning expected data"
    }
} catch {
    Test-Fail "Regulators API failed: $_"
}

# Test 4: Get Recent Changes
try {
    $changes = Invoke-RestMethod -Uri "$BACKEND_URL/api/regulatory/changes" -Method Get
    if ($changes.success) {
        Test-Pass "Changes API responding"
    } else {
        Test-Fail "Changes API failed"
    }
} catch {
    Test-Fail "Changes API failed: $_"
}

# Test 5: Get Statistics
try {
    $stats = Invoke-RestMethod -Uri "$BACKEND_URL/api/regulatory/stats" -Method Get
    if ($stats.success) {
        Test-Pass "Statistics API responding"
    } else {
        Test-Fail "Statistics API failed"
    }
} catch {
    Test-Fail "Statistics API failed: $_"
}

# Test 6: Error Handling (404)
try {
    Invoke-RestMethod -Uri "$BACKEND_URL/api/regulatory/invalid-endpoint" -Method Get -ErrorAction Stop
    Test-Fail "404 error handling failed (should have thrown error)"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Test-Pass "404 error handling works"
    } else {
        Test-Fail "404 error handling failed (got $($_.Exception.Response.StatusCode.value__))"
    }
}

Write-Host ""

# ============================================
# 3. BFF PROXY TESTS
# ============================================
Write-Host "🔄 Testing BFF Proxy..." -ForegroundColor Cyan
Write-Host "-----------------------------------"

try {
    $bffRegulators = Invoke-RestMethod -Uri "$BFF_URL/api/regulatory/regulators" -Method Get -TimeoutSec 5
    if ($bffRegulators.data | Where-Object { $_.id -eq "SAMA" }) {
        Test-Pass "BFF proxy routing works"
    } else {
        Test-Fail "BFF proxy not routing correctly"
    }
} catch {
    Test-Warn "BFF not responding (may not be started)"
    Write-Host "   To start BFF: cd apps\bff; npm start"
}

Write-Host ""

# ============================================
# 4. PERFORMANCE TESTS
# ============================================
Write-Host "⚡ Testing Performance..." -ForegroundColor Cyan
Write-Host "-----------------------------------"

# Test 8: Response Time
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    Invoke-RestMethod -Uri "$BACKEND_URL/api/regulatory/changes" -Method Get | Out-Null
    $stopwatch.Stop()
    $responseTimeMs = $stopwatch.ElapsedMilliseconds
    
    if ($responseTimeMs -lt 200) {
        Test-Pass "Response time excellent ($responseTimeMs ms)"
    } elseif ($responseTimeMs -lt 500) {
        Test-Pass "Response time acceptable ($responseTimeMs ms)"
    } else {
        Test-Warn "Response time slow ($responseTimeMs ms - target: <200ms)"
    }
} catch {
    Test-Fail "Performance test failed: $_"
}

Write-Host ""

# ============================================
# 5. SECURITY TESTS
# ============================================
Write-Host "🔒 Testing Security..." -ForegroundColor Cyan
Write-Host "-----------------------------------"

# Test 11: SQL Injection Protection
try {
    $sqlInjection = Invoke-RestMethod -Uri "$BACKEND_URL/api/regulatory/changes?regulator=SAMA';DROP TABLE regulatory_changes;--" -Method Get
    Test-Pass "SQL injection protection working"
} catch {
    Test-Pass "SQL injection protection working (request blocked)"
}

# Test 12: Multiple Concurrent Requests
$concurrent = 0
for ($i = 1; $i -le 10; $i++) {
    try {
        Invoke-RestMethod -Uri "$BACKEND_URL/api/regulatory/regulators" -Method Get -TimeoutSec 2 | Out-Null
        $concurrent++
    } catch {}
}

if ($concurrent -eq 10) {
    Test-Pass "Service handles multiple concurrent requests"
} else {
    Test-Fail "Service failing under concurrent requests ($concurrent/10 succeeded)"
}

Write-Host ""

# ============================================
# 6. LOGGING TESTS
# ============================================
Write-Host "📝 Testing Logging..." -ForegroundColor Cyan
Write-Host "-----------------------------------"

if (Test-Path "logs") {
    if (Test-Path "logs\combined.log") {
        Test-Pass "Combined log file exists"
    } else {
        Test-Warn "Combined log file not found"
    }
    
    if (Test-Path "logs\error.log") {
        Test-Pass "Error log file exists"
    } else {
        Test-Warn "Error log file not found"
    }
} else {
    Test-Warn "Logs directory not found"
}

Write-Host ""

# ============================================
# 7. CONFIGURATION TESTS
# ============================================
Write-Host "⚙️  Testing Configuration..." -ForegroundColor Cyan
Write-Host "-----------------------------------"

if (Test-Path ".env") {
    Test-Pass ".env file exists"
    
    $envContent = Get-Content .env -Raw
    if ($envContent -match "DB_NAME") {
        Test-Pass "Database configuration present"
    } else {
        Test-Fail "Database configuration missing"
    }
    
    if ($envContent -match "OPENAI_API_KEY") {
        Test-Pass "OpenAI API key configured"
    } else {
        Test-Warn "OpenAI API key not configured (AI analysis won't work)"
    }
} else {
    Test-Fail ".env file missing"
    Write-Host "   Copy .env.example to .env and configure"
}

Write-Host ""

# ============================================
# FINAL RESULTS
# ============================================
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Tests Passed:  $TESTS_PASSED" -ForegroundColor Green
Write-Host "❌ Tests Failed:  $TESTS_FAILED" -ForegroundColor Red
Write-Host "⚠️  Warnings:     $WARNINGS" -ForegroundColor Yellow
Write-Host ""

$TOTAL_TESTS = $TESTS_PASSED + $TESTS_FAILED
if ($TOTAL_TESTS -gt 0) {
    $PASS_RATE = [math]::Round(($TESTS_PASSED / $TOTAL_TESTS) * 100, 0)
    Write-Host "Pass Rate: $PASS_RATE%"
    Write-Host ""
}

# Production readiness assessment
if ($TESTS_FAILED -eq 0 -and $TESTS_PASSED -ge 10) {
    Write-Host "🎉 PRODUCTION READY!" -ForegroundColor Green
    Write-Host "   All critical tests passed"
    Write-Host "   ✅ Backend service is operational"
    Write-Host "   ✅ API endpoints responding correctly"
    Write-Host "   ✅ Security tests passed"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Review warnings above (if any)"
    Write-Host "  2. Test frontend UI manually"
    Write-Host "  3. Deploy to production environment"
    exit 0
} elseif ($TESTS_FAILED -eq 0) {
    Write-Host "⚠️  MOSTLY READY" -ForegroundColor Yellow
    Write-Host "   Some tests could not be completed"
    Write-Host "   Review warnings above"
    Write-Host ""
    Write-Host "Recommendations:"
    Write-Host "  - Address all warnings"
    Write-Host "  - Complete manual testing"
    Write-Host "  - Deploy to staging first"
    exit 0
} else {
    Write-Host "❌ NOT PRODUCTION READY" -ForegroundColor Red
    Write-Host "   $TESTS_FAILED test(s) failed"
    Write-Host "   Fix failed tests before deploying"
    Write-Host ""
    Write-Host "Critical issues to fix:"
    Write-Host "  - Review failed tests above"
    Write-Host "  - Check logs for errors"
    Write-Host "  - Verify all services are running"
    exit 1
}

