var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');
const fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

        const sql = fs.readFileSync(path.join(__dirname, 'dogwalks.sql'), 'utf8');

        const statements = sql.split(';').filter((stmt) => stmt.trim());

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
        const [dogs] = await db.execute(`
            SELECT d.name AS dog_name, d.size, u.username
            AS owner_username
            FROM Dogs d
            JOIN Users u ON d.owner_id = u.user_id
            ORDER BY d.name
            `);
            res.json(dogs);

    } catch (err) {
        console.error('Error fetching dogs:', err);
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});

// API ROUTE: OPEN WALK REQUESTS
app.get('/api/walkrequests/open', async (req,res) => {
    try {
        const [walkRequests] = await db.execute(`
            SELECT
                wr.request_id,
                d.name AS dog_name,
                wr.requested_time,
                wr.duration_minutes,
                wr.location,
                u.username AS owner_username
            FROM WalkRequests wr
            JOIN Dogs d ON wr.dog_id = d.dog_id
            JOIN Users u ON d.owner_id = u.user_id
            WHERE wr.status = 'open'
            ORDER BY wr.requested_time
            `);
        res.json(walkRequests);
    } catch (err) {
        console.error('Error fetching open walk requests:', err);
        res.status(500).json({ error: 'Failed to fetch open walk requests' });
    }
});

// API ROUTE: WALKER SUMMARY
app.get('/api/walkers/summary', async (req, res) => {
    try {
        const [walkerSummary] = await db.execute(`
            SELECT
                u.username AS walker_username,
                COUNT(DISTINCT CASE WHEN wr.status = 'completed' THEN wr.request_id END) AS completed_walks,
                COUNT(DISTINCT wrt.rating_id) AS total_ratings,
                AVG(wrt.rating) AS average_rating
            FROM Users u
            LEFT JOIN WalkApplications wa ON u.user_id = wa.walker_id
            LEFT JOIN WalkRequests wr ON wa.request_id = wr.request_id AND wa.status = 'accepted'
            LEFT JOIN WalkRatings wrt ON wr.request_id = wrt.request_id AND u.user_id = wrt.walker_id
            WHERE u.role = 'walker'
            GROUP BY u.user_id, u.username
            ORDER BY u.username
            `);

        const formattedSummary = walkerSummary.map((walker) => ({
            walker_username: walker.walker_username,
            total_ratings: parseInt(walker.total_ratings, 10),
            average_rating: walker.average_rating ? parseFloat(walker.average_rating) : null,
            completed_walks: parseInt(walker.completed_walks, 10)
        }));

        res.json(formattedSummary);
    } catch (err) {
        console.error('Error fetching walker summary:', err);
        res.status(500).json({ error: 'Failed to fetch walker summary' });
    }
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
