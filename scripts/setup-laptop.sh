#!/bin/bash
# F3XYKEE · Laptop Setup Script (macOS)
# Futtatás: curl -fsSL https://raw.githubusercontent.com/kriso-git/fexyke-terminal/master/scripts/setup-laptop.sh | bash

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}◢ F3XYKEE · LAPTOP SETUP${NC}"
echo "────────────────────────────────────"
echo ""

# ── 1. Homebrew ──────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo -e "${CYAN}▸ Homebrew telepítése...${NC}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon path fix
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  fi
  echo -e "${GREEN}✓ Homebrew telepítve${NC}"
else
  echo -e "${GREEN}✓ Homebrew már megvan${NC}"
fi

# ── 2. Node.js ───────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${CYAN}▸ Node.js telepítése...${NC}"
  brew install node
  echo -e "${GREEN}✓ Node.js telepítve: $(node -v)${NC}"
else
  echo -e "${GREEN}✓ Node.js már megvan: $(node -v)${NC}"
fi

# ── 3. Git ───────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo -e "${CYAN}▸ Git telepítése...${NC}"
  brew install git
  echo -e "${GREEN}✓ Git telepítve${NC}"
else
  echo -e "${GREEN}✓ Git már megvan: $(git --version)${NC}"
fi

# ── 4. Vercel CLI ────────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  echo -e "${CYAN}▸ Vercel CLI telepítése...${NC}"
  npm install -g vercel
  echo -e "${GREEN}✓ Vercel CLI telepítve${NC}"
else
  echo -e "${GREEN}✓ Vercel CLI már megvan${NC}"
fi

# ── 5. Mappa ─────────────────────────────────────────────────
WORKDIR="$HOME/Website Biz"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
echo ""
echo -e "${CYAN}▸ Munkamappa: $WORKDIR${NC}"

# ── 6. Repók klónozása ───────────────────────────────────────
echo ""
echo -e "${CYAN}▸ Projektek letöltése...${NC}"

clone_or_pull() {
  local repo=$1
  local dir=$2
  if [ -d "$dir/.git" ]; then
    echo -e "${YELLOW}  ↻ $dir — már megvan, frissítés...${NC}"
    git -C "$dir" pull --quiet
  else
    echo -e "  ⬇ $dir klónozása..."
    git clone "https://github.com/kriso-git/$repo.git" "$dir" --quiet
    echo -e "${GREEN}  ✓ $dir kész${NC}"
  fi
}

clone_or_pull "DonnaPizzaKecskemet"  "donna-pizza"
clone_or_pull "alexoldal"            "alexoldal"
clone_or_pull "fexyke-terminal"      "f3xykee-terminal"

# ── 7. npm install mindenhol ─────────────────────────────────
echo ""
echo -e "${CYAN}▸ Csomagok telepítése...${NC}"

npm_install() {
  local dir=$1
  echo -e "  ⬇ $dir..."
  npm install --prefix "$WORKDIR/$dir" --silent
  echo -e "${GREEN}  ✓ $dir kész${NC}"
}

npm_install "donna-pizza"
npm_install "alexoldal"
npm_install "f3xykee-terminal"

# ── 8. f3xykee .env.local ────────────────────────────────────
echo ""
echo -e "${CYAN}▸ f3xykee-terminal környezeti változók beállítása...${NC}"
cd "$WORKDIR/f3xykee-terminal"

if [ -f ".env.local" ]; then
  echo -e "${GREEN}  ✓ .env.local már létezik${NC}"
else
  echo ""
  echo -e "${YELLOW}  Vercel CLI-vel automatikusan letöltjük a kulcsokat.${NC}"
  echo -e "${YELLOW}  Szükséges: Vercel fiókba bejelentkezés.${NC}"
  echo ""
  vercel link --yes 2>/dev/null || vercel link
  vercel env pull .env.local
  echo -e "${GREEN}  ✓ .env.local létrehozva${NC}"
fi

# ── Kész ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}◢ MINDEN KÉSZ!${NC}"
echo "────────────────────────────────────"
echo ""
echo -e "  ${CYAN}donna-pizza:${NC}      cd ~/Website\ Biz/donna-pizza && npm run dev"
echo -e "  ${CYAN}alexoldal:${NC}        cd ~/Website\ Biz/alexoldal && npm run dev"
echo -e "  ${CYAN}f3xykee-terminal:${NC} cd ~/Website\ Biz/f3xykee-terminal && npm run dev"
echo ""
