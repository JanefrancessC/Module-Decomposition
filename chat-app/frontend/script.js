let pollingForm = document.getElementById("polling-form");
let formEl = document.getElementById("send-message");
let userEl = document.getElementById("user");
let messageEl = document.getElementById("message");
let displayBox = document.getElementById("display-message");
let feedbackEl = document.getElementById("feedback");

const serverURL = `https://janefrancessc-chat-app-backend.hosting.codeyourfuture.io`;
// const serverURL = "http://127.0.0.1:3000";
const state = { messages: [] };
let pollingMode = "regular";
let longPoll = false;
let isFetching = false;

pollingForm.addEventListener("change", (e) => {
  e.preventDefault();

  pollingMode = e.target.value;
  longPoll = pollingMode === "long";

  feedbackEl.innerHTML = `
  <p>${longPoll ? "Using long polling!" : "Using regular polling!"}</p>
  `;
  setTimeout(() => {
    feedbackEl.innerHTML = "";
  }, 3000);
});

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
      displayMessages();
    }
  } catch (error) {
    console.error(error.message);
    displayBox.innerHTML = `<p>Error: Server is down!</p>`;
  } finally {
    isFetching = false;
  }
  if (longPoll) {
    keepFetchingMessages();
  } else {
    setTimeout(keepFetchingMessages, 2000);
  }
}

async function likeMessage(msgId) {
  try {
    const response = await fetch(`${serverURL}/${msgId}/like`, {
      method: "POST",
    });

    if (!response.ok) {
      feedbackEl.innerHTML = `<p>${await response.text()}</p>`;
      return;
    }
    const updatedMessage = await response.json();

    state.messages = state.messages.map((msg) =>
      msg.id === updatedMessage.id ? updatedMessage : msg,
    );
    displayMessages();
  } catch (error) {
    console.error(error.message);
  }
}

async function dislikeMessage(msgId) {
  try {
    const response = await fetch(`${serverURL}/${msgId}/dislike`, {
      method: "POST",
    });

    if (!response.ok) {
      feedbackEl.innerHTML = `<p>${await response.text()}</p>`;
      return;
    }
    const updatedMessage = await response.json();

    state.messages = state.messages.map((msg) =>
      msg.id === updatedMessage.id ? updatedMessage : msg,
    );
    displayMessages();
  } catch (error) {
    console.error(error.message);
  }
}

function displayMessages() {
  displayBox.innerHTML = state.messages
    .map(
      (msg) =>
        `<div>
            <p>
                <strong>${msg.user}: ${msg.message} </strong>
                <small>${new Date(msg.time).toLocaleString()}</small>
            </p>
            <button onclick="likeMessage(${msg.id})">${msg.likes} 👍 </button>
            <button onclick="dislikeMessage(${msg.id})">${msg.dislikes} 👎 </button>
            </div>
        `,
    )
    .join("");
}

async function handleSubmit(event) {
  event.preventDefault();

  let message = messageEl.value;
  let user = userEl.value;

  if (!message || !user) {
    feedbackEl.innerHTML = `<p>Field cannot be empty!</p>`;
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
      feedbackEl.innerHTML = `<p>${await response.text()}</p>`;
      return;
    }

    feedbackEl.innerHTML = `<p>Message sent!</p>`;

    setTimeout(() => {
      feedbackEl.innerHTML = "";
    }, 3000);

    // userEl.value = ""; //Clear user for same browser, but diff browsers for users ? leave the username foreach user's browser
    messageEl.value = "";
  } catch (error) {
    console.error(error.message);
    feedbackEl.innerHTML = `<p>Something went wrong.</p>`;
  }
}

formEl.addEventListener("submit", handleSubmit);

keepFetchingMessages();
