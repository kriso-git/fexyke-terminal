#!/bin/bash
# F3XYKEE · Laptop Setup Script (macOS)
# Futtatás: curl -fsSL https://raw.githubusercontent.com/kriso-git/fexyke-terminal/master/scripts/setup-laptop.sh | bash

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

TOTAL_STEPS=8
CURRENT_STEP=0

# ── Progress bar ─────────────────────────────────────────────
progress() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  local label="$1"
  local filled=$((CURRENT_STEP * 20 / TOTAL_STEPS))
  local empty=$((20 - filled))
  local bar=""
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  echo ""
  echo -e "${CYAN}[${bar}] ${CURRENT_STEP}/${TOTAL_STEPS}${NC}  ${BOLD}${label}${NC}"
}

ok()   { echo -e "  ${GREEN}✓${NC}  $1"; }
skip() { echo -e "  ${DIM}–  $1 (már megvan)${NC}"; }
info() { echo -e "  ${CYAN}▸${NC}  $1"; }
warn() { echo -e "  ${YELLOW}!${NC}  $1"; }

# ── Fejléc ───────────────────────────────────────────────────
clear
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ███████╗██████╗ ██╗  ██╗██╗   ██╗██╗  ██╗███████╗███████╗"
echo "  ██╔════╝╚════██╗╚██╗██╔╝╚██╗ ██╔╝██║ ██╔╝██╔════╝██╔════╝"
echo "  █████╗   █████╔╝ ╚███╔╝  ╚████╔╝ █████╔╝ █████╗  █████╗  "
echo "  ██╔══╝   ╚═══██╗ ██╔██╗   ╚██╔╝  ██╔═██╗ ██╔══╝  ██╔══╝  "
echo "  ██║     ██████╔╝██╔╝ ██╗   ██║   ██║  ██╗███████╗███████╗"
echo "  ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝"
echo -e "${NC}"
echo -e "  ${DIM}LAPTOP SETUP · MACOS${NC}"
echo ""
echo -e "  ${DIM}────────────────────────────────────────────────────${NC}"
echo ""
sleep 0.5

# ── 1. Homebrew ──────────────────────────────────────────────
progress "Homebrew"
if ! command -v brew &>/dev/null; then
  info "Telepítés..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 2>&1 | tail -3
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  fi
  ok "Homebrew telepítve"
else
  skip "Homebrew $(brew --version | head -1)"
fi

# ── 2. Node.js ───────────────────────────────────────────────
progress "Node.js"
if ! command -v node &>/dev/null; then
  info "Telepítés..."
  brew install node --quiet
  ok "Node.js telepítve: $(node -v)"
else
  skip "Node.js $(node -v)"
fi

# ── 3. Git ───────────────────────────────────────────────────
progress "Git"
if ! command -v git &>/dev/null; then
  info "Telepítés..."
  brew install git --quiet
  ok "Git telepítve"
else
  skip "Git $(git --version | awk '{print $3}')"
fi

# ── 4. Vercel CLI ────────────────────────────────────────────
progress "Vercel CLI"
if ! command -v vercel &>/dev/null; then
  info "Telepítés..."
  npm install -g vercel --silent
  ok "Vercel CLI telepítve"
else
  skip "Vercel CLI $(vercel --version 2>/dev/null | head -1)"
fi

# ── 5. Mappa létrehozása ─────────────────────────────────────
progress "Munkamappa"
WORKDIR="$HOME/Website Biz"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
ok "Mappa: $WORKDIR"

# ── 6. Repók klónozása ───────────────────────────────────────
progress "Projektek letöltése"

clone_or_pull() {
  local repo=$1
  local dir=$2
  if [ -d "$WORKDIR/$dir/.git" ]; then
    info "$dir frissítése..."
    git -C "$WORKDIR/$dir" pull --quiet
    ok "$dir naprakész"
  else
    info "$dir letöltése..."
    git clone "https://github.com/kriso-git/$repo.git" "$WORKDIR/$dir" --quiet
    ok "$dir letöltve"
  fi
}

clone_or_pull "DonnaPizzaKecskemet"  "donna-pizza"
clone_or_pull "alexoldal"            "alexoldal"
clone_or_pull "fexyke-terminal"      "f3xykee-terminal"

# ── 7. npm install ───────────────────────────────────────────
progress "npm csomagok"

npm_install() {
  local dir=$1
  local node_modules="$WORKDIR/$dir/node_modules"
  if [ -d "$node_modules" ]; then
    skip "$dir/node_modules"
  else
    info "$dir telepítés..."
    npm install --prefix "$WORKDIR/$dir" --silent
    ok "$dir csomagok kész"
  fi
}

npm_install "donna-pizza"
npm_install "alexoldal"
npm_install "f3xykee-terminal"

# ── 8. f3xykee .env.local ────────────────────────────────────
progress ".env.local (f3xykee)"
cd "$WORKDIR/f3xykee-terminal"

if [ -f ".env.local" ]; then
  skip ".env.local már létezik"
else
  warn "Vercel bejelentkezés szükséges a kulcsok letöltéséhez"
  vercel link --yes 2>/dev/null || vercel link
  vercel env pull .env.local
  ok ".env.local letöltve"
fi

# ── Kész ─────────────────────────────────────────────────────
echo ""
echo -e "${DIM}  ────────────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${GREEN}${BOLD}◢ MINDEN KÉSZ!${NC}"
echo ""
echo -e "  ${DIM}Projektek indítása:${NC}"
echo ""
echo -e "  ${CYAN}donna-pizza${NC}       cd ~/Website\ Biz/donna-pizza && npm run dev"
echo -e "  ${CYAN}alexoldal${NC}         cd ~/Website\ Biz/alexoldal && npm run dev:all"
echo -e "  ${CYAN}f3xykee-terminal${NC}  cd ~/Website\ Biz/f3xykee-terminal && npm run dev"
echo ""
