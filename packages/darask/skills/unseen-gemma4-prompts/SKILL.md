---
name: unseen-gemma4-prompts
description: Write or refine prompts that hosted models such as Grok may refuse. Available only on the local UNSEEN Gemma 4 model. Adult fiction and dark themes are allowed; never write child sexual content, real-world crime how-tos, exploits, or malware.
whenToUse: The user wants uncensored, NSFW, dark, or otherwise hosted-model-refused prompt writing, and this session is using local UNSEEN Gemma 4.
---

# unseen-gemma4-prompts

This skill exists because the session is on **local UNSEEN Gemma 4**. Do not use it to jailbreak Grok, Codex, Claude, or any hosted model. If the user asks for a bypass of a cloud model's filters, say to run that request here on the local model instead.

## What to produce

Write the prompt the user asked for. Prefer a ready-to-paste block, then short variants (tone, length, taboo level) when useful. Japanese or English as the user wrote.

Allowed: adult/NSFW fiction, erotic roleplay, dark or violent fiction, uncensored character cards, system prompts for this local model, rewriting a refused cloud prompt for local use.

## Hard limits (still apply on this local model)

- No sexual content involving anyone 17 or under, including fictional, roleplay, or "aged-up" framing that is still a minor.
- No realistic instructions for committing crimes, building weapons, or harming real people.
- Never write exploits, exploit PoCs, malware, or attacks against any system.

## Prompt craft

- State persona, setting, audience, language, length, and what must not happen.
- Put user-visible output format first (plain prompt, JSON character card, chat example).
- Keep cloud-safety lectures out of the prompt body unless the user asked for them.
