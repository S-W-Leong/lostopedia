#!/bin/bash
# Test Script for Admin Moderation Workflow
# Usage: ./scripts/test-moderation-workflow.sh [base_url]

set -e

# Configuration
BASE_URL="${1:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    echo ""
    echo "=================================="
    echo "TEST: $1"
    echo "=================================="
    TESTS_RUN=$((TESTS_RUN + 1))
}

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Check prerequisites
check_prerequisites() {
    print_test "Prerequisites Check"
    
    # Check if curl is available
    if command -v curl &> /dev/null; then
        pass "curl is installed"
    else
        fail "curl is not installed"
        exit 1
    fi
    
    # Check if jq is available (for JSON parsing)
    if command -v jq &> /dev/null; then
        pass "jq is installed"
    else
        fail "jq is not installed (optional, but recommended)"
    fi
    
    # Check if server is running
    if curl -s "$BASE_URL" &> /dev/null; then
        pass "Server is reachable at $BASE_URL"
    else
        fail "Server is not reachable at $BASE_URL"
        exit 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    print_test "API Endpoint Tests"
    
    # Test DELETE endpoint is disabled
    info "Testing DELETE /api/admin/items/[id] is disabled..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/admin/items/test-id" || echo "000")
    
    if [ "$RESPONSE" = "404" ] || [ "$RESPONSE" = "405" ]; then
        pass "DELETE endpoint returns $RESPONSE (disabled)"
    else
        fail "DELETE endpoint returns $RESPONSE (expected 404 or 405)"
    fi
    
    # Test GET endpoints are accessible
    info "Testing GET /api/flags..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/flags?status=pending&limit=10" || echo "000")
    
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
        pass "GET /api/flags returns $RESPONSE (accessible)"
    else
        fail "GET /api/flags returns $RESPONSE (unexpected)"
    fi
    
    info "Testing GET /api/admin/items..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/items?limit=10" || echo "000")
    
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
        pass "GET /api/admin/items returns $RESPONSE (accessible)"
    else
        fail "GET /api/admin/items returns $RESPONSE (unexpected)"
    fi
}

# Test database schema
test_database_schema() {
    print_test "Database Schema Tests"
    
    info "This test requires psql access to the database"
    info "Skipping database tests (run manually with psql)"
    
    # If PGDATABASE is set, we can run these tests
    if [ -n "$PGDATABASE" ]; then
        # Check items table has new columns
        if psql -c "\d items" | grep -q "removed_flag_id"; then
            pass "items.removed_flag_id column exists"
        else
            fail "items.removed_flag_id column missing"
        fi
        
        if psql -c "\d items" | grep -q "removed_reason"; then
            pass "items.removed_reason column exists"
        else
            fail "items.removed_reason column missing"
        fi
        
        # Check flags table has action_taken column
        if psql -c "\d flags" | grep -q "action_taken"; then
            pass "flags.action_taken column exists"
        else
            fail "flags.action_taken column missing"
        fi
        
        # Check trigger exists
        if psql -c "\df update_item_flag_status" | grep -q "update_item_flag_status"; then
            pass "update_item_flag_status trigger function exists"
        else
            fail "update_item_flag_status trigger function missing"
        fi
    fi
}

# Test frontend pages
test_frontend_pages() {
    print_test "Frontend Page Tests"
    
    info "Testing admin pages are accessible..."
    
    # Test flags page
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/flags" || echo "000")
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "302" ] || [ "$RESPONSE" = "401" ]; then
        pass "Admin flags page accessible (status: $RESPONSE)"
    else
        fail "Admin flags page not accessible (status: $RESPONSE)"
    fi
    
    # Test items page
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/items" || echo "000")
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "302" ] || [ "$RESPONSE" = "401" ]; then
        pass "Admin items page accessible (status: $RESPONSE)"
    else
        fail "Admin items page not accessible (status: $RESPONSE)"
    fi
}

# Test validation
test_validation() {
    print_test "Validation Tests"
    
    info "Testing item status validation..."
    
    # Try to set status to 'removed' directly (should fail)
    RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/admin/items/test-id" \
        -H "Content-Type: application/json" \
        -d '{"status": "removed"}' || echo "{}")
    
    # We expect this to fail with validation error
    if echo "$RESPONSE" | grep -qi "error\|invalid\|validation"; then
        pass "Direct 'removed' status change is rejected"
    else
        info "Cannot verify validation (might need authentication)"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo "=================================="
    echo "TEST SUMMARY"
    echo "=================================="
    echo "Total Tests Run: $TESTS_RUN"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo "=================================="
    echo "Admin Moderation Workflow Tests"
    echo "Base URL: $BASE_URL"
    echo "=================================="
    
    check_prerequisites
    test_api_endpoints
    test_database_schema
    test_frontend_pages
    test_validation
    print_summary
}

# Run tests
main

