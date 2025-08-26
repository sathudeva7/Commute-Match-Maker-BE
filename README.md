# Commute Match Maker Backend - Testing Guide

This document provides comprehensive guidance on testing the Commute Match Maker Backend application.

## Test Structure

The testing suite is organized into several categories:

### 1. Unit Tests (`tests/unit/`)
- **Controllers**: Test API endpoint handlers
- **Services**: Test business logic and data processing
- **Repositories**: Test data access layer
- **Middleware**: Test authentication and validation

### 2. Integration Tests (`tests/integration/`)
- **API Integration**: Test complete API workflows
- **Database Integration**: Test repository operations with real database
- **Socket Integration**: Test real-time messaging functionality

### 3. End-to-End Tests (`tests/e2e/`)
- **User Journey**: Complete user workflows from registration to matching
- **Real-time Features**: WebSocket communication testing
- **Error Scenarios**: Edge cases and error handling

## Setup and Installation

### Prerequisites
```bash
# Install dependencies
npm install

# Install test dependencies (if not already included)
npm install --save-dev jest @types/jest supertest socket.io-client mongodb-memory-server
```

### Environment Setup
```bash
# Copy test environment file
cp .env.test.example .env.test

# Configure test environment variables
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Running Tests

### All Tests
```bash
npm test
```

### Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode for development
npm run test:watch

# Test coverage report
npm run test:coverage
```

### Specific Test Files
```bash
# Run specific test file
npx jest tests/unit/services/user.service.test.ts

# Run tests matching pattern
npx jest --testNamePattern="should register user"

# Run tests for specific module
npx jest user
```

## Test Coverage

The test suite covers:

### Authentication & Authorization (15 tests)
- ✅ User registration with valid data
- ❌ Registration with existing email
- ✅ Login with valid credentials
- ❌ Login with invalid credentials
- ✅ JWT token validation
- ❌ Access with invalid/expired tokens

### Chat Functionality (35 tests)
- ✅ Create direct and group chats
- ✅ Send and receive messages
- ✅ Real-time messaging via WebSocket
- ✅ Message status updates (sent/delivered/read)
- ✅ Typing indicators
- ✅ Chat participant management
- ❌ Unauthorized access attempts

### User Management (20 tests)
- ✅ Profile creation and updates
- ✅ Matching preferences validation
- ✅ Password hashing and sanitization
- ❌ Invalid preference values
- ✅ Profile data privacy

### Journey Management (25 tests)
- ✅ Journey creation and updates
- ✅ Similar journey matching
- ✅ Route-based journey search
- ✅ Journey statistics
- ❌ Invalid travel modes and data
- ❌ Unauthorized journey modifications

### Real-time Features (20 tests)
- ✅ WebSocket connection and authentication
- ✅ Real-time message broadcasting
- ✅ Online status tracking
- ✅ Chat room management
- ❌ Connection without authentication

### Database Operations (25 tests)
- ✅ CRUD operations across all entities
- ✅ Data relationships and integrity
- ✅ Pagination and filtering
- ✅ Transaction handling
- ✅ Soft deletion

## Test Data Management

### Database Cleanup
Tests use MongoDB Memory Server for isolation:
- Each test suite gets a fresh database
- Automatic cleanup between tests
- No impact on development/production data

### Test Fixtures
Common test data is defined in setup files:
```typescript
// Example test user
const testUser = {
  full_name: 'John Doe',
  email: 'john@test.com',
  password: 'password123',
  gender: 'MALE'
};
```

## Mock Strategy

### External Dependencies
- Database models are mocked for unit tests
- Real database used for integration tests
- JWT and bcrypt libraries mocked for unit tests

### Service Layer
- Repository layer mocked for service tests
- External APIs mocked (if any)
- File system operations mocked

## Test Patterns

### Arrange-Act-Assert
```typescript
it('should create user successfully', async () => {
  // Arrange
  const userData = { name: 'John', email: 'john@test.com' };
  mockUserRepo.create.mockResolvedValue(expectedUser);

  // Act
  const result = await userService.createUser(userData);

  // Assert
  expect(result).toEqual(expectedUser);
  expect(mockUserRepo.create).toHaveBeenCalledWith(userData);
});
```

### Error Testing
```typescript
it('should throw error when user not found', async () => {
  mockUserRepo.findById.mockResolvedValue(null);

  await expect(userService.getUser('invalid-id'))
    .rejects
    .toThrow('User not found');
});
```

### Async Operations
```typescript
it('should handle async operations', async () => {
  const promise = userService.createUser(userData);
  
  await expect(promise).resolves.toBeDefined();
});
```

## WebSocket Testing

### Connection Testing
```typescript
it('should connect with valid token', (done) => {
  const client = Client(`http://localhost:${port}`, {
    auth: { token: validToken }
  });

  client.on('connect', () => {
    expect(client.connected).toBe(true);
    client.disconnect();
    done();
  });
});
```

### Real-time Message Testing
```typescript
it('should broadcast messages', (done) => {
  client2.on('new_message', (message) => {
    expect(message.content).toBe('Hello!');
    done();
  });

  client1.emit('send_message', {
    chatId: 'chat123',
    content: 'Hello!'
  });
});
```

## Performance Testing

### Load Testing
```typescript
it('should handle concurrent operations', async () => {
  const promises = Array(100).fill(null).map(() => 
    request(app).post('/api/user/register').send(userData)
  );

  const responses = await Promise.all(promises);
  responses.forEach(response => {
    expect(response.status).toBe(201);
  });
});
```

## Security Testing

### Authentication Testing
```typescript
it('should reject invalid tokens', async () => {
  const response = await request(app)
    .get('/api/user/profile')
    .set('Authorization', 'Bearer invalid-token');

  expect(response.status).toBe(401);
});
```

### Authorization Testing
```typescript
it('should prevent unauthorized access', async () => {
  const response = await request(app)
    .put('/api/journey/other-user-journey-id')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ title: 'Hacked' });

  expect(response.status).toBe(403);
});
```

## Debugging Tests

### Verbose Output
```bash
# Run tests with detailed output
npm test -- --verbose

# Run tests with coverage and debug info
npm test -- --coverage --detectOpenHandles
```

### Test Debugging
```typescript
// Add debug logging
console.log('Test data:', testData);

// Use Jest's debug mode
// Add debugger; statements and run with --runInBand
```

### Common Issues

1. **Timeout Errors**
   - Increase Jest timeout: `jest.setTimeout(10000)`
   - Check for hanging promises
   - Ensure proper cleanup

2. **Database Connection Issues**
   - Verify MongoDB Memory Server setup
   - Check for unclosed connections
   - Ensure proper beforeEach/afterEach cleanup

3. **Socket.IO Testing Issues**
   - Ensure proper client disconnection
   - Check port conflicts
   - Verify authentication setup

## Best Practices

### Test Organization
- One test file per source file
- Group related tests with `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange-Act-Assert)

### Test Data
- Use factories for test data creation
- Avoid hard-coded IDs
- Clean up test data between tests
- Use realistic but minimal test data

### Assertions
- Test both success and failure cases
- Verify all relevant response properties
- Check side effects (database changes, etc.)
- Use specific matchers (`toBe`, `toEqual`, `toContain`)

### Async Testing
- Always return promises or use async/await
- Handle rejection testing properly
- Set appropriate timeouts
- Clean up async operations

## Continuous Integration

### GitHub Actions (Example)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Coverage Goals

- **Unit Tests**: >90% line coverage
- **Integration Tests**: All major workflows
- **E2E Tests**: Critical user journeys
- **Overall**: >85% total coverage

## Contributing

When adding new features:

1. Write tests before implementation (TDD)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update test documentation
5. Add integration tests for new endpoints
6. Include error case testing

## Troubleshooting

### Common Test Failures

1. **"Cannot find module" errors**
   - Check import paths
   - Verify mock setup
   - Ensure Jest configuration is correct

2. **Database connection errors**
   - Verify MongoDB Memory Server setup
   - Check for port conflicts
   - Ensure proper cleanup

3. **Authentication failures**
   - Verify JWT secret in test environment
   - Check token generation in tests
   - Ensure user exists in test database

4. **WebSocket connection issues**
   - Check server startup in tests
   - Verify client/server configurations
   - Ensure proper cleanup of connections

For additional help, check the test logs and enable debug mode for more detailed information.