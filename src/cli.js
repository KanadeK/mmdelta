#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import packageMetadata from "../package.json" with { type: "json" };
import { diffGraphs } from "./diff.js";
import { MmdeltaError } from "./errors.js";
import { parseFlowchart } from "./parser.js";
import { renderJson, renderMarkdown, renderText } from "./reporters.js";

const FORMATS = new Set(["text", "json", "markdown"]);
const FAIL_POLICIES = new Set(["any", "breaking", "never"]);

export async function main(arguments_ = process.argv.slice(2), io = process) {
  try {
    const command = parseCommand(arguments_);
    if (command.action === "help") {
      io.stdout.write(helpText());
      return 0;
    }
    if (command.action === "version") {
      io.stdout.write(`mmdelta ${packageMetadata.version}\n`);
      return 0;
    }

    await assertOutputDoesNotConflict(command);
    const [before, after] = await Promise.all([
      readGraph(command.beforePath),
      readGraph(command.afterPath),
    ]);
    const report = diffGraphs(before, after);
    const context = {
      beforePath: reportPath(command.beforePath),
      afterPath: reportPath(command.afterPath),
    };
    const output = render(report, context, command.format);

    if (command.outputPath) {
      try {
        await writeFile(command.outputPath, output, "utf8");
      } catch (error) {
        throw new MmdeltaError("OUTPUT_WRITE_FAILED", `Could not write ${command.outputPath}.`, {
          cause: error,
          hint: "Check the output directory and file permissions.",
        });
      }
    } else {
      io.stdout.write(output);
    }
    return policyExitCode(report, command.failOn);
  } catch (error) {
    const normalized = normalizeError(error);
    io.stderr.write(formatError(normalized));
    return 2;
  }
}

function parseCommand(arguments_) {
  let parsed;
  try {
    parsed = parseArgs({
      args: arguments_,
      allowPositionals: true,
      strict: true,
      options: {
        format: { type: "string", short: "f", default: "text" },
        output: { type: "string", short: "o" },
        "fail-on": { type: "string", default: "any" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (error) {
    throw new MmdeltaError("INVALID_OPTION", error.message, {
      cause: error,
      hint: "Run `mmdelta --help` for the supported options.",
    });
  }

  if (parsed.values.help) {
    return { action: "help" };
  }
  if (parsed.values.version) {
    return { action: "version" };
  }
  if (parsed.positionals.length !== 3 || parsed.positionals[0] !== "diff") {
    throw new MmdeltaError(
      "INVALID_USAGE",
      "Expected `mmdelta diff <before.mmd> <after.mmd>`.",
      { hint: "Run `mmdelta --help` for examples." },
    );
  }
  if (!FORMATS.has(parsed.values.format)) {
    throw new MmdeltaError("INVALID_OPTION", `Unsupported format: ${parsed.values.format}.`, {
      hint: "Choose text, json, or markdown.",
    });
  }
  if (!FAIL_POLICIES.has(parsed.values["fail-on"])) {
    throw new MmdeltaError(
      "INVALID_OPTION",
      `Unsupported fail policy: ${parsed.values["fail-on"]}.`,
      { hint: "Choose any, breaking, or never." },
    );
  }

  return {
    action: "diff",
    beforePath: parsed.positionals[1],
    afterPath: parsed.positionals[2],
    format: parsed.values.format,
    outputPath: parsed.values.output,
    failOn: parsed.values["fail-on"],
  };
}

async function readGraph(path) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    throw new MmdeltaError("INPUT_READ_FAILED", `Could not read ${path}.`, {
      cause: error,
      hint: "Check that the file exists and is readable UTF-8 text.",
    });
  }
  try {
    return parseFlowchart(source);
  } catch (error) {
    if (error instanceof MmdeltaError) {
      error.path = path;
    }
    throw error;
  }
}

async function assertOutputDoesNotConflict(command) {
  if (!command.outputPath) {
    return;
  }
  const output = comparablePath(command.outputPath);
  if (output === comparablePath(command.beforePath) || output === comparablePath(command.afterPath)) {
    throw new MmdeltaError("OUTPUT_CONFLICT", "The output path is also an input path.", {
      hint: "Choose a separate report path so the source diagram cannot be overwritten.",
    });
  }

  const outputIdentity = await fileIdentity(command.outputPath);
  if (!outputIdentity) {
    return;
  }
  for (const inputPath of [command.beforePath, command.afterPath]) {
    const inputIdentity = await fileIdentity(inputPath);
    if (
      inputIdentity &&
      outputIdentity.device === inputIdentity.device &&
      outputIdentity.inode === inputIdentity.inode
    ) {
      throw new MmdeltaError("OUTPUT_CONFLICT", "The output file aliases an input file.", {
        hint: "Choose a new report file, not a hard link or symbolic link to an input.",
      });
    }
  }
}

function comparablePath(path) {
  const absolute = resolve(path);
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

async function fileIdentity(path) {
  try {
    const metadata = await stat(path);
    return { device: metadata.dev, inode: metadata.ino };
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw new MmdeltaError("PATH_INSPECTION_FAILED", `Could not inspect ${path}.`, {
      cause: error,
      hint: "Check the file and parent-directory permissions.",
    });
  }
}

function render(report, context, format) {
  if (format === "json") {
    return renderJson(report, context);
  }
  if (format === "markdown") {
    return renderMarkdown(report, context);
  }
  return renderText(report, context);
}

function policyExitCode(report, policy) {
  if (policy === "never") {
    return 0;
  }
  if (policy === "breaking") {
    return report.hasBreakingChanges ? 1 : 0;
  }
  return report.hasChanges ? 1 : 0;
}

function reportPath(path) {
  return path.replaceAll("\\", "/");
}

function normalizeError(error) {
  if (error instanceof MmdeltaError) {
    return error;
  }
  return new MmdeltaError("INTERNAL_ERROR", "mmdelta could not complete the comparison.", {
    cause: error,
    hint: "Re-run with smaller supported inputs; report a reproducible case if it persists.",
  });
}

function formatError(error) {
  const location = error.path
    ? `${reportPath(error.path)}${error.line ? `:${error.line}` : ""}: `
    : error.line
      ? `line ${error.line}: `
      : "";
  const hint = error.hint ? `\nhint: ${error.hint}` : "";
  return `error [${error.code}] ${location}${error.message}${hint}\n`;
}

function helpText() {
  return `mmdelta ${packageMetadata.version}

Semantic diffs for a strict Mermaid flowchart subset.

Usage:
  mmdelta diff <before.mmd> <after.mmd> [options]

Options:
  -f, --format <text|json|markdown>  Report format (default: text)
  -o, --output <path>                Write the report to a separate file
      --fail-on <any|breaking|never> Exit 1 policy (default: any)
  -h, --help                         Show this help
  -v, --version                      Show the version

Exit codes:
  0  No differences under the selected policy
  1  Differences meet the selected policy
  2  Usage, input, parse, resource, or output error
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
