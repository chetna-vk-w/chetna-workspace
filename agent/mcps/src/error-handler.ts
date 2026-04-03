/**
 * Custom error classes for better error handling
 */

export class SSHConnectionError extends Error {
  constructor(message: string, public host: string, public port: number) {
    super(message);
    this.name = 'SSHConnectionError';
  }
}

export class SSHAuthenticationError extends Error {
  constructor(message: string, public username: string) {
    super(message);
    this.name = 'SSHAuthenticationError';
  }
}

export class SSHCommandError extends Error {
  constructor(message: string, public command: string, public exitCode?: number) {
    super(message);
    this.name = 'SSHCommandError';
  }
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class ConnectionNotFoundError extends Error {
  constructor(connectionId: string) {
    super(`Connection not found: ${connectionId}`);
    this.name = 'ConnectionNotFoundError';
  }
}

export class InvalidConfigError extends Error {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`);
    this.name = 'InvalidConfigError';
  }
}

export class StorageError extends Error {
  constructor(message: string, public operation: string) {
    super(`Storage error during ${operation}: ${message}`);
    this.name = 'StorageError';
  }
}

/**
 * Validate SSH connection configuration
 */
export function validateSSHConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || typeof config.name !== 'string') {
    errors.push('Connection name is required and must be a string');
  }

  if (!config.host || typeof config.host !== 'string') {
    errors.push('Host is required and must be a string');
  } else {
    // Basic hostname/IP validation
    const hostPattern = /^[a-zA-Z0-9.-]+$/;
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!hostPattern.test(config.host) && !ipPattern.test(config.host)) {
      errors.push('Host must be a valid hostname or IP address');
    }
  }

  if (config.port !== undefined) {
    const port = Number(config.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('Port must be a number between 1 and 65535');
    }
  }

  if (!config.username || typeof config.username !== 'string') {
    errors.push('Username is required and must be a string');
  }

  // Check authentication method
  const hasPassword = config.password && typeof config.password === 'string';
  const hasPrivateKey = config.privateKey && typeof config.privateKey === 'string';
  const hasPrivateKeyPath = config.privateKeyPath && typeof config.privateKeyPath === 'string';

  if (!hasPassword && !hasPrivateKey && !hasPrivateKeyPath) {
    errors.push('Authentication required: provide password, privateKey, or privateKeyPath');
  }

  // Validate private key format if inline key provided
  if (hasPrivateKey) {
    if (!config.privateKey.includes('BEGIN') || !config.privateKey.includes('PRIVATE KEY')) {
      errors.push('Private key appears to be invalid (missing BEGIN/PRIVATE KEY markers)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: Error, includeDetails: boolean = false): string {
  // Remove sensitive information from error messages
  let message = error.message;

  // Remove IP addresses in production
  if (!includeDetails) {
    message = message.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>');
  }

  // Remove file paths
  if (!includeDetails) {
    message = message.replace(/\/[\w\/.-]+/g, '<PATH>');
  }

  // Remove passwords if accidentally included
  message = message.replace(/password[=:]\s*\S+/gi, 'password=<REDACTED>');

  return message;
}

/**
 * Retry mechanism for transient errors
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication errors or invalid config
      if (
        error instanceof SSHAuthenticationError ||
        error instanceof InvalidConfigError ||
        error instanceof ConnectionNotFoundError
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt, error);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError!;
}

/**
 * Rate limiter to prevent abuse
 */
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const timestamps = this.timestamps.get(key) || [];

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    validTimestamps.push(now);
    this.timestamps.set(key, validTimestamps);

    return true;
  }

  reset(key: string): void {
    this.timestamps.delete(key);
  }
}

/**
 * Validate command for safety
 */
export function validateCommand(command: string): { safe: boolean; reason?: string } {
  if (!command || typeof command !== 'string') {
    return { safe: false, reason: 'Command must be a non-empty string' };
  }

  if (command.length > 10000) {
    return { safe: false, reason: 'Command too long (max 10000 characters)' };
  }

  // Warn about potentially dangerous commands (but don't block)
  const dangerousPatterns = [
    /rm\s+-rf\s+\/[^\/\s]*/,  // rm -rf /something
    /:\(\)\s*\{\s*:|.*fork.*bomb/i,  // Fork bombs
    /mkfs\./,  // Format filesystem
    /dd\s+if=.*of=\/dev\/(sd|hd|nvme)/,  // Overwrite disk
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      console.warn(`[WARNING] Potentially dangerous command detected: ${command.substring(0, 50)}...`);
      // Don't block, just warn
      break;
    }
  }

  return { safe: true };
}
