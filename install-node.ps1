# Install Node.js LTS
$nodeUrl = 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi'
$installerPath = 'C:\temp\node-installer.msi'
$tempDir = 'C:\temp'

# Create temp directory if it doesn't exist
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

Write-Output "Downloading Node.js from $nodeUrl..."
try {
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -TimeoutSec 300 -ErrorAction Stop
    Write-Output "Downloaded successfully to $installerPath"
} catch {
    Write-Error "Failed to download Node.js: $_"
    exit 1
}

Write-Output "Installing Node.js..."
try {
    $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList "/i", $installerPath, "/quiet", "/norestart" -Wait -PassThru
    Write-Output "Installation completed with exit code: $($process.ExitCode)"
} catch {
    Write-Error "Failed to install Node.js: $_"
    exit 1
}

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')

Write-Output "Verifying Node.js installation..."
$nodeVersion = & node --version
$npmVersion = & npm --version

if ($nodeVersion -and $npmVersion) {
    Write-Output "Node.js installed: $nodeVersion"
    Write-Output "npm installed: $npmVersion"
    Write-Output "Installation successful!"
} else {
    Write-Output "Installation may not have completed. Please restart your terminal and try again."
}
