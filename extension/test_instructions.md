# Bot Detection Extension Testing Guide

## Setup
1. Load the extension in Chrome using Developer Mode
2. Navigate to https://tictactoe.live/
3. Set your username in the extension popup
4. Configure bot detection settings in the popup

## Testing Checklist

### ✅ Extension Loading
- [ ] Extension loads without errors in Chrome
- [ ] Popup opens and displays all controls
- [ ] Settings are saved and persist between sessions

### ✅ Bot Detection Settings
- [ ] Max Bot Games slider (1-10, default 7)
- [ ] Max Human Games slider (1-5, default 1)
- [ ] Bot Alert toggle (default ON)
- [ ] Bot GUI toggle (default ON)
- [ ] Console Log toggle (default ON)
- [ ] Reset Game Counters button

### ✅ Game Detection
- [ ] New games are detected automatically
- [ ] Opponent names are extracted correctly
- [ ] Profile sidebar detection works
- [ ] Bot vs human classification is accurate

### ✅ Notifications
- [ ] Console logging shows detection results
- [ ] Browser alerts appear for bot detection (if enabled)
- [ ] GUI overlay notifications display correctly
- [ ] Human detection notifications work

### ✅ Game Management
- [ ] Game counters increment correctly
- [ ] "Play Again" clicked for continuing games
- [ ] "Leave" clicked when limits reached
- [ ] Counters reset when both limits reached
- [ ] Settings persist between games

### ✅ Button Logic
- [ ] "Play Again" button detection works
- [ ] "Leave Room" button detection works
- [ ] "Play Online" button detection works
- [ ] Fallback logic handles missing buttons

## Expected Behavior

1. **Against Bots**: Play up to 7 games, then leave to find humans
2. **Against Humans**: Play 1 game, then leave to find bots
3. **Cycle**: After reaching both limits, reset and continue
4. **Notifications**: Show appropriate alerts/GUI for detections
5. **Storage**: All settings and counters persist

## Common Issues

- If buttons aren't detected, check console for errors
- If opponent detection fails, verify profile sidebar opens
- If settings don't save, check Chrome storage permissions
- If notifications don't show, verify popup settings

## Debug Information

Check browser console for detailed logs:
- `[Bot Detection]` prefix for all system messages
- Game state changes and decisions
- Button detection and clicking results
- Storage operations and settings updates