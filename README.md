# Face Attendance Student Track

Face Attendance Student Track is a full-stack institute management platform for student tracking, role-based dashboards, and face-based attendance workflows. It combines a React frontend, Node.js/Express backend, MongoDB database, and a Python Flask face-recognition service to help institutions manage students, teachers, attendance, internships, certificates, achievements, and reports from one system.

## Project Overview

This project is designed for colleges, training centers, and internship programs that need a structured way to manage student activity and attendance. Admins can onboard users, teachers can manage assigned students and internship progress, and students can view their attendance, achievements, certificates, permissions, and profile-related updates.

The system also includes face registration and verification support, allowing attendance workflows to be backed by image-based identity checks.

## Key Features

- Role-based access for admin, teacher, and student users
- Admin dashboard for teacher and student onboarding
- Excel-based student and teacher upload support
- Student login and registration flows
- Teacher dashboard for student tracking and reporting
- Student dashboard for attendance, internship, certificate, and achievement data
- Face registration and face verification workflow
- Backend-proxied face service integration
- Internship status and progress management
- Certificate, achievement, and permission tracking
- Attendance sessions and attendance records
- Email-ready backend configuration
- Environment-based configuration for local and production deployment
- Rate limiting, upload validation, and audit logging

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Face Service | Python, Flask, OpenCV |
| Upload Processing | Multer, XLSX |
| Authentication | JWT, bcryptjs |
| Deployment Support | PM2 ecosystem config, Nginx example |

## Folder Structure

```text
face-attendance-student-track/
├── backend/             # Express API, auth, models, routes, controllers
├── frontend/            # React client application
├── face_recognition/    # Flask face registration and verification service
├── deploy/              # Deployment examples
├── DEPLOYMENT.md        # Production deployment notes
├── ecosystem.config.cjs # PM2 process config
└── README.md
```

## Services

### Backend API

The backend handles authentication, role-based APIs, uploads, attendance, student/teacher/admin workflows, MongoDB persistence, mail configuration, audit logging, and communication with the face-recognition service.

### Frontend Client

The frontend provides separate screens and dashboards for admins, teachers, and students, including login, registration, face setup, attendance, internship, achievement, certificate, and reporting views.

### Face Recognition Service

The Flask service manages face registration and verification using OpenCV-based image processing. It is intended to run separately from the backend and should be exposed privately or behind a secure reverse proxy in production.

## Environment Setup

Create environment files from the provided examples:

- [backend/.env.example](backend/.env.example)
- [frontend/.env.example](frontend/.env.example)
- [face_recognition/.env.example](face_recognition/.env.example)

Never commit real `.env` files, secrets, tokens, generated logs, local databases, uploaded files, or face image data.

## Backend Setup

```bash
cd backend
npm install
npm run validate-env
npm run provision-admin
npm run dev
```

Useful backend scripts:

- `npm start` - run the backend with Node.js
- `npm run dev` - run the backend with Nodemon
- `npm run seed` - run seed data script
- `npm run provision-admin` - create or update the first admin user
- `npm run validate-env` - validate required environment configuration

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

For production builds:

```bash
cd frontend
npm run build
```

## Face Service Setup

```bash
cd face_recognition
python -m venv .venv
.venv\Scripts\activate
pip install flask flask-cors opencv-python numpy
python app.py
```

The default face service values are controlled through `face_recognition/.env.example`.

## Admin Provisioning

Do not rely on default admin auto-creation in production. Configure these values in `backend/.env`:

```env
PROVISION_ADMIN_USERNAME=admin
PROVISION_ADMIN_PASSWORD=change_me_before_use
PROVISION_ADMIN_NAME=Institute Admin
```

Then run:

```bash
cd backend
npm run provision-admin
```

## Recommended Local Startup

1. Start MongoDB.
2. Start the face-recognition service.
3. Start the backend API.
4. Start the React frontend.
5. Log in using the provisioned admin account.

## Security and Hardening

The project already includes several production-minded protections:

- JWT secret is configured through environment variables
- CORS origins are environment-controlled
- Upload size limits are configurable
- Login, face, upload, and certificate routes use rate limiting
- Face registration and verification are proxied through the backend
- Excel, image proof, and document uploads are validated
- Audit events are written to backend logs
- Example environment files are committed while real secrets are ignored

Before real deployment, also add:

- HTTPS with a reverse proxy
- Secure MongoDB access controls
- Centralized logs and monitoring
- Backup and restore procedures
- Credential rotation process
- Strong biometric consent and privacy policy
- Stronger liveness and anti-spoofing checks for face verification

## Deployment Notes

See [DEPLOYMENT.md](DEPLOYMENT.md) for a fuller production runbook.

Recommended production flow:

1. Prepare MongoDB and backend environment variables.
2. Provision the first admin account.
3. Run the face service on an internal host or behind a reverse proxy.
4. Start the backend with production environment values.
5. Build and serve the frontend.
6. Expose only the required public endpoints.

## Future Enhancements

- Add dashboard analytics for attendance trends and student performance
- Add advanced face liveness detection to reduce spoofing risk
- Add automated email/SMS notifications for attendance and permissions
- Add exportable reports in PDF and Excel formats
- Add teacher assignment history and student progress timelines
- Add mobile-responsive refinements for all dashboards
- Add test coverage for authentication, uploads, attendance, and role-based APIs
- Add CI/CD workflow for linting, testing, and deployment
- Add cloud storage support for certificates and student documents
- Add admin controls for academic year, departments, batches, and sections

## Repository Description

Full-stack student attendance and tracking system with role-based admin, teacher, and student dashboards, Excel onboarding, MongoDB APIs, and Flask/OpenCV face registration and verification.
