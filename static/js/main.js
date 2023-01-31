import * as helpers from "./helpers.js";
import { DumbMemoryModule } from "./memory.js";


const modelURL =
    "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json";

/**
 * Siri sound. There is a delay between when you tap and when it starts transcripting. 
 * This sound helps make people wait for it to start transcripting.
*/
const startListeningAudioElement = new Audio("static/media/startListening.mp3");
const pokeAudioElement = new Audio("static/media/poke.mp3");
const bonkAudioElement = new Audio("static/media/bonk.mp3");

const username = helpers.getURLParam("username") || "hackdaddy8000";
const waifuName = helpers.getURLParam("name") || "Goku 3";
const promptBase = helpers.getURLParam("prompt")
    || `You are a smug girl. You enjoy belittling people. 
    You love pointing out how much smarter you are than everyone. 
    You are currently hiding in your basement from the feds. 
    The feds are after you due to various cyber crimes. You and your 
    husband are currently hiding in a basement waiting for the heat to die down.`;
const voice = helpers.getURLParam("voice") || "ja-JP-NanamiNeural";

const openAIKey = helpers.getURLParam("openai");
if (openAIKey == null) {
    document.getElementById("warning").innerText += "ERROR: No OpenAI API Key given. Add it by passing it as a GET parameter called 'openai'\n";
    $("#start-button").prop("disabled", true);
}

const subscriptionKey = helpers.getURLParam("speech_key");
const serviceRegion = helpers.getURLParam("speech_region");
const AZURE_POSSIBLE = subscriptionKey != null && serviceRegion != null;
if (!AZURE_POSSIBLE) {
    document.getElementById("warning").innerText += "WARNING: Azure speech is misconfigured. She will sound horrible + some features disabled. Fix it by passing a GET parameter called 'speech_key' for the API key and 'speech_region' for the azure region";
}

$("#start-button").click(() => $('.overlay').delay(1500).fadeOut(800));

////////////////////////////////////////////////////////////////////////////////////////////

var speechConfig = null, audioConfig = null;
if (AZURE_POSSIBLE) {
    speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = "en-US";
    audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
}

var $name_label, $transcription;
function setUI(name, content) {
    $name_label.text(name);
    $transcription.text(content);
}

// Flag to make sure user doesn't interact with her while she's "thinking"
var interactionDisabled = true;

var synthesizer;
const memory = new DumbMemoryModule(promptBase);

/**
 * Called when something happens that should prompt the waifu to "react". Poke, speak, webhook, etc.
 * @param {*} getInteraction a function that takes a function as a parameter. getInteraction should pass the "interaction" into the function. 
 */
function onInteract(model, getInteraction) {
    if (interactionDisabled) {
        return;
    }
    interactionDisabled = true;

    if (synthesizer != null) {
        synthesizer.close(() => { });
    }
    synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
    const visemeAcc = [];
    synthesizer.visemeReceived = function (s, e) {
        visemeAcc.push(e);
    };

    function callback(userPrompt) {
        setUI(username, userPrompt);

        var fullTextGenerationPrompt = `${memory.buildPrompt()}\nMe: ${userPrompt}\nYou: `;
        console.log(fullTextGenerationPrompt)
        helpers.openAIAPICompletionReq(openAIKey, fullTextGenerationPrompt, function (waifuResponse) {
            interactionDisabled = false;

            memory.pushMemory(`Me: ${userPrompt}\nYou: ${waifuResponse}`);

            setUI(waifuName, waifuResponse);

            // Try get emotion
            helpers.emotionAnalysis(openAIKey, waifuResponse, (emotion) => {
                var waifuExpression = helpers.emotion2ModelExpression(emotion);
                model.internalModel.motionManager.expressionManager.setExpression(waifuExpression);

                var ssml = helpers.createSsml(waifuResponse, voice, emotion);
                // Text to speech
                synthesizer.speakSsmlAsync(
                    ssml,
                    function (result) {
                        if (result.reason === SpeechSDK.ResultReason.Canceled) {
                            console.log("synthesis failed. Error detail: " + result.errorDetails + "\n");
                        }
                        var start = Date.now();
                        for (let e of visemeAcc) {
                            setTimeout(() => {
                                helpers.setViseme(model, e.visemeId)
                            }, e.audioOffset / 10000 - (Date.now() - start));
                        }
                        synthesizer.close();
                        synthesizer = undefined;
                    },
                    function (err) {
                        window.console.log(err);
                        synthesizer.close();
                        synthesizer = undefined;
                    }
                );
            });
        });
    }

    getInteraction(callback);
}

(async function main() {
    $name_label = $('#nametag');
    $transcription = $('#transcription');

    if (!!window.SpeechSDK) {
        SpeechSDK = window.SpeechSDK;
        interactionDisabled = false;
        console.log("Speech enabled");
    }

    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        resizeTo: window
    });

    const model = await PIXI.live2d.Live2DModel.from(modelURL);

    model.internalModel.motionManager.groups.idle = 'Idle';

    app.stage.addChild(model);

    function resizeWaifu() {
        model.scale.set(window.innerHeight / 1280 * .8);
        model.x = (window.innerWidth - 500) / 2;
    }
    resizeWaifu();
    onresize = (_) => resizeWaifu();

    $transcription.click(function () {
        onInteract(model, (callback) => {
            startListeningAudioElement.play();
            $transcription.text("Listening...");
            $name_label.text(username + ":");

            var recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

            recognizer.recognizing = (s, e) => {
                $transcription.text(e.result.text);
            };

            recognizer.recognizeOnceAsync(
                function (result) {
                    $transcription.text(result.text);
                    recognizer.close();
                    recognizer = undefined;

                    callback(result.text);
                },
                function (err) {
                    $transcription.text(err);
                    window.console.log(err);
                    recognizer.close();
                    recognizer = undefined;

                    callback(null);
                });
        });
    });

    model.on('hit', (hitAreaNames) => {
        onInteract(model, (callback) => {
            var hitLocation = hitAreaNames[0];
            if (hitLocation == "head") {
                bonkAudioElement.play();
            } else {
                pokeAudioElement.play();
            }
            callback(`*pokes your ${hitLocation}*`);
        });
    });
})();
