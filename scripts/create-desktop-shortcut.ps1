$ErrorActionPreference = 'Stop'
$executablePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\release\Code Atlas-win32-x64\Code Atlas.exe'))
if (-not (Test-Path -LiteralPath $executablePath -PathType Leaf)) {
    throw 'Build the application first: npm run desktop:package'
}
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopFolder 'Code Atlas.lnk'
$shortcutFactory = New-Object -ComObject WScript.Shell
$shortcut = $shortcutFactory.CreateShortcut($shortcutPath)
if ((Test-Path -LiteralPath $shortcutPath) -and $shortcut.TargetPath -and ($shortcut.TargetPath -ne $executablePath)) {
    throw 'A different Code Atlas shortcut already exists. Keep it and use the packaged executable directly.'
}
$shortcut.TargetPath = $executablePath
$shortcut.WorkingDirectory = Split-Path -Parent $executablePath
$shortcut.IconLocation = "$executablePath,0"
$shortcut.Description = 'Code Atlas - Python workspace'
$shortcut.Save()
Write-Output $shortcutPath
