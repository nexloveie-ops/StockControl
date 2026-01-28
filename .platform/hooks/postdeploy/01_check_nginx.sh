#!/bin/bash
# 检查nginx配置

echo "=== Checking Nginx Configuration ==="
echo "Nginx version:"
nginx -v

echo ""
echo "Testing nginx configuration:"
nginx -t

echo ""
echo "Nginx configuration files:"
ls -la /etc/nginx/conf.d/

echo ""
echo "Custom configuration content:"
cat /etc/nginx/conf.d/elasticbeanstalk.conf 2>/dev/null || echo "elasticbeanstalk.conf not found"

echo ""
echo "Proxy configuration:"
cat /etc/nginx/conf.d/proxy.conf 2>/dev/null || echo "proxy.conf not found"

echo "=== Nginx Configuration Check Complete ==="
