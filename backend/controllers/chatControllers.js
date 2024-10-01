const asyncHandler = require("express-async-handler");
const Chat = require("../Model/chatModel");
const User = require("../Model/userModel");

const accessChat = asyncHandler(async (req, res) => {
    console.log("API Hit!");

    const { userId } = req.body;

    if (!userId) {
        console.log("UserId param not sent with request");
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        console.log("Fetching chat between users...");

        // Check if chat exists between current user and target user
        let chat = await Chat.find({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: req.user._id } } }, // current user
                { users: { $elemMatch: { $eq: userId } } }, // target user
            ]
        }).populate("users", "-password").populate("latestMessage");

        // Populate the latestMessage.sender field if chat exists
        chat = await User.populate(chat, {
            path: "latestMessage.sender",
            select: "name pic email"
        });

        if (chat.length > 0) {
            // If chat already exists, return the first match
            console.log("Existing chat found, returning chat...");
            return res.status(200).send(chat[0]);
        }

        console.log("No chat found, creating a new chat...");

        // Create new chat if it doesn't exist
        const chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId], // Add current and target user to chat
        };

        const createdChat = await Chat.create(chatData);

        // Populate the users in the newly created chat
        const fullChat = await Chat.findOne({ _id: createdChat._id }).populate("users", "-password");

        return res.status(200).send(fullChat);
    } catch (error) {
        console.error("Error accessing or creating chat:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: error.message, // Fixed 'err is not defined'
                statusCode: 500,
            },
        });
    }
});


const fetchChats = asyncHandler(async(req,res)=>{
    try {
        Chat.find({users:{$elemMatch:{$eq:req.user._id}}})
        .populate("users", "-password") // Populate user details but exclude passwords
        .populate("groupAdmin", "-password") // Populate group admin details if it's a group chat
        .populate("latestMessage") // Populate the latest message for each chat
        .sort({ updatedAt: -1 })
        .then(async(results)=>{
            results= await User.populate(results,{
                path:"latestMessage.sender",
                select:"name pic email",
            });
            res.status(200).send(results);

        });

    } catch (error) {
        res.status(400);
        throw new Error(error.message);
        
    }
});

const createGroupChat = asyncHandler(async (req, res) => {
    const { users, name } = req.body;

    // Check if name and users array are provided
    if (!users || !name) {
        return res.status(400).json({ message: "Please provide both group name and users." });
    }

    // Parse the users list (convert to array if it's a single user)
    let usersArray = JSON.parse(users);

    // Ensure there are at least two users in the group chat
    if (usersArray.length < 2) {
        return res.status(400).json({ message: "At least 2 users are required to create a group chat." });
    }

    // Add the current logged-in user to the group
    usersArray.push(req.user);

    try {
        // Create a new group chat
        const groupChat = await Chat.create({
            chatName: name,
            isGroupChat: true,
            users: usersArray,
            groupAdmin: req.user, // Set the current user as the group admin
        });

        // Populate users and groupAdmin fields before sending the response
        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                statusCode: 500,
            },
        });
    }
});


const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;

    // Validate input
    if (!chatId || !chatName) {
        return res.status(400).json({ message: "Chat ID and new chat name are required." });
    }

    try {
        // Find the chat by ID and update its name
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { chatName },  // Update the chat name with the new name
            { new: true }  // Return the updated document
        ).populate("users", "-password").populate("groupAdmin", "-password");

        if (!updatedChat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        // Send the updated chat information
        res.status(200).json(updatedChat);
    } catch (error) {
        console.error("Error renaming chat:", error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                statusCode: 500,
            },
        });
    }
});



const addToGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    // Validate input
    if (!chatId || !userId) {
        return res.status(400).json({ message: "Chat ID and User ID are required." });
    }

    try {
        // Find the chat to ensure it's a group chat
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        // Ensure the chat is a group chat
        if (!chat.isGroupChat) {
            return res.status(400).json({ message: "This is not a group chat." });
        }

        // Check if the user is already in the group
        if (chat.users.includes(userId)) {
            return res.status(400).json({ message: "User is already in the group." });
        }

        // Add the user to the group chat
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $push: { users: userId } },  // Add the new user to the users array
            { new: true }  // Return the updated chat
        ).populate("users", "-password").populate("groupAdmin", "-password");

        // Return the updated chat information
        res.status(200).json(updatedChat);
    } catch (error) {
        console.error("Error adding user to group:", error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                statusCode: 500,
            },
        });
    }
});





const removeFromGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    // Validate input
    if (!chatId || !userId) {
        return res.status(400).json({ message: "Chat ID and User ID are required." });
    }

    try {
        // Log chatId and userId for debugging
        console.log("Chat ID:", chatId);
      

        // Check if the chat exists and is a group chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        // Ensure the chat is a group chat
        if (!chat.isGroupChat) {
            return res.status(400).json({ message: "This is not a group chat." });
        }

        // Check if the user is in the group
        if (!chat.users.includes(userId)) {
            return res.status(400).json({ message: "User is not in the group." });
        }

        // Remove the user from the group
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $pull: { users: userId } }, // Remove the user
            { new: true } // Return the updated chat document
        ).populate("users", "-password").populate("groupAdmin", "-password");

        // Check if the user was successfully removed
        if (!updatedChat.users.includes(userId)) {
            res.status(200).json(updatedChat); // Return the updated chat info
        } else {
            res.status(400).json({ message: "Failed to remove user from group." });
        }

    } catch (error) {
        console.error("Error removing user from group:", error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                statusCode: 500,
            },
        });
    }
});


module.exports = { accessChat,fetchChats,createGroupChat,renameGroup ,addToGroup,removeFromGroup};
