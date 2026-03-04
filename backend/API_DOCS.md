# 后端接口文档 (API Documentation)

## 1. 基础说明 (General Info)
*   **Base URL**: `/api`
*   **Content-Type**: `application/json`
*   **Authentication**: Bearer Token in `Authorization` header.
    *   Example: `Authorization: Bearer <your_token>`
*   **Response Format**:
    ```json
    {
      "code": 200,    // 状态码 (200: 成功, 其他: 失败)
      "msg": "success", // 提示信息
      "data": { ... } // 业务数据
    }
    ```

## 2. 认证模块 (Auth)

### 2.1 用户注册 (Register)
*   **URL**: `/auth/register`
*   **Method**: `POST`
*   **Auth Required**: No
*   **Body**:
    ```json
    {
      "username": "john_doe",
      "email": "john@example.com",
      "password": "securePassword123"
    }
    ```
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "注册成功",
      "data": {
        "user": { "id": 1, "username": "john_doe", "email": "john@example.com" },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```

### 2.2 用户登录 (Login)
*   **URL**: `/auth/login`
*   **Method**: `POST`
*   **Auth Required**: No
*   **Body**:
    ```json
    {
      "email": "john@example.com",
      "password": "securePassword123"
    }
    ```
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "登录成功",
      "data": {
        "user": { "id": 1, "username": "john_doe", "avatar": "http://..." },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```

## 3. 用户模块 (User)

### 3.1 获取个人资料 (Get Profile)
*   **URL**: `/user/profile`
*   **Method**: `GET`
*   **Auth Required**: Yes
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": {
        "id": 1,
        "username": "john_doe",
        "nickname": "John",
        "avatar": "http://...",
        "bio": "Travel enthusiast",
        "stats": {
          "postCount": 10,
          "favoriteCount": 5,
          "receivedLikesCount": 100,
          "likedCount": 20
        }
      }
    }
    ```

### 3.2 更新个人资料 (Update Profile)
*   **URL**: `/user/profile`
*   **Method**: `PUT`
*   **Auth Required**: Yes
*   **Body**:
    ```json
    {
      "nickname": "Johnny",
      "bio": "Updated bio",
      "avatar": "http://new-avatar-url.com"
    }
    ```
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "更新成功",
      "data": { "id": 1, "nickname": "Johnny", ... }
    }
    ```

### 3.3 获取我的活动 (Get My Activities)
*   **URL**: `/user/activities`
*   **Method**: `GET`
*   **Query Params**:
    *   `type`: `posts` (我的帖子) | `favorites` (我的收藏) | `likes` (我点赞的内容)
*   **Auth Required**: Yes
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": [
        {
          "id": 101,
          "title": "Trip to Paris",
          "image": "http://...",
          "user": { "name": "John", "avatar": "..." },
          "likes": 15,
          "isLiked": true,
          "favoritedAt": "2023-10-27T10:00:00Z" // Only for type=favorites
        }
      ]
    }
    ```

## 4. 帖子模块 (Post)

### 4.1 获取帖子列表 (List Posts)
*   **URL**: `/posts`
*   **Method**: `GET`
*   **Auth Required**: Optional (携带 Token 可获取 isLiked 状态)
*   **Query Params**:
    *   `page`: 页码 (default 1)
    *   `limit`: 每页数量 (default 10)
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": {
        "list": [
          { "id": 1, "title": "My Trip", "content": "...", "images": [], "user": {...}, "likes": 5, "isLiked": false }
        ],
        "total": 100,
        "page": 1
      }
    }
    ```

### 4.2 创建帖子 (Create Post)
*   **URL**: `/posts`
*   **Method**: `POST`
*   **Auth Required**: Yes
*   **Body**:
    ```json
    {
      "title": "Amazing view in Tokyo",
      "content": "Had a great time visiting...",
      "images": ["http://img1.com", "http://img2.com"]
    }
    ```
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "发布成功",
      "data": { "id": 102, "title": "Amazing view in Tokyo", ... }
    }
    ```

### 4.3 获取帖子详情 (Get Post Detail)
*   **URL**: `/posts/:id`
*   **Method**: `GET`
*   **Auth Required**: Optional
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": {
        "id": 1,
        "title": "My Trip",
        "content": "...",
        "images": [],
        "user": { "id": 2, "username": "alice", ... },
        "comments": [ ... ],
        "likes": 10,
        "isLiked": true
      }
    }
    ```

## 5. 行程模块 (Itinerary)

### 5.1 AI 生成行程 (Generate Itinerary)
*   **URL**: `/itineraries/generate`
*   **Method**: `POST`
*   **Auth Required**: Yes
*   **Body**:
    ```json
    {
      "destination": "Kyoto",
      "days": 3,
      "preferences": ["culture", "food"],
      "budget": "medium"
    }
    ```
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "生成成功",
      "data": {
        "title": "3 Days in Kyoto",
        "content": [
           { "day": 1, "activities": ["Kinkaku-ji", "Ryoan-ji"] },
           ...
        ]
      }
    }
    ```

### 5.2 保存行程 (Save Itinerary)
*   **URL**: `/itineraries`
*   **Method**: `POST`
*   **Auth Required**: Yes
*   **Body**:
    ```json
    {
      "title": "My Kyoto Plan",
      "content": [ ... ], // JSON structure from generation
      "start_date": "2023-11-01",
      "end_date": "2023-11-03"
    }
    ```
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "保存成功",
      "data": { "id": 501, "title": "My Kyoto Plan" }
    }
    ```

### 5.3 获取行程列表 (List Itineraries)
*   **URL**: `/itineraries`
*   **Method**: `GET`
*   **Auth Required**: Yes
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": [
        { "id": 501, "title": "My Kyoto Plan", "start_date": "2023-11-01", "days": 3 }
      ]
    }
    ```

## 6. 上传模块 (Upload)

### 6.1 上传文件 (Upload File)
*   **URL**: `/upload`
*   **Method**: `POST`
*   **Auth Required**: Yes
*   **Header**: `Content-Type: multipart/form-data`
*   **Body**: `file` (Binary)
*   **Response**:
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": {
        "url": "http://localhost:3000/uploads/avatar-123.jpg"
      }
    }
    ```
