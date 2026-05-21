import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const port = 3000;
const messages = [
  {
    message: "Hello",
    user: "Jane",
    time: Date.now() - 6000,
  },
  {
    message: "Hey",
    user: "John",
    time: Date.now() - 3000,
  },
  {
    message: "Hi",
    user: "Bob",
    time: Date.now(),
  },
];
const callbacksForNewMessages = [];

app.get("/", (req, res) => {
  res.json({ message: `Welcome to my Chat Application!` });
});

app.get("/messages", (req, res) => {
  let since = Number(req.query.since);
  let longPoll = req.query.longPoll === "true";

  if (since) {
    const messagesToSend = messages.filter((msg) => msg.time > since);
    if (messagesToSend.length === 0 && longPoll) {
      callbacksForNewMessages.push((val) => res.json(val));
      return;
    } else res.json(messagesToSend);
    return;
  }
  res.json(messages);
});

app.post("/messages", (req, res) => {
  const { message, user } = req.body;

  if (
    typeof message !== "string" ||
    typeof user !== "string" ||
    !message.trim() ||
    !user.trim()
  ) {
    res.status(400).json({ error: `Message and user are required!` });
    return;
  }

  messages.push({
    message,
    user,
    time: Date.now(),
  });
  while (callbacksForNewMessages.length > 0) {
    const callback = callbacksForNewMessages.pop();
    callback([messages[messages.length - 1]]);
  }
  res.status(201).json({ success: true });
});

app.listen(port, () => {
  console.log(`Chat server listening on port ${port}`);
});
