# Admission Management CRM

This project is a full-stack Admission Management System designed to manage the student admission workflow efficiently.  
It includes modules for institutions, campuses, departments, programs, seat allocation, and admission confirmation.

---

## Live Demo

Frontend URL:  
https://admission-management-crm-phi.vercel.app/

---

## Tech Stack

Frontend:
- React.js
- Bootstrap
- Axios

Backend:
- Node.js
- Express.js

Database:
- MongoDB Atlas

Other Tools:
- JWT Authentication
- REST APIs

---

## Project Structure

admission-management/
│
├── client/                # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│
├── server/                # Node.js Backend
│   ├── routes/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   └── index.js
│
├── README.md

---

## Setup Instructions

Follow these steps to run the project locally.

### Step 1: Clone Repository

git clone https://github.com/Sushmagowda11/Admission-Management-CRM.git

cd Admission-Management-CRM

---

### Step 2: Install Dependencies

Frontend:

cd client  
npm install  

Backend:

cd ../server  
npm install  

---

### Step 3: Create Environment File

Inside the **server** folder, create a file named:

.env

Add:

MONGODB_URI=your_mongodb_atlas_connection_string  
MONGODB_DB=Admission-Management-CRM  
JWT_SECRET=your_secret_key  

---

### Step 4: Start Backend Server

cd server  

npm start  

---

### Step 5: Start Frontend

cd client  

npm run dev  

---

## Admission Workflow

### Admin Responsibilities

Admin creates:

- Institution
- Campus
- Department
- Program
- Academic Year
- Seat Matrix

---

### Admission Officer Responsibilities

Officer performs:

- Create Applicant
- Allocate Seat
- Verify Documents
- Mark Fee Paid
- Confirm Admission

---

### Management Responsibilities

Management can:

- View Dashboard
- Monitor Seat Utilization
- Track Admission Status

---

## Validation Rules

- Seat cannot be allocated if quota is full.
- Total quota must match intake.
- Admission confirmation allowed only if:
  - Documents = VERIFIED
  - Fee = PAID
- Admission number is immutable after generation.

---

## API Overview

The backend exposes REST APIs for:

- Authentication (Login/Register)
- Applicant Management
- Seat Allocation
- Admission Confirmation
- Dashboard Data

---

## AI Tools Used

The following AI tools were used during development:

ChatGPT:
- Debugging MongoDB Atlas connection
- Resolving deployment issues
- Improving backend logic


---

## Author

Sushma S
Junior Software Developer Candidate