# Figma AI Design Prompts for Xiaohongshu-Style Travel App
# 小红书风格旅游 App 设计提示词

This document contains detailed prompts to generate UI designs in Figma (using plugins like Galileo AI, Uizard, or Figma's own AI features) for a travel application inspired by Xiaohongshu (RedNote).

**Design System Keywords**:3
- **Style**: Minimalist, Clean, Youthful, Content-First.
- **Color Palette**: Primary Red (#FF2442), White Background (#FFFFFF), Light Gray Background (#F5F5F5), Dark Gray Text (#333333).
- **Typography**: Sans-serif, Bold Headings, Readable Body.
- **Layout**: Masonry Grid (Waterfall), Card-based, Bottom Navigation Bar.
- **Icons**: Rounded, Line/Outline style (active state filled).

---

## 1. Login / Register Screen (登录/注册页)

### English Prompt
> Design a modern, minimalist mobile login screen for a travel social app.
> **Background**: Clean white or a subtle, high-quality travel photo with an overlay.
> **Content**:
> - Large, bold app logo and name at the top center.
> - "Log In" and "Sign Up" tabs.
> - Input fields for "Phone Number" or "Email" and "Password" with rounded corners and light gray fill.
> - A prominent primary red (#FF2442) "Log In" button with white text, full width.
> - "Forgot Password?" link.
> - Social login options at the bottom (WeChat, Apple, Google) with circular icons.
> - Terms of Service checkbox.
> **Style**: High-end, trustworthy, airy spacing.

### Chinese Explanation (中文说明)
设计一个现代简约的移动端登录页面。背景可以是纯白或带有一张高质量的旅游风景图（加蒙版）。
顶部居中放置 App Logo 和名称。包含“登录”和“注册”切换标签。
输入框（手机号/邮箱、密码）采用圆角设计，浅灰色填充。
登录按钮使用品牌主色调红色（#FF2442），全宽圆角。
底部提供第三方登录入口（微信、Apple、Google）及服务条款勾选框。整体风格高端、可信赖。

---

## 2. Home Feed (首页 - 发现)

### English Prompt
> Design a mobile home screen for a lifestyle and travel app with a masonry (waterfall) grid layout.
> **Header**:
> - Top search bar with rounded corners, placeholder text "Search destinations...", and a search icon.
> - Tab navigation below search: "Follow", "Discover" (Active), "Nearby".
> **Content**:
> - A dual-column masonry grid of travel cards.
> - Each card features a large, high-quality vertical image (aspect ratio 3:4 or 1:1).
> - Below the image: A multi-line title (max 2 lines), user avatar, username, and a "heart" icon with a like count.
> **Bottom Navigation**:
> - 5 icons: Home (Active), Shop/Booking, Create (+ button in center, red), Message, Me.
> **Style**: Immersive, image-focused, similar to Pinterest or Xiaohongshu.

### Chinese Explanation (中文说明)
设计一个生活方式/旅游 App 的首页，采用瀑布流布局。
顶部包含圆角搜索框（提示文案“搜索目的地...”）和标签栏（关注、发现、附近）。
主要内容区为双列瀑布流卡片。每个卡片包含一张高质量的竖构图封面图。
图片下方显示标题（最多两行）、发布者头像、昵称以及点赞图标和数量。
底部导航栏包含 5 个图标：首页（激活）、预订/商城、发布（中间红色加号）、消息、我。风格沉浸式，强调图片内容。

---

## 3. Spot Detail Page (景点详情页)

### English Prompt
> Design a detailed view screen for a travel spot or user post.
> **Header**: Transparent navigation bar with a "Back" arrow and "Share" icon.
> **Content**:
> - A full-width image carousel at the top (pagination dots).
> - Title section: Large, bold title (e.g., "Must-visit Hidden Gem in Kyoto").
> - User info row: Avatar, Name, "Follow" button (outlined red).
> - Body text: Rich text description with emojis and hashtags, readable font size.
> - "Mentioned Spots" section: A horizontal scroll list of location cards (with maps icon).
> - Comments preview section showing top 2 comments.
> **Footer**:
> - Fixed bottom bar with an input field "Say something...", "Like" (Heart), "Collect" (Star), and "Comment" (Bubble) icons.
> **Style**: Clean, informative, easy to read.

### Chinese Explanation (中文说明)
设计一个旅游景点或用户笔记的详情页。
顶部透明导航栏包含返回和分享按钮。
首屏为全宽图片轮播。下方是粗体大标题。
用户信息栏包含头像、昵称和“关注”按钮（红色描边）。
正文区域包含详细描述、Emoji 和标签。
“相关地点”区域展示横向滚动的地点卡片。评论预览区展示热评。
底部固定操作栏包含输入框“说点什么...”、点赞、收藏和评论图标。风格清晰易读。

---

## 4. Chat Interface (AI 聊天助手)

### English Prompt
> Design a chat interface screen for an AI travel assistant.
> **Header**: Title "AI Travel Planner", subtitle "Online".
> **Content**:
> - Chat history area with message bubbles.
> - User messages: Aligned right, primary red background, white text.
> - AI messages: Aligned left, white background, gray text, with an avatar.
> - Rich media support: AI can send travel itinerary cards or spot recommendations (image + title + rating) within the chat.
> **Footer**:
> - Input area with a text field, voice input icon, and "Send" button.
> - "Quick Actions" chips above the input: "Plan a trip", "Suggest hotels", "Weather".
> **Style**: Conversational, friendly, functional.

### Chinese Explanation (中文说明)
设计一个 AI 旅游助手的聊天界面。
顶部标题“AI 旅行策划师”。
聊天记录区域包含左右对话气泡。用户消息右对齐（红色背景），AI 消息左对齐（白色背景，带头像）。
AI 回复支持富媒体卡片（如行程推荐、景点卡片）。
底部输入区包含文本框、语音图标和发送按钮。
输入框上方提供快捷操作胶囊按钮：“规划行程”、“推荐酒店”、“天气查询”。风格对话式、友好。

---

## 5. User Profile (个人中心)

### English Prompt
> Design a personal profile screen for a mobile app.
> **Header**:
> - Large background banner (optional) or clean white.
> - User info: Large avatar on the left, Stats on the right (Following, Followers, Likes and Collects).
> - Bio section below with verified badge and location tag.
> - "Edit Profile" and "Settings" buttons (outlined gray).
> **Content Tabs**:
> - "Notes" (My Posts), "Collections", "Likes".
> **Grid**:
> - 3-column grid of square thumbnails representing the user's posts.
> **Style**: Personal, organized, grid-based.

### Chinese Explanation (中文说明)
设计个人中心页面。
顶部用户信息区：左侧大头像，右侧统计数据（关注、粉丝、获赞与收藏）。
下方显示简介、认证标识和位置标签。提供“编辑资料”和“设置”按钮。
内容切换标签：“笔记”、“收藏”、“赞过”。
下方展示用户发布的内容，采用三列宫格布局（方形缩略图）。风格个性化、井井有条。

---

## 6. Admin Dashboard (Web Version) (后台管理 - Web 端)

### English Prompt
> Design a web-based admin dashboard for content management.
> **Sidebar**:
> - Dark navigation sidebar with logo. Items: Dashboard, User Management, Content Moderation, Analytics, Settings.
> **Main Area**:
> - **Top Cards**: 4 summary cards (Total Users, Daily Active Users, New Posts, Reported Content).
> - **Chart Section**: A large line chart showing "User Growth" over time.
> - **Table Section**: "Recent Users" or "Flagged Posts" table with columns (ID, Name, Status, Actions).
> - Action buttons in table rows: "Edit", "Delete", "Ban".
> **Style**: Professional, data-rich, clean dashboard UI (like Ant Design or Material UI).

### Chinese Explanation (中文说明)
设计一个基于 Web 的内容管理后台。
左侧深色侧边栏导航：仪表盘、用户管理、内容审核、数据分析、设置。
主区域包含顶部 4 个数据概览卡片（总用户、日活、新增帖子、被举报内容）。
中间是大尺寸折线图展示用户增长趋势。
下方是数据表格（最近用户或被标记的帖子），包含 ID、名称、状态、操作列。
操作按钮包括“编辑”、“删除”、“封禁”。风格专业、数据丰富，类似 Ant Design。
