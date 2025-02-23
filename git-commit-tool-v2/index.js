#!/usr/bin/env node

if (process.argv.includes("--setup")) {
  console.log("Running setup process...");
  import("./setup.js")
    .then(({ runSetup }) => runSetup())
    .then(() => {
      console.log("Setup completed.");
    })
    .catch((err) => {
      console.error("Error during setup:", err);
      process.exit(1);
    });
} else {
  console.log("Generating AI commit message...");
  import("./ai.js")
    .then(({ generateCommitMessage }) => generateCommitMessage())
    .then((commitMessage) => {
      console.log("\nGenerated commit message:", commitMessage);
      return import("./git-actions.js").then(({ gitCommit }) => {
        return gitCommit(commitMessage);
      });
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
