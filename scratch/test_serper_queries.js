const apiKey = 'ee683e8213930ba58fe5616ef8b9d672366db8c3';
const queries = [
    'site:facebook.com "furniture manufacturer" Mumbai',
    'site:facebook.com "furniture manufacturer" contact',
    'facebook.com "furniture manufacturer" email',
    'yoga instructor Delhi site:instagram.com',
];

async function testQuery(query) {
    console.log(`Testing: ${query}`);
    try {
        const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, num: 5 }),
        });
        const data = await res.json();
        console.log(`Status: ${res.status}, Message: ${data.message || 'Success'}, Results: ${data.organic ? data.organic.length : 0}`);
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

async function runTests() {
    for (const q of queries) {
        await testQuery(q);
    }
}

runTests();
