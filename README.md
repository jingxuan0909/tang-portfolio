# Tang Keng Hin — Portfolio

A responsive personal portfolio for a Computer Science (Cybersecurity) student, featuring an authenticated content management area, live project and resume content, and certificate uploads.

[![Live Website](https://img.shields.io/badge/Live_Website-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tang-keng-hin.vercel.app)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3FCF8E)](https://supabase.com/)

![Tang Keng Hin portfolio preview](public/og.png)

## Live website

Visit the deployed portfolio at **[tang-keng-hin.vercel.app](https://tang-keng-hin.vercel.app)**.

Public routes:

- `/` — Home and featured work
- `/about` — Profile, background, and skills
- `/resume` — Education, experience, activities, and projects
- `/contact` — Contact details and social links
- `/admin` — Private content management area

## About the project

This portfolio presents academic progress, technical projects, experience, extracurricular activities, awards, and certifications in a polished dark interface. Content can be updated from the private Admin page without editing or redeploying the source code.

The public site is hosted on Vercel, while Supabase provides the PostgreSQL database, Admin authentication, and file storage.

## Features

- Responsive multi-page React portfolio
- Smooth page transitions, scroll reveals, and interactive motion
- Full-colour profile portrait shared across the site
- Semester results without displaying Current CGPA
- Project, experience, education, and extracurricular sections
- Clickable award and certificate documents
- GitHub, LinkedIn, Facebook, Gmail, and WhatsApp links
- Private Supabase-authenticated Admin page
- Add, edit, and remove portfolio content
- Upload portraits, PDFs, and certificate images
- Password recovery flow
- PostgreSQL content persistence with Row Level Security
- Automatic Vercel deployments from GitHub

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router |
| Styling | Custom CSS, DM Sans, Cormorant Garamond |
| Motion | Motion for React |
| Icons | Phosphor Icons |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage |
| Hosting | Vercel |
| Version control | Git and GitHub |

## Architecture

```text
Visitor / Admin
      |
      v
Vercel-hosted React application
      |
      +--> Supabase Auth
      +--> Supabase PostgreSQL
      +--> Supabase Storage
```

Public visitors can read portfolio content and public files. Only the designated authenticated Admin user is permitted to create or update content and upload or remove files through Supabase Row Level Security policies.

## Local development

### Requirements

- Node.js 20 or newer
- npm
- A Supabase project

### Installation

```bash
git clone https://github.com/jingxuan0909/tang-portfolio.git
cd tang-portfolio
npm install
```

Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

Add the public Supabase project values to `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Start the local development server:

```bash
npm run dev
```

The application will be available at the URL printed by Vite, normally `http://localhost:5173`.

## Supabase setup

The application expects the following Supabase resources:

### Database

A `public.portfolio_content` table containing:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `smallint` | Singleton content record with ID `1` |
| `content` | `jsonb` | Complete editable portfolio content |
| `updated_at` | `timestamptz` | Last update timestamp |

The public `anon` role requires read access. Insert and update access should be restricted through Row Level Security to the designated Admin user's Supabase Auth UID.

### Storage

The public bucket is named `portfolio-files` and accepts:

- PDF
- JPEG
- PNG
- WebP

The current upload limit is 10 MB per file. Public visitors can read files, while upload, update, and deletion operations are restricted to the Admin UID.

### Authentication

Admin access uses Supabase email and password authentication. Configure these redirect URLs in Supabase Auth:

```text
http://localhost:4173/**
https://tang-keng-hin.vercel.app/**
```

Never commit database passwords, secret keys, service-role keys, or user passwords.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build:vercel` | Create the production Vercel build in `dist` |
| `npm run preview` | Preview a production build locally |
| `npm run test:sites` | Run the hosting worker tests |

## Deploying to Vercel

1. Import this GitHub repository into Vercel.
2. Select the Vite framework preset.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables.
4. Use `npm run build:vercel` as the build command.
5. Use `dist` as the output directory.
6. Deploy the project.

The included `vercel.json` provides the required build configuration and SPA route rewrites. Every push to the `main` branch triggers a new production deployment.

## Project structure

```text
tang-portfolio/
├── data/                  # Initial portfolio content
├── public/                # Static images and documents
├── src/
│   ├── AdminPage.jsx      # Authenticated content editor
│   ├── ResetPasswordPage.jsx
│   ├── content-context.jsx
│   ├── pages.jsx
│   ├── supabase.js
│   └── styles.css
├── supabase/              # Database permission SQL
├── vercel.json            # Vercel build and route configuration
└── vite.config.mjs
```

## Author

**Tang Keng Hin**  
Computer Science (Cybersecurity) Student

- [GitHub](https://github.com/jingxuan0909)
- [Portfolio](https://tang-keng-hin.vercel.app)
- [Email](mailto:kenghin0909@gmail.com)
