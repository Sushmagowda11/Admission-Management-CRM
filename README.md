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
├── database.sqlite
└── README.md

## Admission Workflow

1. Admin creates:
   - Institution
   - Campus
   - Department
   - Program
   - Academic Year
   - Seat Matrix

2. Officer performs:
   - Create Applicant
   - Allocate Seat
   - Verify Documents
   - Mark Fee Paid
   - Confirm Admission

3. Management:
   - View Dashboard
   - Monitor seat utilization


 ## Validation Rules

- Seat cannot be allocated if quota is full.
- Total quota must match intake.
- Admission confirmation allowed only if:
  - Documents = VERIFIED
  - Fee = PAID
- Admission number is immutable after generation.

