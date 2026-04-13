# 🍽️ MessMate — Smart Mess Management System

> A full-stack web application built to solve real food wastage and management problems in college mess systems.

---

## 💡 The Problem

Every day at our college mess, hundreds of meals were prepared without knowing how many students would actually show up.

The result? **Massive food wastage. Every single day.**

- Students forgot to cancel meals when they weren't eating
- Admins had zero visibility into actual demand before cooking
- Everything was tracked on **paper registers** — no data, no patterns, no control
- Fee records were maintained manually, prone to errors and disputes
- There was no way for students to know what was being served in advance

This wasn't just an inconvenience — it was a systemic problem affecting food resources, mess finances, and student experience daily.

---

## ✅ The Solution

**MessMate** brings the entire mess operation online with one core idea:

> *If students book meals in advance, the kitchen knows exactly how much food to prepare — and wastage drops significantly.*

Students book what they'll eat. Admins see exact counts before cooking. Everyone wins.

---

## ✨ Features

### 👨‍🎓 Student Panel
- 📅 **Daily Meal Booking** — Book breakfast, lunch, or dinner for any upcoming day
- ⚙️ **Default Preferences** — Set your default meal choices; the system auto-books them daily via a cron job
- 📋 **My Bookings** — View, track, and manage all past and upcoming bookings
- 🗓️ **Weekly Menu** — See what's being served throughout the week before deciding

### 🛠️ Admin Panel
- 📊 **Analytics Dashboard** — See exact meal counts per day before cooking begins
- 🍱 **Meal Configuration** — Configure available meals and their pricing
- 📆 **Weekly Menu Config** — Plan and publish the week's menu in advance
- 🔒 **Mess Closure** — Mark holidays or closure days so students aren't charged
- 💰 **Fees Manager** — Track and manage student fee records digitally

### 🔐 Security
- JWT-based authentication with protected routes
- Role-based access control (Student / Admin)
- Rate limiting on auth endpoints (prevents brute force)
- Secure password hashing with bcrypt
- Auto-seeded admin account on first startup

### ⚡ Automation
- Cron job runs daily to auto-book meals for students based on their saved default preferences — so even if a student forgets, their regular meals are booked

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
│   ├── middleware/     # JWT auth middleware
│   ├── utils/          # Auto-booking logic, admin seeder
│   ├── cronJob.js      # Daily scheduled tasks
│   └── server.js       # Entry point
│
└── frontend/vite-project/
    ├── src/
    │   ├── components/
    │   │   ├── Admin/      # Admin panel pages
    │   │   ├── Auth/       # Login & Register
    │   │   ├── Common/     # Navbar, ErrorBoundary, ProtectedRoute
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
# Set VITE_API_URL=http://localhost:5000
npm run dev
```

### 4. Open in Browser

Visit `http://localhost:5173` — the app redirects to login automatically.
An admin account is created from your `.env` credentials on first startup.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Strong random secret for signing tokens |
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
- [ ] Payment integration (Razorpay / UPI) for online fee collection
- [ ] Student feedback & rating system for meals
- [ ] Export daily reports as PDF/Excel for admin

---

## 🧑‍💻 Author

**[Your Name]**  
2nd Year B.Tech — [Your Branch] | [Your College Name]  
📧 your.email@example.com  
🔗 [LinkedIn](https://linkedin.com/in/your-profile) | [GitHub](https://github.com/your-username)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> ⭐ If you found this useful or interesting, please consider giving it a star — it keeps the motivation going!
