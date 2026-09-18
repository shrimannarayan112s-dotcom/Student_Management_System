# Student Management System

A full-stack college ERP application for managing students, faculty, academic structure, attendance, marks, results, timetables, and notices.

## Technology

- React and Vite frontend
- FastAPI backend
- Python services and validation utilities
- SQL database schema
- Git and GitHub

## Features

### Administrator Portal

- Administrator login and logout
- Administrator profile
- Change administrator password
- Create and manage administrator accounts
- Change account roles
- Activate or deactivate accounts
- Administrator activity logs
- Student statistics dashboard
- Category-based student lists

### Student Management

- Add student
- View all students
- Search student by ID or name
- Update student details
- Delete one or multiple students
- Bulk student entry with spreadsheet-style fields
- Bulk paste student records from tab-separated data

### Academic Management

- Faculty management
- Course management
- Semester management
- Subject management
- Section management
- Bulk entry for faculty, courses, semesters, subjects, and sections
- Capacity tracking for sections

### Faculty Portal

- Faculty login
- Faculty profile
- View department students
- Record student attendance
- Record internal and external marks
- View faculty timetable
- View published notices

### Student Portal

- Student login
- Student profile
- View assigned subjects
- View attendance records and percentages
- View marks and grades
- View total result and percentage
- View personal timetable
- View published notices

## Project Structure

```text
api/          FastAPI routes and application entry point
database/     Database connection and schema
frontend/     React and Vite user interface
models/       Application models
services/     Admin, student, faculty, academic, and portal services
utils/        Password and validation helpers
```

## Local Setup

Install backend dependencies:

```powershell
pip install -r requirements.txt
```

Start the backend:

```powershell
uvicorn api.main:app --reload
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend normally runs at `http://localhost:5173` and the API documentation at `http://127.0.0.1:8000/docs`.

## Deployment Configuration

The frontend API URL can be configured with:

```text
VITE_API_URL=https://your-backend-domain.com
```

The backend allowed frontend origins can be configured with:

```text
CORS_ORIGINS=https://your-frontend-domain.com
```

See `.env.example` and `frontend/.env.example` for local configuration examples.

## Author

Shriman Narayan