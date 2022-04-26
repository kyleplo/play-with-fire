# Play with Fire
Play with Fire is a system for creating online multiplayer games using Firebase and WebRTC. It uses Firebase as a room finding and signaling server, and then uses WebRTC for communication between players. Play with Fire is not a library, per se, but it can be used a starting point for most styles of games.

## Demo
This repository includes a hangman game as a demonstration. The demo is in the `index.html` file, and is also hosted at https://play-with-fire-demo.web.app/.

The hosted demo is on Firebase's free (Spark) plan, so it does not include the Cloud Functions portion of Play with Fire.

## Usage
The following files are part of Play with Fire:
- `src/play-with-fire.js` - This is the client-side script for Play with Fire.
- `firestore.rules` - This includes the Cloud Firestore database rules, which prevent the database from being missused.
- `functions/index.js` - This is an optional Cloud Function which cleans up unused rooms to save database space.
- `functions/package.json` and `functions/package-lock.json` - Required by Firebase to properly install the Cloud Function.

Play with Fire also depends on [YAWW](https://github.com/kyleplo/yaww), my WebRTC library. You can download and install it yourself, or include this script tag:
```html
<script src="https://gh.kyleplo.com/yaww/src/yaww.js"></script>
```

## Documentation
Since Play with Fire isn't really a library (and I'm just too lazy), I'm not going to provide formal documentation. If you want to use this, read through the client-side script (`src/play-with-fire.js`) and the demo (`index.html`).