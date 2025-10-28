//
//  BhashiniTTSService.swift
//  S4CV
//
//  Text-to-Speech service using Bhashini TTS API
//  Provides voice feedback in user's preferred language
//

import Foundation
import AVFoundation

class BhashiniTTSService: ObservableObject {
    // API credentials (same as BhashiniServiceV2)
    private let userID = "21d41f1e0ae54d958d93d8a1c65f96a4"
    private let ulcaApiKey = "025f6d4ca8-74bc-4847-8bbf-70f1ed42b166"
    
    // API endpoints
    private let pipelineURL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    private let computeURL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    
    @Published var isSpeaking = false
    private var audioPlayer: AVAudioPlayer?
    private var audioPlayerDelegate: AudioPlayerDelegate?
    
    /// Speak text in the specified language
    func speak(text: String, language: BhashiniAPIConfig.LanguageCode) async throws {
        await MainActor.run { isSpeaking = true }
        
        defer {
            Task { @MainActor in
                self.isSpeaking = false
            }
        }
        
        // Get audio data from Bhashini TTS
        let audioData = try await generateSpeech(text: text, language: language)
        
        // Play the audio
        try await playAudio(data: audioData)
    }
    
    // MARK: - Convenience Methods
    
    /// Speak success message in user's language
    func speakSuccess(language: BhashiniAPIConfig.LanguageCode) async {
        let messages: [BhashiniAPIConfig.LanguageCode: String] = [
            .english: "Success! Your information has been saved.",
            .hindi: "सफलता! आपकी जानकारी सहेज ली गई है।",
            .telugu: "విజయం! మీ సమాచారం సేవ్ చేయబడింది.",
            .tamil: "வெற்றி! உங்கள் தகவல் சேமிக்கப்பட்டது.",
            .bengali: "সফল! আপনার তথ্য সংরক্ষিত হয়েছে।"
        ]
        
        if let message = messages[language] {
            try? await speak(text: message, language: language)
        }
    }
    
    /// Speak error message
    func speakError(language: BhashiniAPIConfig.LanguageCode) async {
        let messages: [BhashiniAPIConfig.LanguageCode: String] = [
            .english: "Sorry, something went wrong. Please try again.",
            .hindi: "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
            .telugu: "క్షమించండి, ఏదో తప్పు జరిగింది। దయచేసి మళ్లీ ప్రయత్నించండి.",
            .tamil: "மன்னிக்கவும், ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.",
            .bengali: "দুঃখিত, কিছু ভুল হয়েছে। আবার চেষ্টা করুন।"
        ]
        
        if let message = messages[language] {
            try? await speak(text: message, language: language)
        }
    }
    
    // MARK: - Private Methods
    
    private func generateSpeech(text: String, language: BhashiniAPIConfig.LanguageCode) async throws -> Data {
        print("Generating speech for language: \(language.rawValue)")
        
        // Step 1: Get pipeline config for TTS
        let (serviceId, authToken) = try await getPipelineConfig(language: language.rawValue)
        
        // Step 2: Call TTS compute API
        let audioBase64 = try await computeTTS(
            text: text,
            serviceId: serviceId,
            authToken: authToken,
            language: language.rawValue
        )
        
        // Step 3: Decode base64 audio
        guard let audioData = Data(base64Encoded: audioBase64) else {
            throw TTSError.decodingFailed
        }
        
        print("TTS audio generated: \(audioData.count) bytes")
        return audioData
    }
    
    private func getPipelineConfig(language: String) async throws -> (serviceId: String, authToken: String) {
        let payload: [String: Any] = [
            "pipelineTasks": [
                [
                    "taskType": "tts",
                    "config": [
                        "language": [
                            "sourceLanguage": language
                        ]
                    ]
                ]
            ],
            "pipelineRequestConfig": [
                "pipelineId": "64392f96daac500b55c543cd"
            ]
        ]
        
        var request = URLRequest(url: URL(string: pipelineURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(userID, forHTTPHeaderField: "userID")
        request.setValue(ulcaApiKey, forHTTPHeaderField: "ulcaApiKey")
        request.timeoutInterval = 10.0
        
        let jsonData = try JSONSerialization.data(withJSONObject: payload, options: [])
        request.httpBody = jsonData
        
        print("TTS pipeline request: \(String(data: jsonData, encoding: .utf8) ?? "")")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TTSError.apiError
        }
        
        print("TTS pipeline response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode != 200 {
            let errorString = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("TTS pipeline error: \(errorString)")
            throw TTSError.apiError
        }
        
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw TTSError.configFailed
        }
        
        // Extract service ID and auth token
        guard let pipelineResponseConfig = json["pipelineResponseConfig"] as? [[String: Any]],
              let firstResponse = pipelineResponseConfig.first,
              let config = firstResponse["config"] as? [[String: Any]],
              let firstConfig = config.first,
              let serviceId = firstConfig["serviceId"] as? String,
              let pipelineInferenceAPIEndPoint = json["pipelineInferenceAPIEndPoint"] as? [String: Any],
              let inferenceApiKey = pipelineInferenceAPIEndPoint["inferenceApiKey"] as? [String: Any],
              let authToken = inferenceApiKey["value"] as? String else {
            throw TTSError.configFailed
        }
        
        print("TTS config: serviceId=\(serviceId)")
        return (serviceId, authToken)
    }
    
    private func computeTTS(text: String, serviceId: String, authToken: String, language: String) async throws -> String {
        let payload: [String: Any] = [
            "pipelineTasks": [
                [
                    "taskType": "tts",
                    "config": [
                        "language": [
                            "sourceLanguage": language
                        ],
                        "serviceId": serviceId,
                        "gender": "female"
                    ]
                ]
            ],
            "inputData": [
                "input": [
                    [
                        "source": text
                    ]
                ]
            ]
        ]
        
        var request = URLRequest(url: URL(string: computeURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(authToken, forHTTPHeaderField: "Authorization")
        
        let jsonData = try JSONSerialization.data(withJSONObject: payload, options: [])
        request.httpBody = jsonData
        
        print("TTS compute payload: \(String(data: jsonData, encoding: .utf8) ?? "")")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TTSError.apiError
        }
        
        print("TTS compute response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode != 200 {
            let errorString = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("TTS compute error: \(errorString)")
            throw TTSError.apiError
        }
        
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw TTSError.noOutput
        }
        
        print("TTS compute response: \(json)")
        
        // Extract audio content from response
        guard let pipelineResponse = json["pipelineResponse"] as? [[String: Any]],
              let firstResponse = pipelineResponse.first,
              let audio = firstResponse["audio"] as? [[String: Any]],
              let firstAudio = audio.first,
              let audioContent = firstAudio["audioContent"] as? String else {
            throw TTSError.noOutput
        }
        
        print("TTS audio content length: \(audioContent.count)")
        return audioContent
    }
    
    private func playAudio(data: Data) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            do {
                audioPlayer = try AVAudioPlayer(data: data)
                let delegate = AudioPlayerDelegate(continuation: continuation)
                audioPlayerDelegate = delegate // Keep strong reference
                audioPlayer?.delegate = delegate
                audioPlayer?.prepareToPlay()
                
                if audioPlayer?.play() == true {
                    // Will complete in delegate callback
                } else {
                    continuation.resume(throwing: TTSError.playbackFailed)
                }
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
}

// MARK: - Audio Player Delegate

private class AudioPlayerDelegate: NSObject, AVAudioPlayerDelegate {
    let continuation: CheckedContinuation<Void, Error>
    
    init(continuation: CheckedContinuation<Void, Error>) {
        self.continuation = continuation
    }
    
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        if flag {
            continuation.resume()
        } else {
            continuation.resume(throwing: TTSError.playbackFailed)
        }
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        continuation.resume(throwing: error ?? TTSError.decodingFailed)
    }
}

// MARK: - Errors

enum TTSError: LocalizedError {
    case notConfigured
    case invalidURL
    case configFailed
    case apiError
    case noOutput
    case decodingFailed
    case playbackFailed
    
    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Bhashini TTS is not configured."
        case .invalidURL:
            return "Invalid TTS endpoint URL."
        case .configFailed:
            return "Failed to get TTS configuration."
        case .apiError:
            return "TTS API request failed."
        case .noOutput:
            return "No audio output received from TTS."
        case .decodingFailed:
            return "Failed to decode audio data."
        case .playbackFailed:
            return "Audio playback failed."
        }
    }
}