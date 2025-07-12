const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

const USERNAME = 'cal4';
const PASSWORD = '1john419';
const USERS_FILE = './users.json';

function getProgress() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveProgress(data) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// Login Page
app.get('/', (req, res) => {
    if (req.session.loggedIn) return res.redirect('/dashboard');
    res.render('login');
});

// Handle Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === USERNAME && password === PASSWORD) {
        req.session.loggedIn = true;
        return res.redirect('/dashboard');
    }
    res.send('Invalid login. <a href="/">Try again</a>.');
});

// Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.loggedIn) return res.redirect('/');
    const books = fs.readdirSync('./books');
    const progress = getProgress()[USERNAME] || {};
    res.render('dashboard', { books, progress });
});

// Read Chapter
app.get('/read/:book/:chapter', (req, res) => {
    if (!req.session.loggedIn) return res.redirect('/');

    const { book, chapter } = req.params;
    const chapterPath = path.join(__dirname, 'books', book, `${chapter}.html`);

    if (!fs.existsSync(chapterPath)) return res.send('Chapter not found');

    // 🛠️ Fixed: sort chapters numerically
    const chapters = fs.readdirSync(path.join(__dirname, 'books', book))
        .filter(f => f.endsWith('.html'))
        .sort((a, b) => {
            const numA = parseInt(a.replace('.html', ''));
            const numB = parseInt(b.replace('.html', ''));
            return numA - numB;
        });

    const currentIndex = chapters.indexOf(`${chapter}.html`);
    const nextChapter = chapters[currentIndex + 1]
        ? chapters[currentIndex + 1].replace('.html', '')
        : null;

    const prevChapter = chapters[currentIndex - 1]
        ? chapters[currentIndex - 1].replace('.html', '')
        : null;

    const progress = getProgress();
    progress[USERNAME] = progress[USERNAME] || {};
    progress[USERNAME][book] = chapter;
    saveProgress(progress);

    let chapterContent;
    try {
        chapterContent = fs.readFileSync(chapterPath, 'utf8');
    } catch (err) {
        console.error('Error reading chapter file:', err);
        return res.status(500).send('Error reading chapter content.');
    }

    try {
        res.render('reader', {
            book,
            chapter,
            content: chapterContent,
            nextChapter,
            prevChapter
        });
    } catch (err) {
        console.error('Render error:', err);
        res.status(500).send('Internal Server Error: ' + err.message);
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
