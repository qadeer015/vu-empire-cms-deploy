function tool({
    name,
    description,
    parameters,
    execute,
}) {
    if (!name) {
        throw new Error("Tool name is required.");
    }

    if (typeof execute !== "function") {
        throw new Error(
            `Tool "${name}" must have an execute function.`
        );
    }

    return {
        name,
        description,
        parameters: parameters || {
            type: "object",
            properties: {},
        },

        execute,
    };
}

module.exports = tool;