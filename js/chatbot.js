/* Hihi Digitizing - Chatbot (works offline with built-in knowledge base;
   optionally upgrades to a real AI via a proxy endpoint, see CONFIG.aiEndpoint) */
(function () {
  "use strict";

  var CONFIG = {
    botName: "Hihi Assistant",
    whatsapp: "923452669812",
    email: "hihidigitizing@gmail.com",
    phone: "+92 345 2669812",
    // Paste your Cloudflare Worker URL here to turn on real AI answers (see worker/README.md).
    // Leave empty to use only the built-in smart FAQ bot.
    aiEndpoint: ""
  };

  var SYSTEM_PROMPT =
    "You are the friendly assistant of Hihi Digitizing Services, an embroidery digitizing and vector art studio in Landhi, Karachi, Pakistan. " +
    "Services: embroidery digitizing (logos, text, designs), raster to vector (vector art for screen printing), 3D puff logos, patch logo digitizing, portrait digitizing. " +
    "Contact: WhatsApp +92 345 2669812, email hihidigitizing@gmail.com. " +
    "Price list (USD): Hats/Beanies/Visors $15, turnaround 2 to 4 hours; Left Chest/Right Chest/Sleeves $15, 2 to 4 hours; Front Chest/Jacket Back $30, 6 to 10 hours; Raster to Vector $15, 4 to 8 hours. " +
    "Only quote these prices. For anything else (portraits, patches, 3D puff, very large or complex designs) do not invent a price, ask them to send artwork on WhatsApp for a quote. " +
    "Reply in the same language as the user (English, Urdu or Roman Urdu). Keep answers under 80 words.";

  var wa = function (text) {
    return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(text);
  };

  var KB = [
    { k: ["hello", "hi", "hey", "salam", "assalam", "aoa", "hola"], a: "Assalam-o-Alaikum! Welcome to Hihi Digitizing Services. How can I help you today?" },
    { k: ["service", "services", "offer", "what do you do", "kya karte", "kaam"], a: "We offer:\n• Embroidery Digitizing\n• Raster to Vector (vector art)\n• 3D Puff Logos\n• Patch Logo Digitizing\n• Portrait Digitizing\n\nTell me what you need and I will guide you." },
    { k: ["hat", "hats", "cap", "caps", "beanie", "beanies", "visor", "visors", "topi"], a: "Hats, Beanies and Visors digitizing is $15, delivered in 2 to 4 hours." },
    { k: ["chest", "sleeve", "sleeves", "left chest", "right chest"], a: "Left Chest, Right Chest and Sleeves digitizing is $15, delivered in 2 to 4 hours." },
    { k: ["jacket", "jacket back", "front chest"], a: "Front Chest and Jacket Back digitizing is $30, delivered in 6 to 10 hours." },
    { k: ["embroidery", "digitizing", "digitising", "dst", "pes", "emb", "stitch", "logo"], a: "We turn logos and artwork into smooth, stitch-ready embroidery files for caps, hoodies, jackets, polos, uniforms and more. Send your artwork and tell us the size and fabric for a free quote." },
    { k: ["vector", "raster", "screen print", "ai file", "eps", "svg", "redraw"], a: "Our vector service converts low-resolution images into clean, scalable vector files (AI/EPS/SVG/PDF) that are perfect for screen printing, vinyl and large-format printing. Price: $15, delivered in 4 to 8 hours." },
    { k: ["3d", "puff", "puffy"], a: "3D puff digitizing is one of our specialities. It gives raised, bold lettering and logos on caps and hoodies. Share your logo and cap/garment type and we will quote you." },
    { k: ["patch", "patches"], a: "We digitize patches for uniforms, promotional items and custom apparel, with clean borders, durable stitching and vibrant results." },
    { k: ["portrait", "photo", "face"], a: "Portrait digitizing turns a photo into a detailed stitched artwork. Send a clear, high-quality photo and the size you want." },
    { k: ["price", "pricing", "cost", "rate", "rates", "charges", "kitna", "qeemat", "kimat", "paisa", "paise", "price list", "dollar"], a: "Our prices:\n• Hats, Beanies, Visors: $15 (2 to 4 hours)\n• Left Chest, Right Chest, Sleeves: $15 (2 to 4 hours)\n• Front Chest, Jacket Back: $30 (6 to 10 hours)\n• Raster to Vector: $15 (4 to 8 hours)\n\nFor 3D puff, patches, portraits or very large designs, send your artwork for an exact quote.", chips: ["Get a free quote", "Turnaround time"] },
    { k: ["time", "turnaround", "delivery", "how long", "fast", "urgent", "kitni der", "kab tak", "deadline", "rush", "hours", "ghante"], a: "Turnaround times:\n• Hats, Beanies, Visors: 2 to 4 hours\n• Left/Right Chest, Sleeves: 2 to 4 hours\n• Front Chest, Jacket Back: 6 to 10 hours\n• Raster to Vector: 4 to 8 hours\n\nFor rush orders, mention it on WhatsApp.", chips: ["Pricing"] },
    { k: ["format", "file", "send", "artwork", "jpg", "png", "pdf", "upload"], a: "You can send artwork as JPG, PNG, PDF or AI. The clearer the image, the better the result. Share it on WhatsApp or by email and mention the final size and garment type." },
    { k: ["revision", "change", "edit", "fix", "correction", "mistake"], a: "If something is not right, tell us and we will review it. Please see our Refund Policy page for full details." },
    { k: ["refund", "money back", "return"], a: "Please read our Refund Policy page (link in the footer) for the full terms. For any specific order issue, message us on WhatsApp." },
    { k: ["contact", "whatsapp", "call", "phone", "number", "email", "mail", "raabta", "rabta"], a: "You can reach us at:\n📱 WhatsApp / Phone: " + CONFIG.phone + "\n✉️ " + CONFIG.email, chips: ["Open WhatsApp"] },
    { k: ["address", "location", "where", "karachi", "landhi", "office", "kahan"], a: "We are located at Majeed Colony, Landhi, Karachi, Pakistan. We serve clients online worldwide." },
    { k: ["payment", "pay", "easypaisa", "jazzcash", "bank", "paypal", "advance"], a: "For payment options, please confirm on WhatsApp when you place your order and we will share the details." },
    { k: ["portfolio", "sample", "work", "example", "gallery", "samples"], a: "You can see our work on the Portfolio page. Want me to take you there?", chips: ["Open Portfolio"] },
    { k: ["thanks", "thank", "shukriya", "shukria", "jazak"], a: "You are welcome! Anything else I can help you with?" },
    { k: ["bye", "goodbye", "allah hafiz", "khuda hafiz"], a: "Allah Hafiz! Have a great day." }
  ];

  var FALLBACK = "I am not fully sure about that one. The quickest way is to talk to our team directly. Want me to open WhatsApp for you?";
  var MAIN_CHIPS = ["Our services", "Get a free quote", "Pricing", "Contact us"];

  var history = [];
  var quote = null; // active quote flow state
  var els = {};

  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s]/g, " "); }

  function match(text) {
    var t = " " + norm(text) + " ", best = null, bestScore = 0;
    KB.forEach(function (e) {
      var score = 0;
      e.k.forEach(function (w) {
        if (t.indexOf(" " + w + " ") > -1) score += 2 + w.length / 10;
        else if (w.length > 3 && t.indexOf(w) > -1) score += 1;
      });
      if (score > bestScore) { best = e; bestScore = score; }
    });
    return bestScore >= 1 ? best : null;
  }

  function scroll() { els.msgs.scrollTop = els.msgs.scrollHeight; }

  function addMsg(text, who, save) {
    var d = document.createElement("div");
    d.className = "hc-m " + (who === "user" ? "hc-user" : "hc-bot");
    d.textContent = text;
    els.msgs.appendChild(d);
    scroll();
    if (save !== false) { history.push({ role: who === "user" ? "user" : "assistant", content: text }); persist(); }
    return d;
  }

  function addChips(list) {
    var old = els.msgs.querySelectorAll(".hc-chips"); old.forEach(function (o) { o.remove(); });
    var w = document.createElement("div"); w.className = "hc-chips";
    list.forEach(function (c) {
      var b = document.createElement("button"); b.className = "hc-chip"; b.textContent = c;
      b.onclick = function () { handle(c); };
      w.appendChild(b);
    });
    els.msgs.appendChild(w); scroll();
  }

  function typing() {
    var d = document.createElement("div"); d.className = "hc-m hc-bot hc-typing";
    d.innerHTML = "<i></i><i></i><i></i>"; els.msgs.appendChild(d); scroll(); return d;
  }

  function reply(text, chips, delay) {
    var t = typing();
    setTimeout(function () { t.remove(); addMsg(text, "bot"); if (chips) addChips(chips); }, delay || 550);
  }

  function persist() { try { sessionStorage.setItem("hc_hist", JSON.stringify(history.slice(-30))); } catch (e) {} }

  /* ---------- quote flow ---------- */
  var SERVICES = ["Embroidery Digitizing", "Raster to Vector", "3D Puff Logo", "Patch Digitizing", "Portrait Digitizing"];
  function startQuote() {
    quote = { step: "service" };
    reply("Great, let us get your free quote. Which service do you need? (Starting prices: caps/chest/sleeves $15, front chest/jacket back $30, vector $15)", SERVICES);
  }
  function quoteStep(text) {
    if (quote.step === "service") { quote.service = text; quote.step = "details"; return reply("Got it. Tell me the design size (e.g. 4 inch wide), garment/cap type and any special notes.", ["Skip"]); }
    if (quote.step === "details") { quote.details = text === "Skip" ? "-" : text; quote.step = "name"; return reply("And your name please?"); }
    if (quote.step === "name") {
      quote.name = text;
      var msg = "Hi Hihi Digitizing, I am " + quote.name + ". I need a quote for: " + quote.service + ". Details: " + quote.details + ". (Sent from website chatbot)";
      var url = wa(msg); quote = null;
      var t = typing();
      setTimeout(function () {
        t.remove();
        var d = addMsg("Thanks! Tap the button below to send your request on WhatsApp, then attach your artwork there.", "bot");
        var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.className = "hc-chip";
        a.style.cssText = "display:inline-block;margin-top:8px;background:#25D366;border-color:#25D366;color:#fff;text-decoration:none";
        a.textContent = "Send on WhatsApp"; d.appendChild(document.createElement("br")); d.appendChild(a); scroll();
      }, 600);
    }
  }

  /* ---------- AI (optional) ---------- */
  function askAI(text) {
    var t = typing();
    fetch(CONFIG.aiEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: SYSTEM_PROMPT, messages: history.slice(-10) })
    }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { t.remove(); addMsg(j.reply || FALLBACK, "bot"); })
      .catch(function () { t.remove(); local(text); });
  }

  function local(text) {
    var m = match(text);
    if (m) {
      var chips = m.chips || (m.k[0] === "hello" ? MAIN_CHIPS : null);
      reply(m.a, chips);
    } else reply(FALLBACK, ["Open WhatsApp", "Get a free quote"]);
  }

  function handle(text) {
    text = (text || "").trim(); if (!text) return;
    addMsg(text, "user");
    var low = text.toLowerCase();
    if (quote) return quoteStep(text);
    if (low === "get a free quote" || /\b(free quote|quotation)\b/.test(low)) return startQuote();
    if (low === "open whatsapp") { window.open(wa("Hi Hihi Digitizing, I need some help."), "_blank"); return reply("Opening WhatsApp for you."); }
    if (low === "open portfolio") { reply("Taking you to the Portfolio page..."); return setTimeout(function () { location.href = "blog.html"; }, 700); }
    if (low === "our services") return local("services");
    if (low === "contact us") return local("contact");
    if (low === "pricing") return local("price");
    if (low === "turnaround time") return local("turnaround");
    if (CONFIG.aiEndpoint) return askAI(text);
    local(text);
  }

  /* ---------- UI ---------- */
  function build() {
    var l = document.createElement("button");
    l.id = "hc-launcher"; l.setAttribute("aria-label", "Open chat"); l.innerHTML = '<i class="fas fa-comment-dots"></i><span class="hc-dot"></span>';
    var teaser = document.createElement("div"); teaser.id = "hc-teaser"; teaser.textContent = "Need a quote? Chat with us \uD83D\uDC4B";
    var box = document.createElement("div"); box.id = "hc-box"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Chat");
    box.innerHTML =
      '<div class="hc-head"><div class="hc-avatar"><i class="fas fa-robot"></i></div>' +
      '<div class="hc-title"><b>' + CONFIG.botName + '</b><small>Online</small></div>' +
      '<button id="hc-reset" title="New chat" aria-label="New chat"><i class="fas fa-redo"></i></button>' +
      '<button id="hc-close" aria-label="Close"><i class="fas fa-times"></i></button></div>' +
      '<div class="hc-msgs" id="hc-msgs" aria-live="polite"></div>' +
      '<form class="hc-foot" id="hc-form"><input id="hc-input" type="text" placeholder="Type your message..." autocomplete="off" maxlength="400">' +
      '<button type="submit" aria-label="Send"><i class="fas fa-paper-plane"></i></button></form>' +
      '<div class="hc-note">Automated assistant. For orders please confirm on WhatsApp.</div>';
    document.body.appendChild(l); document.body.appendChild(teaser); document.body.appendChild(box);
    els = { l: l, box: box, teaser: teaser, msgs: box.querySelector("#hc-msgs"), input: box.querySelector("#hc-input") };

    function open() { box.classList.add("hc-open"); teaser.style.display = "none"; l.classList.add("hc-seen"); l.style.display = "none"; els.input.focus(); try { sessionStorage.setItem("hc_seen", "1"); } catch (e) {} }
    function close() { box.classList.remove("hc-open"); l.style.display = "flex"; }
    l.onclick = open; teaser.onclick = open;
    box.querySelector("#hc-close").onclick = close;
    box.querySelector("#hc-reset").onclick = function () { history = []; quote = null; persist(); els.msgs.innerHTML = ""; greet(); };
    box.querySelector("#hc-form").onsubmit = function (e) { e.preventDefault(); var v = els.input.value; els.input.value = ""; handle(v); };

    var saved = []; try { saved = JSON.parse(sessionStorage.getItem("hc_hist") || "[]"); } catch (e) {}
    if (saved.length) { saved.forEach(function (m) { addMsg(m.content, m.role === "user" ? "user" : "bot", false); }); history = saved; l.classList.add("hc-seen"); }
    else greet();

    var seen = false; try { seen = sessionStorage.getItem("hc_seen"); } catch (e) {}
    if (!seen) setTimeout(function () { if (!box.classList.contains("hc-open")) teaser.style.display = "block"; }, 6000);
  }

  function greet() {
    addMsg("Assalam-o-Alaikum! I am the Hihi Digitizing assistant. Ask me about our services, pricing or get a free quote.", "bot");
    addChips(MAIN_CHIPS);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
