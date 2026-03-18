# Everwood Co. - Interactive Furniture Visualization

Everwood Co. is a web-based application for interior designers to create 2D floor plans and visualize them in real-time 3D with furniture from a catalog. It supports role-based access for admins (designers) and customers.

## Features

- **Secure Authentication**: JWT-based login/registration with role-based access (admin/customer). 
- **Admin Dashboard**: Manage designs, update status, search, and view owner info. 
- **2D Room Designer**: Define dimensions (L/W/H in meters), shapes (rectangle/L-shaped), wall/floor colors; drag-drop furniture with SVG polygons. 
- **3D Room Viewer**: Three.js rendering with OrbitControls, GLB models, lighting/shadows, background toggle (dark/light). 
- **Furniture Catalog**: CRUD operations for admins; 3D preview cards with auto-rotation for all users. 
- **User Dashboard**: Personal designs library, filter/sort, edit/view in 3D. 
- **Responsive UI**: Bootstrap 5, Material Icons, real-time feedback. 

## Tech Stack

| Layer     | Technologies                          |
|-----------|---------------------------------------|
| Frontend | React 18, Vite, Bootstrap 5, Three.js, SVG/Fabric.js   |
| Backend  | Node.js, Express, JWT middleware   |
| Database | MongoDB Atlas, Mongoose   |
| Uploads  | Multer for GLB/images   |

## Installation & Setup

1. Clone the repo: `git clone https://github.com/BrendonKD/furniture-web.git` 
2. `cd furniture-web && npm install`
3. Backend: `cp .env.example .env`, update MongoDB URI and JWT secret.
4. `npm run dev` (Vite) for backend. 
5. Access at `http://localhost:5173`.

**Prerequisites**: Node.js 18+, MongoDB Atlas account. 

## Usage

- **Admin**: Login, manage furniture/designs via dashboard.
- **Customer**: Browse catalog, explore shared designs.
- Create room → Drag furniture → Toggle 3D → Save/share. 

Demo video: [YouTube Presentation](https://youtu.be/OCuMy6rpfVM) 

## Team & Contributions

| Name                  | Role                  | Key Responsibilities   |
|-----------------------|-----------------------|-------------------------------|
| Kekulkotuwage D Brendon (10952848) | Project Lead, Full-Stack | Architecture, API, 2D Designer, Auth, Dashboard |
| Ranasingha Kaushalya (10952731) | 3D Graphics Developer | Three.js viewer, GLB loading, L-room geometry |
| W. D. S. Weerasekara (10952775) | Frontend UI Developer | User dashboard, 3D cards, responsive design |
| A. V. Shyaman (10953316) | UI/UX Designer       | Figma prototypes, HCI principles, storyboards |
| Deshani Kudaralage (10952996) | Requirements Evaluation | Surveys, interviews, SUS testing, feedback |
| Rayigamage Gunawardhana (10952738) | Furniture Module    | CRUD, GLB upload, inventory |

PUSL3122 HCI Coursework, NSBM Green University | University of Plymouth 

## HCI Evaluation

- **Requirements**: Online questionnaires, contextual interviews. 
- **Prototyping**: Paper → Figma low/high-fidelity. 
- **Testing**: 2 rounds task-based; SUS improved from 63 to 81. 
- **Heuristics**: Visibility, consistency, error prevention applied. 

## Limitations & Future Work

- No per-furniture color edit; add drag-scale on 2D. 
- Extend: More shapes, AR export, purchase integration. 

## References

1. Brooke, J. (1996). SUS: A quick and dirty usability scale. 
2. Nielsen, J. (1994). Usability Engineering. 
3. Preece, J. et al. (2019). Interaction Design. 

---
**Course**: PUSL3122 HCI, Computer Graphics & Visualization - Group 04 
