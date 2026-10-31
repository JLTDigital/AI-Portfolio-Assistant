# Build Plan — Holo Call

High-level features in rough build order. Run `/feature` to spec the next unchecked item.

## Your features

- [x] 1. **Knowledge base loader** - Read every markdown file in `content/` with its front matter, combine them into one context, and warn at build time if it exceeds the token budget.
- [x] 2. **Agent persona & grounding** - A system prompt that makes Agent speak about Jonathan in the third person, answer only from the knowledge base, and handle salary, right-to-work and unknown questions as agreed.
- [x] 3. **Chat API route** - A server-side `/api/chat` endpoint that streams answers from Gemini using the combined context and recent conversation turns.
- [ ] 4. **Provider fallback chain** - Retry on Groq, then OpenRouter, when the primary provider rate-limits, errors or times out.
- [ ] 5. **Abuse protection** - Per-IP rate limiting plus limits on input length and conversation length.
- [ ] 6. **Signal-lost fallback** - A pre-written, in-call "signal lost" message linking to the portfolio and LinkedIn, shown when allowances run out or every provider fails.
- [ ] 7. **Chat interface** - A message transcript, an input box and streamed "holo transmission" text, responsive from mobile to desktop.
- [ ] 8. **Suggested questions** - Clickable starter chips that send common recruiter questions.
- [ ] 9. **Scene backdrop** - A near-black CSS backdrop with a faint grid, scanlines and vignette, plus a readability gradient behind the chat.
- [ ] 10. **Agent blob avatar** - Nyx UI Morphing Blob as Agent, with idle, ringing, thinking, speaking and signal-lost states; loaded in the browser only, with mobile, reduced-motion and no-WebGL fallbacks.
- [ ] 11. **Incoming call intro** - Caller card reading "Agent", Accept button, connecting glitch and the Agent blob materialising, before handing off to the chat.
- [ ] 12. **Intro controls** - A Skip button, a reduced-motion version, and remembering returning visitors so they go straight to the chat.
- [ ] 13. **End call** - Collapse the call and reset the conversation, then show contact links.
- [ ] 14. **Contact links bar** - Persistent links to download the CV, LinkedIn, the portfolio and email.
- [ ] 15. **Call sounds** - Optional ring and connect tones, muted by default, with a toggle.
- [ ] 16. **Accessibility & mobile pass** - Keyboard use, screen-reader-friendly transcript, contrast checks and no harsh flashing.
- [ ] 17. **Privacy note & share metadata** - A one-line AI privacy note, page metadata, and an Open Graph image of the holo-call card for LinkedIn previews.
- [ ] 18. **Health check** - An `/api/health` endpoint reporting app status and whether each provider can be reached.
- [ ] 19. **CV import script** - `npm run import:cv` converts an updated .docx or .pdf CV into `content/cv.md` for review.
- [ ] 20. **Portfolio import script** - Fetches the live portfolio site and drafts `content/portfolio.md` for review.
