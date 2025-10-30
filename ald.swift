//
//  BhashiniLanguageDetectionService.swift
//  S4CV
//
//  Language detection service using Bhashini API
//  Auto-detects user's language from spoken or typed input
//

import Foundation
import Combine

class BhashiniLanguageDetectionService: ObservableObject {
    
    @Published var detectedLanguageCode: String?
    @Published var detectionConfidence: Double = 0.0
    
    private let pipelineURL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    private let computeURL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    
    // Cache for ALD pipeline configuration
    private var aldPipelineConfig: ALDConfig?
    
    // MARK: - Real-time Audio Language Detection
    
    /// Detect language from audio data in real-time (before ASR)
    /// - Parameter audioData: WAV audio data (16kHz, mono, 16-bit PCM)
    /// - Returns: Detected language code (e.g., "hi", "en", "te") and confidence
    func detectLanguageFromAudio(_ audioData: Data) async throws -> (languageCode: String, confidence: Double) {
        print("🎤 ALD: Starting real-time audio language detection")
        
        // Get ALD pipeline configuration
        let config = try await getALDPipelineConfig()
        
        // Convert audio to base64
        let base64Audio = audioData.base64EncodedString()
        print("🎤 ALD: Processing \(audioData.count) bytes of audio")
        
        // Prepare ALD compute request
        let requestBody: [String: Any] = [
            "pipelineTasks": [
                [
                    "taskType": "ald",
                    "config": [
                        "serviceId": config.serviceId,
                        "audioFormat": "wav",
                        "samplingRate": 16000
                    ]
                ]
            ],
            "inputData": [
                "audio": [
                    [
                        "audioContent": base64Audio
                    ]
                ]
            ]
        ]
        
        var request = URLRequest(url: URL(string: config.callbackUrl ?? computeURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.authorizationToken, forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        request.timeoutInterval = 10 // 10 second timeout for real-time detection
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        // Check HTTP response
        if let httpResponse = response as? HTTPURLResponse {
            print("🎤 ALD API Status: \(httpResponse.statusCode)")
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("🎤 ALD API Error: \(errorBody)")
                throw LanguageDetectionError.apiError
            }
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        print("🎤 ALD Response: \(String(describing: json))")
        
        // Parse ALD response
        guard let pipelineResponse = json?["pipelineResponse"] as? [[String: Any]],
              let firstResponse = pipelineResponse.first,
              let output = firstResponse["output"] as? [[String: Any]],
              let firstOutput = output.first else {
            throw LanguageDetectionError.noOutput
        }
        
        // Extract detected language and confidence
        // Bhashini ALD returns: {"source": "hi", "langConfidence": {"hi": 0.95, "en": 0.05}}
        guard let detectedLang = firstOutput["source"] as? String else {
            throw LanguageDetectionError.noOutput
        }
        
        let confidence: Double
        if let langConfidence = firstOutput["langConfidence"] as? [String: Double],
           let detectedConfidence = langConfidence[detectedLang] {
            confidence = detectedConfidence
        } else {
            confidence = 1.0 // Default confidence if not provided
        }
        
        print("🎤 ALD: Detected language='\(detectedLang)', confidence=\(confidence)")
        
        // Update published properties
        await MainActor.run {
            self.detectedLanguageCode = detectedLang
            self.detectionConfidence = confidence
        }
        
        return (detectedLang, confidence)
    }
    
    /// Get ALD pipeline configuration from Bhashini
    private func getALDPipelineConfig() async throws -> ALDConfig {
        // Return cached config if available
        if let cached = aldPipelineConfig {
            return cached
        }
        
        let requestBody: [String: Any] = [
            "pipelineTasks": [
                ["taskType": "ald"]
            ],
            "pipelineRequestConfig": [
                "pipelineId": BhashiniAPIConfig.generalPipelineID
            ]
        ]
        
        var request = URLRequest(url: URL(string: pipelineURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(BhashiniAPIConfig.apiKey, forHTTPHeaderField: "ulcaApiKey")
        request.setValue(BhashiniAPIConfig.userID, forHTTPHeaderField: "userID")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🎤 ALD Pipeline Status: \(httpResponse.statusCode)")
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("🎤 ALD Pipeline Error: \(errorBody)")
                throw LanguageDetectionError.configFailed
            }
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        guard let pipelineResponseConfig = json?["pipelineResponseConfig"] as? [[String: Any]],
              let aldConfig = pipelineResponseConfig.first(where: { ($0["taskType"] as? String) == "ald" }),
              let config = aldConfig["config"] as? [[String: Any]],
              let firstService = config.first,
              let serviceId = firstService["serviceId"] as? String,
              let pipelineInferenceAPIEndPoint = json?["pipelineInferenceAPIEndPoint"] as? [String: Any],
              let inferenceApiKey = pipelineInferenceAPIEndPoint["inferenceApiKey"] as? [String: Any],
              let apiKeyValue = inferenceApiKey["value"] as? String else {
            print("🎤 ALD: Failed to parse pipeline configuration")
            throw LanguageDetectionError.configFailed
        }
        
        let callbackUrl = pipelineInferenceAPIEndPoint["callbackUrl"] as? String
        
        let pipelineConfig = ALDConfig(
            serviceId: serviceId,
            authorizationToken: apiKeyValue,
            callbackUrl: callbackUrl
        )
        
        // Cache the configuration
        aldPipelineConfig = pipelineConfig
        
        print("🎤 ALD: Pipeline configured with serviceId=\(serviceId)")
        
        return pipelineConfig
    }
    
    // MARK: - Text-based Language Detection
    
    /// Detect language from text input
    func detectLanguage(from text: String) async throws -> BhashiniAPIConfig.LanguageCode {
        // Get pipeline config for language detection
        let config = try await getPipelineConfig()
        
        guard let langDetectConfig = config.pipelineResponseConfig?.first(where: { $0.taskType == "asr" || $0.taskType == "translation" }),
              let configItem = langDetectConfig.config.first,
              let callbackUrl = configItem.callbackUrl else {
            throw LanguageDetectionError.configFailed
        }
        
        // Call compute API
        let detectedLang = try await computeLanguageDetection(
            text: text,
            serviceId: configItem.serviceId,
            modelId: configItem.modelId,
            callbackUrl: callbackUrl
        )
        
        // Map to language code
        return mapToLanguageCode(detectedLang)
    }
    
    /// Simple heuristic-based language detection (fallback)
    func detectLanguageHeuristic(from text: String) -> BhashiniAPIConfig.LanguageCode {
        // Check for script patterns
        let devanagariRange = "[\u{0900}-\u{097F}]"
        let teluguRange = "[\u{0C00}-\u{0C7F}]"
        let tamilRange = "[\u{0B80}-\u{0BFF}]"
        let bengaliRange = "[\u{0980}-\u{09FF}]"
        
        if text.range(of: devanagariRange, options: .regularExpression) != nil {
            return .hindi
        } else if text.range(of: teluguRange, options: .regularExpression) != nil {
            return .telugu
        } else if text.range(of: tamilRange, options: .regularExpression) != nil {
            return .tamil
        } else if text.range(of: bengaliRange, options: .regularExpression) != nil {
            return .bengali
        } else {
            return .english // Default
        }
    }
    
    // MARK: - Private Methods
    
    private func getPipelineConfig() async throws -> BhashiniPipelineResponse {
        // Use a generic pipeline for language detection
        let request = BhashiniPipelineRequest(
            pipelineTasks: [
                BhashiniPipelineRequest.PipelineTask(
                    taskType: "translation",
                    config: BhashiniPipelineRequest.PipelineTask.TaskConfig(
                        language: BhashiniPipelineRequest.PipelineTask.TaskConfig.LanguageConfig(
                            sourceLanguage: "", // Auto-detect
                            targetLanguage: "en"
                        ),
                        serviceId: nil,
                        modelId: nil,
                        domain: nil
                    )
                )
            ],
            pipelineRequestConfig: BhashiniPipelineRequest.PipelineRequestConfig(
                pipelineId: BhashiniAPIConfig.generalPipelineID
            )
        )
        
        guard let url = URL(string: BhashiniAPIConfig.pipelineConfigURL) else {
            throw LanguageDetectionError.invalidURL
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue(BhashiniAPIConfig.apiKey, forHTTPHeaderField: "Authorization")
        urlRequest.setValue(BhashiniAPIConfig.userID, forHTTPHeaderField: "userID")
        
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw LanguageDetectionError.apiError
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(BhashiniPipelineResponse.self, from: data)
    }
    
    private func computeLanguageDetection(text: String, serviceId: String, modelId: String?, callbackUrl: String) async throws -> String {
        // This is a placeholder - Bhashini doesn't have a dedicated language detection endpoint
        // In practice, we would use the heuristic method or infer from ASR results
        throw LanguageDetectionError.notSupported
    }
    
    private func mapToLanguageCode(_ languageString: String) -> BhashiniAPIConfig.LanguageCode {
        switch languageString.lowercased() {
        case "hi", "hindi":
            return .hindi
        case "te", "telugu":
            return .telugu
        case "ta", "tamil":
            return .tamil
        case "bn", "bengali":
            return .bengali
        case "en", "english":
            return .english
        default:
            return .english
        }
    }
}

// MARK: - Supporting Types

struct ALDConfig {
    let serviceId: String
    let authorizationToken: String
    let callbackUrl: String?
}

// MARK: - Errors

enum LanguageDetectionError: LocalizedError {
    case invalidURL
    case configFailed
    case apiError
    case notSupported
    case noOutput
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid language detection endpoint URL."
        case .configFailed:
            return "Failed to get language detection configuration."
        case .apiError:
            return "Language detection API request failed."
        case .notSupported:
            return "Language detection not supported by Bhashini."
        case .noOutput:
            return "No language detected."
        }
    }
}