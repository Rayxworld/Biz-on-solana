@echo off
setlocal
cd /d %~dp0

echo Checking status...
git status -sb

set /p msg=Commit message: 
if "%msg%"=="" (
  echo Commit message required.
  exit /b 1
)

git add .
if errorlevel 1 exit /b 1

git commit -m "%msg%"
if errorlevel 1 exit /b 1

git push
if errorlevel 1 exit /b 1

echo Done.
endlocal
