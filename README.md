# 📱 Solin

Solin is an AI-powered mobile application designed to streamline university life. Built with the **MERN** stack (MongoDB, Express, React Native via Expo, Node.js), Solin features:

- 📅 **Live Timetable Organizer & Events Calendar**  
  Organize your academic schedule dynamically and track university events all in one place.

- 🧠 **Notion-like Smart Document Tool**  
  Upload or paste your lecture notes, and Solin will parse and summarize them using AI, turning them into clean, organized documents.

---

## 🚀 Features

- Real-time calendar and class scheduler.
- Integrated event tracker.
- AI-generated documents from raw lecture notes.
- Notion-like markdown editing experience.
- Mobile-first with full offline support.

---

## 🛠 Tech Stack

- **Frontend:** React Native (Expo)
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **AI:** Gemini API (or equivalent)

---

## 🧪 Getting Started for Development

### 1. 📦 Prerequisites

- Node.js (v18+ recommended)
- npm
- Expo CLI (`npm install -g expo-cli`)
- MongoDB (local or Atlas)
- Gemini API key (or another supported AI API)
- JWT Secret Key

---

### 2. 🔑 Environment Variables

Create a `.env` file in the **root of your backend** with the following keys:

```env
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 3. 📱 Running the App in Development Mode

Frontend (React Native + Expo)


cd frontend
npm install
npm start

This will launch the Expo Dev Tools. Use the Expo Go app on your phone or an Android/iOS simulator to test the app.

Backend (Node + Express)

cd backend
npm install
node server.js

Make sure your MongoDB service is running and your .env file is correctly configured.

📁 Project Structure
bash
Copy
Edit
/frontend        → React Native (Expo) app
/backend         → Node.js + Express API
.env             → API keys and secrets (not included in repo)
README.md        → This file

🧠 AI Parsing and Generation
The document feature uses a custom parser to extract content from raw notes. It then feeds that content into the Gemini API for summarization and enhancement.

🔐 Authentication
Solin uses JWT tokens to manage user sessions securely. Be sure to configure JWT_SECRET in your backend environment.

📌 Notes
You need to have a valid MongoDB URI and Gemini API Key.

Development and deployment environments should never share the same API keys.

Don’t commit your .env file to version control.

💡 Future Ideas
Cloud sync support for documents

Course-specific schedule templates

AI-generated quizzes from notes

Voice-to-notes transcription

🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

📜 License
MIT License © 2025 Hasan Shkoukani

Let me know if you'd like the README to include screenshots, setup GIFs, or if you're planning to deploy a
