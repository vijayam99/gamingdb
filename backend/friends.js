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
  // TODO: find users whose username contains q, label each (You / Add Friend / Request Sent / Respond / Friends)

  res.status(501).json({ error: "Not implemented" });
});

// POST /api/friends/requests
router.post("/requests", async (req, res) => {
  // TODO: block self (400), missing user (404), existing request or friendship (409), then create (201)
  res.status(501).json({ error: "Not implemented" });
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
  if (!["accept", "decline", "cancel"].includes(req.params.action)) {
    return res.status(400).json({ error: "Unknown action." });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid request id." });
  }

  // TODO: accept/decline only by receiver, cancel only by sender, only while Pending; set respondedAt
  return res.status(501).json({ error: "Not implemented" });
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
