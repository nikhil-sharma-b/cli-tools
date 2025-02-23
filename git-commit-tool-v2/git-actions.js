import { execSync } from "child_process";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

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
    const output = execSync("git status", { cwd: repoPath, encoding: "utf-8" });
    console.log(output);
    return output;
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
    const output = execSync("git diff", { cwd: repoPath, encoding: "utf-8" });
    console.log(output);
    return output;
  } catch (error) {
    console.error("Error running git diff:", error.message);
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
    // Note: Ensure that changes have been staged prior to committing.
    const output = execSync(`git commit -m "${commitMessage}"`, {
      cwd: repoPath,
      encoding: "utf-8",
    });
    console.log(output);
    return output;
  } catch (error) {
    console.error("Error running git commit:", error.message);
    return null;
  }
}
