#!/usr/bin/env sh
npm install

# this cryptic command will run the chat server, let you interact with the console, and also log to file
npm start 2>&1 | tee egbert.log
