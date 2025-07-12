# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `pnpm dev` - Start development server with Turbopack (fast refresh)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm build:local` - Build for local environment (NO_HTTPS=1)

### Code Quality
- `pnpm lint` - Run Next.js lint + Biome lint with auto-fix
- `pnpm lint:fix` - Fix linting issues automatically
- `pnpm format` - Format code with Biome
- `pnpm check-types` - TypeScript type checking (no emit)

### Testing
- `pnpm test` - Run tests with Vitest
- `pnpm test:watch` - Run tests in watch mode

### Database Operations
- `pnpm db:migrate` - Run database migrations (uses tsx scripts/db-migrate.ts)
- `pnpm db:generate` - Generate new Drizzle migrations
- `pnpm db:push` - Push schema changes directly (development only)
- `pnpm db:studio` - Open Drizzle Studio for database management
- `pnpm db:reset` - Drop all tables and push schema (destructive)

### Setup & Utilities
- `pnpm initial:env` - Generate .env from .env.example
- `pnpm postinstall` - Post-installation setup script
- `pnpm clean` - Clean build artifacts

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router and Turbopack
- **Authentication**: Better Auth with Google OAuth support
- **Payments**: Polar.sh for lifetime deals and one-time payments
- **Database**: PostgreSQL with Drizzle ORM (TypeScript-first)
- **Styling**: Tailwind CSS with 20+ theme variants
- **Code Quality**: Biome for linting/formatting, TypeScript strict mode
- **Testing**: Vitest for unit testing

### Key Directories
- `src/app/` - Next.js App Router with route groups:
  - `(auth)/` - Public authentication pages
  - `(premium)/` - Protected premium features
  - `(psec)/` - Additional protected routes
- `src/components/` - React components organized by feature
- `src/lib/` - Core libraries (auth, database, utilities)
- `src/hooks/` - Custom React hooks
- `scripts/` - Build and utility scripts

### Database Schema (Drizzle + PostgreSQL)
- **UserSchema**: User accounts with preferences (theme, settings)
- **SessionSchema**: Authentication sessions with device tracking
- **AccountSchema**: OAuth provider accounts
- **VerificationSchema**: Email verification tokens

### Authentication Flow (Better Auth)
- Email/password authentication with 7-day sessions
- Google OAuth with automatic account linking
- Protected route groups for premium features
- User preferences stored in database JSON column

### Payment Integration (Polar.sh)
- One-time payments for lifetime access
- Automatic customer creation and linking
- Environment variables: `POLAR_ACCESS_TOKEN`, `POLAR_LIFETIME_PRODUCT_ID`

## Development Patterns

### Environment Configuration
- Uses `load-env` library loaded in drizzle.config.ts
- SSL required for production database connections
- `NO_HTTPS=1` for local development cookie handling

### Code Style
- Biome configuration enforces 2-space indentation, 80-character line width
- Double quotes for JavaScript strings
- TypeScript strict mode enabled
- Import organization enabled

### Theme System
- 20+ built-in themes with CSS custom properties
- Dark/light mode support for all themes
- Theme switching via user preferences in database

### Internationalization
- next-intl for i18n support
- Message files in `/messages/` for 7 languages
- Locale utilities in `src/i18n/`

## Important Files & Patterns

### Configuration Files
- `drizzle.config.ts` - Database configuration with SSL support
- `biome.json` - Linting and formatting rules
- `vitest.config.ts` - Test configuration
- `next.config.ts` - Next.js configuration

### Key Patterns
- Route groups for organizing pages by access level
- Repository pattern for database access (`src/lib/db/repositories/`)
- Custom hooks for common functionality (`src/hooks/`)
- Shared UI components with shadcn/ui base

### Scripts
- `scripts/db-migrate.ts` - Handle database migrations
- `scripts/initial-env.ts` - Environment setup
- `scripts/clean.ts` - Clean build artifacts
- `scripts/postinstall.ts` - Post-installation tasks

## Task Planner Feature

### Overview
Comprehensive 4x4 Eisenhower Matrix task planner with real-time updates:
- **Quadrant View**: Visual 4x4 grid (Urgent/Important, Urgent/Not Important, etc.)
- **List View**: Collapsible sections for each quadrant
- **Drag & Drop**: Move tasks between quadrants and reorder within sections
- **Real-time Updates**: WebSocket broadcasting for multi-client synchronization
- **Task Management**: Create, edit, delete with rich metadata (time blocks, difficulty, tags)

### Database Schema
- **PlannerSchema**: Daily planners linked to users and dates
- **TaskSchema**: Tasks with quadrant, priority, completion status, and metadata
- Supports task attributes: title, description, time required, time blocks, difficulty levels, custom tags

### API Endpoints
- `GET/POST /api/planner` - Fetch/create daily planners
- `GET/POST /api/tasks` - List/create tasks
- `PUT/DELETE /api/tasks/[id]` - Update/delete individual tasks
- `PUT /api/tasks/reorder` - Batch reorder tasks with drag & drop

### Components Structure
- `PlannerView` - Main container with view switching and date selection
- `QuadrantView` - 4x4 Eisenhower Matrix layout
- `ListView` - Collapsible sections for each quadrant
- `TaskItem` - Individual task component with drag handles and actions
- `TaskForm` - Modal form for creating/editing tasks

### WebSocket Integration
- Real-time task updates across multiple clients
- User-specific and date-specific rooms
- Broadcasts for task creation, updates, deletion, and reordering

### Key Dependencies
- `@dnd-kit/*` - Drag and drop functionality
- `socket.io` - WebSocket real-time updates  
- `date-fns` - Date formatting and manipulation
- `framer-motion` - Smooth animations and transitions

## Package Manager
- Uses pnpm as primary package manager
- `onlyBuiltDependencies` specified for Biome, Tailwind, and other native packages
- Node.js 18+ required