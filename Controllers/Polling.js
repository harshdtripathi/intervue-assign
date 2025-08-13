const Poll = require("../models/Poll");

module.exports = (io, socket) => {
  socket.on("create_poll", async ({ question, options, roomId, duration }) => {
    const poll = await Poll.create({
      question,
      options,
      startTime: new Date(),
      roomId
    });

    io.to(roomId).emit("poll_started", poll);

    setTimeout(async () => {
      poll.active = false;
      await poll.save();
      io.to(roomId).emit("poll_results", poll.options);
    }, duration * 1000);
  });

  socket.on("submit_vote", async ({ pollId, optionIndex }) => {
    const poll = await Poll.findById(pollId);
    if (poll && poll.active) {
      poll.options[optionIndex].votes += 1;
      await poll.save();
      io.to(poll.roomId).emit("vote_update", poll.options);
    }
  });
};
