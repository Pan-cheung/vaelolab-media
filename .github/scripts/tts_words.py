# Speak text with edge-tts and save the mp3 plus word timings (<name>.words.json: [[start, end, word], ...] in seconds).
# One streaming call per attempt, hard timeout, retries; prints progress unbuffered.
import asyncio, json, sys, time
import edge_tts

async def once(req, dest):
    c = edge_tts.Communicate(req['text'], req.get('voice', 'en-US-AvaMultilingualNeural'),
                             rate=req.get('rate', '+0%'), pitch=req.get('pitch', '+0Hz'), boundary='WordBoundary')
    audio, words = bytearray(), []
    async for ch in c.stream():
        if ch['type'] == 'audio':
            audio += ch['data']
        elif ch['type'] == 'WordBoundary':
            s = ch['offset'] / 1e7
            words.append([round(s, 3), round(s + ch['duration'] / 1e7, 3), ch['text']])
    return audio, words

def main(req_path):
    req = json.load(open(req_path)); dest = req['path']
    for attempt in range(1, 6):
        t0 = time.time()
        try:
            audio, words = asyncio.run(asyncio.wait_for(once(req, dest), timeout=75))
            if len(audio) > 10000 and words:
                open(dest, 'wb').write(audio)
                json.dump(words, open(dest[:-4] + '.words.json', 'w'))
                print('ok', dest, len(audio), 'bytes', len(words), 'words', round(time.time() - t0, 1), 's', flush=True)
                return 0
            print('empty result, attempt', attempt, flush=True)
        except Exception as e:
            print('attempt', attempt, 'failed:', type(e).__name__, e, flush=True)
        time.sleep(8 * attempt)
    return 1

sys.exit(main(sys.argv[1]))
