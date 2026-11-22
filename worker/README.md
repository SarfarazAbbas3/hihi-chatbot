# AI chatbot ko real AI se connect karna (optional)

Chatbot abhi bina kisi setup ke chalta hai (built-in FAQ). Real AI chahiye to:

1. https://dash.cloudflare.com par free account banao -> Workers & Pages -> Create Worker.
2. `chatbot-worker.js` ka code paste karo, `ALLOWED_ORIGINS` mein apni site ka URL likho.
3. Worker Settings -> Variables -> `ANTHROPIC_API_KEY` naam se apni Claude API key **Secret** ke taur par add karo.
4. Deploy karo, phir worker ka URL copy karo (jaise https://hihi-bot.xxx.workers.dev).
5. `js/chatbot.js` mein `aiEndpoint: ""` ki jagah wo URL paste karo.

API key kabhi bhi website ki files mein na likho, warna koi bhi use chura sakta hai.
