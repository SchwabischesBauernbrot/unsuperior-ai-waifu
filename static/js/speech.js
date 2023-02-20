import { createSsml, setViseme } from "./helpers.js";

// TODO separate mouth movement logic from speech synthesis. SRP!

/**
 * This abstracts the speech synthesizers so that it's straightforward to switch
 * between Azure and JS.
 */
class TextToSpeechSynthesizerFactory {
    static Dummy() {
        this.build = function() {
            return new TextToSpeechSynthesizer(); // Use base class as NOOP
        }
        return this;
    }
    static JS(model, lang, voice) {
        this.build = function() {
            return new JSTextToSpeechSynthesizer(model, lang, voice);
        }
        return this;
    }
    static Azure(model, lang, voice, subscriptionKey, serviceRegion) {
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
        speechConfig.speechRecognitionLanguage = lang;
        this.build = function () {
            return new AzureTextToSpeechSynthesizer(model, voice, speechConfig);
        }
        return this;
    }
    static Text() {
        this.build = function() {
            return new TextToSpeechSynthesizer();
        }
        return this;
    }
}
class TextToSpeechSynthesizer {
    /*
     Construct in the direct scope of user interaction events. Not inside async operations. 
     Some browsers do not let you play audio unless the user interacts with the browser.
     Some logic must be done in the direct scope of (for example) "onclick" events.
     */
    speak(text, emotion) { }
    interrupt() { }
    close() { }
}
class AzureTextToSpeechSynthesizer extends TextToSpeechSynthesizer {
    #model;
    #voice;
    #config;
    #azureSpeechSynthesizer;
    #visemeAcc;
    constructor(model, voice, config) {
        super();
        this.#model = model;
        this.#voice = voice;
        this.#config = config;
        this.#azureSpeechSynthesizer = new SpeechSDK.SpeechSynthesizer(this.#config);
        this.#visemeAcc = [];
        let visemeAcc = this.#visemeAcc; // Need it due to scope shenanigans with .visemeReceived
        this.#azureSpeechSynthesizer.visemeReceived = function (s, e) {
            visemeAcc.push(e);
        };
    }
    speak(text, emotion) {
        const synthesizer = this;
        const ssml = createSsml(text, this.#voice, emotion);
        let visemeAcc = this.#visemeAcc, model = this.#model;
        // Text to speech
        this.#azureSpeechSynthesizer.speakSsmlAsync(
            ssml,
            function (result) {
                if (result.reason === SpeechSDK.ResultReason.Canceled) {
                    console.log("synthesis failed. Error detail: " + result.errorDetails + "\n");
                }
                let start = Date.now();
                for (let e of visemeAcc) {
                    setTimeout(() => {
                        setViseme(model, e.visemeId)
                    }, e.audioOffset / 10000 - (Date.now() - start));
                }
                synthesizer.close();
            },
            function (err) {
                window.console.log(err);
                synthesizer.close();
            }
        );
    }
    close() {
        this.#azureSpeechSynthesizer.close();
        this.#azureSpeechSynthesizer = undefined;
    }
}
class JSTextToSpeechSynthesizer extends TextToSpeechSynthesizer {
    #model;
    #utterance;
    constructor(model, lang, voice) {
        super();
        this.#model = model;
        this.#utterance = new SpeechSynthesisUtterance();
        this.#utterance.lang = lang;

        window.speechSynthesis.getVoices(); // Tells the browser to load the voices. Initially empty.
        window.speechSynthesis.onvoiceschanged = () => this.#setVoice(voice); // Runs when the voices are loaded.
    }
    speak(text, emotion) {
        this.#utterance.text = text;
        window.speechSynthesis.speak(this.#utterance);
    }
    interrupt() {
        window.speechSynthesis.cancel();
    }
    #setVoice(voice) {
        this.#utterance.voice = window.speechSynthesis.getVoices()[voice];
    }
}

export { TextToSpeechSynthesizerFactory };