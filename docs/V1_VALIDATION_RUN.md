# Wano v1 Browser Validation Gate

The v1 branch is not considered release-ready from unit tests alone.

A candidate v1 commit must pass the PR browser-validation workflow on both desktop Chromium and tablet Chromium with:

- Korean-first UI visible on first load
- one-click stronghold selection
- recruitment result reflected in resources
- Combat Army creation and route movement
- separate Transport creation
- roster and character detail navigation
- Haki / Devil Fruit / named weapon presentation
- diplomacy navigation
- save/load round trip
- player battle entering Manual tactical control and returning to AUTO
- zero browser console/page errors
- full-page screenshots captured as workflow artifacts

Only a candidate that passes this gate should be deployed to the GitHub Pages v1 preview.
