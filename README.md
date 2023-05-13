# Egbert
A sarcastic gpt-based chat bot. 

Actually no, its a platform where you can define your own gpt-based bots,
give them personalities and memories,
and have them talk on Discord, Minecraft, and places.

But Egbert was the first bot here and he won't let you forget it.

![](docs/egbert.png)

Here are some silly examples from Minecraft and Discord.

![examples.png](docs/examples.png)

# Getting started

## How to install
Make sure you have a reasonably fresh version of nodejs, then run:
- `npm install`

## How to get your first echobot working
You can check that it works by running a sample configuration that just has a console-based echobot.
- `npm start config/examples/echobot.json5`

Then, in the console, type `hello echobot` and it should reply.

# How to create bot that uses GPT

- Get an OpenAI API key at `https://platform.openai.com/account/api-keys`
  If you don't already have an OpenAI account you will need to create one.
- Copy 'config/examples/config.echobot.json5' to 'config/config.json5'
- Replace `YOUR_API_KEY_HERE` with your OpenAI API key.
- Run it! `npm start` (it uses config/config.json5 by default, but you can specify another file like above)

# Development tips

- `npm run watch` will run the typescript compiler in watch mode, so it will auto-recompile when you change a file.
