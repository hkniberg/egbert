# Egbert
A sarcastic gpt-based chat bot. 

Actually no, its a platform where you can define your own gpt-based bots, give them memories, and have them
talk on Discord and Minecraft and (hopefully in the future) other platforms.

But Egbert was the first bot here and he won't let you forget it.

![](docs/egbert.png)

# How to install
Make sure you have a reasonably fresh version of nodejs, then run:
- `npm install`

You can check that it works by running a sample configuration that just has a console-based echobot.
- `npm start config/config.example.simple.json5`

Then type `hello echobot` and check that you get a response.

# How to configure
- Copy `config.example.json5` to `config.json5`, and edit it to your liking.

# How to run
- `npm start`

This will run `src/main.ts`
That's a typescript file, but the module ts-node will (hopefully) magically auto-compile it to javascript on the fly.

By default it will load `config/config.json5` (which you need to create, see above).
You can specify a different config file to use, for example:
- `npm start config/config.example.simple.json5`
