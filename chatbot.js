(function () {
  var SUGGESTIONS = [
    "What is Daniya's most recent project?",
    "What skills did Daniya gain from her recent project?",
    "Has Daniya worked with ROS?",
    "Can I schedule a meeting with her?"
  ];

  var WELCOME =
    "Hi, I'm MODI — Daniya's AI assistant. Ask me about her projects, skills, or how to get in touch.";

  var CLOSE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var SEND_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>';

  function waveRobotSvg(id) {
    return (
      '<svg id="' + id + '" viewBox="0 -6 40 40" fill="none" aria-hidden="true">' +
      '<line x1="20" y1="4" x2="20" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="20" cy="3" r="2" fill="currentColor"/>' +
      '<rect x="9" y="9" width="22" height="18" rx="7" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="16" cy="18" r="2" fill="currentColor"/>' +
      '<circle cx="24" cy="18" r="2" fill="currentColor"/>' +
      '<path d="M15 22.5c1.6 1.6 7.8 1.6 9.4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<line x1="31" y1="20" x2="35" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<g class="modi-robot-arm"><line x1="9" y1="20" x2="4" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>' +
      "</svg>"
    );
  }
  var ROBOT_WAVE_ICON = waveRobotSvg("modi-robot-wave");

  var TOGGLE_ROBOT_ICON =
    '<svg viewBox="0 0 32 26" fill="none" aria-hidden="true">' +
    '<g class="modi-toggle-antenna">' +
    '<line x1="16" y1="4" x2="16" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="16" cy="2" r="2" fill="currentColor"/>' +
    "</g>" +
    '<rect x="5" y="8" width="22" height="18" rx="7" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="12" cy="17" r="2" fill="currentColor"/>' +
    '<circle cx="20" cy="17" r="2" fill="currentColor"/>' +
    '<path d="M12.5 21c1.6 1.6 5.4 1.6 7 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    "</svg>";

  var ROBOT_THINK_ICON =
    '<svg id="modi-robot-think" viewBox="0 -6 40 40" fill="none" aria-hidden="true" hidden>' +
    '<line x1="20" y1="4" x2="20" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="20" cy="3" r="2" fill="currentColor" opacity=".6"/>' +
    '<rect x="9" y="9" width="22" height="18" rx="7" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M14 18.6c1-1.4 3-1.4 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M22 18.6c1-1.4 3-1.4 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<line x1="17" y1="23" x2="23" y2="23" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<line x1="31" y1="20" x2="35" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<line x1="9" y1="20" x2="5" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<circle class="modi-dot modi-dot-1" cx="33" cy="6" r="1.6" fill="currentColor"/>' +
    '<circle class="modi-dot modi-dot-2" cx="37" cy="9" r="1.3" fill="currentColor"/>' +
    '<circle class="modi-dot modi-dot-3" cx="30" cy="2" r="1" fill="currentColor"/>' +
    "</svg>";

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function init() {
    var widget = el("div", { id: "modi-widget", "data-open": "false" });

    var toggle = el(
      "button",
      { id: "modi-toggle", type: "button", "aria-label": "Open MODI, Daniya's AI Assistant" },
      TOGGLE_ROBOT_ICON + "<span>MODI</span>"
    );

    var panel = el("div", { id: "modi-panel", role: "dialog", "aria-label": "MODI chat" });

    var header = el(
      "div",
      { id: "modi-header" },
      '<div id="modi-header-main">' +
        '<div id="modi-robot">' + ROBOT_WAVE_ICON + ROBOT_THINK_ICON + "</div>" +
        '<div id="modi-header-text">' +
        '<p id="modi-header-title">MODI — Daniya’s AI Assistant</p>' +
        "</div>" +
        "</div>"
    );
    var closeBtn = el(
      "button",
      { id: "modi-close", type: "button", "aria-label": "Close chat" },
      CLOSE_ICON.replace("<svg", '<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"')
    );
    header.appendChild(closeBtn);
    var robotWaveEl = header.querySelector("#modi-robot-wave");
    var robotThinkEl = header.querySelector("#modi-robot-think");

    var body = el("div", { id: "modi-body" });
    body.appendChild(el("div", { class: "modi-msg modi-msg-bot" }, escapeHtml(WELCOME)));

    var suggestions = el("div", { id: "modi-suggestions" });
    SUGGESTIONS.forEach(function (question) {
      var btn = el("button", { class: "modi-suggestion", type: "button" }, escapeHtml(question));
      btn.addEventListener("click", function () {
        sendMessage(question);
      });
      suggestions.appendChild(btn);
    });
    body.appendChild(suggestions);

    var inputRow = el("div", { id: "modi-input-row" });
    var input = el("input", {
      id: "modi-input",
      type: "text",
      placeholder: "Ask MODI a question…",
      autocomplete: "off"
    });
    var sendBtn = el(
      "button",
      { id: "modi-send", type: "button", "aria-label": "Send message" },
      SEND_ICON.replace("<svg", '<svg fill="currentColor"')
    );
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    var hasSentFirstMessage = false;

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(inputRow);

    widget.appendChild(toggle);
    widget.appendChild(panel);
    document.body.appendChild(widget);

    function openPanel() {
      widget.setAttribute("data-open", "true");
      input.focus();
    }
    function closePanel() {
      widget.setAttribute("data-open", "false");
      toggle.focus();
    }
    function sendMessage(text) {
      var trimmed = text.trim();
      if (!trimmed) return;
      body.insertBefore(
        el("div", { class: "modi-msg modi-msg-user" }, escapeHtml(trimmed)),
        suggestions
      );
      body.scrollTop = body.scrollHeight;
      input.value = "";
      if (!hasSentFirstMessage) {
        hasSentFirstMessage = true;
        robotWaveEl.hidden = true;
        robotThinkEl.hidden = false;
      }
    }

    toggle.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", closePanel);
    sendBtn.addEventListener("click", function () {
      sendMessage(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && widget.getAttribute("data-open") === "true") closePanel();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
