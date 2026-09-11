#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node -v
npm -v
cd /mnt/c/Users/Ultimate/Claude/ew_toolkit || exit 1
npm run build:hub
