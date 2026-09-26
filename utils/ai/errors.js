class AgentError extends Error {
    constructor(message, options = {}) {
        super(message);

        this.name = "AgentError";
        this.code = options.code || "AGENT_ERROR";
        this.cause = options.cause;
    }
}

class ToolError extends AgentError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || "TOOL_ERROR",
        });

        this.name = "ToolError";
    }
}

class MaxTurnsError extends AgentError {
    constructor(maxTurns) {
        super(
            `Agent exceeded maximum number of turns (${maxTurns}).`,
            {
                code: "MAX_TURNS_EXCEEDED",
            }
        );

        this.name = "MaxTurnsError";
        this.maxTurns = maxTurns;
    }
}

module.exports = {
    AgentError,
    ToolError,
    MaxTurnsError,
};