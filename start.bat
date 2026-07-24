@echo off
echo Starting Math Practice app...
echo.
echo Open this in your browser: http://localhost:8080
echo.
echo On iPad: make sure your iPad is on the same Wi-Fi,
echo then open Safari and go to http://YOUR-PC-IP:8080
echo (run "ipconfig" to find your PC's IP address)
echo.
echo Press Ctrl+C to stop the server.
echo.
python -m http.server 8080
