#!/bin/bash
# Removes the daily market-data refresh installed by tools/install-daily-refresh.sh
LABEL="com.stocksense.gse-refresh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "Removed $LABEL"
