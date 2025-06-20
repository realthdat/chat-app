// src/SignIn.js
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from './firebase';
import './styles.css'; // đảm bảo import nếu chưa có

export default function SignIn() {
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Lỗi đăng nhập:", e.message);
    }
  };

  return (
    <div className="page-container">
      <div className="signin-container">
        <h2>🗨️ Chào mừng bạn đến với Chat App!</h2>
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
