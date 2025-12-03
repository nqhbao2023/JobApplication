netstat -ano | Select-String ":3000"
Stop-Process -Id <PID> -Force 