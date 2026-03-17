# Furniture Room Visualizer - HCI & Visualization Project (PUSL3122)

## Project Overview
Web-based application for furniture designers to visualize room layouts. Customers collaborate during in-store consultations to see how chairs, tables, and more fit spatially and aesthetically in their space. Supports 2D layout planning with drag-and-drop, seamless conversion to interactive 3D views.

**Tech Stack:**
- Frontend: React + Vite (JavaScript)
- 3D Rendering: Vanilla Three.js (no libraries like React Three Fiber)
- Backend: Node.js + Express
- Database: MongoDB
- Other: Fabric.js for 2D canvas, bcrypt/JWT auth

## Key Features
- **Designer Login/Dashboard**: Secure auth, manage design portfolio
- **Room Setup**: Enter dimensions, shape (L-shape support), color scheme
- **2D Designer**:place furniture shapes and Rotate Furniture, customise the Room size
- **3D View**: Toggle for realistic preview with lighting/shading
- **Furniture Management**: Admin upload .glb models, scale changes
- **Save/Edit/Delete**: Persistent designs via API

Matches coursework functional reqs: room specs, 2D/3D vizualization, scaling, shading, colors.

## Agile Development
Followed Scrum: Weekly commits, sprints on auth → 2D → 3D → admin.
HCI focus: Iterative UX from low-fi sketches to high-fi prototypes.
