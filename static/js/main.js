const modelURL =
    "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json";

/**
 * Siri sound. There is a delay between when you tap and when it starts transcripting. 
 * This sound helps make people wait for it to start transcripting.
*/
const startListeningAudioElement = new Audio("static/media/startListening.mp3");

var $name_label, $transcription;

var disabled = true;

const username = getURLParam("username") || "hackdaddy8000";
const waifuName = getURLParam("name") || "Goku 3";
const promptBase = getURLParam("prompt")
    || `You are a smug girl. You enjoy belittling people. 
    You love pointing out how much smarter you are than everyone. 
    You are currently hiding in your basement from the feds. 
    The feds are after you due to various cyber crimes. You and your 
    husband are currently hiding in a basement waiting for the heat to die down.`;
const voice = getURLParam("voice") || "ja-JP-NanamiNeural";

const openAIKey = getURLParam("openai");
if (openAIKey == null) {
    alert("No OpenAI API key provided");
}

const subscriptionKey = getURLParam("speech_key");
const serviceRegion = getURLParam("speech_region");
if (subscriptionKey == null || serviceRegion == null) {
    alert("No Azure speech key or service region");
}
const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
speechConfig.speechRecognitionLanguage = "en-US";
const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

var recognizer;
var synthesizer;

const interactions = [];
function buildPrompt(newPrompt) {
    return promptBase + interactions.join("\n") + "\nMe:" + newPrompt + "\nYou: ";
}
function pushInteraction(prompt, response) {
    if (interactions.length > 12) {
        interactions.shift();
    }
    interactions.push(`Me: ${prompt}\nYou: ${response}`)
}

function interact(synthesizer, userAction, onResults, onStartTalking) {
    const visemeAcc = [];
    synthesizer.visemeReceived = function (s, e) {
        visemeAcc.push(e);
    };

    var prompt = buildPrompt(userAction);
    openAIAPICompletionReq(openAIKey, prompt, function (response) {
        pushInteraction(userAction, response);
        disabled = false;

        $name_label.text(waifuName);
        $transcription.text(response);

        // Try get emotion
        emotionAnalysis(openAIKey, response, (emotion) => {
            var data = {
                "response": response,
                "emotion": emotion,
            };
            onResults(data);

            var ssml = createSsml(response, voice, emotion);
            // Text to speech
            synthesizer.speakSsmlAsync(
                ssml,
                function (result) {
                    if (result.reason === SpeechSDK.ResultReason.Canceled) {
                        console.log("synthesis failed. Error detail: " + result.errorDetails + "\n");
                    }
                    onStartTalking(visemeAcc);
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

function voiceEvent(onStartListening, onLoading, onResults, onStartTalking) {
    if (disabled) {
        return;
    } else {
        disabled = true;
    }
    startListeningAudioElement.play();
    $transcription.text("Listening...");
    $name_label.text(username + ":");

    onStartListening();

    synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    recognizer.recognizing = (s, e) => {
        $transcription.text(e.result.text);
    };

    // Start listening
    recognizer.recognizeOnceAsync(
        function (result) {
            onLoading()
            $transcription.text(result.text);

            interact(synthesizer, result.text, onResults, onStartTalking);

            recognizer.close();
            recognizer = undefined;
        },
        function (err) {
            disabled = false;
            $transcription.text(err);
            window.console.log(err);

            recognizer.close();
            recognizer = undefined;
        });
};

(async function main() {
    $('.overlay').delay(1500).fadeOut(800);

    $name_label = $('#nametag');
    $transcription = $('#transcription');

    if (!!window.SpeechSDK) {
        SpeechSDK = window.SpeechSDK;
        disabled = false;
        console.log("Speech enabled");
    }

    // Waifu stuff

    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        resizeTo: window
    });

    const model = await PIXI.live2d.Live2DModel.from(modelURL);

    model.internalModel.motionManager.groups.idle = 'Idle';

    app.stage.addChild(model);

    model.scale.set(0.5);
    model.x = -100;

    $transcription.click(function () {
        voiceEvent(function () {
            model.internalModel.motionManager.expressionManager.setExpression(0);
        }, function () {

        }, function (data) {
            var emotion = data["emotion"];
            model.internalModel.motionManager.expressionManager.setExpression(emotion2ModelExpression(emotion));
        }, function (visemes) {
            // Makes her mouth move according to the visemes
            var start = Date.now();
            for (let e of visemes) {
                setTimeout(() => {
                    setViseme(model, e.visemeId)
                }, e.audioOffset / 10000 - (Date.now() - start));
            }
        })
    });

    model.on('hit', (hitAreaNames) => {
        if (disabled) {
            return;
        } else {
            disabled = true;
        }
        synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
        const visemeAcc = [];
        synthesizer.visemeReceived = function (s, e) {
            visemeAcc.push(e);
        };
        $name_label.text(username + ":");
        let poke = `*pokes your ${hitAreaNames[0]}*`;
        $transcription.text(poke);
        interact(synthesizer, poke,
            function (data) {
                var emotion = data["emotion"];
                model.internalModel.motionManager.expressionManager.setExpression(emotion2ModelExpression(emotion));
            }, function (visemes) {
                // Makes her mouth move according to the visemes
                var start = Date.now();
                for (let e of visemes) {
                    setTimeout(() => {
                        setViseme(model, e.visemeId)
                    }, e.audioOffset / 10000 - (Date.now() - start));
                }
            }
        );
    });
})();
