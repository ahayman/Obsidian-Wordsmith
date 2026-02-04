#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}$1${NC}"
}

info() {
    echo -e "${YELLOW}$1${NC}"
}

# Check if version argument is provided
if [ -z "$1" ]; then
    error "Usage: ./release.sh <version>\n  Example: ./release.sh 1.2.0"
fi

VERSION="$1"

# Validate version format (semver: X.Y.Z)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Invalid version format. Expected semver format: X.Y.Z (e.g., 1.2.0)"
fi

# Get current version from manifest.json
CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' manifest.json | head -1 | sed 's/"version": *"\([^"]*\)"/\1/')

if [ -z "$CURRENT_VERSION" ]; then
    error "Could not read current version from manifest.json"
fi

info "Current version: $CURRENT_VERSION"
info "New version: $VERSION"

# Compare versions to ensure new version is greater
version_gt() {
    # Returns 0 if $1 > $2
    local IFS=.
    local i ver1=($1) ver2=($2)

    for ((i=0; i<${#ver1[@]}; i++)); do
        if ((10#${ver1[i]:-0} > 10#${ver2[i]:-0})); then
            return 0
        elif ((10#${ver1[i]:-0} < 10#${ver2[i]:-0})); then
            return 1
        fi
    done
    return 1  # Equal versions
}

if ! version_gt "$VERSION" "$CURRENT_VERSION"; then
    error "New version ($VERSION) must be greater than current version ($CURRENT_VERSION)"
fi

# Check for release notes file
RELEASE_NOTES_FILE="Release-Notes/${VERSION}.md"
if [ ! -f "$RELEASE_NOTES_FILE" ]; then
    error "Release notes file not found: $RELEASE_NOTES_FILE\n  Please create the release notes before running the release script."
fi

info "Found release notes: $RELEASE_NOTES_FILE"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    error "There are uncommitted changes. Please commit or stash them before releasing."
fi

# Check for untracked files that would be included
if [ -n "$(git status --porcelain)" ]; then
    error "There are uncommitted changes or untracked files. Please commit or clean them before releasing."
fi

success "All validations passed!"

# Update manifest.json
info "Updating manifest.json..."
sed -i '' "s/\"version\": *\"[^\"]*\"/\"version\": \"$VERSION\"/" manifest.json

# Update package.json
info "Updating package.json..."
sed -i '' "s/\"version\": *\"[^\"]*\"/\"version\": \"$VERSION\"/" package.json

# Update versions.json - add new version mapping
info "Updating versions.json..."
MIN_APP_VERSION=$(grep -o '"minAppVersion": *"[^"]*"' manifest.json | sed 's/"minAppVersion": *"\([^"]*\)"/\1/')
# Add new version entry to versions.json
node -e "
const fs = require('fs');
const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
versions['$VERSION'] = '$MIN_APP_VERSION';
fs.writeFileSync('versions.json', JSON.stringify(versions, null, 2) + '\n');
"

# Build the project
info "Building project..."
yarn build

# Commit the version changes
info "Committing version changes..."
git add manifest.json package.json versions.json
git commit -m "Release $VERSION"

# Create and push tag
info "Creating tag $VERSION..."
git tag "$VERSION"

# Push commit and tag
info "Pushing to remote..."
git push
git push origin "$VERSION"

# Create GitHub release
info "Creating GitHub release..."
gh release create "$VERSION" \
    --title "$VERSION" \
    --notes-file "$RELEASE_NOTES_FILE" \
    main.js \
    manifest.json \
    styles.css

success "Release $VERSION created successfully!"
success "View the release at: $(gh release view "$VERSION" --json url -q .url)"
