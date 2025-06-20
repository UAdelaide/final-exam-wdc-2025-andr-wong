var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

let db;

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });

        await connection.query('DROP DATABASE IF EXISTS DogWalkService');
        await connection.query('CREATE DATABASE DogWalkService');
        await connection.query('USE DogWalkService');

        const fs = require('fs');
        const sql = fs.readFileSync(path.join(__dirname, 'dogwalks.sql'), 'utf8');

        const statements = sql.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }

        await connection.end();

        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'DogWalkService'
        });
    } catch (err) {
        console.error('Error setting up the database', err);
    }
})();

// API ROUTE: DOGS
app.get('/api/dogs', async (req, res) => {
    try {
        const [dogs] = await db.execute('
            SELECT d.name AS dog_name, d.size, u.username
            AS owner_username
            FROM Dogs d
            JOIN Users u ON d.owner_id = u.user_id
            ORDER BY d.name
            ');
            res.json(dogs);
    }   catch (err) {
        console.error('Error fetching dogs:', err);
        res.status(500).json({error: 'Failed to fetch dogs'});
    }
});

module.exports = app;
