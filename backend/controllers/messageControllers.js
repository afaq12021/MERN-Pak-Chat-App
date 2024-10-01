const asyncHandler = require("express-async-handler");
const Message = require("../Model/messageModel");
const Chat = require("../Model/chatModel");
const User = require("../Model/userModel");


const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    // Directly populate fields (no execPopulate needed)
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    // Update latestMessage in Chat model
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json(message); // Respond with the populated message object
  } catch (error) {
    console.error("Error sending message:", error.message);
    res.status(400).json({ message: "Failed to send message", error: error.message });
  }
});



const allMessages = asyncHandler(async (req, res) => {
    const { chatId } = req.params; // Get the chatId from the route parameter
  
    try {
      // Fetch all messages for the given chatId, populate necessary fields
      const messages = await Message.find({ chat: chatId })
        .populate("sender", "name pic email") // Populate sender with name, picture, and email
        .populate("chat"); // Populate chat details
  
      res.json(messages); // Send back all the messages as JSON
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  });
  
module.exports = { sendMessage,allMessages };
