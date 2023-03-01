# unsuperior-ai-waifu

![Demo](doc/demo.gif)

Neuro-sama knockoff that runs completely in your browser. Should run on anything, but the page layout is janky on anything but a mobile phone.

## Features

* Completely free with given free credits.
* Easy to run.
* You can interact with her by poking her. I wouldn't recommend it though.
* The mouths of normal VTubers, neurosama move based on the volume of their speech. USAW's mouth movements are more accurate because they're based off the phonetic sound she's making. Works, but WIP
* She has various expressions that change depending on her emotion
* Choose her accent
* She has emotional voices (she can sound happy, sad, etc)

## Goals

* I want this project to be easy to use by most people. Ideally, all people should have to do is sign up for some websites, get API keys, and fill out the form on my website.
* It should be easy to host for me. This is a bunch of static HTML/CSS/JS files so I can easily host it on GH pages.
* It should be pretty cross-platform. I don't want to have to maintain a bunch of different versions of this for everyone.

## How to use

[If you just want to use this program, use this link](https://hackdaddy.dev/blog/unsuperior-ai-waifu/)

### For Devs

If you want to make changes to the code and test them out, you need to create a web server in order serve the project files. Modern browsers will not allow access to the microphone and other permissions otherwise. It must either be localhost, or through HTTPS from a remote host (no HTTP).

This program takes many parameters as GET parameterss through the URL. Example:

`https://hackdaddy.dev/usaw/?openai=sk-12345&engine=native&model=shizuki&prompt=She%20loves%20me%20even%20though%20I%27m%20not%20funny`

### Parameters

#### Logic

Choose one of the following

| GET Param     |                                                                          |
|---------------|--------------------------------------------------------------------------|
| openai        | Your OpenAI API key                                                      |
| usaws         | URL to USAW server endpoint                                              |

#### Speech

| GET Param     |                                                                          | Required?         |
|---------------|--------------------------------------------------------------------------|-------------------|
| sr-engine     | Speech recognition engine. Choose "azure", "native", or "text" (type).   | default "text"    |
| tts-engine    | Text To Speech Egnine. Choose "azure", "native", or "text" (disabled).   | default "text"    |
| speech_key    | Your Microsoft Azure speech key                                          | if engine="azure" |
| speech_region | Your Microsoft Azure speech region                                       | if engine="azure" |
| voice         | Voice for TTS. Depends on whether or not you use Azure. See blog.        | no                |

#### Customization

| GET Param     |                                                                          | Required? |
|---------------|--------------------------------------------------------------------------|-----------|
| model         | Name of waifu model. See `/models.json`                                  | yes       |
| username      | Your name (Purely cosmetic)                                              | no        |
| name          | your waifu's name                                                        | no        |
| prompt        | The base prompt that will be used when generating your waifu's dialogue. | yes       |

## How to add your own model

This software uses Live2D. It's the same program VTubers use for their avatars.

Available models are defined in `models.json`.

```json
{
    "name": "arbitrary_but_unique_name",
    "description": "Description that shows up on the form on hackdaddy.dev",
    "url": "URL or file path to a .model.json file",
    "kScale": 0.000625, // multiplier to grow or shrink the model to make it fit the screen
    "kXOffset": 1150, // shifts model horizontally. Play around with both these values and see what works.
    "idleMotionGroupName": "Idle",
    "emotionMap": {
        "neutral": 0,
        "anger": 2,
        "disgust": 2,
        "fear": 1,
        "joy": 3,
        "sadness": 1,
        "surprise": 3
    }
},
```

This is what a `.model.json` file looks like:

```json
{
  ...,
  "expressions": [
    {"name": "f01", "file": "expressions/f01.exp.json"},
    {"name": "f02", "file": "expressions/f02.exp.json"},
    {"name": "f03", "file": "expressions/f03.exp.json"},
    {"name": "f04", "file": "expressions/f04.exp.json"}
  ],
  ...
  "motions": {
    "idle": [
      {"file": "motions/idle_00.mtn", "fade_in": 2000, "fade_out": 2000},
      {"file": "motions/idle_01.mtn", "fade_in": 2000, "fade_out": 2000},
      {"file": "motions/idle_02.mtn", "fade_in": 2000, "fade_out": 2000}
    ],
    "tap_body": [
      {"file": "motions/tapBody_00.mtn", "sound": "sounds/tapBody_00.mp3"},
      {"file": "motions/tapBody_01.mtn", "sound": "sounds/tapBody_01.mp3"},
      {"file": "motions/tapBody_02.mtn", "sound": "sounds/tapBody_02.mp3"}
    ],
    ...
  }
}
```

`idleMotionGroup` will play one of the "idle" motions when she idles.
`emotionMap` will show the respective expression when she feels an emotion. For example, if she feels `anger`, she will show the expression at index 2: "f03". Expressions are zero-indexed meaning "f01" is at index 0, "f01" is at index 1, etc.

[This website](https://guansss.github.io/live2d-viewer-web/) gives you a bunch of models that are easy to add. See if there are any you like. Please help me by adding them for me.
