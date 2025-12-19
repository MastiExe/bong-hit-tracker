const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: data ? { 'Content-Type': 'application/json' } : {}
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('🌿 Running Bong Hits Tracker Tests...\n');

    try {
        // Test 1: GET /api/stats should return initial empty state
        console.log('Test 1: Initial stats endpoint');
        const stats1 = await request('GET', '/api/stats');
        assert.strictEqual(stats1.status, 200);
        assert.strictEqual(typeof stats1.data.totalTaps, 'number');
        assert.strictEqual(typeof stats1.data.totalUsers, 'number');
        assert(Array.isArray(stats1.data.leaderboard));
        assert(Array.isArray(stats1.data.recentHits));
        console.log('✅ Pass\n');

        // Test 2: POST /api/tap should record a hit
        console.log('Test 2: Record a hit');
        const tap1 = await request('POST', '/api/tap', {
            userId: 'test-1',
            username: 'Alice'
        });
        assert.strictEqual(tap1.status, 200);
        assert.strictEqual(tap1.data.userCount, 1);
        assert.strictEqual(tap1.data.totalTaps, stats1.data.totalTaps + 1);
        assert.strictEqual(tap1.data.totalUsers, stats1.data.totalUsers + 1);
        console.log('✅ Pass\n');

        // Test 3: Multiple hits from same user
        console.log('Test 3: Multiple hits from same user');
        const tap2 = await request('POST', '/api/tap', {
            userId: 'test-1',
            username: 'Alice'
        });
        assert.strictEqual(tap2.data.userCount, 2);
        console.log('✅ Pass\n');

        // Test 4: Different users
        console.log('Test 4: Multiple users');
        await request('POST', '/api/tap', { userId: 'test-2', username: 'Bob' });
        await request('POST', '/api/tap', { userId: 'test-2', username: 'Bob' });
        await request('POST', '/api/tap', { userId: 'test-2', username: 'Bob' });

        const stats2 = await request('GET', '/api/stats');
        assert(stats2.data.totalUsers >= 2);
        assert(stats2.data.totalTaps >= 5);
        console.log('✅ Pass\n');

        // Test 5: Leaderboard ranking
        console.log('Test 5: Leaderboard ranking');
        assert(stats2.data.leaderboard.length > 0);
        const topUser = stats2.data.leaderboard[0];
        assert.strictEqual(topUser.username, 'Bob');
        assert.strictEqual(topUser.count, 3);
        console.log('✅ Pass\n');

        // Test 6: Recent hits feed
        console.log('Test 6: Recent hits feed');
        assert(stats2.data.recentHits.length > 0);
        const recentHit = stats2.data.recentHits[0];
        assert(recentHit.username);
        assert(recentHit.timestamp);
        console.log('✅ Pass\n');

        // Test 7: Username update
        console.log('Test 7: Username update');
        await request('POST', '/api/tap', {
            userId: 'test-1',
            username: 'Alice Updated'
        });
        const stats3 = await request('GET', '/api/stats');
        const aliceInLeaderboard = stats3.data.leaderboard.find(u => u.userId === 'test-1');
        assert.strictEqual(aliceInLeaderboard.username, 'Alice Updated');
        console.log('✅ Pass\n');

        // Test 8: Missing userId should error
        console.log('Test 8: Error handling for missing userId');
        const errorTap = await request('POST', '/api/tap', { username: 'NoId' });
        assert.strictEqual(errorTap.status, 400);
        console.log('✅ Pass\n');

        console.log('🎉 All tests passed!');
        console.log(`\n📊 Final Stats:`);
        console.log(`   Total Hits: ${stats3.data.totalTaps}`);
        console.log(`   Total Users: ${stats3.data.totalUsers}`);
        console.log(`   Leaderboard:`);
        stats3.data.leaderboard.forEach((user, i) => {
            console.log(`      ${i + 1}. ${user.username}: ${user.count} hits`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
