const tool = require("../ai/tool");
const {
    generateContent,
} = require("../../services/gemini.service");

const generateGdbSolution = tool({
    name: "generate_gdb_solution",

    description:
        "Generate a clear, accurate and original solution for a Virtual University GDB question. Use this when the user provides a GDB question and wants help solving or writing an answer.",

    parameters: {
        type: "object",

        properties: {
            courseCode: {
                type: "string",
                description:
                    "The VU course code, for example CS101, MGT101, MTH101.",
            },

            question: {
                type: "string",
                description:
                    "The complete GDB question that needs to be solved.",
            },

            instructions: {
                type: "string",
                description:
                    "Optional instructions or requirements given with the GDB question.",
            },
        },

        required: [
            "courseCode",
            "question",
        ],
    },

    async execute(
        {
            courseCode,
            question,
            instructions,
        },
        context
    ) {
        const prompt = `
You are an expert Virtual University academic assistant.

Generate a solution for the following GDB question.

Course:
${courseCode}

GDB Question:
${question}

Additional Instructions:
${instructions || "None provided"}

Requirements:

1. Understand the question carefully before answering.
2. Answer the actual question directly.
3. Use accurate academic reasoning.
4. Do not invent facts, references, examples, or data.
5. Keep the answer relevant to the course.
6. Write in clear and natural English.
7. Avoid unnecessary headings or filler.
8. Do not mention that you are an AI.
9. Do not copy a memorized answer from another GDB.
10. Produce an original response suitable for a student's GDB submission.
11. If the question is ambiguous, explain the ambiguity instead of inventing missing information.
12. Follow any additional instructions provided with the question.

Return only the proposed GDB answer.
`;

        const response = await generateContent({
            model: "gemini-2.5-flash",

            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
        });

        const answer = response.text?.trim();

        if (!answer) {
            throw new Error(
                "Gemini returned an empty GDB solution."
            );
        }

        return {
            courseCode,
            question,
            answer,
        };
    },
});

module.exports = generateGdbSolution;