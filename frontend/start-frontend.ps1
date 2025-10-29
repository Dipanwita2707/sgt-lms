# Set SSL certificate paths to the correct location
$env:SSL_CRT_FILE = "ssl/localhost.pem"
$env:SSL_KEY_FILE = "ssl/localhost-key.pem"
$env:HTTPS = "true"

Write-Host "Starting frontend server with HTTPS..." -ForegroundColor Green
Write-Host "SSL Certificate: ssl/localhost.pem" -ForegroundColor Yellow
Write-Host "SSL Key: ssl/localhost-key.pem" -ForegroundColor Yellow
Write-Host ""

# Start npm
npm start
