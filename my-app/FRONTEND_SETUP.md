# XSpark CRM Frontend Setup Guide

## Overview
This is a Next.js frontend application for the XSpark CRM lead management system. It provides authentication via Supabase and forms for capturing leads from both clients and staff members.

## Features
- **Supabase Authentication**: Secure login/signup system
- **Protected Routes**: All pages require authentication
- **Home Dashboard**: Quick access to lead entry forms
- **Client Lead Form** (`/tab`): Simple form for attendees/clients
- **Staff Entry Form** (`/staff`): Extended form for staff members with audio upload support
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Real-time Data**: Leads saved to Supabase database

## Prerequisites
- Node.js 18+ installed
- Supabase project created and configured
- Backend API running (optional for frontend-only work)

## Installation

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Set Up Environment Variables
The `.env.local` file is already configured with Supabase credentials. Verify it contains:

```env
# Frontend Environment Variables - Next.js

# Environment mode
NODE_ENV=development

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://rosqknebyxjtsnxdnxkm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Application Configuration
NEXT_PUBLIC_APP_TITLE=XSpark CRM
NEXT_PUBLIC_APP_VERSION=1.0.0

# Admin Panel Credentials (fixed ID/password)
ADMIN_LOGIN_ID=admin
ADMIN_LOGIN_PASSWORD=change-this-password
```

### 3. Ensure Database Tables Exist
Make sure Supabase tables are created by running the schema.sql from the backend folder:
https://github.com/<repo>/backend/schema.sql

## Running the Application

### Development Mode
```bash
npm run dev
```

The application will be available at **http://localhost:3000**

### Build for Production
```bash
npm run build
npm start
```

## Project Structure

```
app/
├── login/page.tsx            # Login page
├── signup/page.tsx           # Signup page
├── home/page.tsx             # Dashboard home (protected)
├── tab/page.tsx              # Client lead form (protected)
├── staff/page.tsx            # Staff lead form (protected)
├── components/
│   ├── Navbar.tsx            # Navigation component
│   └── ProtectedLayout.tsx   # Layout wrapper for protected pages
├── contexts/
│   └── AuthContext.tsx       # Authentication context
├── layout.tsx                # Root layout with AuthProvider
└── page.tsx                  # Redirect to login/home

lib/
└── supabase.ts              # Supabase client config
```

## Features in Detail

### Authentication (Login/Signup)
- Email/password based authentication via Supabase
- New users can sign up, existing users can log in
- Session persisted in browser local storage
- Automatic redirect to login if not authenticated

### Home Dashboard
- Quick links to lead capture forms
- Overview of available features
- CTA buttons to start entering leads

### Client Lead Form (`/tab`)
Fill in **required** fields:
- Name
- Email
- Phone number

**Optional** fields:
- Company name
- Remarks

Data automatically sets:
- `entry_type: "client"`
- `capture_mode: "stall_self"`
- `stage: "met"`
- `priority: 5`

### Staff Lead Form (`/staff`)
Fill in **required** fields:
- Name
- Email
- Phone number

**Optional** fields:
- Company name
- Stall number (e.g., A-01, B-05)
- Lead category (Investor, Entrepreneur, Consultant, Student, Other)
- Lead priority (1-10 slider)
- Remarks
- Audio file upload

Data automatically sets:
- `entry_type: "staff"`
- `capture_mode: "stall_staff"`
- `staff_id: <logged-in-user-id>`
- Audio file uploaded to Supabase Storage

## Testing

### Demo Credentials
Use these credentials to test:
```
Email: admin@xspark.com
Password: password123
```

Or create a new account via the signup page.

### Manual Testing
1. Go to http://localhost:3000
2. You'll be redirected to login
3. Sign in or create a new account
4. View the home dashboard
5. Fill out either lead form
6. Check Supabase dashboard to verify data was saved

## Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### "Could not find table" Error
- Ensure Supabase tables are created (run schema.sql)
- Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correct

### Authentication Not Working
- Verify Supabase project is active
- Check browser console for API errors
- Ensure CORS is properly configured in Supabase

### Audio Upload Fails
- Verify Supabase Storage bucket "lead-audio" exists
- Check storage permissions are set to public read

### Styling Issues
- Run `npm install` to ensure Tailwind CSS packages are installed
- Clear `.next` folder: `rm -rf .next`
- Restart dev server: `npm run dev`

## Environment-Specific Settings

### NEXT_PUBLIC_API_BASE_URL
- **Development**: `http://localhost:8000`
- **Production**: Your deployed backend URL

### Database Credentials
Stored in Supabase anon key, which is public and safe to expose in frontend code.

## Security Notes
- Never commit `.env.local` with real credentials (already in .gitignore)
- Use Supabase Row-Level Security (RLS) to restrict data access
- Admin credentials should not be shared
- Audio files are stored in Supabase Storage with public read access

## Next Steps

1. **Verify all Supabase tables exist** ✓
2. **Set up Supabase Storage bucket** for audio files
3. **Configure CORS** in Supabase dashboard
4. **Run frontend dev server**
5. **Test login and lead submission**
6. **Connect with backend API** for additional features

## Support
For issues, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---
**Last Updated**: February 14, 2026
