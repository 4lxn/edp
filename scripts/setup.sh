#!/usr/bin/env bash
# Prepara el entorno local: instala Node (si falta), las dependencias y el
# índice de álbumes. Córrelo una vez después de clonar:  bash scripts/setup.sh
set -e
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js no encontrado."
  if command -v brew >/dev/null 2>&1; then
    echo "→ Instalando Node con Homebrew…"
    brew install node
  else
    echo "Instala Node 18+ desde https://nodejs.org y vuelve a correr esto."
    exit 1
  fi
fi

echo "→ npm install"
npm install
echo "→ npm run sync"
npm run sync

echo
echo "Listo ✅  Arranca el sitio con:"
echo "    npm run dev"
echo "  Sitio:  http://localhost:5173/"
echo "  Panel para subir fotos:  http://localhost:5173/#/admin"
