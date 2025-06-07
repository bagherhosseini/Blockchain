export class BlockchainError extends Error {
  constructor(message, statusCode = 500, errorCode = 'BLOCKCHAIN_ERROR') {
    super(message);
    this.name = 'BlockchainError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends Error {
  constructor(message, field = null, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.errorCode = 'VALIDATION_ERROR';
    this.field = field;
    this.timestamp = new Date().toISOString();
  }
}

export class MiningError extends Error {
  constructor(message, blockIndex = null, statusCode = 500) {
    super(message);
    this.name = 'MiningError';
    this.statusCode = statusCode;
    this.errorCode = 'MINING_ERROR';
    this.blockIndex = blockIndex;
    this.timestamp = new Date().toISOString();
  }
}

export class ProofOfWorkError extends Error {
  constructor(message, blockHash = null, statusCode = 422) {
    super(message);
    this.name = 'ProofOfWorkError';
    this.statusCode = statusCode;
    this.errorCode = 'PROOF_OF_WORK_ERROR';
    this.blockHash = blockHash;
    this.timestamp = new Date().toISOString();
  }
}

export class FileSystemError extends Error {
  constructor(message, operation = null, statusCode = 500) {
    super(message);
    this.name = 'FileSystemError';
    this.statusCode = statusCode;
    this.errorCode = 'FILESYSTEM_ERROR';
    this.operation = operation;
    this.timestamp = new Date().toISOString();
  }
}

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const getErrorSeverity = (error) => {
  if (error.statusCode >= 500) {
    return ErrorSeverity.CRITICAL;
  } else if (error.statusCode >= 400) {
    return ErrorSeverity.MEDIUM;
  } else if (error instanceof ValidationError) {
    return ErrorSeverity.LOW;
  } else if (error instanceof ProofOfWorkError || error instanceof MiningError) {
    return ErrorSeverity.HIGH;
  } else {
    return ErrorSeverity.MEDIUM;
  }
};

const formatErrorResponse = (error, req) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const baseResponse = {
    success: false,
    errorId,
    error: {
      code: error.errorCode || 'INTERNAL_ERROR',
      message: error.message,
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  if (!isProduction) {
    baseResponse.error.stack = error.stack;
    baseResponse.error.name = error.name;

    if (error.field) baseResponse.error.field = error.field;
    if (error.blockIndex !== null) baseResponse.error.blockIndex = error.blockIndex;
    if (error.blockHash) baseResponse.error.blockHash = error.blockHash;
    if (error.operation) baseResponse.error.operation = error.operation;
  }

  baseResponse.request = {
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  };

  return baseResponse;
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const severity = getErrorSeverity(error);

  const logContext = {
    errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    severity,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      code: error.errorCode,
      stack: error.stack
    }
  };

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${severity.toUpperCase()}] ${error.name}: ${error.message}`);
    console.error(`URL: ${req.method} ${req.originalUrl}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  const errorResponse = formatErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.errorCode = 'ROUTE_NOT_FOUND';
  next(error);
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const handleJoiError = (error) => {
  if (error.name === 'ValidationError' && error.details) {
    const message = error.details.map(detail => detail.message).join(', ');
    const field = error.details[0]?.path?.join('.') || 'unknown';
    throw new ValidationError(message, field);
  }
  throw error;
};

export const handleBlockchainOperation = async (operation, context = {}) => {
  try {
    return await operation();
  } catch (error) {
    if (error.message.includes('mining') || error.message.includes('nonce')) {
      throw new MiningError(error.message, context.blockIndex);
    } else if (error.message.includes('proof of work') || error.message.includes('hash')) {
      throw new ProofOfWorkError(error.message, context.blockHash);
    } else if (error.message.includes('file') || error.message.includes('JSON')) {
      throw new FileSystemError(error.message, context.operation);
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      throw new ValidationError(error.message, context.field);
    } else {
      throw new BlockchainError(error.message, 500, 'BLOCKCHAIN_OPERATION_ERROR');
    }
  }
};

export const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property]);

      if (error) {
        handleJoiError(error);
      }

      req[property] = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export const rateLimitHandler = (req, res) => {
  const error = new Error('Too many requests, please try again later');
  error.statusCode = 429;
  error.errorCode = 'RATE_LIMIT_EXCEEDED';

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`Rate limit exceeded: ${req.ip} - ${req.method} ${req.originalUrl}`);
  }

  const errorResponse = formatErrorResponse(error, req);
  res.status(429).json(errorResponse);
};

export const securityErrorHandler = (error, req, res, next) => {
  if (error.message.includes('security') || error.message.includes('helmet')) {
    const securityError = new Error('Security policy violation');
    securityError.statusCode = 403;
    securityError.errorCode = 'SECURITY_VIOLATION';

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Security Policy Violation: ${error.message} - ${req.ip} ${req.method} ${req.originalUrl}`);
    }

    return next(securityError);
  }

  next(error);
};

export const setupProcessErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    console.error(error.stack);

    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason?.message || reason);
    if (reason?.stack) {
      console.error(reason.stack);
    }
  });
};

export const ErrorFactory = {
  blockNotFound: (index) => new BlockchainError(`Block with index ${index} not found`, 404, 'BLOCK_NOT_FOUND'),

  invalidBlockData: (message) => new ValidationError(`Invalid block data: ${message}`, 'blockData'),

  miningFailed: (blockIndex, reason) => new MiningError(`Mining failed for block ${blockIndex}: ${reason}`, blockIndex),

  proofOfWorkInvalid: (blockHash) => new ProofOfWorkError(`Proof of work validation failed`, blockHash),

  chainInvalid: () => new BlockchainError('Blockchain validation failed', 422, 'CHAIN_INVALID'),

  persistenceError: (operation, details) => new FileSystemError(`Persistence error during ${operation}: ${details}`, operation),

  complexObjectInvalid: (type, id) => new ValidationError(`Complex object validation failed for ${type} with id ${id}`, 'complexObject')
};

export default errorHandler; 