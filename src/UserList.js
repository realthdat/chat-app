import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

function getChatId(user1, user2) {
  return [user1.uid, user2.id].sort().join('_');
}

export default function UserList({ setChatUser }) {
  const [users, setUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  const currentUser = auth.currentUser;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snapshot => {
      const allUsers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser.uid);

      setUsers(allUsers);

      allUsers.forEach(user => {
        const chatId = getChatId(currentUser, user);
        const q = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('timestamp', 'desc')
        );

        onSnapshot(q, msgSnap => {
          const msgs = msgSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Cập nhật tin nhắn cuối cùng
          const latest = msgs[0];
          if (latest) {
            setLastMessages(prev => ({
              ...prev,
              [user.id]: latest.timestamp
            }));
          }

          // Cập nhật số lượng chưa đọc
          const unread = msgs.filter(msg =>
            msg.senderId === user.id &&
            msg.status !== 'seen'
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

  // Sắp xếp người dùng theo thời gian tin nhắn mới nhất
  const sortedUsers = [...users].sort((a, b) => {
    const timeA = lastMessages[a.id]?.toDate?.() ?? new Date(0);
    const timeB = lastMessages[b.id]?.toDate?.() ?? new Date(0);
    return timeB - timeA; // Mới nhất lên đầu
  });

  return (
    <div className="user-list">
      <h3>Chọn người để chat:</h3>
      {users.length === 0 && <p>Không tìm thấy người dùng khác.</p>}
      {sortedUsers.map(user => (
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
