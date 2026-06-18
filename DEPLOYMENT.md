# Deployment Guide

This guide is for a practical institute deployment where:
- the frontend is served publicly
- the backend is reachable through a reverse proxy
- the face service runs internally and is accessed only by the backend

## Recommended Topology

- `frontend`: built React app served by Nginx
- `backend`: Node/Express on `127.0.0.1:5000`
- `face_recognition`: Flask/OpenCV on `127.0.0.1:8000`
- `mongo`: local or managed MongoDB

Do not expose the Flask face service directly to the public internet.

## 1. Prepare Environment Files

Create:
- `backend/.env`
- `frontend/.env.production`
- `face_recognition/.env`

Use:
- [backend/.env.example](/D:/projects/face-attendance-student-track/backend/.env.example)
- [frontend/.env.example](/D:/projects/face-attendance-student-track/frontend/.env.example)
- [face_recognition/.env.example](/D:/projects/face-attendance-student-track/face_recognition/.env.example)

Important production expectations:
- `NODE_ENV=production`
- `ALLOW_DEFAULT_ADMIN=false`
- strong `JWT_SECRET`
- `FACE_SERVICE_URL=http://127.0.0.1:8000`
- `CORS_ORIGINS` set to your real frontend domain

## 2. Validate Backend Environment

```bash
cd backend
node scripts/validate-env.js
```

Fix any missing values before continuing.

## 3. Provision the First Admin

Set:
- `PROVISION_ADMIN_USERNAME`
- `PROVISION_ADMIN_PASSWORD`
- `PROVISION_ADMIN_NAME`

Then run:

```bash
cd backend
npm run provision-admin
```

## 4. Build Frontend

```bash
cd frontend
npm install
npm run build
```

Copy the `frontend/build` output to your static hosting directory.

## 5. Start Backend and Face Service

You can use PM2 with [ecosystem.config.cjs](/D:/projects/face-attendance-student-track/ecosystem.config.cjs).

Example:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

If PM2 is not used:
- run backend with Node under a process manager
- run the Flask service under a process manager
- make both restart automatically on failure

## 6. Reverse Proxy

Use the sample config in [nginx.conf.example](/D:/projects/face-attendance-student-track/deploy/nginx.conf.example).

Important:
- expose only frontend and backend
- keep Flask internal-only
- enable HTTPS with your real certificate

## 7. Operational Checklist

Before going live:
- verify `/api/health`
- verify login for admin, teacher, and student
- verify face registration
- verify face verification
- verify Excel upload
- verify report download
- verify file uploads
- verify `backend/logs/audit.log` is being written

## 8. Backup Checklist

At minimum:
- back up MongoDB regularly
- back up `backend/uploads`
- back up `face_recognition/face_attendance.db`
- back up `face_recognition/registered_faces`

## 9. Not Yet Enterprise-Grade

This project is much safer than before, but for stronger production maturity you should still plan:
- liveness / anti-spoofing improvements
- centralized log aggregation
- automated backup restore testing
- password rotation process
- biometric/privacy policy and consent handling
