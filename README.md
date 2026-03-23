# 🚦 RoadGuard AI

**RoadGuard AI** is a comprehensive, AI-powered traffic monitoring and surveillance dashboard. Designed for scalability and real-time analytics, it processes live camera grid feeds, detects traffic violations, and visualizes large-scale traffic data directly from AWS using a modern React frontend and a robust Node.js backend.

## ✨ Features

- **Surveillance Monitor & Camera Grid**: Real-time visualization of the camera network status and live video feeds.
- **Violation Explorer**: Instant tracking, filtering, and deep-dive analysis of logged traffic violations.
- **Data Analytics Dashboard**: Built-in charts and metrics tracking processing status, violation trends, and system performance.
- **Cloud-Native Data Pipeline**: Seamlessly integrates with **AWS S3** for secure media/document storage and **AWS Athena** for querying massive datasets on the fly.
- **Interactive UI**: A highly responsive, dark-themed dashboard built with Material-UI, Ant Design, Recharts, and Three.js for interactive rendering.

## 🛠️ Tech Stack

**Frontend (Client)**
- React 19 (Vite)
- Material-UI (MUI), Ant Design, & Tailwind CSS for styling
- Recharts for data visualization
- Three.js for 3D/Interactive rendering elements

**Backend (API Data Layer)**
- Node.js & Express
- AWS SDK v3 (`@aws-sdk/client-athena`, `@aws-sdk/client-s3`)
- Multer for file upload handling

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- AWS Account with appropriate S3 and Athena access policies
- Environment variables configured `.env` with your AWS credentials

### Running Locally

1. **Start the Backend API:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *The Express server will start up on its configured port, connecting to your AWS services.*

2. **Start the Frontend Dashboard:**
   Open a new terminal window:
   ```bash
   cd roadguard-ai
   npm install
   npm run dev
   ```
   *The Vite development server will launch on `http://localhost:5173/`.*
