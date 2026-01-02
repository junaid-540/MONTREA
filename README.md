# 🛍 MONTRÉA – Full-Stack E-Commerce Application

MONTRÉA is a full-stack e-commerce web application built using **Node.js, Express.js, MongoDB, and EJS**, following the **MVC architecture**.

The project implements real-world e-commerce workflows including authentication, product management, cart, checkout, payments, orders, refunds, wallet handling, and admin analytics.

This application was developed as part of an intensive learning program with a focus on **scalable backend design, clean architecture, and production-ready practices**.

---

## 🚀 Overview

MONTRÉA is a role-based system with **User** and **Admin** modules.

It supports:
- Secure authentication (OTP & OAuth)
- Complete shopping lifecycle
- Payment & refund handling
- Admin dashboards and reports
- Backend-driven search, filter, sort, and pagination

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- MVC Architecture

### Frontend
- EJS (Server-Side Rendering)
- HTML, CSS, JavaScript

### Integrations & Tools
- Razorpay (Online Payments)
- Nodemailer (Email & OTP)
- Cloudinary (Image Storage)
- Multer (Image Upload Handling)
- Cropper.js (Frontend Image Cropping)
- Chart.js (Admin Analytics)
- PDF & Excel Report Generation
- Git & GitHub


---

## ✨ Key Features

### 👤 User Module
- Signup & login with validation
- OTP-based signup and password recovery
- Google & Facebook OAuth login
- Product listing with pagination
- Backend-driven search, filter, and sorting
- Product detail page with zoom, ratings, stock & offers
- Wishlist management
- Cart management with stock validation
- Checkout with address selection
- Payments via COD, Razorpay & Wallet
- Order tracking, cancellation & return
- Wallet system with refund handling
- Invoice download (PDF)

### 🛡 Admin Module
- Secure admin authentication
- User management (block / unblock)
- Category & product management (soft delete)
- Multiple product images with cropping & resizing
- Inventory & stock management
- Coupon, product offer & category offer management
- Referral system management
- Order lifecycle management
- Sales reports (daily / weekly / custom)
- Report export (PDF & Excel)
- Dashboard analytics with charts

---


## 🔐 Environment Variables

This project uses environment-based configuration.

Refer to the `.env.example` file for the required variables.  
Sensitive values are **not committed** to the repository for security reasons.

---

## ⚙️ Installation & Setup

```bash
git clone https://github.com/your-username/montrea.git
cd montrea
npm install
Create a .env file using .env.example as reference.

▶️ Running the Application


npm run dev
Server runs at:

http://localhost:3000


🎯 Learning Outcomes
Designing scalable MVC architecture

Backend-driven filtering, sorting & pagination

Secure authentication & authorization

Payment gateway integration

Wallet & refund workflows

Admin dashboards & reporting

Real-world e-commerce logic handling
```

📄 License
Educational project for learning purposes.