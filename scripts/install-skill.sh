#!/bin/bash

# install-skill.sh
# Usage: ./install-skill.sh <skill-name> [destination-path]

SKILL_NAME=$1
DEST_DIR="${2:-.agents/skills}"

if [ -z "$SKILL_NAME" ]; then
  echo "Usage: ./install-skill.sh <skill-name>"
  exit 1
fi

# Define search paths relative to user home
SEARCH_PATHS=(
  "$HOME/.agent/skills/skills/$SKILL_NAME"
  "$HOME/.agent/skills/$SKILL_NAME"
  "$HOME/.agents/skills/$SKILL_NAME"
)

echo "Searching for skill: $SKILL_NAME..."

FOUND_PATH=""
for path in "${SEARCH_PATHS[@]}"; do
  if [ -d "$path" ]; then
    FOUND_PATH="$path"
    echo "Found skill at: $FOUND_PATH"
    break
  fi
done

if [ -z "$FOUND_PATH" ]; then
  echo "Error: Skill '$SKILL_NAME' not found in:"
  for path in "${SEARCH_PATHS[@]}"; do
    echo "  - $path"
  done
  exit 1
fi

# specific fix for GSD/get-shit-done naming if needed?
# No, relying on user providing correct folder name or me aliasing it.

# Create destination directory
mkdir -p "$DEST_DIR"

# Copy skill (using cp -R)
# Use -n to avoid overwriting existing? Or just overwrite?
# User might want to update, so overwrite is better but let's be verbose.
cp -R "$FOUND_PATH" "$DEST_DIR/"

if [ $? -eq 0 ]; then
  echo "Successfully installed '$SKILL_NAME' to '$DEST_DIR/$SKILL_NAME'"
else
  echo "Error: Failed to copy skill."
  exit 1
fi
