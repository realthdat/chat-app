import { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import {
  setDoc,
  doc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import './styles.css';

function getChatId(user1, user2) {
  return [user1.uid, user2.id].sort().join('_');
}

export default function ChatRoom({ chatUser, setChatUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingStatus, setTypingStatus] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const currentUser = auth.currentUser;
  const chatId = getChatId(currentUser, chatUser);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeout = useRef(null);
  // const defaultAvatar = '/default-avatar.png'; // Ảnh mặc định cục bộ

  // Utility function to check if timestamp is valid
  const isValidTimestamp = (timestamp) => {
    return timestamp && typeof timestamp.toDate === 'function';
  };

  // Đồng bộ photoURL của currentUser với Firestore
  useEffect(() => {
    const syncUserPhotoURL = async () => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().photoURL !== currentUser.photoURL) {
          await setDoc(userDocRef, {
            photoURL: currentUser.photoURL || null,
            lastLogin: new Date(),
          }, { merge: true });
          console.log('Đã đồng bộ photoURL cho currentUser');
        }
      }
    };
    syncUserPhotoURL();
  }, [currentUser]);

  // Debug: Log thông tin chi tiết
  useEffect(() => {
    console.log('Current User:', {
      uid: currentUser?.uid,
      displayName: currentUser?.displayName,
      photoURL: currentUser?.photoURL || 'Không có photoURL',
    });
    console.log('Chat User:', {
      id: chatUser?.id,
      displayName: chatUser?.displayName,
      photoURL: chatUser?.photoURL || 'Không có photoURL',
    });
  }, [currentUser, chatUser]);

  // Lắng nghe tin nhắn
  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => {
        const data = doc.data();
        if (!data.timestamp) {
          console.warn(`Message ${doc.id} missing timestamp:`, data);
        }
        return {
          id: doc.id,
          ...data,
        };
      });
      setMessages(msgs);

      // Cập nhật trạng thái tin nhắn
      msgs.forEach(async (msg) => {
        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
        if (msg.senderId !== currentUser.uid && msg.status !== 'seen') {
          await updateDoc(msgRef, { status: 'seen' });
        } else if (msg.senderId === currentUser.uid && msg.status === 'sent') {
          await updateDoc(msgRef, { status: 'delivered' });
        }
      });
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gửi tin nhắn
  const sendMessage = async () => {
    if (!input.trim()) return;

    const messageData = {
      text: input,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Ẩn danh',
      senderPhotoURL: currentUser.photoURL || null,
      timestamp: serverTimestamp(),
      status: 'sent',
    };

    console.log('Sending message:', messageData);

    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await updateTypingStatus(false);
  };

  // Phát hiện Enter
  const handleKeyPress = (e) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (e.key === 'Enter' && !e.shiftKey) {
      if (!isMobile) {
        e.preventDefault();
        sendMessage();
      }
    }
  };

  // Đang nhập
  const handleTyping = async (e) => {
    setInput(e.target.value);

    // Auto expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;

    await updateTypingStatus(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const updateTypingStatus = async (status) => {
    const typingRef = doc(db, 'chats', chatId, 'typingStatus', currentUser.uid);
    await setDoc(typingRef, { typing: status });
  };

  // Lắng nghe trạng thái đang nhập
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'chats', chatId, 'typingStatus'),
      (snapshot) => {
        const status = {};
        snapshot.forEach((doc) => {
          status[doc.id] = doc.data().typing;
        });
        setTypingStatus(status);
      }
    );
    return () => unsub();
  }, [chatId]);

  const isChatUserTyping = typingStatus[chatUser.id];

  const formatTime = (timestamp) => {
    if (!isValidTimestamp(timestamp)) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : 'A';

  const handleImageError = (key, url) => {
    console.log(`Lỗi tải ảnh: ${url} cho ${key}`);
    setImageErrors((prev) => ({ ...prev, [key]: true }));
  };

  const lastSeenIndex = [...messages]
    .map((msg, index) => ({ ...msg, index }))
    .reverse()
    .find(
      (msg) => msg.senderId === currentUser.uid && msg.status === 'seen'
    )?.index;

  const lastSentIndex = [...messages]
    .map((msg, index) => ({ ...msg, index }))
    .reverse()
    .find(msg => msg.senderId === currentUser.uid)?.index;

  const isSameDay = (date1, date2) => {
    if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
      return false;
    }
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <button onClick={() => setChatUser(null)} className="back-button">
          <FaArrowLeft style={{ marginRight: "6px" }} /> Quay lại
        </button>
        <div className="chat-user-info">
          {!imageErrors['chatUser'] && chatUser.photoURL ? (
            <img
              src={chatUser.photoURL}
              alt={`${chatUser.displayName}'s avatar`}
              className="chat-user-avatar"
              loading="lazy"
              onError={() => handleImageError('chatUser', chatUser.photoURL)}
            />
          ) : (
            <div className="avatar-initials">
              {getInitials(chatUser.displayName)}
            </div>
          )}
          <h3>{chatUser.displayName}</h3>
        </div>
      </div>

      <div className="message-box">
        {messages.map((msg, i) => {
          const msgDate = isValidTimestamp(msg.timestamp)
            ? msg.timestamp.toDate()
            : null;
          const prevMsgDate =
            i > 0 && isValidTimestamp(messages[i - 1]?.timestamp)
              ? messages[i - 1].timestamp.toDate()
              : null;
          const showDate = !prevMsgDate || !msgDate || !isSameDay(msgDate, prevMsgDate);

          return (
            <div key={msg.id || i}>
              {showDate && msgDate && (
                <div className="date-separator">
                  {msgDate.toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </div>
              )}

              <div
                className={`message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}
                title={msgDate ? formatTime(msg.timestamp) : 'No timestamp'}
              >
                <div className="message-content">
                  {msg.senderId === currentUser.uid ? (
                    !imageErrors['sender_' + msg.id] && msg.senderPhotoURL ? (
                      <img
                        src={msg.senderPhotoURL}
                        alt={`${msg.senderName}'s avatar`}
                        className="message-avatar"
                        loading="lazy"
                        onError={() => handleImageError('sender_' + msg.id, msg.senderPhotoURL)}
                      />
                    ) : (
                      <div className="message-avatar-initials">
                        {getInitials(msg.senderName)}
                      </div>
                    )
                  ) : (
                    !imageErrors['receiver_' + msg.id] && chatUser.photoURL ? (
                      <img
                        src={chatUser.photoURL}
                        alt={`${chatUser.displayName}'s avatar`}
                        className="message-avatar"
                        loading="lazy"
                        onError={() => handleImageError('receiver_' + msg.id, chatUser.photoURL)}
                      />
                    ) : (
                      <div className="message-avatar-initials">
                        {getInitials(chatUser.displayName)}
                      </div>
                    )
                  )}
                  <div className="message-text">
                    {msg.text.split('\n').map((line, idx) => (
                      <span key={idx}>
                        {line}
                        <br />
                      </span>
                    ))}
                    <div className="message-meta">
                      {msgDate ? formatTime(msg.timestamp) : 'No time'}
                    </div>
                  </div>
                </div>

                {msg.senderId === currentUser.uid && (
                  <div className="message-status">
                    {i === lastSeenIndex ? (
                      !imageErrors['seen_' + msg.id] && chatUser.photoURL ? (
                        <img
                          src={chatUser.photoURL}
                          alt="Seen avatar"
                          className="seen-avatar"
                          loading="lazy"
                          onError={() => handleImageError('seen_' + msg.id, chatUser.photoURL)}
                        />
                      ) : (
                        <div className="seen-avatar-initials">
                          {getInitials(chatUser.displayName)}
                        </div>
                      )
                    ) : i === lastSentIndex ? (
                      msg.status === 'delivered' ? (
                        <span className="message-status delivered">Đã nhận</span>
                      ) : (
                        <span className="message-status sent">Đã gửi</span>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isChatUserTyping && (
          <div className="typing-indicator">
            ✍️ {chatUser.displayName} đang nhập...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTyping}
          onKeyDown={handleKeyPress}
          placeholder="Nhập tin nhắn..."
          className="chat-textarea"
        />
        <button className="send-button" onClick={sendMessage} title="Gửi">
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}