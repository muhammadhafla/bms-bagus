# Inventory Management System

A full-stack Inventory Management System built with modern web technologies.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Backend/Database**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [React Query](https://tanstack.com/query/latest)
- **Testing**: [Vitest](https://vitest.dev/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **PDF Generation**: [pdfmake](http://pdfmake.org/)
- **CSV Parsing**: [PapaParse](https://www.papaparse.com/)
- **Icons**: [Tabler Icons](https://tabler.io/icons)

## Getting Started

### Prerequisites

Ensure you have Node.js and npm installed on your local machine. You will also need a Supabase project set up for the database backend.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd inventory
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and add your Supabase connection details:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Available Scripts

- `npm run dev` - Starts the Next.js development server
- `npm run build` - Builds the application for production
- `npm run start` - Starts the Next.js production server
- `npm run lint` - Runs ESLint to check for code issues
- `npm run test` - Runs Vitest for unit testing
