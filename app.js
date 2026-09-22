// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port, verify_token, and WhatsApp API credentials
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const graphApiToken = process.env.GRAPH_API_TOKEN; // your permanent system user access token
const phoneNumberId = process.env.PHONE_NUMBER_ID; // e.g. 1256757994194626

// Route for GET requests (webhook verification)
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests (incoming messages)
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Always acknowledge receipt immediately
  res.status(200).end();

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Only act on actual incoming user messages (not status updates, etc.)
    if (message) {
      const from = message.from; // sender's WhatsApp number
      const incomingText = message.text?.body || '';

      console.log(`Replying to ${from} (said: "${incomingText}")`);

      const response = await fetch(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${graphApiToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: from,
            type: 'text',
            text: {
              body: `You said: "${incomingText}". This is an automated reply!`,
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        console.error('Error sending message:', JSON.stringify(data, null, 2));
      } else {
        console.log('Reply sent:', JSON.stringify(data, null, 2));
      }
    }
  } catch (err) {
    console.error('Error handling webhook:', err);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});