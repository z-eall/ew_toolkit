#!/bin/bash
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
pkill -9 -f "astro dev"
sleep 1
cd /mnt/c/Users/Ultimate/Claude/ew_toolkit/ew_wiki
exec npm run dev
