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

### 🌐 Vitest UI Dashboard (Browser)

```bash
# Open interactive UI for Server tests
npm run test:ui:server

# Open interactive UI for Web tests
npm run test:ui:web
```

### 📊 Specific Module Test Suites

```bash
# Event moderation & lifecycle
npm --prefix server test -- events.test.ts

# Organizer application & SuperAdmin review
npm --prefix server test -- organizers.test.ts

# Attendee RSVPs, passes & gate scanner anti-passback
npm --prefix server test -- passes.test.ts

# Organizer event broadcasts & in-app / FCM notifications
npm --prefix server test -- broadcasts.test.ts

# AI Semantic Query Engine & Matchmaker cron
npm --prefix server test -- matchmaker.test.ts

# Organizer CRM, followers & VIP invites
npm --prefix server test -- crm.test.ts

# WhatsApp & Meta webhooks
npm --prefix server test -- webhooks.test.ts
```

### 🎯 Pre-Launch End-to-End Test Runner

```bash
# Run full battery integration test against active deployment
node testing/automated-test-runner.js
```

### 📊 Test Coverage

```bash
# Run Server test coverage report
npm --prefix server run test:coverage
```
