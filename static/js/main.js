import * as helpers from "./helpers.js";
import { DumbMemoryModule } from "./memory.js";
import { TextToSpeechSynthesizerFactory } from "./speech.js";
import { SpeechToTextRecognizerFactory } from "./speechrecognizer.js";


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

const openAIKey = helpers.getURLParam("openai");
if (openAIKey == null) {
    addError("ERROR: No OpenAI API Key given. Add it by passing it as a GET parameter called 'openai'");
}

const subscriptionKey = helpers.getURLParam("speech_key");
const serviceRegion = helpers.getURLParam("speech_region");
const AZURE_POSSIBLE = subscriptionKey != null && serviceRegion != null && !!window.SpeechSDK;
const NATIVE_SPEECH_POSSIBLE = 'speechSynthesis' in window;
const SPEECH_POSSIBLE = AZURE_POSSIBLE || NATIVE_SPEECH_POSSIBLE;
if (!SPEECH_POSSIBLE) {
    addWarning("WARNING: No speech options are available. She is a mute.");
} else if (!AZURE_POSSIBLE) {
    addWarning("WARNING: Azure speech is misconfigured. She will sound horrible + some features disabled. Fix it by passing a GET parameter called 'speech_key' for the API key and 'speech_region' for the azure region");
} else if (!NATIVE_SPEECH_POSSIBLE) {
    addWarning("WARNING: Native speech is not available. You must use Azure");
}

const NATIVE_SPEECH_RECOGNITION_POSSIBLE = "webkitSpeechRecognition" in window;
const SPEECH_RECOGNITION_POSSIBLE = NATIVE_SPEECH_RECOGNITION_POSSIBLE || AZURE_POSSIBLE;
if (!SPEECH_RECOGNITION_POSSIBLE) {
    addWarning("WARNING: Speech recognition not available. She is deaf.");
}

////////////////////////////////////////////////////////////////////////////////////////////

var ttsFactory; // Created in main()
var sttFactory;
if (NATIVE_SPEECH_RECOGNITION_POSSIBLE) {
    sttFactory = SpeechToTextRecognizerFactory.JS("en");
} else if (AZURE_POSSIBLE) {
    sttFactory = SpeechToTextRecognizerFactory.Azure("en-US", subscriptionKey, serviceRegion);
} else {
    console.error("No speech recognizer built!");
}

var $overlay = $('.overlay');
$("#start-button").click(() => $overlay.delay(1500).fadeOut(800));

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
        helpers.openAIAPICompletionReq(openAIKey, fullTextGenerationPrompt, function (waifuResponse) {
            interactionDisabled = false;

            memory.pushMemory(`Me: ${userPrompt}\nYou: ${waifuResponse}`);

            setUI(waifuName, waifuResponse);

            helpers.emotionAnalysis(openAIKey, waifuResponse, (emotion) => {
                var waifuExpression = helpers.emotion2ModelExpression(emotion);
                model.internalModel.motionManager.expressionManager.setExpression(waifuExpression);
                synthesizer.speak(waifuResponse, emotion);
            });
        });
    }

    getInteraction(callback);
}

(async function main() {
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        resizeTo: window
    });

    const model = await PIXI.live2d.Live2DModel.from(modelURL);
    model.internalModel.motionManager.groups.idle = 'Idle';
    app.stage.addChild(model);

    if (AZURE_POSSIBLE) {
        ttsFactory = TextToSpeechSynthesizerFactory.Azure(model, "en-US", voice, subscriptionKey, serviceRegion);
    } else if ('speechSynthesis' in window) {
        ttsFactory = TextToSpeechSynthesizerFactory.JS(model, "en", voice);
    } else {
        ttsFactory = TextToSpeechSynthesizerFactory.Dummy();
    }

    function resizeWaifu() {
        model.scale.set(window.innerHeight / 1280 * .8);
        model.x = (window.innerWidth - 500) / 2;
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
