const express = require('express');
const { kv } = require('@vercel/kv');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

function getISTDate() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
}

async function checkAndResetDaily() {
    const currentDate = getISTDate();
    const lastReset = await kv.get('lastReset');

    if (!lastReset || lastReset !== currentDate) {
        console.log(`Daily reset triggered. Last reset: ${lastReset}, Current: ${currentDate}`);

        // Get all user keys and reset their counts
        const userKeys = await kv.keys('user:*');
        for (const key of userKeys) {
            const user = await kv.get(key);
            if (user) {
                user.count = 0;
                await kv.set(key, user);
            }
        }

        // Clear hits
        await kv.del('hits');
        await kv.set('lastReset', currentDate);
    }
}

app.post('/api/tap', async (req, res) => {
    try {
        const { userId, username } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        await checkAndResetDaily();

        const userKey = `user:${userId}`;
        let user = await kv.get(userKey);

        if (!user) {
            user = { count: 0, username: username || 'Anonymous' };
        }

        if (username) {
            user.username = username;
        }

        user.count++;
        await kv.set(userKey, user);

        // Add to hits list (keep last 100)
        const hit = {
            userId,
            username: user.username,
            timestamp: new Date().toISOString()
        };

        await kv.lpush('hits', JSON.stringify(hit));
        await kv.ltrim('hits', 0, 99);

        // Get stats for response
        const userKeys = await kv.keys('user:*');
        const users = {};
        let totalTaps = 0;

        for (const key of userKeys) {
            const userData = await kv.get(key);
            const uid = key.replace('user:', '');
            users[uid] = userData;
            totalTaps += userData.count;
        }

        const totalUsers = userKeys.length;

        const leaderboard = Object.entries(users)
            .map(([id, user]) => ({ userId: id, username: user.username, count: user.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const hitsData = await kv.lrange('hits', 0, 19);
        const recentHits = hitsData.map(h => JSON.parse(h));

        res.json({
            userCount: user.count,
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
        await checkAndResetDaily();

        const userKeys = await kv.keys('user:*');
        const users = {};
        let totalTaps = 0;

        for (const key of userKeys) {
            const userData = await kv.get(key);
            const uid = key.replace('user:', '');
            users[uid] = userData;
            totalTaps += userData.count;
        }

        const totalUsers = userKeys.length;

        const leaderboard = Object.entries(users)
            .map(([id, user]) => ({ userId: id, username: user.username, count: user.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const hitsData = await kv.lrange('hits', 0, 19);
        const recentHits = hitsData.map(h => JSON.parse(h));

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

// Export for Vercel
module.exports = app;

// Only start server locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Bong Hits Tracker running on http://localhost:${PORT}`);
    });
}
