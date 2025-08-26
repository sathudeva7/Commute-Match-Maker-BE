// Test helper utilities

/**
 * Suppress TypeScript errors for test mocks
 */
export const suppressTsErrors = {
  // Use this function to wrap any mock that's causing TS errors
  mock: <T>(value: any): T => value as T,
  
  // Use this for mock implementations
  mockFn: <T extends (...args: any[]) => any>(fn?: T): jest.MockedFunction<T> => 
    fn as jest.MockedFunction<T>,
    
  // Use this for any values that need type assertion
  any: <T>(value: any): T => value as T
};

/**
 * Create a typed mock for testing
 */
export function createMock<T>(overrides: Partial<T> = {}): T {
  return overrides as T;
}

/**
 * Type-safe mock function creator
 */
export function mockFunction<T extends (...args: any[]) => any>(): jest.MockedFunction<T> {
  return jest.fn() as jest.MockedFunction<T>;
}

/**
 * Helper to ignore TypeScript errors in test blocks
 */
export const ignoreTS = {
  // @ts-ignore wrapper for single expressions
  ignore: <T>(value: T): T => {
    // @ts-ignore
    return value;
  }
};

export default suppressTsErrors;