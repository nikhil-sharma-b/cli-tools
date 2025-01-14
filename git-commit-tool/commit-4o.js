import { exec } from "child_process";
import { config } from "dotenv";
import OpenAI from "openai";

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o";
const commitTypes = [
  "fix",
  "feat",
  "refactor",
  "chore",
  "docs",
  "style",
  "test",
  "ci",
];

config({ path: ".env.local" });

if (!process.env.REPO_DIR) {
  console.error("Error: REPO_DIR environment variable is not set");
  process.exit(1);
}

/**
 * Executes git status command and returns the output
 * @returns {Promise<string>} The git status command output
 * @throws {Error} If the git status command fails
 */
const getGitStatus = () => {
  return new Promise((resolve, reject) => {
    const options = { cwd: process.env.REPO_DIR };

    exec("git status", options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to get git status: ${error.message}`));
        return;
      }

      if (stderr) {
        reject(new Error(`Git status error: ${stderr}`));
        return;
      }

      resolve(stdout.trim());
    });
  });
};

/**
 * Executes git add . command
 * @returns {Promise<void>}
 * @throws {Error} If the git add command fails
 */
const gitAdd = () => {
  return new Promise((resolve, reject) => {
    const options = { cwd: process.env.REPO_DIR };

    exec("git add .", options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to execute git add: ${error.message}`));
        return;
      }

      if (stderr) {
        reject(new Error(`Git add error: ${stderr}`));
        return;
      }

      resolve();
    });
  });
};

/**
 * Executes git diff --cached command and returns the output
 * @returns {Promise<string>} The git diff command output
 * @throws {Error} If the git diff command fails
 */
const getGitDiff = async () => {
  await gitAdd();

  return new Promise((resolve, reject) => {
    const options = { cwd: process.env.REPO_DIR };

    exec("git diff --cached", options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to get git diff: ${error.message}`));
        return;
      }

      if (stderr) {
        reject(new Error(`Git diff error: ${stderr}`));
        return;
      }

      resolve(stdout.trim());
    });
  });
};

/**
 * Executes git commit command with the provided message
 * @param {string} message - The commit message
 * @returns {Promise<void>}
 * @throws {Error} If the git commit command fails
 */
const gitCommit = (message) => {
  return new Promise((resolve, reject) => {
    const options = { cwd: process.env.REPO_DIR };

    // Escape single quotes in the message to prevent command injection
    const escapedMessage = message.replace(/'/g, "'\\''");

    exec(
      `git commit -m '${escapedMessage}'`,
      options,
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to commit changes: ${error.message}`));
          return;
        }

        if (stderr && process.env.SHOW_LOGS === "true") {
          // Git sometimes writes to stderr for non-error messages
          console.log(stderr);
        }

        if (stdout && process.env.SHOW_LOGS === "true") {
          console.log(stdout);
        }

        resolve();
      }
    );
  });
};

export async function main() {
  const client = new OpenAI({ baseURL: endpoint, apiKey: token });

  const [statusOutput, diffOutput] = await Promise.all([
    getGitStatus(),
    getGitDiff(),
  ]);

  const response = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a Senior Software Engineer who is a genius at writing git commit messages. Provide all responses in JSON format with the structure: {"commitMessage": "string"}. Write single-line commit messages that meets the conventional commit standards.`,
      },
      {
        role: "user",
        content: `Scopes:\n${process.env.COMMIT_SCOPES}\nCommit types:\n${commitTypes}\nStatus:\n${statusOutput}\nChanges:\n${diffOutput}`,
      },
    ],
    temperature: 1.0,
    top_p: 1.0,
    max_tokens: 1000,
    model: modelName,
    response_format: { type: "json_object" },
  });

  const { commitMessage } = JSON.parse(response.choices[0].message.content);

  await gitCommit(commitMessage);

  console.log("\nCommit Message: ", commitMessage);
  console.log("\nCommit successful! 🎉");
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});
