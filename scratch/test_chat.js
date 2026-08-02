// scratch/test_chat.js
const http = require('http');

const data = JSON.stringify({
  message: "Tell me about baby lotion safety"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  console.log(`STATUS: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      console.log('=== CHATBOT RESPONSE ===');
      console.log(`Answer:\n${response.answer}\n`);
      console.log(`Source Chunks Count: ${response.sourceChunks ? response.sourceChunks.length : 0}`);
      if (response.sourceChunks && response.sourceChunks.length > 0) {
        console.log('Matches:');
        response.sourceChunks.forEach((c, i) => {
          console.log(`  [${i+1}] Title: ${c.title}, Category: ${c.category}, Similarity: ${c.similarity}`);
        });
      } else {
        console.log('Note: Fell back to local product matcher.');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
