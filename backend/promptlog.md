# MODI Chatbot — Prompt Log

A chronological summary of the requests made to the AI assistant (Claude Sonnet 5, via Claude Code) during development of the MODI chatbot feature, and what was done in response. This is a condensed reconstruction of the conversation, not a literal transcript export.

1. **Add a floating MODI chatbot (frontend only)** — Reviewed the site's existing palette/fonts, asked clarifying questions on send-behavior and button style, built `chatbot.css`/`chatbot.js`, wired into all 7 pages.
2. **Pill-shaped button, robot face icon, waving→thinking animation** — Built custom SVG robot icons with CSS keyframe animations; fixed several icon-centering bugs (viewBox math, then a hidden-label margin bug).
3. **Antenna should swing left-right** — Added a CSS keyframe rotation on the antenna.
4. **Remove "Frontend preview" header text** — Removed.
5. **Connect to Flask backend at 127.0.0.1:5000, with error handling** — Wired `fetch()`, a typing indicator, and a friendly fallback message on failure.
6. **What's next?** — Recommended OpenAI integration, then deployment.
7. **Start OpenAI integration** — Extracted real portfolio content, wrote a system prompt, integrated OpenAI's API into `app.py`, set up `.env`/`.gitignore`/`requirements.txt`.
8. **What's next?** — Recommended deploying to Render with rate-limiting/CORS.
9. **Deploy to Render** — Added gunicorn, Flask-Limiter, restricted CORS, `render.yaml`/`Procfile`; walked through Render account/Blueprint setup.
10. **MODI should auto-book meetings on my calendar** — Flagged the spam/security risk of public write-access to a calendar; recommended a Calendly link instead. Agreed, implemented.
11. **Push changes** (recurring) — Committed/pushed frontend and backend changes multiple times; diagnosed and fixed a recurring issue where Render kept redeploying a stale commit (its Build & Deploy branch setting wasn't `main`).
12. **Remove the "schedule a meeting" suggestion bubble** — Removed.
13. **Help prep a homework video about the project** — Drafted a shot-list/narration plan, revised to focus only on the chatbot (not the whole portfolio site).
14. **Make the chat window resizable** — Added a drag handle (top-left corner), min/max bounds, double-click-to-reset, persisted size across page loads.
15. **Suggestion bubbles should move to the top and stop reappearing after each message** — Changed insertion order so suggestions stay pinned right after the welcome message.
16. **Add a citation line ("Built by Claude Sonnet 5 · OpenAI API")** — Added; several rounds diagnosing what turned out to be browser caching of `chatbot.css`/`.js`, fixed with versioned query strings.
17. **Add clickable source links in replies (e.g. linking to the exact project)** — Backend matches known names in MODI's reply and returns links; added anchor `id`s to every project block in `projects.html`; frontend renders them inside the reply bubble.
18. **Remove Calendly (changed my mind)** — Removed from the prompt and contact section.
19. **Make source-linking work for non-project topics too (e.g. hobbies)** — Extended it to Education/Awards/Service/More-About-Me pages.
20. **How does OpenAI actually get my info?** — Explained the static system-prompt mechanism (no live site access); tested examples, found and fixed a real gap (the site was never told it was AI-built).
21. **Why not use RAG instead?** — Explained RAG doesn't help (and can hurt) synthesis for a corpus this small; proposed auto-generating the prompt from HTML as a lighter alternative to manual edits.
22. **Reported a real hallucination** (Tank Duel wrongly credited with AI tools) — Traced to an ambiguous single sentence in the hand-written prompt, not a RAG/architecture issue; fixed by splitting it into two clearly separated groups.
23. **Frustration with editing app.py for every fix** — Moved all bio content out of the Python string into `backend/modi_context.md`, so future corrections are plain-text edits.
24. **Links not appearing / Render deploy confusion** — Diagnosed the live backend was still running old code; found and fixed the actual cause (wrong branch selected in Render's settings).
25. **Conceptual questions** — Clarified the Flask-vs-Render relationship (Render just hosts the Flask app), and what a "system prompt" is.
