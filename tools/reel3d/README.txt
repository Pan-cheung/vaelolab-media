3D REEL BUILDER (three.js scenes rendered frame by frame in headless Chromium, 1080x1920, 30 fps, h264 + aac)

Setup (once per session)
  Clone Pan-cheung/vaelolab to /home/claude/vaelolab (logo-dark-animated.svg and fonts/jost-latin-wght-normal.woff2 come from there).
  cd /home/claude/vaelolab-media/tools/reel3d && npm i --no-save three@0.170.0
  python3 -c "import playwright, PIL" (install with pip --break-system-packages and "playwright install chromium" only if missing)

Voiceover with word timings
  In vaelolab-media write incoming/tts-<name>.json:
  {"text": "<script>", "voice": "en-US-AvaMultilingualNeural", "rate": "+12%", "pitch": "+3Hz", "path": "social/YYYY-MM/vo-<name>.mp3", "words": true}
  Push it; the TTS workflow commits the mp3 and <name>.words.json (usually within 2 minutes).

Config (see cfg-news-example.json, a real 45 second news Reel)
  slug, mp3, words, out: absolute paths
  text: the exact script (punctuation is copied onto the timed words, captions are built from it)
  scene_js: scene_news.js for any news story (official image on a floating slab, sticker chips, big number cards)
            other scenes: scene_register.js, scene_tax.js, scene_receipts.js, scene_voice.js, scene_cafe.js
  hook: 3 to 6 words shown from frame 0, gold part in *stars*
  beats: top cards, each {n (optional), q, a (optional), t0: "@first words of the sentence", ta: "@words where the answer is spoken"}
  cta_at: "Send this" (the words where the final send line starts); cta: text with <b>gold</b>
  scene for scene_news.js: image (absolute path), chips [{at, text}] x3, cards [{at, big (max 8 chars), label}] x3 to 5
  Every "@phrase" must be words that appear in the script, in order.

Render
  Stills first:  python3 build2.py /tmp/reel.json 0,8,16,24,32,40   -> /tmp/sheet-<slug>.jpg (look at it)
  Full render:   nohup python3 build2.py /tmp/reel.json > /tmp/reel.log 2>&1 &   (about 15 to 25 minutes for 45 to 60 s)

Standards (Pan, Nov 15 2026)
  45 to 60 seconds, 120 to 150 word script, full content, never one or two lines.
  Captions: one whole sentence at a time (long ones split at a comma, max 12 words), shown in sync with the voiceover and held until the next one starts, words light up as they are spoken. Never choppy.
  Top text sits at 230 px and must never cover the 3D; captions at 1400 px.
  No logo at the start; gold animated logo outro at the end. First frame already moving with the hook on screen.
  Keep any two 3D surfaces at least 0.03 apart (z fighting makes things blink).
