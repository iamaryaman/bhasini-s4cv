# TTS Active Screen Detection - Quick Guide

## Problem Solved ✅
The TTS now reads **only the currently active screen**, not the entire website. It automatically detects screen changes and updates content.

## How It Works

### Before (Issue)
- TTS was reading ALL screens at once
- Content from hidden/inactive screens was included
- Long, confusing audio output

### After (Fixed)
- TTS detects which screen is currently active
- Only extracts content from that specific screen
- Automatically updates when you navigate to a new screen
- Clean, relevant audio output

## Active Screen Detection Methods

The system uses 3 detection methods in priority order:

1. **Class-based**: Looks for `.screen.active` class
2. **Visibility-based**: Checks display/visibility styles
3. **Computed styles**: Verifies actual rendered state

## Testing

### Quick Test
1. Open your web dashboard
2. Open browser console (F12)
3. Navigate to different screens (Welcome → Auth → Voice Screen)
4. Click the "🔊 Read Page" button on each screen
5. Verify it only reads content from the current screen

### Debug Commands
Open console and type:

```javascript
// Show which screen is active (highlights it)
TTSDebug.showActiveScreen();

// Show what will be read
TTSDebug.showContentPreview();

// List all screens
TTSDebug.listAllScreens();

// Test reading current screen
await TTSDebug.testRead();
```

### Keyboard Shortcut
Press **Ctrl+Shift+D** to see debug info about current screen and TTS state.

## Examples

### Example 1: Welcome Screen
```javascript
// Navigate to welcome screen, then:
TTSDebug.showActiveScreen();
// Output: Active Screen: welcomeScreen

TTSDebug.showContentPreview();
// Output: "Welcome to S4CV Create professional resumes..."
```

### Example 2: Voice Input Screen
```javascript
// Navigate to voice screen, then:
TTSDebug.showActiveScreen();
// Output: Active Screen: voiceScreen

TTSDebug.showContentPreview();
// Output: "Single Voice Input CV Builder ONE RECORDING SESSION..."
```

### Example 3: Compare All Screens
```javascript
TTSDebug.compareAllScreens();
// Shows content length for each screen
// ✅ voiceScreen: 1,234 characters (active)
// ⬜ welcomeScreen: 876 characters
// ⬜ authScreen: 543 characters
```

## Screen Change Detection

The TTS monitors screen changes using **MutationObserver**:

```javascript
// When you navigate screens, console shows:
// "Screen changed from welcomeScreen to authScreen"
// "📄 Current TTS Context: { screenId: 'authScreen', contentLength: 543, ... }"
```

## Content Filtering

The TTS automatically filters out:
- ✅ Headers and navigation
- ✅ Hidden screens/modals
- ✅ Button text and icons
- ✅ Scripts and styles
- ✅ Status messages

Only the main content of the active screen is read.

## Verification Checklist

- [ ] Click "Read Page" button
- [ ] Opens browser console
- [ ] See "Reading content from active screen: [screenId]"
- [ ] Audio reads only current screen content
- [ ] Navigate to different screen
- [ ] Click "Read Page" again
- [ ] Audio reads new screen content (not old)

## Common Issues

### Issue: Still reading multiple screens
**Solution**: Check that only one screen has `.active` class
```javascript
TTSDebug.listAllScreens(); // Should show only one active
```

### Issue: Reading header/navigation
**Solution**: Content filtering should handle this, but verify:
```javascript
TTSDebug.showRawText(); // Check what's being extracted
```

### Issue: Not detecting screen changes
**Solution**: Verify MutationObserver is running:
```javascript
window.ttsUI.ttsService.startScreenMonitoring();
```

## Screen Structure

Your dashboard should have this structure:
```html
<main id="main-content">
    <section id="welcomeScreen" class="screen active">
        <!-- Welcome content -->
    </section>
    
    <section id="authScreen" class="screen">
        <!-- Auth content (hidden) -->
    </section>
    
    <section id="voiceScreen" class="screen">
        <!-- Voice content (hidden) -->
    </section>
</main>
```

Only the screen with class `active` will be read.

## API Payload

### Before (Reading all screens)
```json
{
    "inputData": {
        "input": [{
            "source": "Welcome to S4CV ... Sign In or Create Account ... Choose Your Resume Template ... [3000+ characters from ALL screens]"
        }]
    }
}
```

### After (Active screen only)
```json
{
    "inputData": {
        "input": [{
            "source": "Single Voice Input CV Builder ONE RECORDING SESSION ... [only voiceScreen content, ~500 characters]"
        }]
    }
}
```

## Production Use

### Remove Debug Script (Optional)
In `index.html`, comment out:
```html
<!-- <script src="tts-debug-helper.js"></script> -->
```

### Keep Monitoring Active
The screen monitoring is lightweight and should stay active in production for best experience.

## Summary

✅ **Fixed**: TTS now reads only the active screen  
✅ **Automatic**: Detects screen changes automatically  
✅ **Clean**: Filters out navigation and UI elements  
✅ **Tested**: Debug tools help verify correct operation  

The payload sent to Bhashini is now much smaller and contains only relevant content from the current screen, making the TTS experience much better!
