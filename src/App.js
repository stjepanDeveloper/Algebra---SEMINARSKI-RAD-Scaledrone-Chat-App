import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

const ChatApp = () => {

  // Initializing the states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [drone, setDrone] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const scaledroneChannel = process.env.REACT_APP_SCALEDRONE_CHANNEL; // Replace this with the channel ID you get when you make your own Scaledrone room 

  useEffect(() => {
    //TODO replace with a color package later
    const colors = [
      "#ff4500",
      "#1e90ff",
      "#32cd32",
      "#ff69b4",
      "#8a2be2",
      "#00ced1",
    ];

    //TODO replace with a random name generator package later
    const randomNames = [
      "Madchiller Queen",
      "Dandelionsting Hand",
      "Reddeath Snake",
      "Starburner Dove",
    ];


    const newUser = {
      id: uuidv4(),
      name: randomNames[Math.floor(Math.random() * randomNames.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    };

    setUser(newUser);

    //Creating a new drone instance
    const droneInstance = new window.Scaledrone(scaledroneChannel, {
      data: newUser,
    });

    setDrone(droneInstance);

    droneInstance.on("open", () => {
      console.log("Connected to Scaledrone!");
      setIsConnected(true);
    });

    //Subscribing to the room for chat entry
    const room = droneInstance.subscribe("observable-room");

    //Making and returning the updatedMessages array
    room.on("data", (data) => {
      console.log("Received message:", JSON.stringify(data, null, 2)); // Log the received message
      setMessages((prev) => {
        const updatedMessages = [...prev, data]; //Create new array of messages from previous one and the new one
        console.log(
          "Updated messages:",
          JSON.stringify(updatedMessages, null, 2)
        ); // Log updated messages
        return updatedMessages;
      });
    });

    //Close the instance
    droneInstance.on("close", () => {
      console.log("WebSocket connection closed.");
      setIsConnected(false);
    });

    // Reconnect logic (if the connection is lost)
    droneInstance.on("reconnect", () => {
      console.log("Attempting to reconnect to Scaledrone...");
    });

    return () => {
      droneInstance.close();
    };
  }, []);


  // Send message handler function (setting the text, username and color of the message)
  const handleSendMessage = () => {
    if (drone && isConnected) {
      const messageToSend = {
        text: message,
        sender: user.name,
        color: user.color,
      };

      // Log before sending message
      console.log("Before publishing message:", JSON.stringify(messageToSend));

      // Publishing the message to Scaledrone room
      drone.publish(
        {
          room: "observable-room",
          message: messageToSend,
        },
        (error) => {
          if (error) {
            console.log("Error publishing message:", error);
          } else {
            console.log("Message successfully sent!");
          }
        }
      );

      // Log after message is successfully published
      console.log("Message sent:", messageToSend);

      setMessage(""); // Clear the input after sending
    } else {
      console.log("Connection not established.");
    }
  };


  // If you want to send messages on ENTER key
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="App">
      <div className="chat-window">
        <div className="messages">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${
                  msg.sender === user.name ? "own" : "other"
                }`}
              >
                <div className="username" style={{ color: msg.color }}>
                  {msg.sender}
                </div>
                <div>{msg.text}</div>
              </div>
            ))
          ) : (
            <p>No messages yet</p>
          )}
        </div>
        <div className="input-area">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter your message here and press ENTER"
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
