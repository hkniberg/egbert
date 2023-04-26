# Egbert
A sarcastic gpt-based chat bot

![](docs/egbert.png)

# How to set up your environment

- Make sure you have a reasonably fresh version of nodejs
- Copy `.env.example` to `.env` and update it with the correct keys.
- `npm install`
- `npm install -g typescript`
- `npm install -g ts-node`

# How to run

- `npm start`

This will run `src/main.ts`.
That's a typescript file, but the module ts-node will magically auto-compile it to javascript on the fly.