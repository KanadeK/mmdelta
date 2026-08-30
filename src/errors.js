export class MmdeltaError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "MmdeltaError";
    this.code = code;
    this.line = options.line;
    this.hint = options.hint;
  }
}

export function syntaxError(message, line, hint) {
  return new MmdeltaError("UNSUPPORTED_SYNTAX", message, { line, hint });
}
