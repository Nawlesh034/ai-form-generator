// config/AiModal.js
// This file lives on the client and proxies requests to your server API.
// It provides AiChat.sendMessage(prompt) and returns an object shaped like
// result.response.text() so your existing CreateForm code keeps working.

export const AiChat = {
  /**
   * prompt: string
   * returns an object that mimics: { response: { text: () => string } }
   */
  sendMessage: async function(prompt) {
    // call your server-side API that actually talks to Gemini
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    // if server returned non-OK, throw with message
    if (!res.ok) {
      let errMsg = res.statusText;
      try {
        const errJson = await res.json();
        errMsg = errJson?.error || errMsg;
      } catch (e) { /* ignore parse errors */ }
      throw new Error(errMsg);
    }

    const data = await res.json();
    // data should be { text: "..." } from the server route
    const text = data?.text ?? "";

    // return in the same shape your CreateForm expects:
    return {
      response: {
        // mimic async .text() if other code expects a function
        text: () => text
      }
    };
  }
};

export default AiChat;
