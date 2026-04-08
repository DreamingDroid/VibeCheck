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
                  name: "Trivikram",
                },
              },
            ],
            messages: [
              {
                from: "919160048855",
                id: "wamid.HBgMOTE5MTYwMDQ4ODU1FQIAEhgWM0VCODQ3NDQxMEQ1NzM4MTE3RUVYAA==",
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: {
                  body: "Hey VibeCheck! I am looking for a relaxing acoustic music event near the beach this weekend. What do you recommend?",
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
    console.log("Mock Webhook Sent! Status:", res.status);
    if (res.status !== 200) {
      return res.text().then(console.error);
    }
    console.log("Success! Check your VibeCheck Server terminal for the AI logs and check your phone for the reply!");
  })
  .catch(console.error);
