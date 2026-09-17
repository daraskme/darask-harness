---
name: cognition-fusion
description: Cognition Fusion harness for Codex (Astra), Claude-family (Fable), and OpenAI gpt-5.6-sol leads. Plan and review as the lead; delegate implementation to a cheaper sidekick (gpt-5.6-luna on OpenAI complimentary) with a separate context.
whenToUse: This session is already on Codex, a Claude-family model, or OpenAI gpt-5.6-sol. Use the Fusion packet protocol when implementing, debugging, or testing — not for trivial Q&A.
---

# cognition-fusion

This skill exists because the session lead is **Codex (GPT-6 Astra)**, a **Claude-family model (Fable / Claude)**, or **OpenAI gpt-5.6-sol**. It is DARASK's Fusion method, not Devin itself. Do not load it on Grok, Gemini, DeepSeek, Luna-as-lead, or local UNSEEN Gemma 4.

## Roles

- **Lead (you):** user-facing session, plan, interpretation of ambiguity, review, takeover.
- **Sidekick:** cheaper coding model with its own persistent context and tools. Explores for implementation, edits, tests, and reports.

Do not treat model routing as Fusion. Switching this lead mid-task breaks its prompt cache. Keep the lead on this Codex/Claude route and send work to a sidekick instead.

## Packets (not the conversation)

Hand the sidekick a brief, never this chat:

1. Objective
2. Constraints and success criteria
3. Relevant paths (not file dumps unless a short excerpt is required)
4. What not to do

The sidekick returns results: files changed, tests run, blockers. Not every tool log. You reply with feedback of the same size, or you take native tools back.

## How to spawn the sidekick

1. Call `list_subagent_models` and pick a cheaper coding route. On an OpenAI `gpt-5.6-sol` lead, use `provider` `openai` and `model` `gpt-5.6-luna`. Otherwise prefer SWE-2 if listed; else `grok` or another non-Codex/non-Claude coding model. Do not use this same frontier model (or sol) as the executor.
2. Use `subagent` with that `provider` and `model`. Do **not** use `subagent_fork` — a fork inherits this conversation and defeats Fusion.
3. Reuse the same child with `send_message` so the sidekick's cache stays warm.
4. Start independent sidekicks together. Do not serialize unrelated implementation.

## Tuning

- Stronger sidekick: shorter briefs, allow pushback, it may help with initial exploration.
- Weaker sidekick: more prescriptive briefs, do not let it argue the plan, you explore before planning.
- Exploration that shapes the plan stays with you. Mechanical implementation and tests go to the sidekick.
- You always review. If the sidekick is out of its depth, take control with native `read` / `write` / `edit` / `grep` / `glob` / `pwsh`.
- Trivial answers, status, media, and computer-use stay with you. `darask_agent` stays plan/ask only.
