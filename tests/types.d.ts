// Global type declarations for tests

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(a: number, b: number): R;
    }
  }
}

// Extend Express Request for authenticated requests
declare namespace Express {
  interface Request {
    user?: {
      _id: string;
      email: string;
      full_name: string;
    };
  }
}

// Socket.IO extensions for testing
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    userName?: string;
  }
}

// Mongoose mock extensions
declare module 'mongoose' {
  interface Model<T> {
    mockImplementation?: jest.MockImplementation;
    mockResolvedValue?: jest.MockImplementation;
    mockRejectedValue?: jest.MockImplementation;
  }
}

export {};