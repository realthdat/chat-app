// src/UserList.js
import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

function getChatId(user1, user2) {
  return [user1.uid, user2.id].sort().join('_');
}

export default function UserList({ setChatUser }) {
  const [users, setUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const currentUser = auth.currentUser;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snapshot => {
      const allUsers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser.uid);

      setUsers(allUsers);

      // Lắng nghe từng cuộc trò chuyện cho từng user
      allUsers.forEach(user => {
        const chatId = getChatId(currentUser, user);
        const q = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('timestamp')
        );

        onSnapshot(q, msgSnap => {
          const unread = msgSnap.docs.filter(doc =>
            doc.data().senderId === user.id &&
            doc.data().status !== 'seen'
          ).length;

          setUnreadCounts(prev => ({
            ...prev,
            [user.id]: unread
          }));
        });
      });
    });

    return () => unsub();
  }, [currentUser]);

  return (
    <div className="user-list">
      <h3>Chọn người để chat:</h3>
      {users.length === 0 && <p>Không tìm thấy người dùng khác.</p>}
      {users.map(user => (
        <div
          key={user.id}
          className="user-item"
          onClick={() => setChatUser(user)}
        >
          {user.displayName}
          {unreadCounts[user.id] > 0 && (
            <span className="unread-badge">{unreadCounts[user.id]}</span>
          )}
        </div>
      ))}
    </div>
  );
}
