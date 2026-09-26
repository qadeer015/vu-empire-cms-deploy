const {
  Agent,
} = require("../ai");

const generateGdbSolution =
  require("../tools/gdb.tool");

const vuEmpireAgent = new Agent({
  name: "VU Empire Assistant",

  model: "gemini-2.5-flash",

  instructions: `
You are the VU Empire AI assistant.

You help Virtual University students
with courses, assignments and GDBs.

When a user provides a GDB question and
asks for a solution, use the
generate_gdb_solution tool.

Do not generate the GDB answer yourself
when the GDB tool is appropriate.
`,

  tools: [
    generateGdbSolution,
  ],

  maxTurns: 10,
});

module.exports = vuEmpireAgent;