import express from "express";
import cors from "cors";
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());
app.use(dotenv())

const port = process.env.PORT || 3000;
let nextMessageId = 1;
const messages = [
  {
    id: nextMessageId++,
    message: "Hello",
    user: "Jane",
    time: Date.now() - 6000,
    likes: 1,
    dislikes: 2,
  },
  {
    id: nextMessageId++,
    message: "Hey",
    user: "John",
    time: Date.now() - 3000,
    likes: 1,
    dislikes: 2,
  },
  {
    id: nextMessageId++,
    message: "Hi",
    user: "Bob",
    time: Date.now(),
    likes: 1,
    dislikes: 2,
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

  const newMessage = {
    id: nextMessageId++,
    message,
    user,
    time: Date.now(),
    likes: 0,
    dislikes: 0,
  };

  messages.push(newMessage);
  while (callbacksForNewMessages.length > 0) {
    const callback = callbacksForNewMessages.pop();
    callback([messages[messages.length - 1]]);
  }
  res.status(201).json({ success: true });
});

app.post("/messages/:id/like", (req, res) => {
  const id = Number(req.params.id);
  const message = messages.find((msg) => msg.id === id);

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  message.likes++;
  res.json(message);
});

app.post("/messages/:id/dislike", (req, res) => {
  const id = Number(req.params.id);
  const message = messages.find((msg) => msg.id === id);

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  message.dislikes++;
  res.json(message);
});

app.listen(port, () => {
  console.log(`Chat server listening on port ${port}`);
});
