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
} from 'firebase/firestore';
import { db, auth } from './firebase';

function getChatId(user1, user2) {
    return [user1.uid, user2.id].sort().join('_');
}

export default function ChatRoom({ chatUser, setChatUser }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [typingStatus, setTypingStatus] = useState({});
    const currentUser = auth.currentUser;
    const chatId = getChatId(currentUser, chatUser);
    const bottomRef = useRef(null);
    let typingTimeout = useRef(null);

    // Lắng nghe tin nhắn
    useEffect(() => {
        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(msgs);

            // Cập nhật trạng thái đã xem hoặc đã nhận
            msgs.forEach(async (msg) => {
                const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                if (
                    msg.senderId !== currentUser.uid &&
                    msg.status !== 'seen'
                ) {
                    await updateDoc(msgRef, { status: 'seen' });
                } else if (
                    msg.senderId === currentUser.uid &&
                    msg.status === 'sent'
                ) {
                    await updateDoc(msgRef, { status: 'delivered' });
                }
            });
        });

        return () => unsubscribe();
    }, [chatId]);

    // Cuộn xuống cuối mỗi khi có tin mới
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Gửi tin nhắn
    const sendMessage = async () => {
        if (!input.trim()) return;

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: input,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            timestamp: serverTimestamp(),
            status: 'sent',
        });

        setInput('');
        await updateTypingStatus(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleTyping = async (e) => {
        setInput(e.target.value);
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

    // Lắng nghe trạng thái typing
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
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleString();
    };

    // Tìm index tin cuối đã xem
    const lastSeenIndex = [...messages]
        .map((msg, index) => ({ ...msg, index }))
        .reverse()
        .find(
            (msg) => msg.senderId === currentUser.uid && msg.status === 'seen'
        )?.index;

    // Tìm index tin cuối do currentUser gửi
    const lastSentIndex = [...messages]
        .map((msg, index) => ({ ...msg, index }))
        .reverse()
        .find(msg => msg.senderId === currentUser.uid)?.index;

    return (
        <div className="chat-room">
            <button onClick={() => setChatUser(null)} className="back-button">
                <FaArrowLeft style={{ marginRight: "6px" }} /> Quay lại
            </button>
            <h3>Chat với {chatUser.displayName}</h3>

            <div className="message-box">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}
                        title={formatTime(msg.timestamp)}
                    >
                        {msg.text}
                        {msg.senderId === currentUser.uid && (
                            <div className="message-status">
                                {i === lastSeenIndex ? (
                                    <span className="message-status seen">Đã xem</span>
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
                ))}

                {isChatUserTyping && (
                    <div className="typing-indicator">
                        ✍️ {chatUser.displayName} đang nhập...
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            <div className="input-area">
                <input
                    type="text"
                    value={input}
                    onChange={handleTyping}
                    onKeyDown={handleKeyPress}
                    placeholder="Nhập tin nhắn..."
                />
                <button className="send-button" onClick={sendMessage} title="Gửi">
                    <FaPaperPlane />
                </button>
            </div>
        </div>
    );
}
