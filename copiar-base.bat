@echo off
set "SRC=G:\Other computers\Meu laptop (2)\Zyntra\Base\Sistema"

echo [1/4] Copiando para Servicos...
robocopy "%SRC%" "G:\Other computers\Meu laptop (2)\Zyntra\Base\Servicos" /E /XF desktop.ini /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS
echo Servicos CONCLUIDO

echo [2/4] Copiando para Agropecuario...
robocopy "%SRC%" "G:\Other computers\Meu laptop (2)\Zyntra\Base\Agropecuario" /E /XF desktop.ini /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS
echo Agropecuario CONCLUIDO

echo [3/4] Copiando para Demo...
robocopy "%SRC%" "G:\Other computers\Meu laptop (2)\Zyntra\Base\Demo" /E /XF desktop.ini /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS
echo Demo CONCLUIDO

echo [4/4] Removendo arquivo test.txt de Industria...
del "G:\Other computers\Meu laptop (2)\Zyntra\Base\Industria\test.txt" 2>nul

echo === TODAS AS COPIAS CONCLUIDAS ===
