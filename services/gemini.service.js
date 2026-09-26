const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const DEFAULT_MODEL = "gemini-2.5-flash";

async function generateContent({
    model = DEFAULT_MODEL,
    contents,
    config = {},
}) {
    return ai.models.generateContent({
        model,
        contents,
        config,
    });
}

module.exports = {
    ai,
    DEFAULT_MODEL,
    generateContent,
};