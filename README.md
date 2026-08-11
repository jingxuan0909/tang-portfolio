# Tang Keng Hin — Portfolio

A responsive personal portfolio for a Computer Science (Cybersecurity) student, built with React, Supabase, and Vercel. It includes a private content-management area for updating portfolio information without editing the source code.

[![Live Website](https://img.shields.io/badge/Live_Website-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tang-keng-hin.vercel.app)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3FCF8E)](https://supabase.com/)

![Tang Keng Hin portfolio preview](public/og.png)

## Live Website

Visit the portfolio at [tang-keng-hin.vercel.app](https://tang-keng-hin.vercel.app).

| Route | Purpose |
| --- | --- |
| `/` | Home, featured projects, semester results, experience, awards, and certificates |
| `/about` | About information and technical skills |
| `/resume` | Education, experience, activities, skills, and projects |
| `/contact` | Contact information and social links |
| `/admin` | Authenticated portfolio content management |
| `/reset-password` | Supabase password recovery flow |

## Overview

The website presents my academic progress, technical projects, working experience, extracurricular activities, awards, certifications, and contact information in a polished dark interface.

Portfolio content is stored in Supabase PostgreSQL. Images and documents uploaded through Admin are stored in Supabase Storage. Vercel automatically builds and publishes the public website whenever the `main` branch is updated on GitHub.

## Key Features

- Responsive multi-page portfolio for desktop and mobile
- Dark visual design with page transitions and scroll animations
- Full-colour profile portrait shared across the website
- Semester results without exposing Current CGPA
- Current Employment section that can be shown or hidden
- Experience records ordered from newest to oldest
- Editable projects with custom uploaded project logos
- Clickable award and certificate PDF/image documents
- GitHub, LinkedIn, Facebook, Gmail, and WhatsApp connections
- Supabase email/password authentication for Admin
- Add, edit, remove, show, and hide portfolio content
- Upload and replace portraits, project logos, certificates, and awards
- Password-reset flow through Supabase Auth
- Row Level Security for database records and uploaded files
- Automatic GitHub-to-Vercel deployments

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router |
| Styling | Custom responsive CSS |
| Typography | Cormorant Garamond, DM Sans |
| Animation | Motion for React |
| Icons | Phosphor Icons |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Hosting | Vercel |
| Version Control | Git and GitHub |

## Architecture

```text
Public Visitor / Portfolio Admin
                |
                v
      React application on Vercel
                |
       +--------+---------+
       |        |         |
       v        v         v
 Supabase   PostgreSQL  Supabase
   Auth       content   Storage
```

Public visitors receive read-only portfolio content and public documents. Authenticated write operations are restricted by Supabase Row Level Security policies.

## Local Development

### Requirements

- Node.js 20 or newer
- npm
- A Supabase project

### 1. Clone the Repository

```bash
git clone https://github.com/jingxuan0909/tang-portfolio.git
cd tang-portfolio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env.local` from the provided example:

```powershell
Copy-Item .env.example .env.local
```

Add the public Supabase values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The publishable key is designed for frontend use. Security must still be enforced through Supabase Row Level Security. Never place a database password, secret key, or `service_role` key in a frontend environment variable.

### 4. Start the Development Server

```bash
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Supabase Configuration

The application expects:

- A `public.portfolio_content` table
- A single content record with `id = 1`
- A JSON/JSONB `content` column
- An `updated_at` timestamp column
- A public Storage bucket named `portfolio-files`
- One authorised Supabase Auth account for Admin access

The Storage bucket accepts PDF, JPEG, PNG, and WebP files up to 10 MB.

Run [`supabase/permissions.sql`](supabase/permissions.sql) in the Supabase SQL Editor to apply the portfolio database and Storage access policies. Review the authorised Admin email in that file before running it in a different Supabase project.

Configure these Supabase Auth redirect URLs:

```text
http://localhost:5173/**
https://tang-keng-hin.vercel.app/**
```

## Admin Security

The `/admin` address is intentionally reachable because browser routes cannot be treated as secrets. Access to content-management features is protected by Supabase authentication and Row Level Security.

The application does not store the Admin password in the repository. Login credentials are managed by Supabase Auth.

## Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build and prepare the Sites-compatible output |
| `npm run build:vercel` | Create the production Vercel build |
| `npm run preview` | Preview a production build locally |
| `npm run test:sites` | Test the optional Sites hosting worker |

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the GitHub repository into Vercel.
3. Select the Vite framework preset.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel Environment Variables.
5. Deploy the project.

The included [`vercel.json`](vercel.json) configures the Vercel build and SPA route rewrites. Every push to `main` triggers a new deployment when the GitHub repository is connected to Vercel.

## Project Structure

```text
tang-portfolio/
├── data/                       Initial fallback portfolio content
├── public/
│   ├── assets/                 Website images and project logos
│   └── uploads/                Initial award and certificate documents
├── src/
│   ├── AdminPage.jsx           Authenticated content-management interface
│   ├── ResetPasswordPage.jsx   Supabase password recovery page
│   ├── content-context.jsx     Supabase content loading and state
│   ├── pages.jsx               Public portfolio pages
│   ├── supabase.js             Supabase client configuration
│   └── styles.css              Global responsive styling
├── supabase/
│   └── permissions.sql         Database and Storage RLS policies
├── tests/                      Sites worker tests
├── worker/                     Optional Sites hosting worker
├── vercel.json                 Vercel deployment configuration
└── vite.config.mjs             Vite configuration
```

## Privacy and Repository Safety

The repository ignores local environment variables, build output, dependencies, temporary files, logs, and QA screenshots. Before committing, always confirm that no password, database connection string, secret key, or `service_role` key is staged.

## Author

**Tang Keng Hin**  
Computer Science (Cybersecurity) Student

- [Portfolio](https://tang-keng-hin.vercel.app)
- [GitHub](https://github.com/jingxuan0909)
- [Email](mailto:kenghin0909@gmail.com)
