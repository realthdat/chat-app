import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, provider, db } from './firebase';
import './styles.css';

export default function SignIn() {
  const handleSignIn = async () => {
    try {
      // Đăng nhập bằng Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log('Google user data:', {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email
      });

      // Lưu dữ liệu người dùng vào Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: user.displayName || 'Ẩn danh',
        photoURL: user.photoURL || null,
        email: user.email || null,
        id: user.uid,
        lastLogin: new Date()
      }, { merge: true });

      console.log('Đã lưu dữ liệu người dùng vào Firestore:', {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email
      });
    } catch (e) {
      console.error('Lỗi đăng nhập:', e.message);
    }
  };

  return (
    <div className="page-container">
      <div className="signin-container">
        <h2 className="signin-title">🗨️ Chào mừng bạn đến với Chat App!</h2>
        <button className="google-signin-button" onClick={handleSignIn}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google icon"
            className="google-icon"
          />
          Đăng nhập bằng Google
        </button>
      </div>
      <footer className="footer">
        © {new Date().getFullYear()} Copyright by DatDev
      </footer>
    </div>
  );
}