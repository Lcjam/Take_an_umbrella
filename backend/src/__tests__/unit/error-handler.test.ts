import { Request, Response, NextFunction } from 'express';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ExternalApiError,
} from '../../types/errors';
import { errorHandler } from '../../middlewares/error-handler';
import { logger } from '../../utils/logger';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    // Mock Request
    mockRequest = {};

    // Mock Response
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    mockResponse = {
      status: statusSpy,
    };

    // Mock NextFunction
    mockNext = jest.fn();

    // Jest console spy to suppress error logs in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AppError handling', () => {
    test('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input', {
        field: 'email',
        value: 'invalid',
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email', value: 'invalid' },
        },
      });
    });

    test('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('User not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    test('should handle UnauthorizedError with 401 status', () => {
      const error = new UnauthorizedError('Invalid token');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      });
    });

    test('should handle ConflictError with 409 status', () => {
      const error = new ConflictError('User already exists');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'User already exists',
        },
      });
    });

    test('should handle ExternalApiError with 502 status', () => {
      const error = new ExternalApiError('Weather API failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(502);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'EXTERNAL_API_ERROR',
          message: 'Weather API failed',
        },
      });
    });
  });

  describe('Generic Error handling', () => {
    test('should handle generic Error with 500 status in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('should expose error details in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('should expose error stack in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      const callArgs = jsonSpy.mock.calls[0][0];
      expect(callArgs.success).toBe(false);
      expect(callArgs.error.code).toBe('INTERNAL_ERROR');
      expect(callArgs.error.message).toBe('Test error');
      expect(callArgs.error.details).toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Logging', () => {
    test('should log error using logger', () => {
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

      const error = new ValidationError('Invalid input');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });
});
