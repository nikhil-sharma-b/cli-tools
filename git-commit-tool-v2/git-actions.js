import { execSync } from "child_process";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Debug logging flag
const SHOW_LOGS = false;

const repoPath = process.env.PATH_TO_GIT_REPO;

if (!repoPath) {
  console.error(
    "No PATH_TO_GIT_REPO found in environment variables. Please run the setup first."
  );
  process.exit(1);
}

/**
 * Runs 'git status' in the repository defined by PATH_TO_GIT_REPO.
 * @returns {string} The output from 'git status'.
 */
export function gitStatus() {
  try {
    return execSync("git status", { cwd: repoPath, encoding: "utf-8" });
  } catch (error) {
    console.error("Error running git status:", error.message);
    return null;
  }
}

/**
 * Runs 'git diff' in the repository defined by PATH_TO_GIT_REPO.
 * @returns {string} The output from 'git diff'.
 */
export function gitDiff() {
  try {
    return execSync("git diff", { cwd: repoPath, encoding: "utf-8" });
  } catch (error) {
    console.error("Error running git diff:", error.message);
    return null;
  }
}

/**
 * Runs 'git add' in the repository defined by PATH_TO_GIT_REPO.
 * By default, adds all changes. You can pass a specific file or an array of files.
 * @param {string|string[]} [files="."] - The file(s) to add.
 * @returns {string|null} The output from 'git add' or null if an error occurred.
 */
export function gitAdd(files = ".") {
  try {
    let filesArg = Array.isArray(files) ? files.join(" ") : files;
    return execSync(`git add ${filesArg}`, {
      cwd: repoPath,
      encoding: "utf-8",
    });
  } catch (error) {
    console.error("Error running git add:", error.message);
    return null;
  }
}

/**
 * Runs 'git commit' with the provided commit message in the repository defined by PATH_TO_GIT_REPO.
 * @param {string} commitMessage - The commit message to use.
 * @returns {string|null} The output from 'git commit' or null if an error occurred.
 */
export function gitCommit(commitMessage) {
  if (!commitMessage) {
    console.error("Commit message is required for git commit.");
    return null;
  }
  try {
    return execSync(`git commit -m "${commitMessage}"`, {
      cwd: repoPath,
      encoding: "utf-8",
    });
  } catch (error) {
    // Check if the error contains a successful commit message
    // Git sometimes exits with code 1 even on successful commits due to hooks or other factors
    if (
      error.stdout &&
      (error.stdout.includes("file changed") ||
        error.stdout.includes("files changed"))
    ) {
      return error.stdout; // Return the output as it was likely a successful commit
    }
    // Only log error if it's a genuine failure
    if (SHOW_LOGS) console.error("Error running git commit:", error.message);
    return null;
  }
}
