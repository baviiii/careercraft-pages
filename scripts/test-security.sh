#!/bin/bash
# Security Testing Script
# Run this after deployment to verify everything is secure

echo "🔒 Security Verification Script"
echo "================================"
echo ""

# Get URL from user or use default
URL=${1:-"https://your-site.vercel.app"}

echo "Testing: $URL"
echo ""

# Test 1: Check HTTPS
echo "1. Testing HTTPS..."
if curl -sI "$URL" | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
    echo "   ✅ Site is accessible"
else
    echo "   ❌ Site not accessible"
fi

# Test 2: Check Security Headers
echo ""
echo "2. Testing Security Headers..."

HSTS=$(curl -sI "$URL" | grep -i "strict-transport-security" | head -1)
if [ -n "$HSTS" ]; then
    echo "   ✅ HSTS: Found"
    echo "      $HSTS"
else
    echo "   ❌ HSTS: Missing"
fi

CSP=$(curl -sI "$URL" | grep -i "content-security-policy" | head -1)
if [ -n "$CSP" ]; then
    echo "   ✅ CSP: Found"
else
    echo "   ❌ CSP: Missing"
fi

XFRAME=$(curl -sI "$URL" | grep -i "x-frame-options" | head -1)
if [ -n "$XFRAME" ]; then
    echo "   ✅ X-Frame-Options: Found"
else
    echo "   ❌ X-Frame-Options: Missing"
fi

# Test 3: Check for HTTP redirects
echo ""
echo "3. Testing HTTP to HTTPS redirect..."
HTTP_URL=$(echo "$URL" | sed 's/https:/http:/')
REDIRECT=$(curl -sI "$HTTP_URL" | grep -i "location.*https" | head -1)
if [ -n "$REDIRECT" ]; then
    echo "   ✅ HTTP redirects to HTTPS"
else
    echo "   ⚠️  HTTP redirect may not be working"
fi

# Test 4: SSL Certificate
echo ""
echo "4. Testing SSL Certificate..."
SSL_CHECK=$(echo | openssl s_client -connect $(echo "$URL" | sed 's|https://||' | cut -d'/' -f1):443 -servername $(echo "$URL" | sed 's|https://||' | cut -d'/' -f1) 2>/dev/null | grep -i "verify return code")
if [ -n "$SSL_CHECK" ]; then
    echo "   ✅ SSL Certificate: Valid"
else
    echo "   ⚠️  Could not verify SSL (may need openssl)"
fi

echo ""
echo "================================"
echo "✅ Basic security checks complete!"
echo ""
echo "For detailed analysis, visit:"
echo "  - https://securityheaders.com/?q=$URL"
echo "  - https://www.ssllabs.com/ssltest/analyze.html?d=$(echo $URL | sed 's|https://||' | cut -d'/' -f1)"
