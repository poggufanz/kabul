# Firebase Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Firebase project created at https://console.firebase.google.com

## Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase
```bash
firebase login
```

## Step 3: Initialize Firebase (if not already done)
```bash
firebase init
```
Select:
- **Hosting** → Configure files for Firebase Hosting
- **Realtime Database** → Set up the database rules

When prompted:
- Public directory: `dist`
- Single-page app: **Yes**
- GitHub auto-deploy: No

## Step 4: Configure Environment Variables
Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Step 5: Build the App
```bash
npm run build
```

## Step 6: Deploy Database Rules
```bash
firebase deploy --only database
```

## Step 7: Deploy Hosting
```bash
firebase deploy --only hosting
```

## Step 8: Full Deploy (Everything)
```bash
firebase deploy
```

## After Deployment
Your app will be live at:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

## Troubleshooting

### 404 on page refresh
Make sure `firebase.json` has the rewrite rule:
```json
{
  "hosting": {
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### Database permission denied
Check `firebase/database.rules.json` allows read/write.

### CORS errors
Ensure database URL in `.env` is correct.
