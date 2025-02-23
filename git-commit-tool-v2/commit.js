import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
import path from "path";

async function getUserInputs() {
  const questions = [
    {
      type: "input",
      name: "repoPath",
      message: `Enter the project repository path ${chalk.gray(
        "(e.g., /path/to/your/repo)"
      )}:`,
      validate: (input) => {
        if (typeof input !== "string" || input.trim() === "") {
          return "Repository path is required";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "scopes",
      message: `Enter the scopes ${chalk.gray(
        "(e.g., ['feat','fix'] or feat,fix)"
      )}:`,
      validate: (input) => {
        // Validate if input is a string or an already parsed array.
        if (typeof input !== "string") {
          if (Array.isArray(input) && input.length > 0) {
            return true;
          }
          return "Please provide at least one scope";
        }
        try {
          const parsed = JSON.parse(input);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            return "Please provide at least one scope";
          }
          return true;
        } catch {
          if (input.trim() === "") return "Please provide at least one scope";
          return true;
        }
      },
      filter: (input) => {
        // If not a string, assume it's already in the correct format.
        if (typeof input !== "string") {
          return input;
        }
        try {
          const parsed = JSON.parse(input);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (scope) => typeof scope === "string" && scope.trim() !== ""
            );
          }
          return [];
        } catch {
          return input
            .split(",")
            .map((scope) => scope.trim())
            .filter((scope) => scope !== "");
        }
      },
    },
  ];

  try {
    const answers = await inquirer.prompt(questions);
    return {
      repoPath: answers.repoPath,
      scopes: answers.scopes,
    };
  } catch (error) {
    console.error("Error getting user inputs:", error);
    process.exit(1);
  }
}

function updateEnvFile(inputs) {
  const envFilePath = path.join(process.cwd(), ".env.local");
  let envContent = "";
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, "utf-8");
  }

  const newRepoLine = `PATH_TO_GIT_REPO=${inputs.repoPath}`;
  // Store scopes as a JSON array string.
  const newScopesLine = `REPO_SCOPES=${JSON.stringify(inputs.scopes)}`;

  let lines = envContent.split("\n").filter((line) => line.trim() !== "");
  let foundRepo = false;
  let foundScopes = false;

  lines = lines.map((line) => {
    if (line.startsWith("PATH_TO_GIT_REPO=")) {
      foundRepo = true;
      return newRepoLine;
    }
    if (line.startsWith("REPO_SCOPES=")) {
      foundScopes = true;
      return newScopesLine;
    }
    return line;
  });

  if (!foundRepo) {
    lines.push(newRepoLine);
  }
  if (!foundScopes) {
    lines.push(newScopesLine);
  }

  fs.writeFileSync(envFilePath, lines.join("\n"), "utf-8");
  console.log(`Updated ${envFilePath} with the new environment variables.`);
}

async function run() {
  const envFilePath = path.join(process.cwd(), ".env.local");
  let fileExists = fs.existsSync(envFilePath);
  let envContent = "";
  if (fileExists) {
    envContent = fs.readFileSync(envFilePath, "utf-8");
  }
  const lines = envContent.split("\n").filter((line) => line.trim() !== "");
  const hasRepo = lines.some((line) => line.startsWith("PATH_TO_GIT_REPO="));
  const hasScopes = lines.some((line) => line.startsWith("REPO_SCOPES="));

  if (fileExists && (hasRepo || hasScopes)) {
    const { override } = await inquirer.prompt([
      {
        type: "confirm",
        name: "override",
        message:
          "The entries already exist in .env.local. Do you want to override them?",
        default: false,
      },
    ]);
    if (!override) {
      console.log("No changes made to .env.local.");
      return;
    }
  }

  const inputs = await getUserInputs();
  updateEnvFile(inputs);
}

run().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
