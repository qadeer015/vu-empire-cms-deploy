const {
    generateContent,
    DEFAULT_MODEL,
} = require("../../services/gemini.service");

const {
    ToolError,
    MaxTurnsError,
} = require("./errors");

class Agent {
    constructor({
        name,
        instructions = "",
        model = DEFAULT_MODEL,
        tools = [],
        maxTurns = 10,
    }) {
        this.name = name;
        this.instructions = instructions;
        this.model = model;
        this.tools = tools;
        this.maxTurns = maxTurns;

        this.toolMap = new Map();

        for (const registeredTool of tools) {
            if (!registeredTool?.name) {
                throw new Error(
                    "Every agent tool must have a name."
                );
            }

            this.toolMap.set(
                registeredTool.name,
                registeredTool
            );
        }
    }

    getToolDefinitions() {
        return this.tools.map((registeredTool) => ({
            name: registeredTool.name,
            description: registeredTool.description,
            parameters: registeredTool.parameters,
        }));
    }

    async run(input, context = {}) {
        let contents = [
            {
                role: "user",
                parts: [
                    {
                        text: input,
                    },
                ],
            },
        ];

        for (let turn = 0; turn < this.maxTurns; turn++) {
            const response = await generateContent({
                model: this.model,

                contents,

                config: {
                    systemInstruction: this.instructions,

                    tools: [
                        {
                            functionDeclarations:
                                this.getToolDefinitions(),
                        },
                    ],
                },
            });

            const candidate =
                response.candidates?.[0];

            const parts =
                candidate?.content?.parts || [];

            const functionCalls = parts.filter(
                (part) => part.functionCall
            );

            /*
             * Gemini did not request a tool.
             *
             * This means we have reached the final response.
             */
            if (functionCalls.length === 0) {
                return response.text;
            }

            /*
             * Preserve Gemini's response containing
             * the function calls.
             */
            contents.push({
                role: "model",
                parts,
            });

            const functionResponses = [];

            /*
             * Execute all requested tools.
             */
            for (const part of functionCalls) {
                const functionCall = part.functionCall;

                const registeredTool =
                    this.toolMap.get(functionCall.name);

                if (!registeredTool) {
                    functionResponses.push({
                        functionResponse: {
                            name: functionCall.name,
                            response: {
                                error:
                                    `Unknown tool "${functionCall.name}".`,
                            },
                        },
                    });

                    continue;
                }

                try {
                    const result =
                        await registeredTool.execute(
                            functionCall.args || {},
                            context
                        );

                    functionResponses.push({
                        functionResponse: {
                            name: functionCall.name,
                            response: {
                                result,
                            },
                        },
                    });
                } catch (error) {
                    const toolError = new ToolError(
                        `Tool "${functionCall.name}" failed: ${error.message}`,
                        {
                            cause: error,
                        }
                    );

                    functionResponses.push({
                        functionResponse: {
                            name: functionCall.name,
                            response: {
                                error: toolError.message,
                            },
                        },
                    });
                }
            }

            /*
             * Send tool results back to Gemini.
             */
            contents.push({
                role: "user",
                parts: functionResponses,
            });
        }

        throw new MaxTurnsError(this.maxTurns);
    }
}

module.exports = Agent;