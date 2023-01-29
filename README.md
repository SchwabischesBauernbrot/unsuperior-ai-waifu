# unsuperior-ai-waifu

Neuro-sama knockoff that runs completely in your browser. Should run on anything, but the page layout is janky on anything but a mobile phone.

## How to use
[See article for easy way](https://hackdaddy.dev/blog/unsuperior-ai-waifu/)
You need to give the page a bunch of API keys to use through GET variables.
| GET Param     |                                                                                                                                       | Required? |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------|-----------|
| openai        | Your OpenAI API key                                                                                                                   | yes       |
| speech_key    | Your Microsoft Azure speech key                                                                                                       | yes       |
| speech_region | Your Microsoft Azure speech region                                                                                                    | yes       |
| username      | Your name (Purely cosmetic)                                                                                                           | no        |
| name          | your waifu's name                                                                                                                     | no        |
| prompt        | The base prompt that will be used when generating your waifu's dialogue. It should be a description of her, how she acts, talks, etc. | no        |
