import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import "./LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
        });

        // 1. Save data to storage
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // 2. Logic for Role-Based Navigation
        const userRole = res.data.user?.role; // Assuming backend returns { user: { role: 'admin', ... } }

        if (userRole === "admin") {
        navigate("/admin", { replace: true });
        } else {
        navigate("/dashboard", { replace: true });
        }

    } catch (err) {
        console.error(err);
        // You should add an setError state to display this to the user
    }
    };

  return (
    <div className="login-root dark">
      {/* Background */}
      <div className="login-bg">
        <div className="login-bg-overlay" />
        <img
          className="login-bg-image"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQXtdsJoR-sfBLnZRvkKFJ0WvJUmS2TZ107Q9j5SfqX0DZaDaPBc7AP2fEi31PNoCuu45-Ih1YI-nAEjoZUoPTLET8LtxagiO28LlooXpncm6gVDxVvNhSCIZuzlvXgCEYOqKn4IvIgMvny6X-P1oURquZ6YRsz5H5GkHwaiMMYNvjNENgptA3aSkAvU_pfyjNx5zmkEkzvjxcLly9Znmd4ajfdJWE5o_jY5DDmPH90OewTUjSna92vVUxlwp7GMbXEDKov9fIVgI"
          alt="Luxury modern living room with wooden furniture"
        />
      </div>

      {/* Main content */}
      <main className="login-main">
        <div className="login-panel glass-panel">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <span className="material-icons-round">chair</span>
            </div>
            <h1 className="login-brand-title">Everwood &amp; Co.</h1>
            <p className="login-brand-subtitle">
              Fine Craftsmanship, Timeless Design
            </p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="login-field">
              <label className="login-label" htmlFor="email">
                Email Address
              </label>
              <div className="login-input-wrapper">
                <span className="material-icons-round login-input-icon">
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@everwood.com"
                  className="login-input"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <div className="login-label-row">
                <label className="login-label" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="login-input-wrapper">
                <span className="material-icons-round login-input-icon">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="login-input login-input-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <span className="material-icons-round">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="login-remember">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="login-checkbox"
                checked={form.remember}
                onChange={handleChange}
              />
              <label htmlFor="remember" className="login-remember-label">
                Stay signed in
              </label>
            </div>

            {/* Submit */}
            <button type="submit" className="login-submit">
              Login
            </button>
          </form>

          {/* Register link */}
          <div className="login-register">
            <p>
              New to the circle?
              <Link to="/register" className="login-register-link">
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <p>© 2026 Everwood &amp; Company. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default LoginPage;
