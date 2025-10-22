// Audio Processing Utilities
// Handles audio format conversion and base64 encoding for Bhashini API

/**
 * Convert an audio Blob to WAV format at 16kHz sample rate
 * Required for Bhashini ASR API
 * @param {Blob} audioBlob - Input audio blob (WebM or other format)
 * @returns {Promise<Blob>} WAV audio blob
 */
async function convertToWav(audioBlob) {
    try {
        // Convert blob to array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // Create audio context with 16kHz sample rate (Bhashini requirement)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
            sampleRate: 16000 
        });
        
        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Convert AudioBuffer to WAV
        const wavBuffer = audioBufferToWav(audioBuffer);
        
        // Close the audio context to free resources
        audioContext.close();
        
        // Return as Blob
        return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch (error) {
        console.error('Error converting to WAV:', error);
        throw new Error('Failed to convert audio to WAV format');
    }
}

/**
 * Convert AudioBuffer to WAV ArrayBuffer
 * @param {AudioBuffer} buffer - Audio buffer to convert
 * @returns {ArrayBuffer} WAV format array buffer
 */
function audioBufferToWav(buffer) {
    const numberOfChannels = 1; // Mono audio for speech recognition
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    // Get the audio data from the first channel
    const channelData = buffer.getChannelData(0);
    
    // Calculate sizes
    const length = channelData.length * numberOfChannels * (bitDepth / 8);
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    // Helper functions for writing data
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    const floatTo16BitPCM = (output, offset, input) => {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    };
    
    // Write WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true); // audio format
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * (bitDepth / 8), true); // byte rate
    view.setUint16(32, numberOfChannels * (bitDepth / 8), true); // block align
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Write audio data
    floatTo16BitPCM(view, 44, channelData);
    
    return arrayBuffer;
}

/**
 * Convert a Blob to base64 string
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64 encoded string
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Remove the data URL prefix to get just the base64 string
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Create a download link for audio blob
 * @param {Blob} blob - Audio blob to download
 * @param {string} filename - Filename for the download
 */
function downloadAudioBlob(blob, filename = 'recording.wav') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Get audio duration from blob
 * @param {Blob} audioBlob - Audio blob
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(audioBlob) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioContext.close();
        return audioBuffer.duration;
    } catch (error) {
        console.error('Error getting audio duration:', error);
        return 0;
    }
}

/**
 * Check if MediaRecorder is supported with the specified MIME type
 * @param {string} mimeType - MIME type to check
 * @returns {boolean} Whether the MIME type is supported
 */
function isRecordingSupported(mimeType = 'audio/webm;codecs=opus') {
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType);
}

/**
 * Get the best supported MIME type for recording
 * @returns {string} The best supported MIME type
 */
function getBestMimeType() {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/wav'
    ];
    
    for (const type of types) {
        if (isRecordingSupported(type)) {
            return type;
        }
    }
    
    // Fallback to basic webm if nothing else is supported
    return 'audio/webm';
}

/**
 * Visualize audio waveform on canvas
 * @param {MediaStream} stream - Media stream from microphone
 * @param {HTMLCanvasElement} canvas - Canvas element to draw on
 * @returns {Function} Stop visualization function
 */
function visualizeAudio(stream, canvas) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvasCtx = canvas.getContext('2d');
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    
    let animationId;
    
    function draw() {
        animationId = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasCtx.fillStyle = 'rgba(252, 252, 249, 0.2)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        
        const barWidth = (WIDTH / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for(let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * HEIGHT;
            
            const r = 33 + (dataArray[i] / 255) * 100;
            const g = 128 + (dataArray[i] / 255) * 50;
            const b = 141;
            
            canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
            canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    draw();
    
    // Return stop function
    return () => {
        cancelAnimationFrame(animationId);
        source.disconnect();
        analyser.disconnect();
        audioContext.close();
    };
}

// Export utilities for use in other modules
window.AudioUtils = {
    convertToWav,
    blobToBase64,
    downloadAudioBlob,
    getAudioDuration,
    isRecordingSupported,
    getBestMimeType,
    visualizeAudio
};
