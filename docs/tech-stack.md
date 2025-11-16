Frontend - Astro with React for interactive components:
- Astro 5 enables building fast, high-performance sites and apps with minimal JavaScript
- React 19 provides interactivity where needed
- TypeScript 5 for static typing and better IDE support
- Tailwind 4 enables convenient styling of the application
- Shadcn/ui provides an accessible React component library we will base the UI on

Backend - Supabase as a comprehensive backend solution:
- Provides a PostgreSQL database
- Provides SDKs in many languages, serving as a Backend-as-a-Service
- Open-source solution that can be hosted locally or on your own server
- Built-in user authentication

Testing - Comprehensive testing strategy:
- Vitest 2.1.4 for unit and integration tests with code coverage
- Testing Library 16.2.0 for React component testing
- Playwright 1.49.1 for end-to-end testing across multiple browsers
- jsdom 25.0.1 for DOM emulation in component tests
- Target code coverage: ≥80% lines, ≥80% functions, ≥75% branches

AI - Communication with models via the Openrouter.ai service:
- Access to a wide range of models (OpenAI, Anthropic, Google, and many others), allowing us to find a solution that offers high efficiency and low cost
- Allows setting spending limits for API keys

CI/CD and Hosting:
- GitHub Actions for creating CI/CD pipelines
- DigitalOcean for hosting the application via a Docker image