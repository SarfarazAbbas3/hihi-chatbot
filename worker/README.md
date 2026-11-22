# FREE AI chatbot setup (Cloudflare Workers AI)

Chatbot do tarah chalta hai:
- **Bina setup ke:** built-in smart FAQ (English, Urdu, Roman Urdu).
- **FREE AI ke saath:** neeche ke steps karo. Koi API key ya card nahi chahiye. Bot har sawal ka jawab usi language mein dega jis mein sawal hua.

Cloudflare har account ko roz 10,000 "Neurons" free deta hai (takreeban 100-200 AI jawab roz). Jab free limit khatam ho jaye ya AI band ho, bot khud built-in FAQ par wapas aa jata hai, customer ko farq nahi dikhta. Limit raat 00:00 UTC par reset hoti hai.

## Steps (5-10 minute)

1. https://dash.cloudflare.com par free account banao (card nahi chahiye).
2. **Workers & Pages** -> **Create** -> **Create Worker** -> naam do (jaise `hihi-bot`) -> **Deploy**.
3. **Edit code** dabao, purana code hata kar `chatbot-worker.js` ka poora code paste karo. Upar `ALLOWED_ORIGINS` mein apni asli website likho (jaise `https://www.hihidigitizing.com`). **Deploy** dabao.
4. Worker ki **Settings** -> **Bindings** -> **Add** -> **Workers AI** chuno. Variable name bilkul `AI` likho. Save/Deploy.
5. Worker ka URL copy karo (jaise `https://hihi-bot.xxxx.workers.dev`).
6. `js/chatbot.js` kholo, `aiEndpoint: ""` ki jagah URL paste karo:
   `aiEndpoint: "https://hihi-bot.xxxx.workers.dev"`
   Phir files GitHub par upload/commit kar do.

## Test
Website kholo, chat mein "how are you", "kitna rate hai logo ka?" aur Urdu mein koi sawal likho. Jawab usi language mein aana chahiye.
Agar purane FAQ jaisa jawab aaye: `aiEndpoint` aur `ALLOWED_ORIGINS` check karo, aur browser mein F12 -> Console dekho.

## Agar AI jawab nahi de raha
Cloudflare kabhi kabhi free models ki list badalta hai. Worker mein `FREE_MODELS` list hai, ye models ek ek karke try hote hain. Naya free model chahiye to https://developers.cloudflare.com/workers-ai/models/ se naam copy karke list mein daal do.

## Prices bataane ke liye (optional)
Worker ke upar `OWNER_NOTES` hai. Apne asli rates aur delivery time likh do. Khali rahega to bot koi price nahi batayega, sirf "artwork bhejein, free quote lein" kahega (taake galat price na bol de).

## Baad mein Claude (paid) chahiye to
Worker mein `ANTHROPIC_API_KEY` naam ka **Secret** add kar do, bot khud Claude use karne lagega. Key kabhi website ki files mein na likho.

## Hifazat
- Worker sirf `ALLOWED_ORIGINS` wali sites se chalta hai aur har IP ko ek minute mein limited requests deta hai.
- Bot ke instructions Worker ke andar hain, website se koi badal nahi sakta.
