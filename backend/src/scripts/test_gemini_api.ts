import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  for (const m of ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview']) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }),
    });
    console.log(m, res.status);
    if (res.ok) {
      console.log('WORKING MODEL:', m);
      return;
    }
  }
}

main();
