/**
 * 📝 Logger & Monitoring - نظام السجلات والمراقبة
 */

export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SUCCESS: 'success'
};

class Logger {
  constructor() {
    this.logs = [];
  }

  log(level, module, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data
    };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.shift();

    const emoji = {
      info: '💬',
      warn: '⚠️',
      error: '🔴',
      success: '✅'
    }[level] || '📝';

    const formatted = `${emoji} [${module}] ${message}`;
    if (level === 'error') console.error(formatted, data);
    else if (level === 'warn') console.warn(formatted, data);
    else console.log(formatted, data);

    return entry;
  }

  info(module, msg, data) { return this.log(LogLevel.INFO, module, msg, data); }
  warn(module, msg, data) { return this.log(LogLevel.WARN, module, msg, data); }
  error(module, msg, data) { return this.log(LogLevel.ERROR, module, msg, data); }
  success(module, msg, data) { return this.log(LogLevel.SUCCESS, module, msg, data); }

  getLogs(limit = 100) {
    return this.logs.slice(-limit).reverse();
  }
}

const logger = new Logger();
export default logger;
