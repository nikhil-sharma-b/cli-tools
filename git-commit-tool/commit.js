/**
 * @fileoverview Git status command handler with proper error handling and type safety
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { exec } from "child_process";
import { config } from "dotenv";

config({ path: ".env.local" });

// Variables
// AI Variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

/**
 * Utility function to conditionally log messages
 * @param {string} message - The message to log
 */
const log = (message) => {
  if (process.env.SHOW_LOGS === "true") {
    console.log(message);
  }
};

const schema = {
  description: "Commit message",
  type: SchemaType.OBJECT,
  properties: {
    commitMessage: {
      type: SchemaType.STRING,
      description: `Commit message with the scope being one of ${process.env.COMMIT_SCOPES}`,
      nullable: false,
    },
  },
  required: ["commitMessage"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

// Data Variables
log("Commit Scopes:" + process.env.COMMIT_SCOPES);

// Validate required environment variables
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

/**
 * Main execution function
 * @returns {Promise<void>}
 */
const main = async () => {
  try {
    const [statusOutput, diffOutput] = await Promise.all([
      getGitStatus(),
      getGitDiff(),
    ]);

    const prompt = `Please analyze the following git status and diff output and generate a commit message that follows the conventional commit message format. Use lowercases unless a word is a proper noun or is an acronym. Give me the commit message alone and no other explanation.:
Status:
${statusOutput}

Changes (diff):
${diffOutput}`;

    log("Generated Prompt:" + prompt);

    const result = await model.generateContent(prompt);
    const { commitMessage } = JSON.parse(result.response.text());

    log("Commit Message:" + commitMessage);
    await gitCommit(commitMessage);

    console.log("\nCommit successful! 🎉");
  } catch (error) {
    console.error("Error executing git commands:", error.message);
    process.exit(1);
  }
};

// Execute the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
