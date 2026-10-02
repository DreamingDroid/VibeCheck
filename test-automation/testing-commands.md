# Testing Commands

Commands to execute and debug the automated test suites across the VibeCheck workspace:

### 🚀 Run Test Suites

```bash
# Run all tests (Server + Web)
npm test

# Run only Server tests
npm run test:server

# Run only Web tests
npm run test:web
```

### 🔍 Watch Mode (Interactive / Development)

```bash
# Watch mode for backend development
npm run test:watch:server

# Watch mode for frontend development
npm run test:watch:web
```

### 📊 Test Coverage

```bash
# Run Server test coverage report
npm --prefix server run test:coverage
```
