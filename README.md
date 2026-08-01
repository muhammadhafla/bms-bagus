# BMS Inventory Management System

A robust, modern, and offline-capable Inventory Management System and Point of Sale (POS) application built for high performance and excellent user experience.

## ✨ Core Features

- **Inventory Management**: Track stock levels, categories, and manage item master data.
- **Point of Sale (POS) / Transactions**: Process sales quickly with an optimized interface.
- **Purchasing**: Manage suppliers, purchase orders, and inbound stock.
- **Finance & Analytics**: Track revenue, calculate profit (Revenue - COGS), and view sales trends via interactive charts (Recharts).
- **Bulk Print & Barcode**: Generate and print multiple barcodes efficiently using built-in PDF generation (pdfmake).
- **Role-Based Access Control**: Securely isolate data and features between different roles (Finance, Purchasing, Cashier).
- **Progressive Web App (PWA)**: Installable on mobile and desktop devices with offline indicators and robust caching.

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Server Components where applicable)
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with strict Row Level Security & SSR Auth)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Global state) & [React Query](https://tanstack.com/query/latest) (Server state & caching)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with a custom comprehensive UI component system in `components/ui/`.
- **Testing**: [Vitest](https://vitest.dev/) for unit, component, and strict accessibility (A11y) testing.
- **Data Utilities**: [PapaParse](https://www.papaparse.com/) for CSV export, [Zod](https://zod.dev/) for strong schema validation.

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+) and npm
- A Supabase project

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

3. Environment Variables:
   Copy `.env.example` to `.env.local` and configure your Supabase URL and Anon Key:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🧪 Development Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Builds for production
- `npm run start` - Starts production server
- `npm run lint` - Runs ESLint
- `npm run tsc` - Runs TypeScript type checking
- `npm run test` - Runs all Vitest test suites (Unit & Accessibility)
