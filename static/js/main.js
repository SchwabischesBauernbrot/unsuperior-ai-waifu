import * as helpers from "./helpers.js";
import { DumbMemoryModule } from "./memory.js";
import { TextToSpeechSynthesizerFactory } from "./speech.js";
import { SpeechToTextRecognizerFactory } from "./speechrecognizer.js";

/**
 * Siri sound. There is a delay between when you tap and when it starts transcripting. 
 * This sound helps make people wait for it to start transcripting.
*/
const startListeningAudioElement = new Audio("static/media/startListening.mp3");
const pokeAudioElement = new Audio("static/media/poke.mp3");
const bonkAudioElement = new Audio("static/media/bonk.mp3");

function addMessage(text, clas) {
    var ul = document.getElementById("warning");
    var li = document.createElement("li");
    li.classList.add(clas);
    li.appendChild(document.createTextNode(text));
    ul.appendChild(li);
}
function addWarning(text) {
    addMessage(text, "warning");
}
function addError(text) {
    addMessage(text, "error");
    $("#start-button").prop("disabled", true);
}

const model = helpers.getURLParam("model");
const modelsRaw = await fetch('models.json');
const modelsJSON = await modelsRaw.json();
var modelData;
if (model == null || model == "") {
    modelData = structuredClone(modelsJSON[0]);
} else {
    for (let m of modelsJSON) {
        if (m["name"] == model) {
            modelData = m;
            break;
        }
    }
}
if (modelData == null) {
    addError("ERROR: Unknown model " + model);
}


const username = helpers.getURLParam("username") || "hackdaddy8000";
const waifuName = helpers.getURLParam("waifuname") || "Goku 3";
const promptBase = helpers.getURLParam("prompt")
    || `You are a smug girl. You enjoy belittling people. 
    You love pointing out how much smarter you are than everyone. 
    You are currently hiding in your basement from the feds. 
    The feds are after you due to various cyber crimes. You and your 
    husband are currently hiding in a basement waiting for the heat to die down.`;
const voice = helpers.getURLParam("voice");

const openAIKey = helpers.getURLParam("openai");
if (openAIKey == null) {
    addError("ERROR: No OpenAI API Key given. Add it by passing it as a GET parameter called 'openai'");
}

const subscriptionKey = helpers.getURLParam("speech_key");
const serviceRegion = helpers.getURLParam("speech_region");

const engineOfChoice = helpers.getURLParam("engine") || "native";
const AZURE_POSSIBLE = subscriptionKey != null && serviceRegion != null && !!window.SpeechSDK;
const NATIVE_SPEECH_POSSIBLE = 'speechSynthesis' in window;
const SPEECH_POSSIBLE = AZURE_POSSIBLE || NATIVE_SPEECH_POSSIBLE;
var voiceEngine = engineOfChoice;
if (helpers.isMobile() && engineOfChoice == "native") {
    addWarning("WARNING: To my knowledge, native TTS and speech recognition does not work on mobile. Try to use Azure.");
}
if (!SPEECH_POSSIBLE) {
    addWarning("WARNING: No speech options are available. She is a mute.");
    voiceEngine = null;
} else if (engineOfChoice == "azure" && !AZURE_POSSIBLE) {
    addWarning("WARNING: Azure speech is misconfigured. Trying to fall back on native. Fix it by passing a GET parameter called 'speech_key' for the API key and 'speech_region' for the azure region");
    voiceEngine = "native";
} else if (engineOfChoice == "native" && !NATIVE_SPEECH_POSSIBLE) {
    addWarning("WARNING: Native TTS is not available. You must use Azure. No voice - she is now a mute.");
    voiceEngine = null;
}

const NATIVE_SPEECH_RECOGNITION_POSSIBLE = "webkitSpeechRecognition" in window;
const SPEECH_RECOGNITION_POSSIBLE = NATIVE_SPEECH_RECOGNITION_POSSIBLE || AZURE_POSSIBLE;
var speechRecognitionEngine = engineOfChoice;
if (!SPEECH_RECOGNITION_POSSIBLE) {
    addWarning("WARNING: Speech recognition not available. She is deaf.");
    speechRecognitionEngine = null;
} else if (engineOfChoice == "azure" && !AZURE_POSSIBLE) {
    // Already has a warning message from voice
    speechRecognitionEngine = null;
} else if (engineOfChoice == "native" && !NATIVE_SPEECH_RECOGNITION_POSSIBLE) {
    addWarning("WARNING: Native speech recognition is not available. You must use Azure. No hearing - she is now deaf.");
    speechRecognitionEngine = null;
}

////////////////////////////////////////////////////////////////////////////////////////////

var ttsFactory; // Created in main()
var sttFactory;
if (speechRecognitionEngine == "native") {
    sttFactory = SpeechToTextRecognizerFactory.JS("en");
} else if (speechRecognitionEngine == "azure") {
    sttFactory = SpeechToTextRecognizerFactory.Azure("en-US", subscriptionKey, serviceRegion);
} else if (speechRecognitionEngine == null) {
    sttFactory = SpeechToTextRecognizerFactory.Deaf();
} else {
    console.error("Illegal speechRecognitionEngine state!", speechRecognitionEngine);
}

var $overlay = $('.overlay');
$("#start-button").click(() => $overlay.fadeOut(800));

var $name_label = $('#nametag'), $transcription = $('#transcription');
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
        synthesizer.interrupt();
    }
    synthesizer = ttsFactory.build();

    function callback(userPrompt) {
        setUI(username, userPrompt);

        var fullTextGenerationPrompt = `${memory.buildPrompt()}\nMe: ${userPrompt}\nYou: `;
        helpers.openAIAPICompletionReq(openAIKey, fullTextGenerationPrompt, function (waifuResponse, error) {
            if (error != null) {
                setUI("ERROR", error);
                return;
            }
            interactionDisabled = false;

            memory.pushMemory(`Me: ${userPrompt}\nYou: ${waifuResponse}`);

            setUI(waifuName, waifuResponse);

            helpers.emotionAnalysis(openAIKey, waifuResponse, (emotion) => {
                var waifuExpression = modelData["emotionMap"][emotion] ?? 0;
                model.internalModel.motionManager.expressionManager.setExpression(waifuExpression);
                synthesizer.speak(waifuResponse, emotion);
            });
        });
    }

    getInteraction(callback);
}

(async function main() {
    $name_label.text(username);

    $(".icon-switch").click(function () {
        $(".icon-switch").toggleClass("icon-switch-1 icon-switch-2");
    });

    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        resizeTo: window
    });

    const model = await PIXI.live2d.Live2DModel.from(modelData["url"]);
    model.internalModel.motionManager.groups.idle = modelData["idleMotionGroupName"] ?? "Idle";
    app.stage.addChild(model);

    if (voiceEngine == "azure") {
        ttsFactory = TextToSpeechSynthesizerFactory.Azure(model, "en-US", voice, subscriptionKey, serviceRegion);
    } else if (voiceEngine == "native") {
        ttsFactory = TextToSpeechSynthesizerFactory.JS(model, "en", voice);
    } else if (voiceEngine == null) {
        ttsFactory = TextToSpeechSynthesizerFactory.Dummy();
    } else {
        console.error("voiceEngine illegal state!", voiceEngine);
    }

    function resizeWaifu() {
        // I just messed with the numbers until it centered her properly
        let scale = window.innerHeight * modelData["kScale"];
        model.scale.set(scale);
        model.x = (window.innerWidth - scale * modelData["kXOffset"]) / 2;
        model.y = modelData["kYOffset"] ?? 0;
    }
    resizeWaifu();
    onresize = (_) => resizeWaifu();

    $transcription.click(function () {
        onInteract(model, (callback) => {
            startListeningAudioElement.play();
            setUI(username, "Listening...");
            $name_label.text(username + ":");

            let recognizer = sttFactory.build();

            recognizer.recognize(
                (partialResult) => {
                    setUI(username, partialResult);
                },
                (result, error) => {
                    if (result) {
                        $transcription.text(result);
                    } else if (error) {
                        $transcription.text(err);
                        window.console.log(err);
                    }
                    recognizer = undefined;
                    callback(result);
                }
            );
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

    $overlay.css("opacity", .8);
    interactionDisabled = false;
})();
