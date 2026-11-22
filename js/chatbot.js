/* Hihi Digitizing - Chatbot
   - Works on its own with a built-in smart FAQ (English, Urdu, Roman Urdu).
   - Becomes a real AI assistant as soon as CONFIG.aiEndpoint is set
     (see worker/README.md). If the AI is down it silently falls back to the FAQ. */
(function () {
  "use strict";

  var CONFIG = {
    botName: "Hihi Assistant",
    whatsapp: "923452669812",
    email: "hihidigitizing@gmail.com",
    phone: "+92 345 2669812",
    // Paste your Cloudflare Worker URL here, e.g. "https://hihi-bot.yourname.workers.dev"
    // Leave empty to use only the built-in FAQ bot.
    aiEndpoint: ""
  };

  var wa = function (text) {
    return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(text);
  };

  /* ---------- language detection: en / ru (Roman Urdu) / ur (Urdu script) ---------- */
  var RU = {};
  ("kaise kese kaisay kya kia hai hain hy aap mujhe mjhe mujhy chahiye chahye chaiye kitna kitne kitni krna karna karo kro " +
   "mein mai yar yaar bhai shukriya shukria theek thik acha achha nahi nhe nahin bata batao btao bataiye " +
   "kab kahan kidhar paisa qeemat kimat mera meri mere hamara tum tumhara apka aapka apki aapki karwana krwana banwana " +
   "haal sab sb koi koi jawab jawaab sawal swal").split(" ").forEach(function (w) { RU[w] = 1; });

  var lastLang = "en";
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s]/g, " "); }
  function detect(text) {
    if (/[\u0600-\u06FF]/.test(text)) return (lastLang = "ur");
    var w = norm(text).split(/\s+/).filter(Boolean);
    var hits = w.filter(function (x) { return RU[x]; }).length;
    if (hits >= 1 && (hits >= 2 || w.length <= 4 || hits / w.length >= 0.2)) return (lastLang = "ru");
    if (w.length <= 2 && lastLang !== "en") return lastLang; // short/ambiguous: keep the language in use
    return (lastLang = "en");
  }

  /* ---------- built-in knowledge base ---------- */
  // a = { en, ru, ur }, w = weight (intent entries beat topic entries)
  var KB = [
    { k: ["assalam", "salam", "aoa", "سلام", "السلام"], w: 2.5, a: {
      en: "Walaikum Assalam! Welcome to Hihi Digitizing Services. How can I help you today?",
      ru: "Walaikum Assalam! Hihi Digitizing Services mein khush aamdeed. Main aapki kya madad kar sakta hoon?",
      ur: "وعلیکم السلام! ہیہی ڈیجیٹائزنگ سروسز میں خوش آمدید۔ میں آپ کی کیا مدد کر سکتا ہوں؟" }, home: 1 },
    { k: ["hello", "hi", "hey", "hola", "ہیلو"], w: 1.5, a: {
      en: "Hello! Welcome to Hihi Digitizing Services. How can I help you today?",
      ru: "Hello! Hihi Digitizing Services mein khush aamdeed. Main aapki kya madad kar sakta hoon?",
      ur: "ہیلو! ہیہی ڈیجیٹائزنگ سروسز میں خوش آمدید۔ میں آپ کی کیا مدد کر سکتا ہوں؟" }, home: 1 },
    { k: ["how are you", "how r u", "how are u", "how you doing", "kaise ho", "kese ho", "kaisay ho", "kaise hain", "kese hain", "aap kaise", "ap kaise", "kya haal", "kia haal", "kia hal", "kya hal", "haal chal", "khairiyat", "کیسے ہیں", "کیسے ہو", "آپ کیسے", "حال"], w: 3, a: {
      en: "I'm doing great, thank you for asking! \uD83D\uDE0A How are you? Tell me what you need and I'll be happy to help with embroidery digitizing, vector art or a free quote.",
      ru: "Alhamdulillah main bilkul theek hoon, shukriya! \uD83D\uDE0A Aap kaise hain? Embroidery digitizing, vector art ya free quote ke liye bataiye, main madad karunga.",
      ur: "الحمدللہ میں بالکل ٹھیک ہوں، شکریہ! \uD83D\uDE0A آپ کیسے ہیں؟ ایمبرائیڈری ڈیجیٹائزنگ، ویکٹر آرٹ یا فری کوٹ کے لیے بتائیں، میں مدد کروں گا۔" }, home: 1 },
    { k: ["who are you", "your name", "are you a bot", "are you human", "are you real", "are you ai", "tum kon", "aap kon", "apka naam", "aapka naam", "tumhara naam", "bot ho", "insan ho", "کون ہو", "آپ کون", "نام کیا"], w: 3, a: {
      en: "I'm the virtual assistant of Hihi Digitizing Services. I can answer questions about our embroidery digitizing and vector art services, and connect you with our team on WhatsApp for orders.",
      ru: "Main Hihi Digitizing Services ka virtual assistant hoon. Embroidery digitizing aur vector art ke sawalon ke jawab de sakta hoon, aur order ke liye aapko hamari team se WhatsApp par mila sakta hoon.",
      ur: "میں ہیہی ڈیجیٹائزنگ سروسز کا ورچوئل اسسٹنٹ ہوں۔ ہماری ایمبرائیڈری ڈیجیٹائزنگ اور ویکٹر آرٹ سروسز کے بارے میں آپ کے سوالوں کے جواب دے سکتا ہوں، اور آرڈر کے لیے آپ کو ہماری ٹیم سے واٹس ایپ پر ملوا سکتا ہوں۔" } },
    { k: ["service", "services", "offer", "what do you do", "kya karte", "kaam", "khidmat", "sarvis", "خدمات", "سروس", "سروسز"], w: 1.5, a: {
      en: "We offer:\n• Embroidery Digitizing\n• Raster to Vector (vector art)\n• 3D Puff Logos\n• Patch Logo Digitizing\n• Portrait Digitizing\n\nTell me what you need and I will guide you.",
      ru: "Hamari services:\n• Embroidery Digitizing\n• Raster to Vector (vector art)\n• 3D Puff Logos\n• Patch Logo Digitizing\n• Portrait Digitizing\n\nBataiye aapko kis cheez ki zaroorat hai, main guide karta hoon.",
      ur: "ہماری سروسز:\n• ایمبرائیڈری ڈیجیٹائزنگ\n• ریسٹر ٹو ویکٹر (ویکٹر آرٹ)\n• 3D پف لوگو\n• پیچ لوگو ڈیجیٹائزنگ\n• پورٹریٹ ڈیجیٹائزنگ\n\nبتائیں آپ کو کس چیز کی ضرورت ہے، میں رہنمائی کرتا ہوں۔" } },
    { k: ["embroidery", "embroidry", "digitizing", "digitising", "dst", "pes", "emb", "stitch", "logo", "ایمبرائیڈری", "ڈیجیٹائز", "لوگو"], a: {
      en: "We turn logos and artwork into smooth, stitch-ready embroidery files for caps, hoodies, jackets, polos, uniforms and more. Send your artwork with the size and fabric for a free quote.",
      ru: "Hum logos aur artwork ko caps, hoodies, jackets, polos aur uniforms ke liye smooth, stitch-ready embroidery files mein convert karte hain. Artwork, size aur fabric bhejein aur free quote lein.",
      ur: "ہم لوگو اور آرٹ ورک کو ٹوپیوں، ہوڈیز، جیکٹس، پولو اور یونیفارم کے لیے صاف اور سلائی کے لیے تیار ایمبرائیڈری فائلوں میں بدلتے ہیں۔ آرٹ ورک، سائز اور کپڑے کی تفصیل بھیجیں اور فری کوٹ لیں۔" } },
    { k: ["vector", "raster", "screen print", "ai file", "eps", "svg", "redraw", "ویکٹر"], a: {
      en: "Our vector service converts low-resolution images into clean, scalable vector files (AI, EPS, SVG or PDF), perfect for screen printing, vinyl and large-format printing.",
      ru: "Hamari vector service low-resolution images ko clean, scalable vector files (AI, EPS, SVG ya PDF) mein convert karti hai, jo screen printing, vinyl aur large-format printing ke liye perfect hain.",
      ur: "ہماری ویکٹر سروس کم ریزولوشن تصاویر کو صاف اور قابلِ توسیع ویکٹر فائلوں (AI، EPS، SVG یا PDF) میں بدلتی ہے جو اسکرین پرنٹنگ، ونائل اور بڑے سائز کی پرنٹنگ کے لیے بہترین ہیں۔" } },
    { k: ["3d", "puff", "puffy", "پف"], a: {
      en: "3D puff digitizing is one of our specialities. It gives raised, bold lettering and logos on caps, hoodies and jackets. Share your logo and garment type and we will quote you.",
      ru: "3D puff digitizing hamari speciality hai. Isse caps, hoodies aur jackets par ubhra hua, bold lettering aur logo banta hai. Apna logo aur garment type bhejein, hum quote de denge.",
      ur: "تھری ڈی پف ڈیجیٹائزنگ ہماری خاصیت ہے۔ اس سے ٹوپیوں، ہوڈیز اور جیکٹس پر ابھرے ہوئے نمایاں لوگو اور لکھائی بنتی ہے۔ اپنا لوگو اور کپڑے کی قسم بھیجیں، ہم کوٹ دے دیں گے۔" } },
    { k: ["patch", "patches", "پیچ"], a: {
      en: "We digitize patches for uniforms, promotional items and custom apparel, with clean borders, durable stitching and vibrant results.",
      ru: "Hum uniforms, promotional items aur custom apparel ke liye patches digitize karte hain, clean borders aur mazboot stitching ke saath.",
      ur: "ہم یونیفارم، پروموشنل آئٹمز اور کسٹم کپڑوں کے لیے پیچ ڈیجیٹائز کرتے ہیں، صاف کناروں اور پائیدار سلائی کے ساتھ۔" } },
    { k: ["portrait", "photo", "face", "پورٹریٹ", "تصویر"], a: {
      en: "Portrait digitizing turns a photo into detailed stitched artwork. Send a clear, high-quality photo and the size you want.",
      ru: "Portrait digitizing photo ko detailed stitched artwork mein badal deta hai. Saaf, high-quality photo aur apni marzi ka size bhejein.",
      ur: "پورٹریٹ ڈیجیٹائزنگ تصویر کو تفصیلی سلائی والے آرٹ ورک میں بدل دیتی ہے۔ صاف اور اچھے معیار کی تصویر اور مطلوبہ سائز بھیجیں۔" } },
    { k: ["price", "pricing", "cost", "rate", "rates", "charges", "charge", "kitna", "kitne", "qeemat", "kimat", "paisa", "paise", "قیمت", "ریٹ", "کتنے", "کتنا"], w: 2.2, chips: ["Get a free quote"], a: {
      en: "Pricing depends on design size, stitch count and complexity, so we quote per design, and the quote is free. Send your artwork and I'll get you a quote. Want me to open WhatsApp with a ready message?",
      ru: "Price design ke size, stitch count aur complexity par depend karti hai, is liye hum har design ka alag quote dete hain, aur quote bilkul free hai. Artwork bhejein, hum price bata denge. WhatsApp par ready message khol doon?",
      ur: "قیمت ڈیزائن کے سائز، سلائیوں کی تعداد اور پیچیدگی پر منحصر ہے، اس لیے ہم ہر ڈیزائن کا الگ کوٹ دیتے ہیں اور کوٹ مفت ہے۔ آرٹ ورک بھیجیں، ہم قیمت بتا دیں گے۔ کیا واٹس ایپ پر تیار پیغام کھول دوں؟" } },
    { k: ["time", "turnaround", "delivery", "how long", "fast", "urgent", "kitni der", "kab tak", "deadline", "rush", "جلدی", "کتنی دیر", "ڈیلیوری"], w: 2, a: {
      en: "We focus on quick turnaround with top quality. For urgent or rush orders, mention it in your message and we will confirm the delivery time for your design.",
      ru: "Hum quick turnaround aur top quality par focus karte hain. Urgent ya rush order ho to apne message mein likh dein, hum aapke design ka delivery time confirm kar denge.",
      ur: "ہم بہترین معیار کے ساتھ جلد ڈیلیوری پر توجہ دیتے ہیں۔ اگر آرڈر فوری ہو تو پیغام میں لکھ دیں، ہم آپ کے ڈیزائن کا ڈیلیوری ٹائم بتا دیں گے۔" } },
    { k: ["format", "formats", "file", "files", "send", "artwork", "jpg", "png", "pdf", "upload", "فائل", "فارمیٹ"], w: 1.5, a: {
      en: "For embroidery we deliver machine formats like DST, PES, EMB and more on request. Vector work comes as AI, EPS, SVG or PDF. You can send artwork as JPG, PNG or PDF; the clearer the image, the better the result. Share it on WhatsApp or by email with the final size and garment type.",
      ru: "Embroidery ke liye hum DST, PES, EMB aur request par dusre machine formats dete hain. Vector work AI, EPS, SVG ya PDF mein milta hai. Aap artwork JPG, PNG ya PDF mein bhej sakte hain; image jitni saaf hogi result utna behtar hoga. WhatsApp ya email par final size aur garment type ke saath bhejein.",
      ur: "ایمبرائیڈری کے لیے ہم DST، PES، EMB اور درخواست پر دیگر مشین فارمیٹس دیتے ہیں۔ ویکٹر کام AI، EPS، SVG یا PDF میں ملتا ہے۔ آپ آرٹ ورک JPG، PNG یا PDF میں بھیج سکتے ہیں؛ تصویر جتنی صاف ہوگی نتیجہ اتنا بہتر ہوگا۔ واٹس ایپ یا ای میل پر سائز اور کپڑے کی قسم کے ساتھ بھیجیں۔" } },
    { k: ["revision", "change", "changes", "edit", "fix", "correction", "mistake", "تبدیلی"], a: {
      en: "If something is not right, tell us and we will review it. Please see our Refund Policy page for details.",
      ru: "Agar kuch theek na ho to humein batayein, hum review karenge. Tafseel ke liye hamari Refund Policy page dekhein.",
      ur: "اگر کوئی چیز درست نہ ہو تو ہمیں بتائیں، ہم جائزہ لیں گے۔ تفصیل کے لیے ہمارا ریفنڈ پالیسی صفحہ دیکھیں۔" } },
    { k: ["refund", "money back", "return", "ریفنڈ", "واپسی"], w: 2, a: {
      en: "Refunds may be considered if we make a clear mistake, such as delivering something that does not match the approved design. Email hihidigitizing@gmail.com within 7 days of receiving your order with your order number and details. Full terms are on our Refund Policy page.",
      ru: "Agar hamari taraf se clear ghalti ho (jaise approved design se different kaam), to refund consider kiya ja sakta hai. Order milne ke 7 din ke andar hihidigitizing@gmail.com par order number aur tafseel ke saath email karein. Poori shartein Refund Policy page par hain.",
      ur: "اگر ہماری طرف سے واضح غلطی ہو (مثلاً منظور شدہ ڈیزائن سے مختلف کام) تو ریفنڈ پر غور کیا جا سکتا ہے۔ آرڈر ملنے کے 7 دن کے اندر hihidigitizing@gmail.com پر آرڈر نمبر اور تفصیل کے ساتھ ای میل کریں۔ مکمل شرائط ریفنڈ پالیسی صفحے پر ہیں۔" } },
    { k: ["contact", "whatsapp", "call", "phone", "number", "email", "mail", "raabta", "rabta", "رابطہ", "نمبر", "ای میل", "واٹس"], w: 2, chips: ["Open WhatsApp"], a: {
      en: "You can reach us at:\n\uD83D\uDCF1 WhatsApp / Phone: " + CONFIG.phone + "\n\u2709\uFE0F " + CONFIG.email,
      ru: "Aap humse yahan rabta kar sakte hain:\n\uD83D\uDCF1 WhatsApp / Phone: " + CONFIG.phone + "\n\u2709\uFE0F " + CONFIG.email,
      ur: "آپ ہم سے یہاں رابطہ کر سکتے ہیں:\n\uD83D\uDCF1 واٹس ایپ / فون: " + CONFIG.phone + "\n\u2709\uFE0F " + CONFIG.email } },
    { k: ["address", "location", "where", "karachi", "landhi", "office", "kahan", "kidhar", "پتہ", "کہاں", "کراچی"], w: 2, a: {
      en: "We are located at Majeed Colony, Landhi, Karachi, Pakistan. We work fully online and serve clients worldwide.",
      ru: "Hamara address Majeed Colony, Landhi, Karachi, Pakistan hai. Hum poori tarah online kaam karte hain aur dunya bhar ke clients ko serve karte hain.",
      ur: "ہمارا پتہ مجید کالونی، لانڈھی، کراچی، پاکستان ہے۔ ہم مکمل آن لائن کام کرتے ہیں اور دنیا بھر کے کلائنٹس کو سروس دیتے ہیں۔" } },
    { k: ["payment", "pay", "easypaisa", "jazzcash", "bank", "paypal", "advance", "ادائیگی", "پیمنٹ"], w: 2, a: {
      en: "For payment options, please confirm on WhatsApp when you place your order and we will share the details.",
      ru: "Payment options ke liye order dete waqt WhatsApp par confirm karein, hum details bata denge.",
      ur: "ادائیگی کے طریقوں کے لیے آرڈر دیتے وقت واٹس ایپ پر رابطہ کریں، ہم تفصیل بتا دیں گے۔" } },
    { k: ["portfolio", "sample", "samples", "work", "example", "examples", "gallery", "نمونہ", "نمونے"], a: {
      en: "You can see our work on the Portfolio page. Want me to take you there?",
      ru: "Hamara kaam Portfolio page par dekh sakte hain. Kya main wahan le chalun?",
      ur: "ہمارا کام پورٹ فولیو صفحے پر دیکھ سکتے ہیں۔ کیا میں آپ کو وہاں لے چلوں؟" }, chips: ["Open Portfolio"] },
    { k: ["thanks", "thank", "thankyou", "shukriya", "shukria", "jazak", "jazakallah", "شکریہ"], w: 2, a: {
      en: "You are welcome! Anything else I can help you with?",
      ru: "Khushi hui madad kar ke! Kuch aur poochna ho to bataiye.",
      ur: "آپ کا شکریہ! کچھ اور پوچھنا ہو تو بتائیں۔" } },
    { k: ["ok", "okay", "alright", "theek", "thik", "acha", "achha", "ٹھیک", "اچھا"], w: 1.2, a: {
      en: "Great! Is there anything else I can help you with?",
      ru: "Theek hai! Kuch aur madad chahiye to bataiye.",
      ur: "ٹھیک ہے! کچھ اور مدد چاہیے تو بتائیں۔" } },
    { k: ["bye", "goodbye", "allah hafiz", "khuda hafiz", "الوداع", "اللہ حافظ"], w: 2, a: {
      en: "Allah Hafiz! Have a great day.",
      ru: "Allah Hafiz! Aapka din acha guzre.",
      ur: "اللہ حافظ! آپ کا دن اچھا گزرے۔" } }
  ];

  var FALLBACK = {
    en: "I'm not fully sure about that one, but our team will gladly help. Want me to open WhatsApp for you? You can also ask me about our services, pricing or a free quote.",
    ru: "Is baare mein mujhe poori tarah pata nahi, lekin hamari team zaroor madad karegi. WhatsApp khol doon? Aap services, price ya free quote ke baare mein bhi pooch sakte hain.",
    ur: "اس بارے میں مجھے پوری طرح معلوم نہیں، لیکن ہماری ٹیم ضرور مدد کرے گی۔ کیا واٹس ایپ کھول دوں؟ آپ سروسز، قیمت یا فری کوٹ کے بارے میں بھی پوچھ سکتے ہیں۔"
  };
  var MAIN_CHIPS = ["Our services", "Get a free quote", "Pricing", "Contact us"];

  var history = [];
  var quote = null;
  var busy = false;
  var els = {};

  function match(text) {
    var t = " " + norm(text) + " ", best = null, bestScore = 0;
    KB.forEach(function (e) {
      var score = 0;
      e.k.forEach(function (w) {
        if (t.indexOf(" " + w + " ") > -1) score += 2 + w.length / 10;
        else if (w.length > 3 && t.indexOf(w) > -1) score += 1;
      });
      score *= (e.w || 1);
      if (score > bestScore) { best = e; bestScore = score; }
    });
    return bestScore >= 1 ? best : null;
  }

  function scroll() { els.msgs.scrollTop = els.msgs.scrollHeight; }

  function addMsg(text, who, save) {
    var d = document.createElement("div");
    d.className = "hc-m " + (who === "user" ? "hc-user" : "hc-bot");
    d.textContent = text;
    if (/[\u0600-\u06FF]/.test(text)) d.dir = "auto";
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
  var Q = {
    start:   { en: "Great, let us get your free quote. Which service do you need?", ru: "Zabardast, chaliye aapka free quote banate hain. Aapko kaun si service chahiye?", ur: "بہت خوب، آپ کا فری کوٹ بناتے ہیں۔ آپ کو کون سی سروس چاہیے؟" },
    details: { en: "Got it. Tell me the design size (e.g. 4 inch wide), garment/cap type and any special notes.", ru: "Theek hai. Design ka size (jaise 4 inch wide), garment/cap type aur koi khaas notes bata dein.", ur: "ٹھیک ہے۔ ڈیزائن کا سائز (مثلاً 4 انچ چوڑا)، کپڑے/ٹوپی کی قسم اور کوئی خاص بات بتا دیں۔" },
    name:    { en: "And your name please?", ru: "Aur aapka naam?", ur: "اور آپ کا نام؟" },
    done:    { en: "Thanks! Tap the button below to send your request on WhatsApp, then attach your artwork there.", ru: "Shukriya! Neeche button dabayein aur apni request WhatsApp par bhejein, phir wahin artwork attach kar dein.", ur: "شکریہ! نیچے بٹن دبا کر اپنی درخواست واٹس ایپ پر بھیجیں، پھر وہیں آرٹ ورک لگا دیں۔" }
  };
  function startQuote() { quote = { step: "service" }; reply(Q.start[lastLang], SERVICES); }
  function quoteStep(text) {
    if (quote.step === "service") { quote.service = text; quote.step = "details"; return reply(Q.details[lastLang], ["Skip"]); }
    if (quote.step === "details") { quote.details = text === "Skip" ? "-" : text; quote.step = "name"; return reply(Q.name[lastLang]); }
    if (quote.step === "name") {
      quote.name = text;
      var msg = "Hi Hihi Digitizing, I am " + quote.name + ". I need a quote for: " + quote.service + ". Details: " + quote.details + ". (Sent from website chatbot)";
      var url = wa(msg); quote = null;
      var t = typing();
      setTimeout(function () {
        t.remove();
        var d = addMsg(Q.done[lastLang], "bot");
        var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.className = "hc-chip";
        a.style.cssText = "display:inline-block;margin-top:8px;background:#25D366;border-color:#25D366;color:#fff;text-decoration:none";
        a.textContent = "Send on WhatsApp"; d.appendChild(document.createElement("br")); d.appendChild(a); scroll();
      }, 600);
    }
  }

  /* ---------- AI (optional) ---------- */
  function cleanHistory() {
    var h = history.slice(-10);
    while (h.length && h[0].role !== "user") h.shift(); // API needs the first message from the user
    return h;
  }

  function askAI(text) {
    var t = typing(); busy = true;
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    fetch(CONFIG.aiEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: cleanHistory() }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { if (!r.ok) throw new Error("bad status"); return r.json(); })
      .then(function (j) {
        clearTimeout(timer); t.remove(); busy = false;
        var rep = String(j.reply || "").trim();
        if (!rep) return local(text);
        var wantWA = /\[\[WA\]\]/.test(rep);
        rep = rep.replace(/\[\[WA\]\]/g, "").trim();
        addMsg(rep, "bot");
        if (wantWA) addChips(["Open WhatsApp", "Get a free quote"]);
      })
      .catch(function () { clearTimeout(timer); t.remove(); busy = false; local(text); });
  }

  function local(text) {
    var L = detect(text);
    var m = match(text);
    if (m) reply(m.a[L] || m.a.en, m.chips || (m.home ? MAIN_CHIPS : null));
    else reply(FALLBACK[L], ["Open WhatsApp", "Get a free quote"]);
  }

  function handle(text) {
    text = (text || "").trim(); if (!text || busy) return;
    addMsg(text, "user");
    var low = text.toLowerCase();
    var isChip = /^(get a free quote|open whatsapp|open portfolio|our services|contact us|pricing|skip)$/.test(low) || SERVICES.indexOf(text) > -1;
    if (!isChip) detect(text);
    if (quote) return quoteStep(text);
    if (low === "get a free quote" || /\b(free quote|quotation|quote)\b/.test(low)) return startQuote();
    if (low === "open whatsapp") { window.open(wa("Hi Hihi Digitizing, I need some help."), "_blank"); return reply("Opening WhatsApp for you.", null, 300); }
    if (low === "open portfolio") { reply("Taking you to the Portfolio page...", null, 300); return setTimeout(function () { location.href = "blog.html"; }, 800); }
    if (low === "our services") return local("services");
    if (low === "contact us") return local("contact");
    if (low === "pricing") return local("price");
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
    box.querySelector("#hc-reset").onclick = function () { history = []; quote = null; busy = false; lastLang = "en"; persist(); els.msgs.innerHTML = ""; greet(); };
    box.querySelector("#hc-form").onsubmit = function (e) { e.preventDefault(); var v = els.input.value; els.input.value = ""; handle(v); };

    var saved = []; try { saved = JSON.parse(sessionStorage.getItem("hc_hist") || "[]"); } catch (e) {}
    if (saved.length) { saved.forEach(function (m) { addMsg(m.content, m.role === "user" ? "user" : "bot", false); }); history = saved; l.classList.add("hc-seen"); }
    else greet();

    var seen = false; try { seen = sessionStorage.getItem("hc_seen"); } catch (e) {}
    if (!seen) setTimeout(function () { if (!box.classList.contains("hc-open")) teaser.style.display = "block"; }, 6000);
  }

  function greet() {
    addMsg("Assalam-o-Alaikum! I am the Hihi Digitizing assistant. Ask me about our services, pricing or get a free quote. You can write in English, Urdu or Roman Urdu.", "bot");
    addChips(MAIN_CHIPS);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
