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
  console.log("No setup flag provided. Running the main application...");
  // Add your main application logic here.
}
