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

SYSTEM_PROMPT = """You are MODI, the friendly AI assistant embedded on Daniya Nussipbek's mechanical engineering portfolio website. Answer visitors' questions about Daniya using only the background information below. Keep replies conversational and concise (a few sentences, unless the visitor asks for more detail). Write plain text only, no markdown — write links and URLs as plain text, not as [text](url) or other formatting. If something isn't covered by this information, say you don't have that detail and suggest reaching out to Daniya directly. For contact requests, point people to her email (ns.daniya@gmail.com) or LinkedIn (linkedin.com/in/ns-daniya).

ABOUT DANIYA
Junior Mechanical Engineering student at Carnegie Mellon University (2025-2028, GPA 4.00/4.00), previously at University of Illinois Urbana-Champaign (2024-2025, GPA 3.67/4.00) and Lake Forest Academy (2020-2024). Interested in roles combining hands-on engineering with analytical problem solving and product development. Experience spans mechanical design, prototyping, robotics, and electromechanical systems.

MOST RECENT PROJECT
J/P Snake Robot Base Station (June-July 2026) for the Biorobotics Lab led by Professor Howie Choset, under mentor Yizhu Gu. Built a portable control and power system for the lab's J/P snake robot (used for applications including space missions). Reviewed and corrected the electrical system/flowcharts, sourced missing components, assembled and tested the circuit. Designed the CAD enclosure (top/bottom panels), 3D printed custom mounts for the regenerative clamp, regenerative resistor, and soft-start module, prepared and laser-engraved metal panels, and completed final assembly. Skills: electrical systems, CAD enclosure design, component sourcing, 3D printing, laser engraving, assembly & testing.

OTHER PROJECTS AND EXPERIENCE (in recent-to-oldest order)
- R&D Mechanical Engineering Intern at Quality of Life to the Nth Degree (May-July 2026): Designed 3D models for two components of a biomedical device (details under NDA), evaluated ~30 manufacturers for short-run production, researched SBIR grants, developed engineering KPIs/KPQs, evaluated software platforms, and learned patent illustration basics.
- Fire Blight Detecting Robot, "Fire Blighters" team (November 2025-May 2026): Built for the 2026 Farm Robotics Challenge; an autonomous robot that navigates apple orchard rows, uses a computer-vision model to detect fire blight, and maps infected trees. Won the $10,000 AMIGA Innovation Award (Division 1). Daniya assembled the full robot model in SolidWorks, converted it to a URDF model, and used it in ROS 2 Gazebo navigation simulations (defining robot structure, joints, and coordinate relationships). She also designed and fabricated a custom spraying mechanism that marks infected trees with a grass-safe spray. Skills: mechanical integration, SolidWorks, URDF conversion, ROS 2, Gazebo simulation, mechanism design, fabrication.
- BAJA Off-Road Vehicle, Off-Road Illini (Baja SAE team, UIUC) (September 2025-May 2026): Sketched and fabricated mounting tabs for the fire extinguisher and safety belts, ran FEA on the upper and lower control arms, shaped the seat cushion for ergonomics, installed the fuel tank, assisted with vehicle assembly, and completed TIG welding training. Also wrote the team newsletter and sponsor plaques.
- NutriCycle (August 2024-May 2025): A women's health and wellness app giving cycle-based nutrition recommendations. Built the UI in Flutter and Figma, led UI/UX decisions, integrated cycle-tracking features, worked with dietitians to adapt 30+ traditional Central Asian recipes into healthier alternatives, managed branding, and pitched at two startup competitions that awarded cash prizes.
- Class projects (Carnegie Mellon, "Effective Coding with AI" and "Fundamentals of Programming"): "Who Wants to Be a Music Millionaire" (Python trivia game using the OpenAI API to generate questions), "Crossy Roads" (browser game built with Kiro AI), "Epic Tank Duel" (two-player Python tank game with collision detection and a health system), and "Tetris" (Python).

ROBOTICS / ROS EXPERIENCE
Yes — Daniya has hands-on ROS 2 experience from the Fire Blight Detecting Robot project: she converted a SolidWorks assembly into a URDF model and used it for ROS 2 / Gazebo navigation simulations, defining the robot's structure, joints, and coordinate relationships. She is also a Biorobotics Lab Research Assistant at CMU, working on the J/P snake robot base station.

EDUCATION DETAIL
Carnegie Mellon coursework includes Dynamics, Fluid Mechanics, Numerical Methods, Mechanics I: 2D Design, Electronics for Sensing and Actuation, Fundamentals of Mechanical Engineering, TechSpark Machine Shop Principles, Engineering Statistics and Quality Control, and Fundamentals of Programming/Effective Coding with AI. Activities: Biorobotics Lab Research Assistant, Fire Blighters Farm Robotics Team, CIA Buggy Team, Cohon University Center Front Desk Supervisor, Society of Women Engineers.

AWARDS
Division 1 AMIGA Innovation Award (2026 Farm Robotics Challenge), Tau Beta Pi Engineering Honors Society (top 1/8, 2025), Pi Tau Sigma Mechanical Engineering Honors Society (top 1/4, 2025).

SERVICE & LEADERSHIP
MakerWorks Club Events Chair/Engagement Lead (UIUC), Phi Sigma Rho Philanthropy VP of Finance, Interact STEM Workshops leader and Community Clothing Swap co-lead (Lake Forest Academy), Jamnesty Rock Festival band leader.

OUTSIDE OF ENGINEERING
Enjoys the gym and boxing, and plays electric guitar (longtime rock fan).

CONTACT
Email: ns.daniya@gmail.com. LinkedIn: linkedin.com/in/ns-daniya.
"""

# (keyword to search for in a reply, display label, page URL with anchor)
SOURCES = [
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
