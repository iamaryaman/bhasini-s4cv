//
//  BhashiniTranslationService.swift
//  S4CV
//
//  Translation service using Bhashini NMT API
//

import Foundation

class BhashiniTranslationService: ObservableObject {
    // API credentials (same as BhashiniServiceV2)
    private let userID = "21d41f1e0ae54d958d93d8a1c65f96a4"
    private let ulcaApiKey = "025f6d4ca8-74bc-4847-8bbf-70f1ed42b166"
    
    // API endpoints
    private let pipelineURL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    private let computeURL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    
    @Published var isTranslating = false
    @Published var lastError: String?
    
    /// Translate text from one language to another using Bhashini NMT
    func translate(text: String, from sourceLanguage: BhashiniAPIConfig.LanguageCode, to targetLanguage: BhashiniAPIConfig.LanguageCode) async throws -> String {
        
        await MainActor.run { isTranslating = true }
        defer { Task { await MainActor.run { isTranslating = false } } }
        
        print("Translating from \(sourceLanguage.rawValue) to \(targetLanguage.rawValue)")
        
        // Step 1: Get pipeline config
        let (serviceId, authToken) = try await getPipelineConfig(from: sourceLanguage.rawValue, to: targetLanguage.rawValue)
        
        // Step 2: Call compute API  
        let translatedText = try await computeTranslation(
            text: text,
            serviceId: serviceId,
            authToken: authToken,
            sourceLanguage: sourceLanguage.rawValue,
            targetLanguage: targetLanguage.rawValue
        )
        
        return translatedText
    }
    
    // MARK: - Private Methods
    
    private func getPipelineConfig(from sourceLanguage: String, to targetLanguage: String) async throws -> (serviceId: String, authToken: String) {
        
        let payload: [String: Any] = [
            "pipelineTasks": [
                [
                    "taskType": "translation",
                    "config": [
                        "language": [
                            "sourceLanguage": sourceLanguage,
                            "targetLanguage": targetLanguage
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
        
        print("Translation pipeline request: \(String(data: jsonData, encoding: .utf8) ?? "")")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TranslationError.apiError
        }
        
        print("Translation pipeline response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode != 200 {
            let errorString = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("Translation pipeline error: \(errorString)")
            throw TranslationError.apiError
        }
        
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw TranslationError.configFailed
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
            throw TranslationError.configFailed
        }
        
        print("Translation config: serviceId=\(serviceId)")
        return (serviceId, authToken)
    }
    
    private func computeTranslation(text: String, serviceId: String, authToken: String, sourceLanguage: String, targetLanguage: String) async throws -> String {
        
        let payload: [String: Any] = [
            "pipelineTasks": [
                [
                    "taskType": "translation",
                    "config": [
                        "language": [
                            "sourceLanguage": sourceLanguage,
                            "targetLanguage": targetLanguage
                        ],
                        "serviceId": serviceId
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
        
        print("Translation compute payload: \(String(data: jsonData, encoding: .utf8) ?? "")")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TranslationError.apiError
        }
        
        print("Translation compute response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode != 200 {
            let errorString = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("Translation compute error: \(errorString)")
            throw TranslationError.apiError
        }
        
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw TranslationError.noOutput
        }
        
        print("Translation compute response: \(json)")
        
        // Extract translation from response
        guard let pipelineResponse = json["pipelineResponse"] as? [[String: Any]],
              let firstResponse = pipelineResponse.first,
              let output = firstResponse["output"] as? [[String: Any]],
              let firstOutput = output.first,
              let translatedText = firstOutput["target"] as? String else {
            throw TranslationError.noOutput
        }
        
        print("Translation result: \(translatedText)")
        return translatedText
    }
}

// MARK: - Errors

enum TranslationError: LocalizedError {
    case notConfigured
    case invalidURL
    case configFailed
    case apiError
    case noOutput
    
    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Bhashini API is not configured. Please add your API key in Settings."
        case .invalidURL:
            return "Invalid API endpoint URL."
        case .configFailed:
            return "Failed to get translation configuration."
        case .apiError:
            return "Translation API request failed. Please check your network connection."
        case .noOutput:
            return "No translation output received from API."
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .notConfigured:
            return "Go to Settings → Bhashini API and enter your credentials."
        case .apiError:
            return "Check your internet connection and try again."
        default:
            return "Please try again or contact support if the issue persists."
        }
    }
}