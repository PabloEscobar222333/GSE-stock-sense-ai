#!/bin/bash
# Installs a macOS LaunchAgent that runs tools/refresh-market-data.js every day at 16:30
# (after the GSE's 15:00 GMT close). The script itself decides what to do:
#   weekdays  → append the day's closing prices + refresh macro (seconds)
#   Saturdays → full history rebuild (~40 min) to catch up gaps/corrections
# If the Mac is asleep at 16:30, launchd runs the job when it wakes.
# Output goes to tools/refresh.log. Remove with tools/uninstall-daily-refresh.sh
set -euo pipefail

LABEL="com.stocksense.gse-refresh"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -z "$NODE" ]; then echo "node not found in PATH" >&2; exit 1; fi

# macOS blocks background jobs from Desktop/Documents/Downloads unless node has
# Full Disk Access (System Settings → Privacy & Security → Full Disk Access → add $NODE).
case "$DIR" in
  "$HOME/Desktop"*|"$HOME/Documents"*|"$HOME/Downloads"*)
    echo "WARNING: $DIR is in a macOS-protected folder."
    echo "  The scheduled job will fail with 'Operation not permitted' unless you either:"
    echo "   1) give $NODE Full Disk Access (System Settings → Privacy & Security), or"
    echo "   2) move the project outside Desktop/Documents/Downloads and re-run this script."
    echo
    ;;
esac
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$DIR/tools/refresh-market-data.js</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>16</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>$DIR/tools/refresh.log</string>
  <key>StandardErrorPath</key><string>$DIR/tools/refresh.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Installed $LABEL — runs daily at 16:30. Log: $DIR/tools/refresh.log"
