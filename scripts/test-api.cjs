const Anthropic = require('@anthropic-ai/sdk');
const c = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
c.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 10,
  messages: [{ role: 'user', content: 'ping' }]
}).then(r => {
  console.log('API OK:', JSON.stringify(r.content));
}).catch(e => {
  console.error('API ERROR:', e.message, e.status);
});
