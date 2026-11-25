const express = require("express");
const mongoose = require("mongoose");

const User = mongoose.model("User");

const FriendRequest = mongoose.model(
  "FriendRequest",
  new mongoose.Schema(
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      status: {
        type: String,
        enum: ["Pending", "Accepted", "Declined", "Cancelled"],
        default: "Pending",
      },
      respondedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);

const router = express.Router();

// Pending or accepted request between two users
function findActive(a, b) {
  return FriendRequest.findOne({
    status: { $in: ["Pending", "Accepted"] },
    $or: [
      { sender: a, receiver: b },
      { sender: b, receiver: a },
    ],
  });
}

// Logged-in user's id is req.userId

// GET /api/friends/search?q=
router.get("/search", async (req, res) => {
  // Read search field text and store in lowercase.
  const q = String(req.query.q ?? "")
    .trim()
    .toLowerCase();
  if (!q) return res.json([]);

  // Escape characters
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Find up to 20 users whose username contains the search text
  const users = await User.find({
    username: { $regex: safe },
  })
    .select("username")
    .limit(20);

  // Label each user based on their relationship to me
  const results = await Promise.all(
    users.map(async (user) => {
      // Default: no relationship yet
      let label = "Add Friend";

      if (user._id.equals(req.userId)) {
        // This result is me
        label = "You";
      } else {
        // Check for a pending or accepted request in either direction
        const rel = await findActive(req.userId, user._id);
        if (rel?.status === "Accepted") label = "Friends";
        // Pending: did I send it, or do I need to respond?
        else if (rel)
          label = rel.sender.equals(req.userId) ? "Request Sent" : "Respond";
      }

      return { id: user._id, username: user.username, label };
    }),
  );

  // Return each user's id, username, and label
  res.json(results);
});

// POST /api/friends/requests
router.post("/requests", async (req, res) => {
  // Require username (400)
  const username = String(req.body?.username ?? "")
    .trim()
    .toLowerCase();
  if (!username) return res.status(400).json({ error: "Enter a username." });

  // Missing user (404) or block yourself (400)
  const receiver = await User.findOne({ username });
  if (!receiver) return res.status(404).json({ error: "No users found." });
  if (receiver._id.equals(req.userId)) {
    return res.status(400).json({ error: "You can't add yourself." });
  }

  // Existing request or friendship (409)
  if (await findActive(req.userId, receiver._id)) {
    return res
      .status(409)
      .json({ error: "Requested user is already pending or already friends." });
  }

  // Create request (201)
  const request = await FriendRequest.create({
    sender: req.userId,
    receiver: receiver._id,
  });
  res.status(201).json({ id: request._id, to: receiver.username });
});

// GET /api/friends/requests
router.get("/requests", async (req, res) => {
  // Get both pending incoming and sent requests with the other user's username
  const [incoming, sent] = await Promise.all([
    FriendRequest.find({ receiver: req.userId, status: "Pending" }).populate(
      "sender",
      "username",
    ),
    FriendRequest.find({ sender: req.userId, status: "Pending" }).populate(
      "receiver",
      "username",
    ),
  ]);

  // Return only the request id and the other user's username for each list.
  res.json({
    incoming: incoming.map((r) => ({ id: r._id, from: r.sender.username })),
    sent: sent.map((r) => ({ id: r._id, to: r.receiver.username })),
  });
});

// PUT /api/friends/requests/:id/:action  (accept / decline / cancel)
router.put("/requests/:id/:action", async (req, res) => {
  // Only allow accept, decline, or cancel (400)
  if (!["accept", "decline", "cancel"].includes(req.params.action)) {
    return res.status(400).json({ error: "Unknown action." });
  }
  // Reject ids that aren't valid ObjectIds (400)
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid request id." });
  }

  // Find the request (404)
  const request = await FriendRequest.findById(req.params.id);
  if (!request)
    return res.status(404).json({ error: "Friend request not found." });

  // Only the sender can cancel
  // Only the receiver can accept or decline (403)
  const action = req.params.action;
  const mustBe = action === "cancel" ? request.sender : request.receiver;
  if (!mustBe.equals(req.userId)) {
    return res.status(403).json({ error: "You can't change this request." });
  }
  // Only pending requests can be changed (400)
  if (request.status !== "Pending") {
    return res
      .status(400)
      .json({ error: "This request was already answered." });
  }

  // Map the action to its new status, record when it was answered, and save
  const newStatus = {
    accept: "Accepted",
    decline: "Declined",
    cancel: "Cancelled",
  };
  request.status = newStatus[action];

  // set respondedAt
  request.respondedAt = new Date();
  await request.save();

  // Return the updated request
  res.json({ id: request._id, status: request.status });
});

// GET /api/friends
router.get("/", async (req, res) => {
  // Find users who's status is Accepted AND (sender OR receiver).
  // Populate/replace each sender and receiver userId with username field.
  const accepted = await FriendRequest.find({
    status: "Accepted",
    $or: [{ sender: req.userId }, { receiver: req.userId }],
  }).populate("sender receiver", "username");

  // For each accepted request, pick which one isn't the current user and add to friends.
  const friends = [];
  for (const request of accepted) {
    let friend;
    if (request.sender._id.equals(req.userId)) {
      friend = request.receiver;
    } else {
      friend = request.sender;
    }
    friends.push({
      id: friend._id,
      username: friend.username,
      since: request.respondedAt,
    });
  }

  // return friends list
  res.json(friends);
});

router.use((error, req, res, _next) => {
  console.error("Friends request failed:", error.name, error.code ?? "");
  res
    .status(500)
    .json({ error: "Could not complete the request. Please try again." });
});

module.exports = { router, FriendRequest, findActive };
