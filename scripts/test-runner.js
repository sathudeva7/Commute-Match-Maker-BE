#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const testFiles = {
  // Unit Tests - Services
  'user-service': 'tests/unit/services/user.service.test.ts',
  'chat-service': 'tests/unit/services/chat.service.test.ts',
  'journey-service': 'tests/unit/services/journey.service.test.ts',
  'socket-service': 'tests/unit/services/socket.service.test.ts',
  
  // Unit Tests - Controllers
  'user-controller': 'tests/unit/controllers/user.controller.test.ts',
  'chat-controller': 'tests/unit/controllers/chat.controller.test.ts',
  'journey-controller': 'tests/unit/controllers/journey.controller.test.ts',
  
  // Unit Tests - Repositories
  'user-repo': 'tests/unit/repositories/user.repository.test.ts',
  'chat-repo': 'tests/unit/repositories/chat.repository.test.ts',
  'message-repo': 'tests/unit/repositories/message.repository.test.ts',
  
  // Unit Tests - Middleware
  'auth-middleware': 'tests/unit/middleware/auth.test.ts',
  
  // Integration Tests
  'api-integration': 'tests/integration/api.integration.test.ts',
  'db-integration': 'tests/integration/database.integration.test.ts',
  'socket-integration': 'tests/integration/socket.integration.test.ts',
  
  // E2E Tests
  'e2e': 'tests/e2e/user-journey.e2e.test.ts'
};

function runTest(testKey, options = []) {
  const testFile = testFiles[testKey];
  
  if (!testFile) {
    console.log(`❌ Test "${testKey}" not found!`);
    console.log('Available tests:');
    Object.keys(testFiles).forEach(key => {
      console.log(`  - ${key}`);
    });
    return;
  }

  console.log(`🧪 Running test: ${testKey}`);
  console.log(`📁 File: ${testFile}`);
  console.log('─'.repeat(50));

  const jest = spawn('npx', ['jest', testFile, ...options], {
    stdio: 'inherit',
    shell: true
  });

  jest.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ Test "${testKey}" passed!`);
    } else {
      console.log(`❌ Test "${testKey}" failed!`);
    }
  });
}

function showHelp() {
  console.log('🧪 Test Runner for Commute Match Maker Backend');
  console.log('');
  console.log('Usage: node scripts/test-runner.js [test-name] [options]');
  console.log('');
  console.log('Available tests:');
  
  console.log('\n📋 Unit Tests - Services:');
  console.log('  user-service, chat-service, journey-service, socket-service');
  
  console.log('\n🎮 Unit Tests - Controllers:');
  console.log('  user-controller, chat-controller, journey-controller');
  
  console.log('\n💾 Unit Tests - Repositories:');
  console.log('  user-repo, chat-repo, message-repo');
  
  console.log('\n🔐 Unit Tests - Middleware:');
  console.log('  auth-middleware');
  
  console.log('\n🔗 Integration Tests:');
  console.log('  api-integration, db-integration, socket-integration');
  
  console.log('\n🎯 End-to-End Tests:');
  console.log('  e2e');
  
  console.log('\nOptions:');
  console.log('  --watch     Run in watch mode');
  console.log('  --coverage  Run with coverage report');
  console.log('  --verbose   Run with verbose output');
  
  console.log('\nExamples:');
  console.log('  node scripts/test-runner.js user-service');
  console.log('  node scripts/test-runner.js chat-controller --watch');
  console.log('  node scripts/test-runner.js api-integration --coverage');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
  process.exit(0);
}

const testName = args[0];
const options = args.slice(1);

runTest(testName, options);