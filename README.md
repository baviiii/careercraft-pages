# Horus Intelligence - AI-Powered Career & Policy Platform

## Project Overview

Horus Intelligence is an AI-powered platform for understanding policy, workforce trends, and career opportunities. Transform complex data into actionable insights.

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd careercraft-pages

# Step 3: Install the necessary dependencies
npm i

# Step 4: Start the development server
npm run dev
```

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase
- Azure AI Services

## Deployment

Build the project for production:

```sh
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to your hosting provider.

## Features

- **Horus Chat**: AI-powered chat assistant with RAG (Retrieval-Augmented Generation) capabilities
- **Policy Analysis**: Deep insights into government policies and strategic direction
- **Career Intelligence**: Job market trends, training programs, and career guidance
- **Admin Dashboard**: Comprehensive admin panel for managing prompts, sessions, and analytics

## Environment Variables

Make sure to configure the following environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `GEMINI_API_KEY`: Google Gemini API key (for AI-assisted features)

## License

Copyright © 2024 Horus Intelligence. All rights reserved.
