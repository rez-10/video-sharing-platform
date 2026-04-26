# Video Sharing Platform (Backend)

## Overview

This project implements a backend service for a video sharing platform using Node.js and Express. It supports user management, video upload/handling, and subscription features, with media storage handled via Cloudinary.

## Implementations

* User authentication and management
* Video upload pipeline with Cloudinary integration
* MongoDB models for users, videos, and subscriptions
* Middleware for authentication and file handling
* Structured error and response handling
* Modular MVC-like separation (controllers, routes, models)

---
##
* Node.js
* Express.js
* MongoDB (via Mongoose)
* Redis (configured)
* Cloudinary (media storage)
* Multer (file upload handling)

---

## Core Features

### User Management

* User registration and authentication
* Avatar upload support via Cloudinary
* User data persistence using MongoDB

**Files:**

* user.controller.js
* user.model.js
* user.routes.js

---

### Video Management

* Video upload handling using Multer
* Storage and delivery via Cloudinary
* Video metadata persistence in MongoDB

---

### Subscriptions

* Subscription model implemented for user relationships

---

## Middleware

### Authentication

  Handles request authentication and user context injection

### File Upload

  Handles multipart/form-data for media uploads

---

## Database Layer

### MongoDB

* Models:

  * user.model.js
  * video.model.js
  * subscription.model.js

### Redis

* No explicit usage observed in controllers

---

## Utilities

* apiError.js → Standardized error handling
* apiResponse.js → Structured API responses
* asyncHandler.js → Wrapper for async route handlers
* cloudinary.js → Cloudinary configuration and upload helpers

---

## Request Flow

1. Client sends HTTP request
2. Route directs request to controller
3. Middleware processes request (auth, file upload)
4. Controller executes logic
5. Data is stored/retrieved from MongoDB
6. Media is uploaded to Cloudinary (if applicable)
7. Response returned using standardized format

---

## Running the Service

### Prerequisites

* Node.js installed
* MongoDB instance
* Cloudinary credentials

### Environment Variables

Configure:

* MongoDB connection URI
* Cloudinary credentials
* JWT secret (if used in auth middleware)

### Start Server

```
npm install
npm start
```

---
