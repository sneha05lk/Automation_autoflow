
const apiKey = 'ee683e8213930ba58fe5616ef8b9d672366db8c3';
const query = 'site:facebook.com "furniture manufacturer" (email OR "contact us" OR gmail OR phone)';
const num = 30;

async function test() {
    try {
        const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, num }),
        });
        console.log('Status:', res.status);
        console.log('StatusText:', res.statusText);
        const data = await res.json();
        console.log('Data count:', data.organic ? data.organic.length : 0);
        if (!res.ok) {
            console.log('Full Error:', data);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
