# Audio Language Detection (ALD) Feature

## Overview

The **Automatic Language Detection (ALD)** feature enables the S4CV web dashboard to automatically detect the language spoken by the user before transcribing their audio. When enabled, the system will:

1. **Capture audio** from the user's microphone
2. **Detect the language** using Bhashini's ALD service
3. **Override the current language setting** with the detected language
4. **Transcribe the audio** using the appropriate ASR model for the detected language

This ensures optimal transcription accuracy regardless of which language the user speaks.

---

## How It Works

### Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  User clicks "Record" button                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Audio is recorded from microphone                               │
│  (16kHz, mono, WAV format)                                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  ALD Toggle Check:                                               │
│  • If ALD is OFF → Use preset language (default: Hindi)         │
│  • If ALD is ON  → Proceed to language detection ↓              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Send audio to Bhashini ALD API                                  │
│  • Detect language from audio content                            │
│  • Get language code (e.g., "hi", "en", "te")                   │
│  • Get confidence score (0.0 - 1.0)                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Override Current Language                                       │
│  • Update app.currentLanguage with detected language            │
│  • Update UI indicator with detected language name              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Send audio + detected language to Bhashini ASR                  │
│  • Transcribe using the appropriate ASR model                    │
│  • Return transcribed text to user                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Interface

### ALD Toggle Button

Located at the top of the voice input screen:

```
┌────────────────────────────────────────┐
│  [○────] Auto-detect language  │ Hindi │
└────────────────────────────────────────┘
     OFF                          Current Language

┌────────────────────────────────────────┐
│  [●────] Auto-detect language  │ 🔄 Auto-detect: ON │
└────────────────────────────────────────┘
     ON                          ALD Active
```

### Toggle States

- **OFF (Default)**
  - Toggle switch is gray
  - Indicator shows current preset language (e.g., "Hindi")
  - Recording will use the preset language

- **ON**
  - Toggle switch is blue/green
  - Indicator shows "🔄 Auto-detect: ON"
  - After detection: Shows "✅ Detected: [Language] (95%)"

---

## Implementation Details

### Files Involved

1. **`bhashini-ald-service.js`** - ALD service class
   - Handles communication with Bhashini ALD API
   - Parses detection results
   - Caches pipeline configuration

2. **`app.js`** - Application integration
   - `toggleAutoDetect()` - Toggle ALD on/off
   - `processAudioWithBhashini()` - Modified to detect language before ASR
   - UI updates for toggle button and indicator

3. **`index.html`** - UI components
   - Toggle switch element
   - Language indicator display

### Key Functions

#### `BhashiniALDService.detectLanguageFromAudio(audioBase64)`

Detects language from audio data.

**Parameters:**
- `audioBase64` (string): Base64-encoded WAV audio (16kHz, mono, 16-bit PCM)

**Returns:**
```javascript
{
  languageCode: "hi",       // ISO language code
  confidence: 0.95,          // Detection confidence (0.0-1.0)
  languageName: "Hindi"      // Human-readable name
}
```

#### `app.toggleAutoDetect()`

Toggles ALD on/off and updates UI.

**Behavior:**
- Toggles `app.autoDetectEnabled` boolean
- Updates toggle switch visual state
- Updates language indicator text
- Shows status message to user

#### `app.processAudioWithBhashini(audioBlob)`

Modified to include ALD workflow.

**Key Changes:**
```javascript
// Check if ALD is enabled
if (this.autoDetectEnabled) {
    // Detect language first
    const detectedLang = await this.aldService.detectLanguageFromAudio(audioBase64);
    
    // Override current language
    languageToUse = detectedLang.languageCode;
    this.currentLanguage = languageToUse;
    
    // Update UI
    indicator.textContent = `✅ Detected: ${detectedLang.languageName}`;
}

// Transcribe with detected/preset language
await this.bhashiniService.transcribeAudio(languageToUse, audioBase64);
```

---

## Supported Languages

The ALD service can detect the following languages:

| Code | Language   | Flag |
|------|------------|------|
| `hi` | Hindi      | 🇮🇳 |
| `en` | English    | 🇺🇸 |
| `ta` | Tamil      | 🇮🇳 |
| `te` | Telugu     | 🇮🇳 |
| `kn` | Kannada    | 🇮🇳 |
| `ml` | Malayalam  | 🇮🇳 |
| `mr` | Marathi    | 🇮🇳 |
| `gu` | Gujarati   | 🇮🇳 |
| `bn` | Bengali    | 🇮🇳 |
| `pa` | Punjabi    | 🇮🇳 |

---

## API Integration

### Bhashini ALD API

**Endpoint:** `https://dhruva-api.bhashini.gov.in/services/inference/pipeline`

**Request Format:**
```json
{
  "pipelineTasks": [{
    "taskType": "ald",
    "config": {
      "serviceId": "ai4bharat/audio-language-detection",
      "audioFormat": "wav",
      "samplingRate": 16000
    }
  }],
  "inputData": {
    "audio": [{
      "audioContent": "base64_encoded_wav_audio_here"
    }]
  }
}
```

**Response Format:**
```json
{
  "pipelineResponse": [{
    "output": [{
      "source": "hi",
      "langConfidence": {
        "hi": 0.95,
        "en": 0.03,
        "te": 0.02
      }
    }]
  }]
}
```

---

## Error Handling

The ALD feature includes robust error handling:

1. **ALD API Failure**
   - Falls back to preset language
   - Shows warning message: "⚠️ Language detection failed, using [preset language]"
   - Continues with ASR transcription

2. **Invalid Audio**
   - Shows error: "No audio data to process"
   - Prevents API call

3. **Network Issues**
   - Catches network errors
   - Falls back to preset language
   - Logs error to console

---

## Usage Instructions

### For End Users

1. **Enable ALD**
   - Navigate to the voice input screen
   - Click the toggle switch next to "Auto-detect language"
   - Verify it turns blue/green and shows "🔄 Auto-detect: ON"

2. **Record Audio**
   - Click the "START COMPLETE CV RECORDING" button
   - Speak in any supported language
   - Click "STOP" when finished

3. **View Detection Results**
   - The language indicator will update with: "✅ Detected: [Language] (95%)"
   - Transcription will automatically use the detected language

4. **Disable ALD**
   - Click the toggle switch again
   - It will return to showing the preset language (e.g., "Hindi")

### For Developers

#### Initialize ALD Service
```javascript
const aldService = new BhashiniALDService();
```

#### Detect Language
```javascript
const audioBase64 = await AudioUtils.blobToBase64(wavBlob);
const result = await aldService.detectLanguageFromAudio(audioBase64);

console.log(`Detected: ${result.languageName} (${result.confidence})`);
// Output: Detected: Hindi (0.95)
```

#### Check Last Detection
```javascript
const lastDetection = aldService.getLastDetectedLanguage();
if (lastDetection) {
    console.log(lastDetection.languageCode); // "hi"
}
```

---

## Configuration

### Default Settings

- **ALD Toggle State**: OFF (disabled by default)
- **Default Language**: Hindi (`hi`)
- **Timeout**: 10 seconds for ALD API request
- **Audio Format**: WAV, 16kHz, mono, 16-bit PCM

### Customization

To change the default language, modify `app.js`:

```javascript
this.currentLanguage = 'en'; // Change from 'hi' to 'en' for English
```

To change the pipeline ID, modify `bhashini-ald-service.js`:

```javascript
pipelineId: "your_custom_pipeline_id"
```

---

## Performance Considerations

- **ALD adds ~2-3 seconds** to the transcription process
- Pipeline configuration is **cached** after first request
- **Fallback mechanism** ensures transcription completes even if ALD fails
- Consider disabling ALD if user consistently speaks the same language

---

## Testing

### Manual Testing Steps

1. **Test with Hindi audio**
   - Enable ALD
   - Record Hindi speech
   - Verify detection: "✅ Detected: Hindi"

2. **Test with English audio**
   - Enable ALD
   - Record English speech
   - Verify detection: "✅ Detected: English"

3. **Test fallback**
   - Enable ALD
   - Disconnect internet temporarily
   - Record audio
   - Verify fallback: "⚠️ Language detection failed, using Hindi"

4. **Test toggle functionality**
   - Toggle ALD on/off multiple times
   - Verify UI updates correctly

### Automated Testing

```javascript
// Test ALD detection
async function testALDDetection() {
    const aldService = new BhashiniALDService();
    const testAudio = "base64_encoded_test_audio";
    
    try {
        const result = await aldService.detectLanguageFromAudio(testAudio);
        console.assert(result.languageCode, "Language code should be returned");
        console.assert(result.confidence >= 0 && result.confidence <= 1, "Confidence should be between 0 and 1");
        console.log("✅ ALD test passed");
    } catch (error) {
        console.error("❌ ALD test failed:", error);
    }
}
```

---

## Troubleshooting

### Issue: Toggle doesn't change visual state

**Solution:**
- Check browser console for errors
- Verify `autoDetectToggle` element exists in DOM
- Clear browser cache and reload

### Issue: Language detection always fails

**Solution:**
- Verify Bhashini API credentials are correct
- Check network connectivity
- Verify audio is in correct format (WAV, 16kHz)
- Check browser console for detailed error messages

### Issue: Detected wrong language

**Solution:**
- Ensure audio quality is good (clear speech, minimal background noise)
- Speak for at least 3-5 seconds
- Check if the language is supported by Bhashini
- Try disabling ALD and manually selecting language

---

## Future Enhancements

1. **Language confidence threshold**
   - Only use detected language if confidence > 80%
   - Otherwise prompt user to select manually

2. **Multi-language mixing detection**
   - Detect code-switching in audio
   - Use multiple ASR models in sequence

3. **User preference learning**
   - Remember user's primary language
   - Pre-select based on history

4. **Visual feedback during detection**
   - Show loading spinner during ALD process
   - Display confidence score visually (progress bar)

---

## Support

For issues or questions about the ALD feature:

1. Check browser console for error messages
2. Verify Bhashini API status
3. Review this documentation
4. Contact development team with error logs

---

## License

This feature uses **Bhashini API** services provided by the Government of India.

---

**Last Updated:** 2025-10-30  
**Version:** 1.0.0
