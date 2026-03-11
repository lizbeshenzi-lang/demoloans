type LogLevel = "debug" | "info" | "warn" | "error";

function shouldLog(level: LogLevel) {
  if (import.meta.env.DEV) return true;
  // In production, keep console noise low; errors still log.
  return level === "error" || level === "warn";
}

export const logger = {
  debug: (...args: unknown[]) => shouldLog("debug") && console.debug(...args),
  info: (...args: unknown[]) => shouldLog("info") && console.info(...args),
  warn: (...args: unknown[]) => shouldLog("warn") && console.warn(...args),
  error: (...args: unknown[]) => shouldLog("error") && console.error(...args),
};

