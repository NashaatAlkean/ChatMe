##ChatMe

Real-time chat application with Angular, Spring Boot, MongoDB, Firebase Auth & WebSockets. Junior Backend Assignment featuring live messaging, user authentication, and push notifications.

## 🚀 Features

### 🔐 Authentication
- **Firebase Authentication** (Email/Password or Google Sign-In)  
- Secure backend routes & WebSocket connections using Firebase ID tokens  
- UI adapts dynamically based on authentication state (login form vs. chat interface)

### 💬 Chat Functionality (WebSocket)
- Send & receive messages in **real time**  
- Retrieve chat history from **MongoDB**  
- **Message format**:
```json
{
  "senderId": "string",
  "receiverId": "string",
  "timestamp": "ISO date string",
  "message": "string"
}
```

### 🧠 Backend
- **Spring Boot** with WebSocket for live chat  
- Firebase JWT verification for both WebSocket & REST endpoints  
- REST API endpoint for retrieving recent chat history  
- MongoDB for message storage  

### 🔔 Firebase Cloud Function
- Triggered whenever a message is sent  
- Simulates sending push notifications (**console log**)

### 🌐 Frontend
- **Angular** app deployed on Firebase Hosting  
- User login & authentication state handling  
- User selection for direct messaging  
- Real-time chat history display and live messaging  

---

## 📦 Tech Stack
- **Backend:** Java Spring Boot, WebSocket, MongoDB Atlas, Firebase Admin SDK  
- **Frontend:** Angular, Firebase Hosting  
- **Database:** MongoDB Atlas  
- **Auth:** Firebase Authentication  
- **Notifications:** Firebase Cloud Functions  

---

## 🛠 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/NashaatAlkean/ChatMe-App.git
cd ChatMe-App
```

### 2️⃣ Backend Setup
Create `application.properties` in `src/main/resources`:
```properties
spring.application.name=ChatApp
server.port=8080
spring.data.mongodb.uri=YOUR_MONGODB_ATLAS_URI
spring.data.mongodb.database=chatApp

firebase.project-id=YOUR_FIREBASE_PROJECT_ID
firebase.service-account-key=path/to/serviceAccountKey.json
cors.allowed-origins=http://localhost:4200
```
Run backend:
```bash
mvn spring-boot:run
```

### 3️⃣ Frontend Setup
```bash
cd frontend
npm install
```
Update Firebase config in `environment.ts`, then run:
```bash
ng serve
```

---

## 🔥 Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)  
2. Create a new project  
3. Enable Authentication (**Email/Password** & **Google Sign-In**)  
4. Create a Service Account & download `serviceAccountKey.json`  
5. Set up Firebase Hosting  
6. Create a Firebase Cloud Function for notification logging  

---

## 🎥 Demo
📹 [Watch Demo](https://drive.google.com/file/d/1zi3MUnjFnD2Uwd5NNUHGR0-DANHLCkOn/view?usp=sharing)

---

## 🤖 AI Tools Usage
- **ChatGPT** → Explanations, code assistance, README structuring  
- **Claude** → UI design suggestions  
- **GitHub Copilot** → Code autocomplete  

---

## 📂 Deliverables
- Backend & frontend code  
- Firebase project setup  
- README setup guide  
- Demo screenshots/recording  
