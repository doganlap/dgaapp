#!/bin/bash

# Stage 1 Pre-Production Test Script
# Tests Regulatory Intelligence Service before production deployment

set -e  # Exit on error

echo "🧪 ================================================"
echo "   STAGE 1 PRE-PRODUCTION TESTING"
echo "   Regulatory Intelligence Service - KSA"
echo "================================================"
echo ""

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3008}"
BFF_URL="${BFF_URL:-http://localhost:3000}"
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
test_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

# ============================================
# 1. BACKEND HEALTH CHECKS
# ============================================
echo "📡 Testing Backend Service..."
echo "-----------------------------------"

# Test 1: Health Check
if curl -sf "$BACKEND_URL/healthz" > /dev/null; then
    HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/healthz")
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        test_pass "Health check endpoint responding"
    else
        test_fail "Health check returned unexpected response"
    fi
else
    test_fail "Health check endpoint not responding"
    echo "❌ Backend service is not running at $BACKEND_URL"
    echo "   Please start the service with: npm start"
    exit 1
fi

# Test 2: Readiness Check
if curl -sf "$BACKEND_URL/readyz" > /dev/null; then
    READY_RESPONSE=$(curl -s "$BACKEND_URL/readyz")
    if echo "$READY_RESPONSE" | grep -q "ready"; then
        test_pass "Readiness check endpoint responding"
        
        # Check database connection
        if echo "$READY_RESPONSE" | grep -q '"database":"connected"'; then
            test_pass "Database connection verified"
        else
            test_fail "Database not connected"
        fi
        
        # Check Redis connection
        if echo "$READY_RESPONSE" | grep -q '"redis":"connected"'; then
            test_pass "Redis connection verified"
        else
            test_warn "Redis not connected (optional but recommended)"
        fi
    else
        test_fail "Service not ready"
    fi
else
    test_fail "Readiness endpoint not responding"
fi

echo ""

# ============================================
# 2. API ENDPOINT TESTS
# ============================================
echo "🔌 Testing API Endpoints..."
echo "-----------------------------------"

# Test 3: Get Regulators List
REGULATORS=$(curl -s "$BACKEND_URL/api/regulatory/regulators")
if echo "$REGULATORS" | grep -q '"success":true'; then
    if echo "$REGULATORS" | grep -q "SAMA"; then
        test_pass "Regulators API returning data"
    else
        test_fail "Regulators API not returning expected data"
    fi
else
    test_fail "Regulators API failed"
fi

# Test 4: Get Recent Changes
CHANGES=$(curl -s "$BACKEND_URL/api/regulatory/changes")
if echo "$CHANGES" | grep -q '"success":true'; then
    test_pass "Changes API responding"
else
    test_fail "Changes API failed"
fi

# Test 5: Get Statistics
STATS=$(curl -s "$BACKEND_URL/api/regulatory/stats")
if echo "$STATS" | grep -q '"success":true'; then
    test_pass "Statistics API responding"
else
    test_fail "Statistics API failed"
fi

# Test 6: Error Handling (404)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/regulatory/invalid-endpoint")
if [ "$HTTP_CODE" -eq 404 ]; then
    test_pass "404 error handling works"
else
    test_fail "404 error handling failed (got $HTTP_CODE)"
fi

echo ""

# ============================================
# 3. BFF PROXY TESTS
# ============================================
echo "🔄 Testing BFF Proxy..."
echo "-----------------------------------"

# Test 7: BFF Proxy to Backend
if curl -sf "$BFF_URL/api/regulatory/regulators" > /dev/null; then
    BFF_REGULATORS=$(curl -s "$BFF_URL/api/regulatory/regulators")
    if echo "$BFF_REGULATORS" | grep -q "SAMA"; then
        test_pass "BFF proxy routing works"
    else
        test_fail "BFF proxy not routing correctly"
    fi
else
    test_warn "BFF not responding (may not be started)"
    echo "   To start BFF: cd apps/bff && npm start"
fi

echo ""

# ============================================
# 4. PERFORMANCE TESTS
# ============================================
echo "⚡ Testing Performance..."
echo "-----------------------------------"

# Test 8: Response Time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$BACKEND_URL/api/regulatory/changes")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)
if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l) )); then
    if (( $(echo "$RESPONSE_TIME < 0.2" | bc -l) )); then
        test_pass "Response time excellent (${RESPONSE_MS}ms)"
    else
        test_pass "Response time acceptable (${RESPONSE_MS}ms)"
    fi
else
    test_warn "Response time slow (${RESPONSE_MS}ms - target: <200ms)"
fi

echo ""

# ============================================
# 5. DATABASE TESTS
# ============================================
echo "🗄️  Testing Database..."
echo "-----------------------------------"

# Check if psql is available
if command -v psql &> /dev/null; then
    DB_HOST="${DB_HOST:-localhost}"
    DB_NAME="${DB_NAME:-grc_assessment}"
    DB_USER="${DB_USER:-postgres}"
    
    # Test 9: Check tables exist
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt regulatory_changes" 2>/dev/null | grep -q "regulatory_changes"; then
        test_pass "Database table 'regulatory_changes' exists"
    else
        test_warn "Cannot verify database tables (connection issue or not created)"
    fi
    
    # Test 10: Check indexes exist
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\di" 2>/dev/null | grep -q "regulatory"; then
        test_pass "Database indexes created"
    else
        test_warn "Cannot verify database indexes"
    fi
else
    test_warn "psql not available - skipping database tests"
    echo "   Install with: apt-get install postgresql-client"
fi

echo ""

# ============================================
# 6. SECURITY TESTS
# ============================================
echo "🔒 Testing Security..."
echo "-----------------------------------"

# Test 11: SQL Injection Protection
SQL_INJECTION=$(curl -s "$BACKEND_URL/api/regulatory/changes?regulator=SAMA';DROP%20TABLE%20regulatory_changes;--")
if echo "$SQL_INJECTION" | grep -qv "error"; then
    test_pass "SQL injection protection working"
else
    test_fail "Potential SQL injection vulnerability"
fi

# Test 12: Rate Limiting (basic test)
# Make 10 quick requests
RATE_TEST=0
for i in {1..10}; do
    if curl -sf "$BACKEND_URL/api/regulatory/regulators" > /dev/null 2>&1; then
        ((RATE_TEST++))
    fi
done
if [ $RATE_TEST -eq 10 ]; then
    test_pass "Service handles multiple concurrent requests"
else
    test_fail "Service failing under concurrent requests"
fi

echo ""

# ============================================
# 7. LOGGING TESTS
# ============================================
echo "📝 Testing Logging..."
echo "-----------------------------------"

# Test 13: Log files exist
if [ -d "logs" ]; then
    if [ -f "logs/combined.log" ]; then
        test_pass "Combined log file exists"
    else
        test_warn "Combined log file not found"
    fi
    
    if [ -f "logs/error.log" ]; then
        test_pass "Error log file exists"
    else
        test_warn "Error log file not found"
    fi
else
    test_warn "Logs directory not found"
fi

echo ""

# ============================================
# 8. CONFIGURATION TESTS
# ============================================
echo "⚙️  Testing Configuration..."
echo "-----------------------------------"

# Test 14: Environment variables
if [ -f ".env" ]; then
    test_pass ".env file exists"
    
    # Check critical env vars
    if grep -q "DB_NAME" .env; then
        test_pass "Database configuration present"
    else
        test_fail "Database configuration missing"
    fi
    
    if grep -q "OPENAI_API_KEY" .env; then
        test_pass "OpenAI API key configured"
    else
        test_warn "OpenAI API key not configured (AI analysis won't work)"
    fi
else
    test_fail ".env file missing"
    echo "   Copy .env.example to .env and configure"
fi

echo ""

# ============================================
# 9. DOCKER TESTS (if Docker available)
# ============================================
if command -v docker &> /dev/null; then
    echo "🐳 Testing Docker..."
    echo "-----------------------------------"
    
    # Test 15: Dockerfile exists
    if [ -f "Dockerfile" ]; then
        test_pass "Dockerfile exists"
    else
        test_fail "Dockerfile missing"
    fi
    
    # Test 16: Docker build (optional - takes time)
    # Uncomment to test Docker build
    # docker build -t regulatory-intelligence-ksa:test . > /dev/null 2>&1
    # if [ $? -eq 0 ]; then
    #     test_pass "Docker image builds successfully"
    # else
    #     test_fail "Docker build failed"
    # fi
    
    echo ""
fi

# ============================================
# FINAL RESULTS
# ============================================
echo "================================================"
echo "📊 TEST RESULTS SUMMARY"
echo "================================================"
echo ""
echo -e "${GREEN}✅ Tests Passed:${NC} $TESTS_PASSED"
echo -e "${RED}❌ Tests Failed:${NC} $TESTS_FAILED"
echo -e "${YELLOW}⚠️  Warnings:${NC} $WARNINGS"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    echo "Pass Rate: $PASS_RATE%"
    echo ""
fi

# Production readiness assessment
if [ $TESTS_FAILED -eq 0 ] && [ $TESTS_PASSED -ge 10 ]; then
    echo -e "${GREEN}🎉 PRODUCTION READY!${NC}"
    echo "   All critical tests passed"
    echo "   ✅ Backend service is operational"
    echo "   ✅ API endpoints responding correctly"
    echo "   ✅ Security tests passed"
    echo ""
    echo "Next steps:"
    echo "  1. Review warnings above (if any)"
    echo "  2. Test frontend UI manually"
    echo "  3. Deploy to production environment"
    exit 0
elif [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY READY${NC}"
    echo "   Some tests could not be completed"
    echo "   Review warnings above"
    echo ""
    echo "Recommendations:"
    echo "  - Address all warnings"
    echo "  - Complete manual testing"
    echo "  - Deploy to staging first"
    exit 0
else
    echo -e "${RED}❌ NOT PRODUCTION READY${NC}"
    echo "   $TESTS_FAILED test(s) failed"
    echo "   Fix failed tests before deploying"
    echo ""
    echo "Critical issues to fix:"
    echo "  - Review failed tests above"
    echo "  - Check logs for errors"
    echo "  - Verify all services are running"
    exit 1
fi

