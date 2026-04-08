const data = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "2225874611577842",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              phone_number_id: "1033881496477434",
            },
            contacts: [
              {
                profile: {
                  name: "Vizag Tester",
                },
              },
            ],
            messages: [
              {
                from: "919160048855",
                id: "wamid.HBLBALALAXCV23419999",
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: {
                  body: "I am arriving in Rushikonda next week, what is happening there?",
                },
                type: "text",
              },
            ],
          },
          field: "messages",
        },
      ],
    },
  ],
};

fetch("http://localhost:4000/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
})
  .then((res) => {
    console.log("Mock Location Webhook Sent! Status:", res.status);
    if (res.status !== 200) {
      return res.text().then(console.error);
    }
    console.log("Success! Wait 3 seconds to test Personalization Extraction.");
  })
  .catch(console.error);
