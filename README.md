# BookNest — Library Management System

## Technology
- Frontend: HTML, CSS, JavaScript (Fetch API)
- Backend: Node.js + Express
- Database: SQLite (`better-sqlite3`)

## Features
- Browse, search and filter books
- Add books and copies
- Issue a book with borrower details and due date
- Prevent issuing beyond available copies
- Find loans using borrower email
- Demo return flow
- Dashboard counts and overdue tracking
- Responsive layout

## Run on Windows / VS Code
1. Install Node.js LTS.
2. Extract this ZIP and open the `BookNest_Library_Project` folder in VS Code.
3. Open Terminal > New Terminal.
4. Run `npm install`
5. Run `npm start`
6. Open `http://localhost:3000`

The database file `booknest.db` is created automatically on first run. Stop the server with Ctrl+C.

## API routes
- `GET /api/health`
- `GET /api/books?q=&category=`
- `POST /api/books`
- `POST /api/loans`
- `GET /api/loans?email=`
- `POST /api/loans/:id/return`
- `GET /api/stats`

## Demo and safety notes
This is an academic prototype, not a production library system. It has no authenticated librarian/student accounts, authorization, backups, or privacy hardening. The “Mark returned” action is intended for demonstration. Use fictional/sample borrower data during demos. Confirm behavior with your actual Node.js environment and document genuine screenshots/test results in the report.
