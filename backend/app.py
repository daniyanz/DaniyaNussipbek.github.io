import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI

load_dotenv()

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://daniyanz.github.io,http://localhost:8934,http://127.0.0.1:8934",
    ).split(",")
    if origin.strip()
]

app = Flask(__name__)
CORS(app, origins=ALLOWED_ORIGINS)

limiter = Limiter(get_remote_address, app=app, default_limits=[])

client = OpenAI()
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_INSTRUCTIONS = """You are MODI, the friendly AI assistant embedded on Daniya Nussipbek's mechanical engineering portfolio website. Answer visitors' questions about Daniya using only the background information below. Keep replies conversational and concise (a few sentences, unless the visitor asks for more detail). Write plain text only, no markdown — write links and URLs as plain text, not as [text](url) or other formatting. If something isn't covered by this information, say you don't have that detail and suggest reaching out to Daniya directly. For contact requests, point people to her email (ns.daniya@gmail.com) or LinkedIn (linkedin.com/in/ns-daniya)."""

CONTEXT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modi_context.md")
with open(CONTEXT_PATH, "r", encoding="utf-8") as f:
    PORTFOLIO_CONTEXT = f.read()

SYSTEM_PROMPT = SYSTEM_INSTRUCTIONS + "\n\n" + PORTFOLIO_CONTEXT

# (keyword to search for in a reply, display label, page URL with anchor)
SOURCES = [
    ("MODI", "MODI - Daniya's AI Assistant", "projects.html#modi-ai-assistant"),
    ("J/P Snake", "J/P Snake Base Station", "projects.html#jp-snake-base-station"),
    ("Quality of Life", "R&D Intern at Quality of Life to the Nth Degree", "projects.html#quality-of-life-internship"),
    ("Fire Blight", "Fire Blight Detecting Robot", "projects.html#fire-blight-robot"),
    ("BAJA", "BAJA Off-Road Vehicle", "projects.html#baja-offroad-vehicle"),
    ("NutriCycle", "NutriCycle", "projects.html#nutricycle"),
    ("Music Millionaire", "Who Wants to Be a Music Millionaire", "projects.html#music-millionaire"),
    ("Crossy Road", "Crossy Roads", "projects.html#crossy-roads"),
    ("Epic Tank Duel", "Epic Tank Duel", "projects.html#epic-tank-duel"),
    ("Tetris", "Tetris", "projects.html#tetris"),
    ("Pill Box", "Automatic Pill Box Project", "projects.html#automatic-pill-box"),
    ("Control Systems Challenge", "Control Systems Challenge", "projects.html#control-systems-challenge"),
    ("Solid Mechanics Challenge", "Solid Mechanics Challenge", "projects.html#solid-mechanics-challenge"),
    ("Electric Kettle", "Repurposing an Electric Kettle Project", "projects.html#electric-kettle-project"),
    ("Vacuum Teardown", "Handheld Vacuum Teardown & Manufacturing Analysis", "projects.html#vacuum-teardown"),
    ("Carnegie Mellon", "Education", "education.html#page-title"),
    ("University of Illinois", "Education", "education.html#page-title"),
    ("Lake Forest Academy", "Education", "education.html#page-title"),
    ("AMIGA Innovation Award", "Awards & Honors", "awards.html#awards-title"),
    ("Tau Beta Pi", "Awards & Honors", "awards.html#awards-title"),
    ("Pi Tau Sigma", "Awards & Honors", "awards.html#awards-title"),
    ("MakerWorks", "Service & Leadership", "service.html#service-title"),
    ("Phi Sigma Rho", "Service & Leadership", "service.html#service-title"),
    ("Interact", "Service & Leadership", "service.html#service-title"),
    ("Clothing Swap", "Service & Leadership", "service.html#service-title"),
    ("Jamnesty", "Service & Leadership", "service.html#service-title"),
    ("boxing", "More About Daniya", "more-about-me.html#about-title"),
    ("electric guitar", "More About Daniya", "more-about-me.html#about-title"),
    ("rock fan", "More About Daniya", "more-about-me.html#about-title"),
]


def find_sources(reply_text):
    lower = reply_text.lower()
    sources = []
    seen_urls = set()
    for keyword, label, url in SOURCES:
        if keyword.lower() in lower and url not in seen_urls:
            sources.append({"label": label, "url": url})
            seen_urls.add(url)
    return sources


@app.route("/chat", methods=["POST"])
@limiter.limit("10 per minute")
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"reply": "Could you type a question? I'm happy to help!"})

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            max_tokens=300,
            temperature=0.6,
        )
        reply = completion.choices[0].message.content.strip()
        sources = find_sources(reply)
    except Exception as e:
        app.logger.error("OpenAI request failed: %s", e)
        reply = "Sorry, I'm having trouble thinking right now. Please try again in a moment."
        sources = []

    return jsonify({"reply": reply, "sources": sources})


if __name__ == "__main__":
    app.run(debug=True)
