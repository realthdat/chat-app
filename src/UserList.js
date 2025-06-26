import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

function getChatId(user1, user2) {
  return [user1.uid, user2.id].sort().join('_');
}

// Function to save user data to Firestore
async function saveUserToFirestore(user) {
  if (!user) return;
  try {
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || null,
      email: user.email || null,
      id: user.uid,
      lastLogin: new Date(),
      online: true,
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user to Firestore:', error);
  }
}

// Function to update online status
async function updateOnlineStatus(userId, status) {
  try {
    await setDoc(doc(db, 'users', userId), {
      online: status,
      lastSeen: status ? null : new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating online status:', error);
  }
}

export default function UserList({ setChatUser }) {
  const [users, setUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const currentUser = auth.currentUser;
  const defaultAvatar = '/default-avatar.png';

  // Đồng bộ photoURL và trạng thái online của currentUser
  useEffect(() => {
    if (!currentUser) return;

    const syncUserPhotoURL = async () => {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().photoURL !== currentUser.photoURL) {
        await setDoc(userDocRef, {
          photoURL: currentUser.photoURL || null,
          lastLogin: new Date(),
          online: true,
        }, { merge: true });
        console.log('Đã đồng bộ photoURL và trạng thái online cho currentUser');
      }
    };
    syncUserPhotoURL();

    // Cập nhật trạng thái online khi người dùng đăng nhập
    updateOnlineStatus(currentUser.uid, true);

    // Xử lý sự kiện trước khi đóng trình duyệt
    const handleBeforeUnload = () => {
      updateOnlineStatus(currentUser.uid, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup: Chỉ xóa sự kiện beforeunload
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Debug: Log thông tin currentUser
  useEffect(() => {
    if (currentUser) {
      console.log('Current User in UserList:', {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL || 'Không có photoURL',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Save current user's data to Firestore
    saveUserToFirestore(currentUser);

    const unsub = onSnapshot(collection(db, 'users'), snapshot => {
      const allUsers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser.uid);

      setUsers(allUsers);

      allUsers.forEach(user => {
        console.log('User info:', {
          id: user.id,
          displayName: user.displayName,
          photoURL: user.photoURL || 'Không có photoURL',
          online: user.online || false,
          lastSeen: user.lastSeen ? user.lastSeen.toDate() : null,
        });

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

          // Update last message
          const latest = msgs[0];
          if (latest) {
            setLastMessages(prev => ({
              ...prev,
              [user.id]: latest
            }));
          }

          // Update unread count
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

  // Sort users by online status and last message timestamp
  const sortedUsers = [...users].sort((a, b) => {
    // Ưu tiên người online lên đầu
    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;
    // Nếu cùng trạng thái, sắp xếp theo thời gian tin nhắn cuối
    const timeA = lastMessages[a.id]?.timestamp?.toDate?.() ?? new Date(0);
    const timeB = lastMessages[b.id]?.timestamp?.toDate?.() ?? new Date(0);
    return timeB - timeA;
  });

  const handleImageError = (key, url) => {
    console.log(`Lỗi tải ảnh: ${url} cho ${key}`);
    setImageErrors((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div className="user-list">
      {currentUser && (
        <div className="current-user-header">
          {!imageErrors['currentUser'] && currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Your avatar"
              className="current-user-avatar"
              loading="lazy"
              onError={() => handleImageError('currentUser', currentUser.photoURL)}
            />
          ) : (
            <img
              src={defaultAvatar}
              alt="Default avatar"
              className="current-user-avatar"
              loading="lazy"
              onError={() => handleImageError('currentUser', defaultAvatar)}
            />
          )}
          <h3>{currentUser.displayName || 'User'}</h3>
        </div>
      )}
      <div className="user-list-title">Conversations</div>
      {users.length === 0 && <p className="no-users">No other users found.</p>}
      {sortedUsers.map(user => (
        <div
          key={user.id}
          className="user-item"
          onClick={() => setChatUser(user)}
        >
          <div className="avatar-container">
            {!imageErrors[`user_${user.id}`] && user.photoURL ? (
              <img
                src={user.photoURL}
                alt={`${user.displayName}'s avatar`}
                className="user-avatar"
                loading="lazy"
                onError={() => handleImageError(`user_${user.id}`, user.photoURL)}
              />
            ) : (
              <img
                src={defaultAvatar}
                alt={`${user.displayName}'s avatar`}
                className="user-avatar"
                loading="lazy"
                onError={() => handleImageError(`user_${user.id}`, defaultAvatar)}
              />
            )}
            <span className={`status-indicator ${user.online ? 'online' : 'offline'}`}></span>
          </div>
          <div className="user-info">
            <div className="user-name">{user.displayName || 'Anonymous'}</div>
            {lastMessages[user.id] && (
              <div className="last-message">
                {lastMessages[user.id].text?.substring(0, 30) + (lastMessages[user.id].text?.length > 30 ? '...' : '')}
              </div>
            )}
          </div>
          {unreadCounts[user.id] > 0 && (
            <span className="unread-badge">{unreadCounts[user.id]}</span>
          )}
        </div>
      ))}
    </div>
  );
}