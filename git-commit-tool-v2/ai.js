import dotenv from "dotenv";
import Groq from "groq-sdk";
import { gitAdd, gitCommit, gitDiff } from "./git-actions.js";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Initialize Groq client
const groq = new Groq();

// Debug logging flag
const SHOW_LOGS = false;

// Function to parse REPO_SCOPES from environment
function getRepoScopes() {
  try {
    return JSON.parse(process.env.REPO_SCOPES || "[]");
  } catch (error) {
    if (SHOW_LOGS) console.error("Error parsing REPO_SCOPES:", error);
    return [];
  }
}

/**
 * Generates a commit message based on git diff using Groq's AI,
 * stages changes with git add, and commits them using git commit.
 * @returns {Promise<string>} A formatted commit message
 */
export async function generateCommitMessage() {
  const diff = gitDiff();
  if (!diff) {
    throw new Error("No git diff available");
  }

  const repoScopes = getRepoScopes();
  const validCommitTypes = [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "chore",
    "ci",
    "build",
    "revert",
  ];

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a commit message generator that follows the Conventional Commits specification.
Your task is to analyze git diffs and generate a single-line commit message in the format: "<type>(<scope>): <description>"

Rules:
1. Type MUST be exactly one of these: ${validCommitTypes.join(", ")}
2. Scope MUST be exactly one of these: ${repoScopes.join(", ")}
3. Description should be clear, concise, and in present tense
4. The entire message should be under 100 characters
5. Do not include any breaking change indicators or body text

Use the provided tools to validate your commit type and scope before generating the final message.
First validate the type and scope separately using the tools, then combine them with your description to form the commit message.

IMPORTANT: You must respond with ONLY a JSON object in this format:
{
  "commit_message": "<type>(<scope>): <description>"
}`,
        },
        {
          role: "user",
          content: `Generate a commit message for the following git diff:\n\n${diff}`,
        },
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.6,
      reasoning_format: "hidden",
      response_format: { type: "json_object" },
    });

    if (SHOW_LOGS)
      console.log("\nAI Response:", completion.choices[0]?.message);

    // Get the generated commit message
    const response = completion.choices[0]?.message?.content?.trim();
    if (SHOW_LOGS) console.log("\nAI Raw Response:", response);

    try {
      const parsedResponse = JSON.parse(response || "{}");
      const commitMessage = parsedResponse.commit_message;

      if (!commitMessage) {
        throw new Error("No commit message was generated");
      }

      console.log("\nGenerated commit message:", commitMessage);

      // Validate format
      const formatRegex =
        /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)\(([^)]+)\): .+$/;
      if (!formatRegex.test(commitMessage)) {
        if (SHOW_LOGS) {
          console.log(
            "Format validation failed! Message must match pattern: <type>(<scope>): <description>"
          );
          console.log("Valid types:", validCommitTypes.join(", "));
          console.log("Valid scopes:", repoScopes.join(", "));
        }
        throw new Error(
          "Generated commit message does not follow the correct format"
        );
      }

      // Stage all changes using git add (default adds all changes)
      const addOutput = gitAdd();
      if (SHOW_LOGS) console.log("Git add output:", addOutput);

      // Commit the staged changes with the generated commit message
      const commitOutput = gitCommit(commitMessage);
      if (SHOW_LOGS) console.log("Git commit output:", commitOutput);

      return commitMessage;
    } catch (parseError) {
      if (SHOW_LOGS) console.error("Error parsing AI response:", parseError);
      throw new Error("Invalid response format from AI");
    }
  } catch (error) {
    if (SHOW_LOGS) console.error("Error generating commit message:", error);
    throw error;
  }
}
