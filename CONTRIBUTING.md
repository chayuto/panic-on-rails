# Contributing to PanicOnRails

Thank you for your interest in contributing to PanicOnRails! This document provides guidelines and steps for contributing.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/chayuto/panic-on-rails/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information
   - Screenshots if applicable

### Suggesting Features

1. Open an issue to discuss the feature before implementing
2. Explain the use case and benefits
3. Wait for feedback from maintainers

### Submitting Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `pnpm run test && pnpm run lint && pnpm run typecheck`
5. Commit with clear messages: `git commit -m 'Add feature X'`
6. Push and open a Pull Request

## Development Setup

```bash
git clone https://github.com/chayuto/panic-on-rails.git
cd panic-on-rails
pnpm install
pnpm run dev
```

## Code Style

- Follow existing code patterns
- Use TypeScript strictly
- Write tests for new features
- Keep commits focused and atomic

## Questions?

Open an issue or reach out to the maintainers.
