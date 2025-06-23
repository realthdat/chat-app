# Chat Application with React and Firebase

## Overview
This is a real-time chat application built with React and Firebase, allowing users to sign in with Google, view a list of other users, and engage in one-on-one text conversations. The app leverages Firebase Firestore for real-time data storage and Firebase Authentication for user management, providing a seamless and interactive messaging experience. Key features include user profile syncing, real-time message updates, unread message counts, and a responsive UI with avatar fallbacks.

## Table of Contents
- Features
- Firestore Data Structure
- Installation
- Running the Project
- Project Structure
- Components
- Styling
- FAQ

## Features
- **Google Authentication**: Users sign in using Google accounts via Firebase Authentication.
- **Real-Time User List**: Displays all users except the current user, sorted by the timestamp of their last message.
- **Real-Time Messaging**: Messages sync instantly with Firestore, supporting text and status updates (sent, delivered, seen).
- **User Profiles**: Syncs display name, photo URL, and last login timestamp with Firestore.
- **Unread Message Counts**: Shows badges for unread messages per conversation.
- **Typing Indicators**: Displays when the other user is typing.
- **Avatar Fallback**: Falls back to initials if user avatars fail to load.
- **Responsive UI**: Clean and modern design with hover effects and mobile-friendly input handling.
- **Error Handling**: Gracefully handles image loading errors and Firestore operation failures.

## Firestore Data Structure
### Collections & Documents
**users Collection**:
- **Document ID**: user.uid
- **Fields**:
  - `displayName` (string): User's display name (e.g., "John Doe").
  - `photoURL` (string or null): URL to user's avatar.
  - `email` (string or null): User's email address.
  - `id` (string): User's UID.
  - `lastLogin` (timestamp): Last login timestamp.

**chats Collection**:
- **Document ID**: chatId (e.g., `${sortedUserId1}_${sortedUserId2}`)
- **Subcollection**: messages
  - **Fields (per message document)**:
    - `senderId` (string): ID of the message sender.
    - `senderName` (string): Sender’s display name.
    - `senderPhotoURL` (string or null): Sender’s avatar URL.
    - `text` (string): Message content.
    - `timestamp` (Firestore timestamp): Message creation time.
    - `status` (string): Message status (e.g., 'sent', 'delivered', 'seen').
- **Subcollection**: typingStatus
  - **Document ID**: user.uid
  - **Fields**:
    - `typing` (boolean): Indicates if the user is typing.

## Installation
1. **Set Up Firebase**:
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
   - Enable Firestore and Authentication (with Google as a sign-in provider).
   - Copy your Firebase configuration and replace the placeholder in `src/firebase.js`:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
     };
     ```

2. **Install Dependencies**:
   - Ensure Node.js (version 14 or higher) is installed.
   - Create a new React project:
     ```bash
     npx create-react-app chat-app
     cd chat-app
     ```
   - Install Firebase and React Icons dependencies:
     ```bash
     npm install firebase react-icons
     ```

3. **Add Project Files**:
   - Place the provided `App.js`, `UserList.js`, `ChatRoom.js`, `SignIn.js`, `firebase.js`, and `styles.css` in the `src` directory.
   - Ensure `index.js` and `index.css` are set up as provided.

## Running the Project
- Start the development server:
  ```bash
  npm start
  ```
- Open your browser and navigate to `http://localhost:3000`.
- Sign in using Google Authentication to access the user list and start chatting.
- Ensure your Firebase Firestore rules allow read/write access for authenticated users:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

## Project Structure
```
chat-app/
├── public/
│   ├── index.html
│   └── default-avatar.png (optional default avatar)
├── src/
│   ├── App.js              // Main app component
│   ├── UserList.js         // Displays list of users
│   ├── ChatRoom.js         // Chat interface for conversations
│   ├── SignIn.js           // Google sign-in interface
│   ├── firebase.js         // Firebase configuration
│   ├── styles.css          // Application styles
│   ├── index.js            // Entry point
│   └── index.css           // Global styles
├── package.json
└── README.md
```

## Components
### App
- **Purpose**: The main component that manages authentication state and renders either the `SignIn` or the main chat interface (`UserList` or `ChatRoom`).
- **Key Features**:
  - Listens for authentication state changes using `onAuthStateChanged`.
  - Saves user data to Firestore on sign-in.
  - Displays a header with the current user’s name and a logout button.
  - Conditionally renders `UserList` or `ChatRoom` based on whether a chat user is selected.
- **Props**: None
- **State**:
  - `user`: Current authenticated user.
  - `chatUser`: Selected user for chatting.

### UserList
- **Purpose**: Displays a list of other users, their last messages, and unread message counts.
- **Key Features**:
  - Syncs current user’s profile with Firestore.
  - Fetches and displays all users except the current user.
  - Shows the last message and unread count for each user.
  - Sorts users by the timestamp of their last message.
  - Handles avatar image errors with initials fallback.
- **Props**:
  - `setChatUser` (function): Callback to set the selected chat user.
- **State**:
  - `users`: Array of other users.
  - `unreadCounts`: Object mapping user IDs to unread message counts.
  - `lastMessages`: Object mapping user IDs to their last message.
  - `imageErrors`: Object tracking failed image loads.

### ChatRoom
- **Purpose**: Provides the chat interface for one-on-one conversations.
- **Key Features**:
  - Displays messages with sender avatars, timestamps, and status (sent, delivered, seen).
  - Supports real-time message syncing and typing indicators.
  - Auto-scrolls to the latest message.
  - Handles message sending with Enter key (non-mobile) and a send button.
  - Updates message status (e.g., marks messages as seen).
  - Displays date separators for messages from different days.
- **Props**:
  - `chatUser` (object): The user being chatted with.
  - `setChatUser` (function): Callback to return to the user list.
- **State**:
  - `messages`: Array of messages in the current chat.
  - `input`: Text input for new messages.
  - `typingStatus`: Object tracking typing status of users.
  - `imageErrors`: Object tracking failed image loads.

### SignIn
- **Purpose**: Handles user authentication via Google sign-in.
- **Key Features**:
  - Initiates Google sign-in with Firebase’s `signInWithPopup`.
  - Saves user data (display name, photo URL, email, etc.) to Firestore on sign-in.
  - Displays a welcome message and a Google sign-in button.
- **Props**: None
- **Dependencies**: Uses Firebase Authentication and Firestore.

## Styling
The application uses a `styles.css` file with the following key classes (customize as needed):

| Class                     | Description                                           |
|---------------------------|-------------------------------------------------------|
| `.page-container`         | Main container for the app layout.                    |
| `.app-container`          | Container for the chat interface.                     |
| `.user-list`              | Container for the UserList component.                 |
| `.current-user-header`    | Header for the current user’s profile.                |
| `.user-item`              | Container for each user in the list.                  |
| `.user-avatar`            | User avatar image.                                    |
| `.avatar-initials`        | Fallback initials for avatars.                        |
| `.unread-badge`           | Badge for unread message counts.                      |
| `.chat-room`              | Container for the ChatRoom component.                 |
| `.chat-header`            | Header for the chat user’s info and back button.      |
| `.message-box`            | Container for chat messages.                          |
| `.message`                | Individual message (sent or received).                |
| `.message-text`           | Message content and metadata.                         |
| `.chat-textarea`          | Textarea for message input.                           |
| `.send-button`            | Button to send messages.                              |
| `.signin-container`       | Container for the sign-in interface.                  |
| `.google-signin-button`   | Google sign-in button.                                |
| `.footer`                 | Footer with copyright notice.                         |

**Example CSS** (partial):
```css
.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.app-container {
  display: flex;
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.user-list {
  width: 300px;
  padding: 20px;
  border-right: 1px solid #e0e0e0;
}
.chat-room {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
.message-box {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.chat-textarea {
  width: 100%;
  resize: none;
  padding: 10px;
}
.signin-container {
  text-align: center;
  padding: 50px;
}
.google-signin-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
}
.footer {
  text-align: center;
  padding: 10px;
}
```

## FAQ
**Q: What happens if no users are in Firestore?**  
A: The `UserList` component displays "No other users found."

**Q: How are unread messages counted?**  
A: Messages from the other user with `status !== 'seen'` are counted.

**Q: Can I customize the avatar fallback?**  
A: Modify the `getInitials` function in `UserList.js` or `ChatRoom.js` to change the fallback logic.

**Q: Why don’t messages show timestamps?**  
A: Ensure `serverTimestamp()` is used when sending messages. If timestamps are missing, check Firestore data and console logs for warnings.

**Q: How do I secure the app?**  
A: Update Firestore security rules to restrict access to authenticated users and validate data. Use HTTPS for production deployment.