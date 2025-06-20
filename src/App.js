// src/App.js
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import UserList from './UserList';
import ChatRoom from './ChatRoom';
import SignIn from './SignIn';
import './styles.css';
import { doc, setDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [chatUser, setChatUser] = useState(null);

  // Theo dõi trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);

        // Lưu thông tin user vào Firestore nếu chưa có
        await setDoc(doc(db, "users", user.uid), {
          displayName: user.displayName,
          email: user.email,
        }, { merge: true });
      } else {
        setUser(null);
        setChatUser(null); // reset nếu đăng xuất
      }
    });

    return () => unsubscribe();
  }, []);

  // Nếu chưa đăng nhập → hiện màn hình đăng nhập
  if (!user) return <SignIn />;

  return (
    <div className="app-container">
      <div className="header">
        <h2>Chào, {user.displayName}</h2>
        <button onClick={() => signOut(auth)} className="logout-button">Đăng xuất</button>
      </div>

      {/* Nếu đã chọn người chat → hiển thị ChatRoom */}
      {chatUser ? (
        <ChatRoom chatUser={chatUser} setChatUser={setChatUser} />
      ) : (
        <UserList setChatUser={setChatUser} />
      )}
    </div>
  );
}

export default App;