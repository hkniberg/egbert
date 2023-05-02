# Egbert
A sarcastic gpt-based chat bot. 

Actually no, its a platform where you can define your own gpt-based bots, give them memories, and have them
talk on Discord and Minecraft and (hopefully in the future) other platforms.

But Egbert was the first bot here and he won't let you forget it.

![](docs/egbert.png)

# How to set up your environment

- Make sure you have a reasonably fresh version of nodejs
- `npm install`
- `npm install -g typescript`
- `npm install -g ts-node`

# How to configure
- Copy `config.example.json` to `config.json`, and edit it to your liking.

# How to run

- `npm start`

This will run `src/main.ts`.
That's a typescript file, but the module ts-node will magically auto-compile it to javascript on the fly.