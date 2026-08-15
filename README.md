# Tang Keng Hin - Portfolio

A responsive personal portfolio for a Computer Science (Cybersecurity) student, built with React, Supabase, Resend, and Vercel. It includes a private content-management workspace for maintaining portfolio content without editing source files.

[![Live Website](https://img.shields.io/badge/Live_Website-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tang-keng-hin.vercel.app)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3FCF8E)](https://supabase.com/)

![Tang Keng Hin portfolio preview](public/og.png)

## Live Website

Visit the portfolio at [tang-keng-hin.vercel.app](https://tang-keng-hin.vercel.app).

| Route | Purpose |
| --- | --- |
| `/` | Home, projects, semester results, experience, awards, and certificates |
| `/about` | About information and technical skills |
| `/projects` | Detailed project descriptions, technologies, links, and logos |
| `/resume` | Education, experience, activities, skills, results, and projects |
| `/contact` | Contact information and social links |
| `/admin` | Secure Admin login, content management, and read-only Guest Preview |
| `/reset-password` | OTP-based password recovery flow |

## Overview

The website presents academic progress, technical projects, work experience, extracurricular activities, awards, certificates, skills, and contact details in a polished dark interface.

Portfolio content is stored in Supabase PostgreSQL. Images and PDF documents uploaded through Admin are stored in Supabase Storage. Resend delivers authentication OTP emails through Supabase Custom SMTP. Vercel automatically builds and publishes the website whenever the `main` branch is updated on GitHub.

## Key Features

- Responsive multi-page portfolio for desktop and mobile
- Dark visual design with page transitions and scroll animations
- Dedicated Projects page with detailed descriptions and technology tags
- Short project descriptions for Home and Resume, with longer copy on Projects
- New projects appear first and can use uploaded custom logo images
- Mobile navigation and portrait sizing optimized for smaller screens
- Semester results displayed without exposing Current CGPA
- Current Employment, Experience, Semester Results, activities, and individual records can be shown or hidden
- Experience and activity records ordered from newest to oldest
- Clickable award and certificate PDF/image documents
- GitHub, LinkedIn, Facebook, Gmail, and WhatsApp connections
- Collapsible Admin sections for managing long content collections
- Modal-based add and edit workflows with success feedback
- Upload, replace, remove, show, hide, add, edit, and delete controls
- Automatic GitHub-to-Vercel deployments

## Admin Authentication and Safety

### Password and six-digit email OTP

The Admin sign-in flow uses two application steps:

1. Supabase verifies the Admin email and password.
2. Supabase generates a six-digit OTP and Resend delivers it to the Admin email.
3. The Admin workspace opens only after the OTP is verified.

The OTP expires after 10 minutes, and resend actions have a 60-second cooldown. OTP verification is recorded only for the current browser session. This is an application-enforced second verification step; it should not be confused with Supabase's native authenticator-based MFA/AAL2.

### OTP-protected password recovery

Forgot Password also requires a six-digit recovery OTP sent by email. A password can be replaced only after Supabase verifies the recovery code. The new password must be entered twice before it is submitted.

### Read-only Guest Preview

Visitors can select **Explore Admin as Guest** to understand how the content-management interface works. Guest Preview displays the complete Admin workspace but blocks saving, uploading, adding, editing, deleting, and visibility changes. Locked controls are visually marked, while navigation and section expansion remain available.

### Backend authorization

The `/admin` route is intentionally reachable because a browser URL is not a security boundary. Actual write access is protected by Supabase Auth and Row Level Security policies. Public visitors receive read-only content; only the authorized Admin account can change database records or Storage files.

The repository never stores the Admin password, Resend API key, database password, Supabase secret key, or `service_role` key.

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
| Auth email delivery | Resend Custom SMTP |
| File Storage | Supabase Storage |
| Hosting | Vercel |
| Version Control | Git and GitHub |

## Architecture

```text
Public Visitor / Guest Preview / Portfolio Admin
                        |
                        v
              React application on Vercel
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
   Supabase Auth   PostgreSQL     Supabase Storage
          |
          v
     Resend SMTP
          |
          v
      Admin Gmail
```

## Local Development

### Requirements

- Node.js 20 or newer
- npm
- A Supabase project

### 1. Clone the repository

```bash
git clone https://github.com/jingxuan0909/tang-portfolio.git
cd tang-portfolio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env.local` from the provided example:

```powershell
Copy-Item .env.example .env.local
```

Add only the public Supabase frontend values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The publishable key is designed for frontend use. Security must still be enforced through Row Level Security. Never place a Resend API key, database password, secret key, or `service_role` key in a frontend environment variable.

### 4. Start the development server

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
- One authorized Supabase Auth account for Admin access
- Six-digit email OTP with a 600-second expiry
- Resend configured as Supabase Custom SMTP

The Storage bucket accepts PDF, JPEG, PNG, and WebP files up to 10 MB.

Run [`supabase/permissions.sql`](supabase/permissions.sql) in the Supabase SQL Editor to apply database and Storage access policies. Review the authorized Admin email in that file before running it in another project.

Configure these Supabase Auth redirect URLs:

```text
http://localhost:5173/**
https://tang-keng-hin.vercel.app/**
```

Configure the **Magic link or OTP** and **Reset password** templates to include `{{ .Token }}` so users receive a six-digit code instead of relying only on a link.

### Resend SMTP values

```text
Host: smtp.resend.com
Port: 465
Username: resend
Password: a private Resend API key
```

The Resend API key belongs only in Supabase's encrypted SMTP configuration. Do not place it in this repository or expose it in screenshots.

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
|-- data/                       Initial fallback portfolio content
|-- public/
|   |-- assets/                 Website images and project logos
|   `-- uploads/                Initial award and certificate documents
|-- src/
|   |-- AdminPage.jsx           Admin authentication and content management
|   |-- ResetPasswordPage.jsx   OTP password recovery page
|   |-- content-context.jsx     Supabase content loading and state
|   |-- pages.jsx               Public portfolio pages
|   |-- supabase.js             Supabase client configuration
|   `-- styles.css              Global responsive styling
|-- supabase/
|   |-- email-otp-templates.md  Supabase OTP email template reference
|   `-- permissions.sql         Database and Storage RLS policies
|-- tests/                      Sites worker tests
|-- worker/                     Optional Sites hosting worker
|-- vercel.json                 Vercel deployment configuration
`-- vite.config.mjs             Vite configuration
```

## Repository Safety

The repository ignores local environment variables, credentials, build output, dependencies, deployment-provider state, temporary files, logs, and QA screenshots. Before committing, always inspect `git status` and confirm that no password, OTP, API key, private certificate, database connection string, Supabase secret, or `service_role` key is staged.

If a credential appears in a screenshot, commit, or message, revoke it and create a replacement.

## Author

**Tang Keng Hin**  
Computer Science (Cybersecurity) Student

- [Portfolio](https://tang-keng-hin.vercel.app)
- [GitHub](https://github.com/jingxuan0909)
- [Email](mailto:kenghin0909@gmail.com)
