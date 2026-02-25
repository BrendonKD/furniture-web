import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"; 
import "./RegisterPage.css";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
    isAdmin: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/register", {
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password,
        role: form.isAdmin ? "admin" : "user",
        contactNumber: form.contactNumber,
      });
      setLoading(false);
      // after successful registration redirect to login
      navigate("/login");
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    }
  };

  return (
    <div className="register-root dark">
      {/* HEADER */}
      <header className="register-header">
        <div className="register-header-left">
            <div className="register-logo-icon">
            <span className="material-icons-round">chair</span>
            </div>
          <h2 className="register-logo-text">Everwood &amp; Co.</h2>
        </div>

        <div className="register-header-right">
          <nav className="register-nav">
            <a href="#shop">Shop</a>
            <a href="#collections">Collections</a>
            <a href="#about">About</a>
          </nav>
          <Link to="/login" className="register-login-btn">
            Log In
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <main className="register-main">
        <div className="register-card">
          {/* Left image */}
          <div className="register-visual">
            <div className="register-visual-overlay" />
            <img
              className="register-visual-img"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJlVtES_LXTIqcWZhVbszxOG1WrwispoP9_ZiFe9sOlu_NATXicyfDNuCqLN_3u5RVdxq8SLDGSoEJoEQBsIqFviIPSgoTeni4XMsEAY8EELbBXPZFdYPJ15QVejTT5GdxihNM025AOiQ3y0aE9bZ1XJ_Y9Dvn_grXVbeQJCsO5teNsVlP1dFFnZ3LujA4AKID3LEINO_EmZyCUsKhiWhX0iQX-211ajjUBfACGGqisHQjszYbumQeHmAvV5ST4HQkNb_zUSBOWpk"
              alt="Artisanal wood crafting"
            />
            <div className="register-visual-caption">
              <span className="register-caption-kicker">
                The Everwood Standard
              </span>
              <h1>Join the Collective</h1>
              <p>
                Register today to access exclusive artisan drops, custom
                furniture design tools, and lifetime craftsmanship warranties.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="register-form-wrapper">
            <div className="register-form-header">
              <h3>Create Your Account</h3>
            </div>

            {error && <div className="register-error">{error}</div>}

            <form className="register-form" onSubmit={handleSubmit}>
              {/* Personal details */}
              <section className="register-section">
                <div className="register-section-title">
                  <span className="material-icons-round">person</span>
                  <span>Personal Details</span>
                </div>
                <div className="register-grid-two">
                  <div className="register-field">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="e.g. Elias"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="register-field">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="e.g. Sterling"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="register-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="elias@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="register-field">
                  <label htmlFor="contactNumber">Contact Number</label>
                  <input
                    id="contactNumber"
                    name="contactNumber"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.contactNumber}
                    onChange={handleChange}
                  />
                </div>
              </section>

              {/* Security */}
              <section className="register-section">
                <div className="register-section-title">
                  <span className="material-icons-round">shield</span>
                  <span>Security</span>
                </div>
                <div className="register-grid-two">
                  <div className="register-field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="register-field">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </section>
              <section className="register-section">
                <div className="register-field checkbox-field">
                    <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="isAdmin"
                        checked={form.isAdmin}
                        onChange={handleChange}
                    />
                    <span>Register as Administrator</span>
                    </label>
                </div>
                </section>
              {/* Submit */}
              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >
                {loading ? "Registering..." : "Complete Registration"}
                <span className="material-icons-round">
                  arrow_forward
                </span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
