const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database("booknest.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS books (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 author TEXT NOT NULL,
 category TEXT NOT NULL,
 copies INTEGER NOT NULL DEFAULT 1 CHECK(copies >= 0),
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS loans (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 book_id INTEGER NOT NULL REFERENCES books(id),
 borrower TEXT NOT NULL,
 email TEXT NOT NULL,
 issue_date TEXT NOT NULL,
 due_date TEXT NOT NULL,
 returned_at TEXT
);
`);
const bookCount = db.prepare("SELECT COUNT(*) n FROM books").get().n;
if (!bookCount) {
 const add = db.prepare("INSERT INTO books(title,author,category,copies) VALUES(?,?,?,?)");
 [
  ["The Alchemist","Paulo Coelho","Fiction",4],
  ["Wings of Fire","A. P. J. Abdul Kalam","Biography",3],
  ["Clean Code","Robert C. Martin","Technology",2],
  ["Atomic Habits","James Clear","Self Help",3],
  ["The Guide","R. K. Narayan","Fiction",2],
  ["Introduction to Algorithms","Cormen et al.","Technology",2]
 ].forEach(b=>add.run(...b));
}
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/health",(req,res)=>res.json({status:"running",app:"BookNest"}));
app.get("/api/books",(req,res)=>{
 const q=(req.query.q||"").trim();
 const category=(req.query.category||"").trim();
 const books=db.prepare(`
 SELECT b.*,
 (SELECT COUNT(*) FROM loans l WHERE l.book_id=b.id AND l.returned_at IS NULL) borrowed
 FROM books b
 WHERE (b.title LIKE ? OR b.author LIKE ?)
 AND (?='' OR b.category=?)
 ORDER BY b.title
 `).all(`%${q}%`,`%${q}%`,category,category);
 res.json(books.map(b=>({...b,available:Math.max(0,b.copies-b.borrowed)})));
});
app.post("/api/books",(req,res)=>{
 const {title,author,category,copies}=req.body;
 if(!title?.trim()||!author?.trim()||!category?.trim()||!Number.isInteger(Number(copies))||Number(copies)<1)
   return res.status(400).json({error:"Enter a title, author, category, and at least 1 copy."});
 const info=db.prepare("INSERT INTO books(title,author,category,copies) VALUES(?,?,?,?)")
   .run(title.trim(),author.trim(),category.trim(),Number(copies));
 res.status(201).json({id:info.lastInsertRowid,message:"Book added."});
});
app.post("/api/loans",(req,res)=>{
 const {bookId,borrower,email,dueDate}=req.body;
 if(!bookId||!borrower?.trim()||!email?.trim()||!dueDate)
   return res.status(400).json({error:"Complete all fields."});
 const book=db.prepare("SELECT * FROM books WHERE id=?").get(Number(bookId));
 if(!book) return res.status(404).json({error:"Book not found."});
 const borrowed=db.prepare("SELECT COUNT(*) n FROM loans WHERE book_id=? AND returned_at IS NULL").get(book.id).n;
 if(borrowed>=book.copies) return res.status(409).json({error:"No copies currently available."});
 const issueDate=new Date().toISOString().slice(0,10);
 if(dueDate<issueDate) return res.status(400).json({error:"Due date cannot be in the past."});
 const info=db.prepare("INSERT INTO loans(book_id,borrower,email,issue_date,due_date) VALUES(?,?,?,?,?)")
  .run(book.id,borrower.trim(),email.trim().toLowerCase(),issueDate,dueDate);
 res.status(201).json({id:info.lastInsertRowid,message:"Book issued successfully."});
});
app.get("/api/loans",(req,res)=>{
 const email=(req.query.email||"").trim().toLowerCase();
 const loans=db.prepare(`
 SELECT l.*,b.title,b.author FROM loans l JOIN books b ON b.id=l.book_id
 WHERE (?='' OR lower(l.email)=?) ORDER BY l.id DESC
 `).all(email,email);
 res.json(loans);
});
app.post("/api/loans/:id/return",(req,res)=>{
 const loan=db.prepare("SELECT * FROM loans WHERE id=?").get(Number(req.params.id));
 if(!loan) return res.status(404).json({error:"Loan record not found."});
 if(loan.returned_at) return res.status(400).json({error:"This book has already been returned."});
 db.prepare("UPDATE loans SET returned_at=? WHERE id=?").run(new Date().toISOString().slice(0,10),loan.id);
 res.json({message:"Book returned successfully."});
});
app.get("/api/stats",(req,res)=>{
 const books=db.prepare("SELECT COUNT(*) n FROM books").get().n;
 const copies=db.prepare("SELECT COALESCE(SUM(copies),0) n FROM books").get().n;
 const active=db.prepare("SELECT COUNT(*) n FROM loans WHERE returned_at IS NULL").get().n;
 const overdue=db.prepare("SELECT COUNT(*) n FROM loans WHERE returned_at IS NULL AND due_date<?").get(new Date().toISOString().slice(0,10)).n;
 res.json({bookTitles:books,totalCopies:copies,activeLoans:active,overdue});
});
app.listen(PORT,()=>console.log(`BookNest running at http://localhost:${PORT}`));
