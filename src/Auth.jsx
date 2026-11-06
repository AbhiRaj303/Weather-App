
import { useState } from "react";
import "./Auth.css";

const Auth = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(
                "/api/auth/" + (isLogin ? "login" : "register"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ name, email, password })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            onLogin(data.user);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">☁</div>

                <h1>AETHER METEO</h1>
                <p className="auth-subtitle">
                    {isLogin
                        ? "Welcome back! Sign in to continue."
                        : "Create your account and explore the weather."}
                </p>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading
                            ? "Please wait..."
                            : isLogin
                            ? "Sign In"
                            : "Create Account"}
                    </button>
                </form>

                {message && <div className="auth-message">{message}</div>}

                <div className="auth-switch">
                    {isLogin
                        ? "Don't have an account?"
                        : "Already have an account?"}

                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setMessage("");
                        }}
                    >
                        {isLogin ? "Register" : "Login"}
                    </button>
                </div>

                <div className="auth-footer">
                    WEATHER • ANYTIME • ANYWHERE
                </div>
            </div>
        </div>
    );
};

export default Auth;
