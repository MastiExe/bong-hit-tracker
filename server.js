const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'taps.json');

app.use(express.json());
app.use(express.static(__dirname));

function getISTDate() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
}

async function loadData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);

        const currentDate = getISTDate();
        if (!parsed.lastReset || parsed.lastReset !== currentDate) {
            console.log(`Daily reset triggered. Last reset: ${parsed.lastReset}, Current: ${currentDate}`);

            if (parsed.users) {
                Object.keys(parsed.users).forEach(userId => {
                    parsed.users[userId].count = 0;
                });
            }

            parsed.hits = [];
            parsed.lastReset = currentDate;
            await saveData(parsed);
        }

        return parsed;
    } catch (error) {
        const initialData = { users: {}, hits: [], lastReset: getISTDate() };
        await saveData(initialData);
        return initialData;
    }
}

async function saveData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

app.post('/api/tap', async (req, res) => {
    try {
        const { userId, username } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const data = await loadData();

        if (!data.users[userId]) {
            data.users[userId] = { count: 0, username: username || 'Anonymous' };
        }

        if (username) {
            data.users[userId].username = username;
        }

        data.users[userId].count++;

        data.hits.push({
            userId,
            username: data.users[userId].username,
            timestamp: new Date().toISOString()
        });

        if (data.hits.length > 100) {
            data.hits = data.hits.slice(-100);
        }

        await saveData(data);

        const totalTaps = Object.values(data.users).reduce((sum, user) => sum + user.count, 0);
        const totalUsers = Object.keys(data.users).length;

        const leaderboard = Object.entries(data.users)
            .map(([id, user]) => ({ userId: id, username: user.username, count: user.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const recentHits = data.hits.slice(-20).reverse();

        res.json({
            userCount: data.users[userId].count,
            totalTaps,
            totalUsers,
            leaderboard,
            recentHits
        });
    } catch (error) {
        console.error('Error processing tap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const data = await loadData();
        const totalTaps = Object.values(data.users).reduce((sum, user) => sum + user.count, 0);
        const totalUsers = Object.keys(data.users).length;

        const leaderboard = Object.entries(data.users)
            .map(([id, user]) => ({ userId: id, username: user.username, count: user.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const recentHits = data.hits.slice(-20).reverse();

        res.json({
            totalTaps,
            totalUsers,
            leaderboard,
            recentHits
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Bong Hits Tracker running on http://localhost:${PORT}`);
});
