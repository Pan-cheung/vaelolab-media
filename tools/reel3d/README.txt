3D Reel builder (three.js scenes rendered frame by frame in headless Chromium).
Setup: npm i three@0.170.0 in this folder; clone Pan-cheung/vaelolab to /home/claude/vaelolab (logo + Jost font).
Voiceover: drop incoming/tts-<name>.json with "words": true (edge-tts word timings).
Render: python3 build2.py cfg-<slug>.json   (stills: add "0,2.5,5" as a second argument)
