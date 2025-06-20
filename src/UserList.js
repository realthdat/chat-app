import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';

export default function UserList({ setChatUser }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const currentUid = auth.currentUser.uid;

      const userList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUid);

      // Đếm tin nhắn chưa đọc cho từng user
      const unreadCounts = {};
      await Promise.all(userList.map(async (user) => {
        const chatId = [currentUid, user.id].sort().join('_');
        const messageQuery = query(
          collection(db, "chats", chatId, "messages"),
          where("senderId", "==", user.id),
          where("status", "!=", "seen")
        );
        const snapshot = await getDocs(messageQuery);
        unreadCounts[user.id] = snapshot.size;
      }));

      const usersWithUnread = userList.map(user => ({
        ...user,
        unread: unreadCounts[user.id] || 0
      }));

      setUsers(usersWithUnread);
    };

    fetchUsers();
  }, []);

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
          <span>{user.displayName}</span>
          {user.unread > 0 && (
            <span className="unread-badge">{user.unread}</span>
          )}
        </div>
      ))}
    </div>
  );
}
