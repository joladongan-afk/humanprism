const apiKey = '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';

console.log('Testing Claude API with full key...');
console.log('API Key length:', apiKey.length);
console.log('API Key (first 40 chars):', apiKey.substring(0, 40));

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

const responseText = await response.text();

if (response.ok) {
  const result = JSON.parse(responseText);
  console.log('\n✅ SUCCESS!');
  console.log('Model:', result.model);
  console.log('Response:', result.content[0].text);
  console.log('Stop reason:', result.stop_reason);
  console.log('Usage:', result.usage);
} else {
  console.log('\n❌ FAILED');
  try {
    const error = JSON.parse(responseText);
    console.log('Error:', error.error);
  } catch (e) {
    console.log('Raw response:', responseText);
  }
}
