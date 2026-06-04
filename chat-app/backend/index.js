import express from "express";
import cors from "cors";

const port = process.env.PORT || 3000;
// Auto-increment IDS
let nextMessageId = 1;
// In-memory message store, shared by all clients
const messages = [];
// Stores pending longPoll requests waiting for new messages
const callbacksForNewMessages = [];

// App setup
const app = express();
app.use(cors());
app.use(express.json());

// Routes
/**
 * GET /
 * Returns messages to client
 *
 * Query params:
 * since - timestamps (ms). If provided, only messages newer than this are returned
 * longPoll - If true and there are no new messages, holds the connection open
 *            until there are new messages instead of returning empty array.
 */
app.get("/", (req, res) => {
  let since = Number(req.query.since);
  let longPoll = req.query.longPoll === "true";

  if (since) {
    const messagesToSend = messages.filter((msg) => msg.time > since);

    // callback until a new message is posted
    // No new messages and client wants long-polling - park the response
    if (messagesToSend.length === 0 && longPoll) {
      callbacksForNewMessages.push((val) => res.json(val));
      return;
    }
    res.json(messagesToSend);
    return;
  }
  // No "since" param, return the full message history
  res.json(messages);
});

/**
 * POST /
 * Accepts a new message from a client.
 * Trims whitespace from user and message before saving so that
 * values like "  hello  " are stored as "hello".
 */
app.post("/", (req, res) => {
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

  // Resolve all parked long-poll clients with new messages
  while (callbacksForNewMessages.length > 0) {
    const callback = callbacksForNewMessages.pop();
    callback([newMessage]);
  }
  res.status(201).json({ success: true });
});

/**
 * POST /:id/:reaction
 * Increments the like or dislike count on a message.
 * Returns the updated message object.
 */
app.post("/:id/:reaction", (req, res) => {
  const id = Number(req.params.id);
  const reaction = req.params.reaction;

  const message = messages.find((msg) => msg.id === id);
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (reaction === "like") {
    message.likes++;
  } else if (reaction === "dislike") {
    message.dislikes++;
  } else {
    res.status(400).json({ error: "Invalid reaction!" });
    return;
  }
  res.json(message);
});

// start the server
app.listen(port, () => {
  console.log(`Chat server listening on port ${port}`);
});
