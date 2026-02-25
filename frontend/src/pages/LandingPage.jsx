import React from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";
<Link to="/login" className="btn btn-hero-primary">Login</Link>

const LandingPage = () => {
  return (
    <div className="landing-root">
      {/* NAVBAR */}
      <header className="navbar navbar-expand-lg navbar-dark landing-navbar">
        <div className="container">
          <Link to="/" className="navbar-brand d-flex align-items-center">
            <div className="brand-icon me-2 d-flex align-items-center justify-content-center">
              <span className="material-icons-round">weekend</span>
            </div>
            <span className="fw-semibold">Everwood &amp; Co.</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <nav className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav ms-auto align-items-lg-center">
              <li className="nav-item">
                <a href="#top" className="nav-link">
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a href="#about" className="nav-link">
                  About
                </a>
              </li>
              <li className="nav-item">
                <a href="#footer" className="nav-link">
                  Contact
                </a>
              </li>
              <li className="nav-item ms-lg-3">
                <Link to="/login" className="btn btn-nav-login px-3">
                  Login
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <main id="top" className="landing-main">
        <section className="landing-hero">
          <div className="container landing-hero-inner text-center">
            <div>
              <h1 className="landing-title">
                Design and Visualise Your
                <br />
                <span>Room in</span>{" "}
                <span className="accent-text">2D &amp; 3D</span>
              </h1>

              <p className="landing-subtitle mx-auto">
                Create room layouts, place furniture, and explore your space in
                interactive 2D and 3D views. Save designs and revisit them
                anytime with our visualisation engine.
              </p>

              <div className="hero-actions d-flex justify-content-center gap-3 mt-4">
                <Link to="/login" className="btn btn-hero-primary">
                  Login
                </Link>
                <Link to="/register" className="btn btn-hero-secondary">
                  Create Account
                </Link>
              </div>
            </div>

            {/* HERO MEDIA / MOCK VIDEO */}
            <div className="hero-media mt-5 mx-auto">
              <button className="hero-play-button" type="button">
                <span className="material-icons-round">play_arrow</span>
              </button>
            </div>
          </div>
        </section>
        
        {/* TAILORED EXPERIENCES */}
        <section
          id="about"
          className="landing-section landing-section-dark py-5"
        >
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="section-title">Tailored Experiences</h2>
              <div className="section-underline mx-auto" />
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <div className="card experience-card h-100">
                  <div className="card-body">
                    <div className="experience-icon mb-3">
                      <span className="material-icons-round">person</span>
                    </div>
                    <h5 className="card-title">For Customers</h5>
                    <p className="card-text">
                      Design your own room from home or in the shop with
                      intuitive tools.
                    </p>
                    <ul className="list-unstyled mt-3 mb-0 small">
                      <li>
                        <span className="material-icons-outlined me-2">
                          palette
                        </span>
                        Set room size and colours
                      </li>
                      <li>
                        <span className="material-icons-outlined me-2">
                          view_quilt
                        </span>
                        Arrange furniture in 2D / 3D
                      </li>
                      <li>
                        <span className="material-icons-outlined me-2">
                          favorite
                        </span>
                        Save favourite layouts
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card experience-card h-100 ">
                  <div className="card-body">
                    <div className="experience-icon mb-3">
                      <span className="material-icons-round">store</span>
                    </div>
                    <h5 className="card-title">For Shop Staff</h5>
                    <p className="card-text">
                      Use this app in the showroom to help customers visualise
                      layouts in real time.
                    </p>
                    <ul className="list-unstyled mt-3 mb-0 small">
                      <li>
                        <span className="material-icons-outlined me-2">
                          desktop_windows
                        </span>
                        In‑store consultation tool
                      </li>
                      <li>
                        <span className="material-icons-outlined me-2">
                          360
                        </span>
                        Real‑time 3D views
                      </li>
                      <li>
                        <span className="material-icons-outlined me-2">
                          folder_shared
                        </span>
                        Manage customer proposals
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* POWERFUL TOOLS */}
        <section id="tools" className="landing-section py-5">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="section-title">Powerful Visualisation Tools</h2>
              <p className="section-subtitle mx-auto">
                Everything you need to bring your interior design ideas to life
                with professional accuracy and clarity.
              </p>
            </div>

            <div className="row g-4">
              <div className="col-md-3 col-sm-6">
                <div className="card tool-card h-100">
                  <div className="card-body">
                    <div className="tool-icon mb-3">
                      <span className="material-icons-round">grid_on</span>
                    </div>
                    <h6 className="card-title">2D Layout Editor</h6>
                    <p className="card-text small mb-0">
                      Precision drafting for floor plans with drag‑and‑drop
                      ease.
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-3 col-sm-6">
                <div className="card tool-card h-100">
                  <div className="card-body">
                    <div className="tool-icon mb-3">
                      <span className="material-icons-round">view_in_ar</span>
                    </div>
                    <h6 className="card-title">3D Room Viewer</h6>
                    <p className="card-text small mb-0">
                      Immersive 3D environments to explore your furniture
                      choices.
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-3 col-sm-6">
                <div className="card tool-card h-100">
                  <div className="card-body">
                    <div className="tool-icon mb-3">
                      <span className="material-icons-round">
                        design_services
                      </span>
                    </div>
                    <h6 className="card-title">Design Management</h6>
                    <p className="card-text small mb-0">
                      Save, edit, and revisit room designs across sessions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-3 col-sm-6">
                <div className="card tool-card h-100">
                  <div className="card-body">
                    <div className="tool-icon mb-3">
                      <span className="material-icons-round">
                        supervisor_account
                      </span>
                    </div>
                    <h6 className="card-title">Admin &amp; User Roles</h6>
                    <p className="card-text small mb-0">
                      Interfaces tailored for both customers and showroom
                      staff.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer id="footer" className="landing-footer py-4">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center mb-1">
              <div className="brand-icon me-2 d-flex align-items-center justify-content-center">
                <span className="material-icons-round">weekend</span>
              </div>
              <span className="fw-semibold">Everwood &amp; Co.</span>
            </div>
            <small className="text-main">
              Course project for PUSL3122 – HCI, Computer Graphics &amp;
              Visualisation.
            </small>
          </div>

          <div className="text-md-end">
            <small className="d-block text-main">
              © {new Date().getFullYear()} Everwood &amp; Co. All rights
              reserved.
            </small>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
