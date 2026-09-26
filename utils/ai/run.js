async function run(agent, input, context = {}) {
    if (!agent || typeof agent.run !== "function") {
        throw new TypeError(
            "run() expects a valid Agent instance."
        );
    }

    return agent.run(input, context);
}

module.exports = run;