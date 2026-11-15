# Speak text with edge-tts and save the mp3 plus word timings (<name>.words.json: [[start, end, word], ...] in seconds).
import asyncio, json, sys
import edge_tts

async def main(req_path):
    req = json.load(open(req_path))
    dest = req['path']
    c = edge_tts.Communicate(req['text'], req.get('voice', 'en-US-AvaMultilingualNeural'),
                             rate=req.get('rate', '+0%'), pitch=req.get('pitch', '+0Hz'), boundary='WordBoundary')
    words = []
    with open(dest, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                s = ch['offset'] / 1e7
                words.append([round(s, 3), round(s + ch['duration'] / 1e7, 3), ch['text']])
    json.dump(words, open(dest[:-4] + '.words.json', 'w'))

asyncio.run(main(sys.argv[1]))
