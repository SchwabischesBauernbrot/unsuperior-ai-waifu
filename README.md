# unsuperior-ai-waifu

Neuro-sama knockoff that runs completely in your browser. Should run on anything, but the page layout is janky on anything but a mobile phone.

## Features

* Completely free with given free credits.
* Easy to run.
* You can interact with her by poking her. I wouldn't recommend it though.
* The mouths of normal VTubers, neurosama move based on the volume of their speech. USAW's mouth movements are more accurate because they're based off the phonetic sound she's making. Works, but WIP
* She has various expressions that change depending on her emotion
* Choose her accent
* She has emotional voices (she can sound happy, sad, etc)

## How to use

[See article for detailed guide on how to set this up](https://hackdaddy.dev/blog/unsuperior-ai-waifu/)

Open the index.html file in your modern browser OR use [this link](https://hackdaddy.dev/unsuperior-ai-waifu)

You need to pass some paraemters to the page through GET variables in the URL.

| GET Param     |                                                                          | Required? |
|---------------|--------------------------------------------------------------------------|-----------|
| openai        | Your OpenAI API key                                                      | yes       |
| speech_key    | Your Microsoft Azure speech key                                          | no        |
| speech_region | Your Microsoft Azure speech region                                       | no        |
| username      | Your name (Purely cosmetic)                                              | no        |
| name          | your waifu's name                                                        | no        |
| prompt        | The base prompt that will be used when generating your waifu's dialogue. | no        |
| voice         | Voice for TTS. Depends on whether or not you use Azure. See blog.        | no        |
| model         | live2D model + metadata. See `/models.json`                              | no        |
