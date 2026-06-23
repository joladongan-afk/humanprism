const apiKey = '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';

console.log('Testing different Claude models...\n');

const models = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20250514',
  'claude-opus-4-1',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

for (const model of models) {
  const payload = {
    model: model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'hi' }]
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

  const responseText = await response.text();
  
  if (response.ok) {
    console.log(`✅ ${model} - WORKS`);
  } else {
    try {
      const error = JSON.parse(responseText);
      console.log(`❌ ${model} - ${error.error.type}: ${error.error.message}`);
    } catch (e) {
      console.log(`❌ ${model} - Status ${response.status}`);
    }
  }
}
