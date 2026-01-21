import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Question, Difficulty } from "./types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chave Gemini não configurada.");
  return new GoogleGenAI({ apiKey });
};

export const generateQuestions = async (theme: Theme, count: number = 15): Promise<Question[]> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Gere exatamente ${count} perguntas reais e históricas sobre ${theme}. 
      Distribuição: 5 fáceis, 5 médias, 5 difíceis.
      Foque em curiosidades, recordes e história real (incluindo Girabola e futebol angolano se o tema for Angolano).`,
      config: {
        systemInstruction: "Você é um historiador de futebol. Gere JSON estrito. Não use Markdown.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["fácil", "médio", "difícil"] },
              subtheme: { type: Type.STRING }
            },
            required: ["text", "options", "correctAnswer", "difficulty", "subtheme"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "[]");
    return parsed.map((q: any) => ({
      ...q,
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      theme,
      approved: true
    }));
  } catch (error) {
    console.error("Gemini falhou:", error);
    return [];
  }
};