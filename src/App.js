import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import "./App.scss";
import randomColor from "randomcolor";
import randomUsername from "random-username-generator";
import Avatar from "react-avatar";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const ChatApp = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [drone, setDrone] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const scaledroneChannel = process.env.REACT_APP_SCALEDRONE_CHANNEL;
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);

  const popAudio = new Audio(require("./assets/sounds/Pop 2.mp3"));

  useEffect(() => {
    const userColor = randomColor();
    const userName = randomUsername.generate();
    const newUser = {
      id: uuidv4(),
      name: userName,
      color: userColor,
    };

    setUser(newUser);

    // Initialize Scaledrone instance with new user data
    const droneInstance = new window.Scaledrone(scaledroneChannel, {
      data: newUser,
    });

    setDrone(droneInstance);

    // Set connection state once Scaledrone opens
    droneInstance.on("open", () => {
      console.log("Connected to Scaledrone!");
      setIsConnected(true);
    });

    const room = droneInstance.subscribe("observable-room");

    // Subscribe to "data" events from the room
    room.on("data", (data) => {
      console.log("Received data:", data);

      // Validate the incoming data to ensure it's an object
      if (!data || typeof data !== "object" || !data.type) {
        console.error("Received invalid data:", data);
        return;
      }

      // Handle messages
      if (data.type === "message" && data.sender && data.text) {
        setMessages((prev) => {
          const updatedMessages = [...prev, data];

          if (hasInteracted) {
            popAudio.play().catch((error) => {
              console.error("Audio playback failed:", error);
            });
          }

          return updatedMessages;
        });

        // Handle typing events
      } else if (data.type === "typing") {
        const { sender, isTyping } = data;

        if (isTyping) {
          setTypingUsers((prev) => {
            if (!prev.includes(sender)) {
              return [...prev, sender];
            }
            return prev;
          });
        } else {
          setTypingUsers((prev) => prev.filter((user) => user !== sender));
        }
      } else {
        // Log unknown data types for better debugging
        console.warn("Unknown data type received:", data);
      }
    });

    // Handle the close event to manage connection status
    droneInstance.on("close", () => {
      console.log("WebSocket connection closed.");
      setIsConnected(false);
    });

    return () => {
      // Clean up Scaledrone instance when the component unmounts
      droneInstance.close();
    };
  }, []);

  // Format time as "Today at HH:MM"
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `Today at ${hours}:${minutes}`;
  };

  const handleSendMessage = () => {
    if (drone && isConnected) {
      const currentTime = new Date();
      const messageToSend = {
        type: "message",
        text: message,
        sender: user.name,
        color: user.color,
        timestamp: formatTime(currentTime),
      };

      drone.publish({
        room: "observable-room",
        message: messageToSend,
      });

      setMessage("");
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage(message + emoji.native);
    setEmojiPickerVisible(false);
  };

  const toggleEmojiPicker = () => {
    setEmojiPickerVisible(!isEmojiPickerVisible);
  };

  const typingTimeout = useRef(null);

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
    setIsTyping(true);

    // Set user interaction state on first input
    if (!hasInteracted) {
      setHasInteracted(true);
    }

    // Send typing event to Scaledrone
    if (drone && isConnected) {
      drone.publish({
        room: "observable-room",
        message: { type: "typing", sender: user.name, isTyping: true },
      });
    }

    // Clear previous timeout and set new timeout to stop typing
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
    setIsTyping(false);

    // Send stop typing event
    if (drone && isConnected) {
      drone.publish({
        room: "observable-room",
        message: { type: "typing", sender: user.name, isTyping: false },
      });
    }
  };

  return (
    <div className="App">
      <div className="chat-window">
        <div className="messages">
          {messages.length > 0 ? (
            messages.map((msg, index) => {
              // Add a conditional check to ensure message has all required properties
              if (!msg || !msg.sender || !msg.text) {
                console.warn(
                  `Message at index ${index} is missing required properties:`,
                  msg
                );
                return null; // Skip rendering this message if it's not valid
              }

              return (
                <div
                  key={index}
                  className={`message ${
                    msg.sender === user.name ? "own" : "other"
                  }`}
                >
                  <div className="message-header">
                    <div className="avatar">
                      <Avatar name={msg.sender} size="30" round />
                    </div>
                    <div className="username" style={{ color: msg.color }}>
                      {msg.sender}
                    </div>
                    <span className="timestamp">{msg.timestamp}</span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              );
            })
          ) : (
            <p>No messages yet</p>
          )}

          {/* Typing Indicator */}
          {typingUsers.filter((username) => username !== user.name).length >
            0 && (
            <div className="typing-indicator">
              {typingUsers.slice(0, 3).join(", ")}{" "}
              {typingUsers.length <= 3
                ? typingUsers.length === 1
                  ? "is typing..."
                  : "are typing..."
                : "and more are typing..."}
            </div>
          )}
        </div>

        <div className="input-area">
          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            onFocus={() => setHasInteracted(true)}
          />
          <button className="emoji-button" onClick={toggleEmojiPicker}>
            😊
          </button>
          {isEmojiPickerVisible && (
            <div className="emoji-picker">
              <Picker data={data} onEmojiSelect={handleEmojiSelect} />
            </div>
          )}
          <button className="send-button" onClick={handleSendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
