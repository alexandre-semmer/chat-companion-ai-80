#!/usr/bin/env bash
# ============================================================
#  iniciar-servidor.sh - SOL Painel (EcoCentauro)
#  Sobe um servidor HTTP local na porta 8082 (Linux/macOS)
# ============================================================
cd "$(dirname "$0")"
PORTA=8088

echo
echo "  Chat"
echo "  Endereco: http://localhost:$PORTA"
echo "  (mantenha este terminal aberto; Ctrl+C para encerrar)"
echo

# Tenta abrir o navegador (ignora silenciosamente se nao houver ambiente grafico)
( command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORTA" ) \
  || ( command -v open >/dev/null && open "http://localhost:$PORTA" ) \
  >/dev/null 2>&1 &

if command -v node >/dev/null 2>&1; then
    npx --yes serve -l "$PORTA" .
elif command -v python3 >/dev/null 2>&1; then
    python3 -m http.server "$PORTA"
else
    echo "  [ERRO] Node.js nao foi encontrado neste computador."
    echo
    echo "  Instale o Node.js (necessario tambem para o Claude Code):"
    echo "  https://nodejs.org - baixe a versao LTS."
    echo
    echo "  Depois de instalar, execute este script novamente."
    exit 1
fi