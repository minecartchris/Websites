const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

// Initialize the app and database
const app = express();
const db = new sqlite3.Database(':memory:'); // In-memory DB (use file-based DB for persistence)

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create the "users" table (for both correct and incorrect attempts)
db.serialize(() => {
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    // Insert the initial correct user
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['admin', '12345']);
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if the username and password exist in the "users" table
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (row) {
            // User exists with correct username and password
            res.json({ success: true, message: 'Login successful!' });
        } else {
            // Store the new incorrect username and password in the database and make it "correct" for future logins
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function (err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error storing login attempt' });
                }
                res.json({ success: false, message: 'Invalid username or password! But now it is a valid credential for future logins.' });
            });
        }
    });
});

// Get all users (for testing purposes)
app.get('/users', (req, res) => {
    db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching users' });
        }
        res.json({ success: true, data: rows });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
