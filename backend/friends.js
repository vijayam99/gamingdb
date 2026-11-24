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
router.get("/search", async (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

// POST /api/friends/requests
router.post("/requests", async (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

// GET /api/friends/requests
router.get("/requests", async (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

// PUT /api/friends/requests/:id/:action  (accept / decline / cancel)
router.put("/requests/:id/:action", async (req, res) => {
  if (!["accept", "decline", "cancel"].includes(req.params.action)) {
    return res.status(400).json({ error: "Unknown action." });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid request id." });
  }
  return res.status(501).json({ error: "Not implemented" });
});

// GET /api/friends
router.get("/", async (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

router.use((error, _req, res, _next) => {
  console.error("Friends request failed:", error.name, error.code ?? "");
  res
    .status(500)
    .json({ error: "Could not complete the request. Please try again." });
});

module.exports = { router, FriendRequest, findActive };
