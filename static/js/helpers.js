function emotion2SsmlStyle(emotion) {
    var style;
    if (emotion == null) {
        style = "General";
    } else {
        const emotionToSsmlStyleMap = {
            "neutral": "General",
            "anger": "Angry",
            "disgust": "Unfriendly",
            "fear": "Terrified",
            "joy": "Excited",
            "sadness": "Sad",
            "surprise": "Excited"
        };
        style = emotionToSsmlStyleMap[emotion]
    }
    return style;
}

/**
 * https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/speech-synthesis-markup
 * SSML stands for Speech Synthesis Markup Language. It is used with Azure's text to speech API to define
 * aspects about how you want the speech output to be like. For example, there are different voices (Jenny, Jane, John, etc).
 * You can use SSML to choose which voice. This helper method just formats certain variables into a proper SSML string.
 * @param {string} response What you want her to say
 * @param {string} name Voice name (see Azure demo)
 * @param {string} style Voice style (see Azure demo) 
 * @returns 
 */
function createSsml(response, name, emotion) {
    var style = emotion2SsmlStyle(emotion);
    return `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">
                    <voice name="${name}">
                        <mstts:viseme type="FacialExpression"/>
                        <mstts:express-as style="${style}" >
                            <prosody pitch="15%">
                                ${response}
                            </prosody>
                        </mstts:express-as>
                    </voice>
                </speak>`;
}

/**
 * In the URL, there are parameters ex: https://hackdaddy.dev?PARAM_NAME=PARAM_VALUE.
 * This function helps get those params.
 * @param {string} key PARAM_NAME 
 * @returns PARAM_VALUE
 */
function getURLParam(key) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(key)
}

/**
 * https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/how-to-speech-synthesis-viseme?tabs=visemeid&pivots=programming-language-javascript#map-phonemes-to-visemes
 * The Azure TTS API tells us what the shape of the mouth should be at certain points in time. That shape is called a viseme.
 * This function takes the Waifu model and the viseme and makes her mouth that shape.
 * @param {*} model Waifu model
 * @param {*} v visemeID
 */
function setViseme(model, v) {
    const visemeMap = [[1, 0], [1, 1], [1, 1], [.3, .7], [1, .3], [1, .3], [1, .1], [.1, .1], [.3, .5], [1, .8], [.2, 2], [1, 1], [1, .2], [.3, .3], [.9, .2], [1, .1], [.1, .1], [1, .3], [1, .05], [1, .3], [1, .6], [1, 0]];
    model.internalModel.coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', visemeMap[v][1] ?? 0);
}

/**
 * 
 * @param {string} emotion output from text2emotion
 * @returns index of the appropriate expression for the emotion
 */
function emotion2ModelExpression(emotion) {
    const emotionMap = {
        "neutral": 0,
        "anger": 1,
        "disgust": 2,
        "fear": 3,
        "joy": 4,
        "sadness": 5,
        "surprise": 6
    };
    return emotionMap[emotion];
}

function openAIAPICompletionReq(key, prompt, callback) {
    $.ajax({
        url: 'https://api.openai.com/v1/completions',
        type: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
        },
        data: JSON.stringify({
            'model': 'text-davinci-003',
            'prompt': prompt,
            'temperature': 0.8,
            'max_tokens': 70
        }),
        success: function (data) {
            callback(data.choices[0].text);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus, errorThrown);
            callback(null);
        },
    });
}