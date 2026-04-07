REM Script VBScript para criar atalho na area de trabalho
REM Executa automaticamente quando chamado pelos scripts .bat ou .ps1

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

REM Obter pasta atual do script
strCurrentDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

REM Caminho para a area de trabalho do usuario atual
strDesktop = objShell.SpecialFolders("Desktop")

REM Criar o atalho
Set objShortcut = objShell.CreateShortcut(strDesktop & "\Aluforce PCP.lnk")

REM Configurar propriedades do atalho
objShortcut.TargetPath = strCurrentDir & "\iniciar_pcp.bat"
objShortcut.WorkingDirectory = strCurrentDir
objShortcut.Description = "Iniciar Sistema PCP Aluforce"
objShortcut.IconLocation = strCurrentDir & "\Interativo-Aluforce.webp,0"

REM Salvar o atalho
objShortcut.Save

WScript.Echo "Atalho 'Aluforce PCP' criado na area de trabalho com sucesso!"