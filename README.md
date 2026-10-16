# sbs-mail

A modern, serverless temporary email service built with Flask, Cloudflare Email Routing & Workers, and Supabase.

## Features

- ✉️ **Instant Temporary Inboxes**: Generate disposable email addresses with custom prefixes and domains.
- ⚡ **Real-time Inbound Processing**: Cloudflare Email Worker receives inbound emails and stores them securely in Supabase.
- 🔒 **User Authentication**: Optional account management powered by Supabase Auth for saved inboxes.
- 🎨 **Modern Web UI**: Responsive, clean dark/light UI for viewing received emails and attachments.
- 🚀 **Serverless / Vercel Ready**: Ready to deploy on Vercel or any Python WSGI environment.

## Tech Stack

- **Backend**: Python (Flask)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth)
- **Email Routing**: Cloudflare Email Routing & Cloudflare Workers
- **Frontend**: HTML5, Vanilla JavaScript, CSS3

## Setup & Configuration

1. **Environment Variables**:
   Create a `.env` file with the following variables:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

2. **Database Setup**:
   Run the SQL schema located in `supabase_setup.sql` in your Supabase SQL Editor.

3. **Install Dependencies & Run Locally**:
   ```bash
   pip install -r requirements.txt
   python app.py
   ```

4. **Deploying Worker**:
   Deploy `worker.js` as a Cloudflare Worker and configure Cloudflare Email Routing rules to forward incoming emails to the worker.
