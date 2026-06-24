const apiKey = 'sk-ant-api03-OXK5wWogy-0VrPpMh0I9rMBqXSG15uswUltGHOJ2';

console.log('Testing Claude API directly...');
console.log('API Key (first 30 chars):', apiKey.substring(0, 30));

const payload = {
  model: 'claude-3-5-sonnet-20250514',
  max_tokens: 100,
  messages: [
    {
      role: 'user',
      content: '안녕?'
    }
  ]
};

console.log('\nRequest payload:', JSON.stringify(payload, null, 2));

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify(payload)
});

console.log('\nResponse status:', response.status);
console.log('Response headers:', Object.fromEntries(response.headers));

const responseText = await response.text();
console.log('\nResponse body:', responseText);

if (response.ok) {
  const result = JSON.parse(responseText);
  console.log('\n✅ SUCCESS! Response:', result.content[0].text);
} else {
  console.log('\n❌ FAILED');
  try {
    const error = JSON.parse(responseText);
    console.log('Error details:', error);
  } catch (e) {
    console.log('Raw response:', responseText);
  }
}
