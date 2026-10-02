#!/usr/bin/env bash

# VibeCheck Git Corruption & Power Cut Recovery Script
# Safely removes 0-byte corrupted Git objects, restores branch refs, and rebuilds the index.

set -e

# Resolve repository root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".git" ]; then
    echo "❌ Error: No .git directory found at $ROOT_DIR"
    exit 1
fi

echo "=========================================================="
echo "🔧 Running Git Repository Recovery..."
echo "=========================================================="

# 1. Clean zero-byte corrupted object files
echo "1️⃣  Removing empty (0-byte) Git objects and lock files..."
EMPTY_OBJECTS=$(find .git/objects -type f -size 0 2>/dev/null || true)
if [ -n "$EMPTY_OBJECTS" ]; then
    find .git/objects -type f -size 0 -delete
    echo "   ✔ Removed empty object files."
else
    echo "   ✔ No zero-byte objects found."
fi

# Clean empty/corrupted FETCH_HEAD or index lock files
[ -f .git/FETCH_HEAD ] && [ ! -s .git/FETCH_HEAD ] && rm -f .git/FETCH_HEAD && echo "   ✔ Removed empty .git/FETCH_HEAD"
rm -f .git/index.lock .git/refs/heads/*.lock 2>/dev/null || true

# 2. Check and repair HEAD / Branch reference if corrupted
echo "2️⃣  Verifying branch and HEAD references..."
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
    echo "   ⚠️  HEAD is invalid. Attempting reflog recovery..."
    
    # Identify current branch
    HEAD_CONTENT=$(cat .git/HEAD 2>/dev/null || true)
    if [[ "$HEAD_CONTENT" =~ ref:\ refs/heads/(.+) ]]; then
        BRANCH="${BASH_REMATCH[1]}"
        echo "   ℹ️  Detected active branch: $BRANCH"
        
        # Try finding last valid commit from branch reflog or HEAD reflog
        LAST_COMMIT=""
        if [ -f ".git/logs/refs/heads/$BRANCH" ]; then
            LAST_COMMIT=$(awk '{print $2}' ".git/logs/refs/heads/$BRANCH" | tail -n 1)
        fi
        if [ -z "$LAST_COMMIT" ] && [ -f ".git/logs/HEAD" ]; then
            LAST_COMMIT=$(awk '{print $2}' ".git/logs/HEAD" | tail -n 1)
        fi
        
        if [ -n "$LAST_COMMIT" ]; then
            echo "$LAST_COMMIT" > ".git/refs/heads/$BRANCH"
            echo "   ✔ Restored '$BRANCH' to last valid commit from reflog: $LAST_COMMIT"
        else
            echo "   ❌ Could not automatically find last commit in reflog."
        fi
    fi
else
    echo "   ✔ HEAD reference is valid."
fi

# 3. Reset and rebuild git index
echo "3️⃣  Rebuilding Git index from HEAD..."
rm -f .git/index
git reset >/dev/null 2>&1 || git reset
echo "   ✔ Git index successfully rebuilt."

# 4. Verify repository integrity
echo "4️⃣  Running Git integrity check (fsck)..."
if git fsck --full >/dev/null 2>&1; then
    echo "   ✔ Git integrity check passed with 0 errors."
else
    echo "   ℹ️  Running detailed fsck report:"
    git fsck --full
fi

echo ""
echo "=========================================================="
echo "✅ Git repository recovery complete!"
echo "=========================================================="
echo ""
git status
