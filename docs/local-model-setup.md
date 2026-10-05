# Local Model Setup (Ollama) — Zero-Cost Development

This lets you run Fydell's AI conversations on your own computer with no API
spending. Nothing here touches paid services or exposes anything publicly.

## First: check what your computer can handle

**On Windows** (PowerShell):
```powershell
# RAM
Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory
# GPU
Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM
# Free disk space
Get-PSDrive C | Select-Object Free
```

**On Mac** (Terminal):
```bash
# RAM
sysctl hw.memsize
# GPU / chip
sysctl machdep.cpu.brand_string; system_profiler SPDisplaysDataType | grep -i "chip\|memory"
# Free disk space
df -h / | tail -1
```

Send me the results and I'll pick the exact model. As a rough guide:

| Your RAM | Model to use | Disk needed | Speed |
|---|---|---|---|
| 16 GB+ | `qwen2.5:7b` (default) | ~5 GB | Good |
| 8 GB | `qwen2.5:3b` or `llama3.2:3b` | ~2 GB | Okay, simpler replies |
| 32 GB+ with GPU | `qwen2.5:14b` | ~9 GB | Better quality |

All of these handle JSON output, which Fydell requires. The default is
`qwen2.5:7b` — strong at structured responses for its size.

## Setup (5 minutes)

1. **Install Ollama:** download from https://ollama.com/download and install.
   During setup, leave "Expose Ollama to the network" **off**. It only needs
   to listen on your own computer.

2. **Pull a model** (Terminal / PowerShell):
   ```
   ollama pull qwen2.5:7b
   ```
   (Or the model I recommend after you send your specs.)

3. **Verify it's running:**
   ```
   ollama list
   curl http://localhost:11434/api/tags
   ```
   Both should respond. If `curl` fails, start Ollama from your applications menu.

4. **Configure Fydell** — in your `.env.local` (next to the repo):
   ```
   MODEL_PROVIDER=ollama
   OLLAMA_MODEL=qwen2.5:7b
   ```

5. **Run Fydell locally** (this part matters):
   ```
   npm run dev
   ```

## Why `npm run dev` is required

Fydell's AI calls run inside the Next.js server, not in your browser. On
fydell.com that server is Vercel's — it cannot reach your computer. When you
run `npm run dev`, the server is *your* computer, so `localhost:11434` resolves
to your Ollama. **Never set `MODEL_PROVIDER=ollama` in Vercel environment
variables** — it will fail there by design.

## Testing it

1. Open `http://localhost:3000` and start a simulation with a coworker conversation.
2. Send the coworker a message. The first reply takes 10–60 seconds on CPU
   (the model loads into memory); later replies are faster.
3. To confirm which provider is active, check the server console — generation
   logs the provider description (never any key).

## What to expect vs. OpenAI

- **Quality:** a 7b local model writes simpler replies than `gpt-4o-mini`. It
  follows the JSON schema (Fydell's validator enforces this regardless), but
  its interpretations are less nuanced.
- **Speed:** 10–60s per reply on CPU, a few seconds on a decent GPU.
- **Memory:** the coordinator, assistance policy, grounding checks, and
  validation are unchanged — only the text generator is swapped.
- **Honesty:** if Ollama isn't running, you get the same honest "teammate
  unavailable" state as before — never a fake reply.

## If something's wrong

| Symptom | Fix |
|---|---|
| "teammate unavailable" | Is Ollama running? Check `curl http://localhost:11434/api/tags` |
| Empty or garbled replies | Model may be too small; try `qwen2.5:7b` |
| Very slow (>2 min) | Model is larger than your RAM allows; drop to a 3b model |
| Works locally, fails on Vercel preview | Expected — Ollama is local-only by design |

## Cost

$0. Ollama is free and open source. Your only cost is electricity and disk space.
Do not sign up for any hosted API tier for this — and note that several hosted
free tiers require users to be 18+.
