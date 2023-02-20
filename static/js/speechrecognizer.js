class SpeechToTextRecognizerFactory {
    static JS(lang) {
        this.build = function () {
            return new NativeSpeechToTextRecognizer(lang);
        }
        return this;
    }
    static Azure(lang, subscriptionKey, serviceRegion) {
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
        speechConfig.speechRecognitionLanguage = lang;
        const audioConfig = window.SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        this.build = function () {
            return new AzureSpeechToTextRecognizer(speechConfig, audioConfig);
        }
        return this;
    }
    static TextInputRecognizer() {
        this.build = function () {
            return new TextInputRecognizer();
        }
        return this;
    }
}
class SpeechToTextRecognizer {
    recognize(onPartialResult, callback) {
        callback(null);
    }
}
class NativeSpeechToTextRecognizer extends SpeechToTextRecognizer {
    #recognizer;
    constructor(lang) {
        super();
        let recognizer = new webkitSpeechRecognition();
        this.#recognizer = recognizer;
        recognizer.continuous = false;
        recognizer.interimResults = true;
        recognizer.lang = lang;
    }
    recognize(onPartialResult, callback) {
        let recognizer = this.#recognizer;
        // https://www.section.io/engineering-education/speech-recognition-in-javascript/
        var transcript = "";
        recognizer.onresult = (event) => {
            transcript = event.results[0][0].transcript;
            onPartialResult(transcript);
        };
        recognizer.onspeechend = function () {
            recognizer.stop();
            console.log(transcript);
            callback(transcript);
        }
        this.#recognizer.start();
    }
}
class AzureSpeechToTextRecognizer extends SpeechToTextRecognizer {
    #recognizer;
    constructor(speechConfig, audioConfig) {
        super();
        this.#recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    }
    recognize(onPartialResult, callback) {
        let recognizer = this.#recognizer;
        this.#recognizer.recognizing = (s, e) => {
            onPartialResult(e.result.text);
        };
        recognizer.recognizeOnceAsync(
            function (result) {
                recognizer?.close();
                recognizer = undefined;

                callback(result.text, null);
            },
            function (err) {
                window.console.log(err);
                recognizer?.close();

                callback(null, err);
            }
        );
    }
}
class TextInputRecognizer extends SpeechToTextRecognizer {
    constructor() {
        super();
        transcription.innerText = "";
        transcription.contentEditable = true;
        transcription.focus();
    }
    recognize(onPartialResult, callback) {
        transcription.onkeydown = function (e) {
            if (e.key == "Enter") {
                transcription.contentEditable = false;
                callback(transcription.innerText);
            }
        }
    }
}

export { SpeechToTextRecognizerFactory };