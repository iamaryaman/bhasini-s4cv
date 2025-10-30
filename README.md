# Bhashini S4CV: Multilingual CV Processing and Extraction

This repository contains a demonstration project that integrates **Bhashini's Language Technology Services** (especially Named Entity Recognition, Translation, and Text-to-Speech) with modern web technologies for **Curriculum Vitae (CV) data extraction** and visualization.

The core goal is to enable robust, multilingual processing of CV data, making it easier to extract, translate, and visualize candidate information. The project also features integration with local LLMs like **Ollama** for enhanced extraction and optimization capabilities.

-----

## ✨ Features

  * **Multilingual CV Data Extraction:** Utilizes Bhashini APIs and a hybrid approach (potentially with Ollama) to perform Named Entity Recognition (NER) on raw text, extracting key fields like name, contact, education, and experience.
  * **Resume Visualization:** Transforms the structured NER output into a clean, visualized resume format on the front-end.
  * **Bhashini Language Services Integration:**
      * **Text-to-Speech (TTS):** Provides audio output for text for accessibility or review.
      * **Translation:** Includes page-level and service-level translation capabilities.
  * **Modular Architecture:** The codebase is structured with separate JavaScript files for service layers (`*-service.js`), UI logic (`*-ui.js`), and utilities, promoting maintainability.
  * **Theme Support:** Includes both light and dark themes (`light-theme.css`, `dark-theme.css`).
  * **Mobile Integration Examples:** Includes a `swift_examples` directory, suggesting potential client-side integration with mobile applications.

-----

## 🛠️ Technology Stack

| Category | Technology | Files |
| :--- | :--- | :--- |
| **Frontend** | HTML, CSS, JavaScript | `index.html`, `style.css`, `app.js`, `ner-ui-components.js` |
| **Bhashini Services** | NER, TTS, Translation | `bhashini-service.js`, `bhashini-ner-service.js`, `bhashini-translation-service.js`, `bhashini-tts-service.js` |
| **AI/LLM Integration** | Ollama | `ollama-optimization-service.js`, `ollama-ui-integration.js` |
| **Core Logic** | CV Extraction, Resume Rendering | `hybrid-cv-extraction.js`, `ner-to-resume-integration.js`, `resume-visualization.js` |
| **Mobile Integration** | Swift | `swift_examples/` |

-----

## 🚀 Getting Started

Since this is a client-side application structure with service integration, you'll need a way to serve the files locally and access the necessary APIs.

### Prerequisites

1.  **Bhashini API Keys/Credentials:** You will need to register and obtain credentials to use the Bhashini NER, TTS, and Translation services.
2.  **Node.js / Local Web Server:** A simple HTTP server is required to run the `index.html` file (e.g., using `http-server` from npm or Python's `http.server`).
3.  **Ollama (Optional):** If you intend to use the Ollama integration features, you will need to have Ollama installed and running locally.

### Installation and Run

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/iamaryaman/bhasini-s4cv.git
    cd bhasini-s4cv
    ```

2.  **Configure API Endpoints:**

      * Open the service files (e.g., `bhashini-service.js`) and replace placeholder API keys or endpoint URLs with your actual Bhashini credentials.

3.  **Start a Local Web Server:**

      * Using Node.js:
        ```bash
        npx http-server
        ```
      * Using Python:
        ```bash
        python -m http.server 8080
        ```

4.  **Access the Application:**
    Open your web browser and navigate to the address provided by the server (e.g., `http://localhost:8080/index.html`).

-----

## 📂 Key Files and Directories

| File/Directory | Description |
| :--- | :--- |
| **`index.html`** | The main application interface file. |
| **`app.js`** | The primary JavaScript file orchestrating the application logic. |
| **`bhashini-service.js`** | Core utility functions for interacting with Bhashini APIs. |
| **`bhashini-ner-service.js`** | Service dedicated to Bhashini's Named Entity Recognition (NER). |
| **`bhashini-tts-service.js`** | Service dedicated to Bhashini's Text-to-Speech (TTS). |
| **`hybrid-cv-extraction.js`** | Logic for the combined (hybrid) approach to CV data extraction. |
| **`ollama-optimization-service.js`** | Handles communication and data optimization using the Ollama LLM. |
| **`resume-visualization.js`** | Handles the front-end rendering of the extracted CV data. |
| **`swift_examples/`** | Contains examples or integration code for Swift (iOS/macOS) clients. |
| **`TTS_ACTIVE_SCREEN_GUIDE.md`** | Likely a guide on how to use the active screen TTS feature. |