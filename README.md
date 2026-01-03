# 10x-cards

AI-powered flashcard generation and spaced repetition learning application.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

10x-cards is a web application designed to streamline the creation and management of educational flashcards. The app leverages Large Language Models (LLMs) via API to automatically generate flashcard suggestions from user-provided text, significantly reducing the time and effort required for manual flashcard creation.

### Key Features

- **AI-Powered Generation**: Paste any text (1,000-10,000 characters) and receive AI-generated flashcard suggestions
- **Review & Approve**: Accept, edit, or reject generated flashcards before saving
- **Manual Creation**: Create custom flashcards with front/back content
- **Spaced Repetition**: Integrated learning algorithm for optimal review scheduling
- **User Accounts**: Secure registration, authentication, and personal flashcard collections
- **GDPR Compliant**: Full data privacy with account and data deletion options

## Tech Stack

### Frontend
- **Astro 5** - Fast, content-focused web framework
- **React 19** - Interactive UI components
- **TypeScript 5** - Static typing and enhanced IDE support
- **Tailwind 4** - Utility-first CSS framework
- **Shadcn/ui** - Accessible React component library

### Backend
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database
  - Built-in authentication
  - SDK for multiple languages

### AI Integration
- **Openrouter.ai** - Access to multiple LLM providers (OpenAI, Anthropic, Google) with cost controls

### CI/CD & Hosting
- **GitHub Actions** - Automated CI/CD pipelines
- **DigitalOcean** - Docker-based application hosting

## Getting Started Locally

### Prerequisites

- Node.js (version specified in `.nvmrc`: **22.14.0**)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/10x-cards.git
   cd 10x-cards
   ```

2. Install the correct Node.js version (using nvm):
   ```bash
   nvm install
   nvm use
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:4321`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Run ESLint and auto-fix issues |
| `npm run format` | Format code with Prettier |

## Project Scope

### In Scope (MVP)

- User registration and authentication
- AI-powered flashcard generation from pasted text
- Manual flashcard creation, editing, and deletion
- Flashcard review and approval workflow
- Spaced repetition learning sessions
- Generation statistics tracking
- Secure, user-isolated data storage

### Out of Scope (MVP)

- Mobile applications (web only)
- Custom spaced repetition algorithm (using existing open-source solution)
- Gamification features
- Document import (PDF, DOCX)
- Public API
- Flashcard sharing between users
- Advanced notification system
- Keyword-based flashcard search

## Project Status

🚧 **In Development** - This project is currently in the early stages of development.

## License

MIT