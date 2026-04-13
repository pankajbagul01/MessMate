# 🍽️ MessMate — Smart Mess Management System

> A full-stack web application for managing college mess bookings, meal planning, and fee tracking — built to solve real problems faced by students and mess administrators every day.

---

## 📌 About the Project

MessMate is a **college mess management system** that replaces manual registers and spreadsheets with a clean, digital experience. Students can book meals, set preferences, and view the weekly menu — while admins get full control over meal configuration, analytics, and fee records.

Built as a personal project during my 3rd year of engineering to solve a real problem at my college.

---

## ✨ Features

### 👨‍🎓 Student Panel
- 📅 **Daily Meal Booking** — Book breakfast, lunch, or dinner for any day
- ⚙️ **Default Preferences** — Set your default meal choices so bookings auto-fill
- 📋 **My Bookings** — View, track, and manage all your bookings
- 🗓️ **Weekly Menu** — See what's being served throughout the week

### 🛠️ Admin Panel
- 📊 **Analytics Dashboard** — Daily and historical booking insights
- 🍱 **Meal Configuration** — Set available meals and their pricing
- 📆 **Weekly Menu Config** — Plan the week's menu in advance
- 🔒 **Mess Closure** — Mark holidays or closure days
- 💰 **Fees Manager** — Track and manage student fee records

### 🔐 Authentication & Security
- JWT-based authentication with protected routes
- Role-based access control (Student / Admin)
- Rate limiting on auth and API endpoints (prevents brute force)
- Secure password hashing with bcrypt

### ⚡ Automation
- Cron job for automatic daily meal bookings based on student preferences
- Admin account auto-seeded on first startup

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Vite |
| **Styling** | Tailwind CSS, Custom CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | JWT (JSON Web Tokens), bcryptjs |
| **HTTP Client** | Axios |
| **Icons** | Lucide React |
| **Scheduler** | node-cron |
| **Rate Limiting** | express-rate-limit |

---

## 📁 Project Structure

```
messmate/
├── backend/
│   ├── models/         # Mongoose schemas (User, Booking, MealConfig, etc.)
│   ├── routes/         # Express API routes
│   ├── middleware/     # Auth middleware
│   ├── utils/          # Auto-booking logic, admin seeder
│   ├── cronJob.js      # Scheduled tasks
│   └── server.js       # Entry point
│
└── frontend/vite-project/
    ├── src/
    │   ├── components/
    │   │   ├── Admin/      # Admin panel pages
    │   │   ├── Auth/       # Login & Register
    │   │   ├── Common/     # Navbar, ErrorBoundary, etc.
    │   │   └── student/    # Student dashboard pages
    │   ├── context/        # Auth context (global state)
    │   ├── hooks/          # Custom React hooks
    │   └── services/       # Axios API service layer
    └── index.html
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/messmate.git
cd messmate
```

### 2. Setup the Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and admin credentials
npm run dev
```

### 3. Setup the Frontend

```bash
cd frontend/vite-project
npm install
cp .env.example .env
# Set VITE_API_URL to your backend URL (e.g., http://localhost:5000)
npm run dev
```

### 4. Open in Browser

Visit `http://localhost:5173` — the app will redirect to login.  
An admin account is automatically created using the credentials in your `.env` file.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Strong random secret for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `PORT` | Server port (default: `5000`) |
| `ADMIN_EMAIL` | Email for the seeded admin account |
| `ADMIN_PASSWORD` | Password for the seeded admin account |
| `ADMIN_NAME` | Display name for admin |

### Frontend (`frontend/vite-project/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |

---

## 📡 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register student |
| GET/POST | `/api/booking` | Manage bookings |
| GET/PUT | `/api/default` | Default meal preferences |
| GET/POST | `/api/mealconfig` | Meal configuration (Admin) |
| GET/POST | `/api/weekly-menu` | Weekly menu (Admin) |
| GET/POST | `/api/mess-closure` | Mark mess closure days |
| GET/POST | `/api/fees` | Fee records (Admin) |

---

## 🔮 Future Improvements

- [ ] Email/SMS notifications for bookings and fee reminders
- [ ] QR code-based meal verification at the mess counter
- [ ] Mobile app (React Native)
- [ ] Razorpay / UPI payment integration for fee collection
- [ ] Student feedback & rating system for meals
- [ ] Export reports as PDF/Excel

---

## 🧑‍💻 Author

**PANKAJ BAGUL**  
CS(AIML) B.Tech Student  
📧 contact.with.pankaj01@example.com  
🔗 [LinkedIn](https://linkedin.com/in/pankajbagul01) | [GitHub](https://github.com/pankajbagul01)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> ⭐ If you found this project useful or interesting, please consider giving it a star!