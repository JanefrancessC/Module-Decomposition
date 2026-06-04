// Accessing DOM elements
let pollingForm = document.getElementById("polling-form");
let formEl = document.getElementById("send-message");
let userEl = document.getElementById("user");
let messageEl = document.getElementById("message");
let feedbackEl = document.getElementById("feedback");
let displayBox = document.getElementById("display-message");
let displayText = document.createElement("p");

displayBox.appendChild(displayText);

const serverURL = `https://janefrancessc-chat-app-backend.hosting.codeyourfuture.io`;
// const serverURL = "http://127.0.0.1:3000";
const feedbackDuration = 3000; //ms before feedback clears
const pollingDuration = 2000; //ms between regular poll requests

// client-side cache of messages received so far
const state = { messages: [] };

let pollingMode = "regular";
let longPoll = false;

// prevents overlapping fetch requests from stacking up
let isFetching = false;

// Tracks the pending setTimeout so it can be cancelled on mode switch
let pollingTimeoutId = null;

/**
 * Displays temporarily feedback message to the user e.g. ("Message sent")
 * then clears the message after "duration" ms.
 */
function showFeedback(message, duration = feedbackDuration) {
  feedbackEl.textContent = message;

  setTimeout(() => {
    feedbackEl.textContent = "";
  }, duration);
}

/**
 * Switches between regular polling and long polling.
 * Cancels any pending timeout and restarts the polling loop immediately.
 */
pollingForm.addEventListener("change", (e) => {
  e.preventDefault();

  pollingMode = e.target.value;
  longPoll = pollingMode === "long";

  clearTimeout(pollingTimeoutId);
  isFetching = false;
  keepFetchingMessages();

  showFeedback(longPoll ? "Using long polling!" : "Using regular polling!");
});

/**
 * Continuously fetches new messages from the server.
 *
 * Regular polling: waits `pollingDuration` ms between each request.
 * Long polling: sends a request that the server holds open until a new
 * message arrives, then immediately sends the next request.
 *
 * The `since` query param tells the server to only return messages
 * newer than the last one we already have, avoiding duplicates.
 */
async function keepFetchingMessages() {
  if (isFetching) return;

  isFetching = true;

  const lastMsgTime =
    state.messages.length > 0
      ? state.messages[state.messages.length - 1].time
      : null;

  const queryString = lastMsgTime
    ? `?since=${lastMsgTime}${longPoll ? "&longPoll=true" : ""}`
    : "";

  const url = `${serverURL}${queryString}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const updatedMessages = await response.json();

    if (updatedMessages.length > 0) {
      state.messages.push(...updatedMessages);
      displayMessages(state.messages);
    }
  } catch (error) {
    console.error(error.message);
    displayText.textContent = `Error: Server is down!`;
  } finally {
    isFetching = false;
  }

  // Schedule the next fetch. Long poll retries sooner since the server
  // already held the connection open; a 500ms gap just avoids tight loops
  // if the server is down.
  if (longPoll) {
    pollingTimeoutId = setTimeout(keepFetchingMessages, 500);
  } else {
    pollingTimeoutId = setTimeout(keepFetchingMessages, pollingDuration);
  }
}

/**
 * Sends a like or dislike reaction to the server for a given message,
 * then updates only that message in local state and re-renders.
 */
async function reactToMessage(msgId, reaction) {
  try {
    const response = await fetch(`${serverURL}/${msgId}/${reaction}`, {
      method: "POST",
    });

    if (!response.ok) {
      showFeedback(await response.text());
      return;
    }
    const updatedMessage = await response.json();

    // clear any error messages
    displayText.remove();

    // Find and update only the affected message rather than replacing the whole array
    const existingMessage = state.messages.find(
      (msg) => msg.id === updatedMessage.id,
    );

    if (existingMessage) {
      existingMessage.likes = updatedMessage.likes;
      existingMessage.dislikes = updatedMessage.dislikes;
    }

    displayMessages(state.messages);
  } catch (error) {
    console.error(error.message);
  }
}

/**
 * Builds a single message card as a DOM element.
 * Using textContent so strings are never interpreted as HTML
 */
function buildMessageEl(msg) {
  const wrapper = document.createElement("div");

  const p = document.createElement("p");

  const strong = document.createElement("strong");
  strong.textContent = `${msg.user}: ${msg.message} `;

  const small = document.createElement("small");
  small.textContent = new Date(msg.time).toLocaleString();

  p.appendChild(strong);
  p.appendChild(small);

  const likeBtn = document.createElement("button");
  likeBtn.dataset.id = msg.id;
  likeBtn.dataset.reaction = "like";
  likeBtn.textContent = `${msg.likes} 👍`;

  const dislikeBtn = document.createElement("button");
  dislikeBtn.dataset.id = msg.id;
  dislikeBtn.dataset.reaction = "dislike";
  dislikeBtn.textContent = `${msg.dislikes} 👎`;

  wrapper.appendChild(p);
  wrapper.appendChild(likeBtn);
  wrapper.appendChild(dislikeBtn);

  return wrapper;
}

/**
 * Replaces the entire message list in the DOM with the latest state.
 * replaceChildren avoids stale nodes.
 */
function displayMessages(messages) {
  displayBox.replaceChildren(...messages.map(buildMessageEl));
}

// Add event listener to the displayBox to listen for likes/dislikes
displayBox.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-reaction]");
  if (!btn) return;

  const msgId = Number(btn.dataset.id);
  const reaction = btn.dataset.reaction;
  reactToMessage(msgId, reaction);
});

/**
 * Handles the send-message form submission.
 * Trims input on the client side for UX (empty-check), but the server
 * also validates and trims before saving.
 */
async function handleSubmit(event) {
  event.preventDefault();

  let message = messageEl.value.trim();
  let user = userEl.value.trim();

  if (!message || !user) {
    showFeedback(`Field cannot be empty!`);
    return;
  }

  try {
    const response = await fetch(serverURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user, message }),
    });

    if (!response.ok) {
      showFeedback(await response.text());
      return;
    }

    showFeedback(`Message sent!`);

    // userEl.value = ""; //Clear user for same browser, but diff browsers for users ? leave the username foreach user's browser
    messageEl.value = "";
  } catch (error) {
    console.error(error.message);
    showFeedback(`Something went wrong.`);
  }
}

formEl.addEventListener("submit", handleSubmit);

keepFetchingMessages();
