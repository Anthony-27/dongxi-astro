# DONGXI — Route B 启动指南

## 文件结构
```
dongxi-astro/          ← Astro 前端
  src/
    layouts/Base.astro ← HTML 壳：OG标签、字体、光标、WhatsApp/Telegram按钮
    styles/global.css  ← 设计系统：颜色、字体、topbar、浮动按钮
    lib/sanity.ts      ← Sanity 客户端 + GROQ 查询
    pages/
      shop.astro       ← 商店页面（从 Sanity 拉产品数据）
      index.astro      ← 主页（待完成）

studio/                ← Sanity CMS 后台
  schemas/
    product.ts         ← 产品内容模型
    showcase.ts        ← 作品展示内容模型
  sanity.config.ts     ← Sanity 配置
```

---

## 第一步：创建 Sanity 项目（5分钟）

1. 去 https://sanity.io → 注册/登录
2. 点 "Create new project" → 随便起名 "dongxi"
3. 记下 **Project ID**（格式类似 `ab12cd34`）

---

## 第二步：配置环境变量

把 `.env.example` 复制成 `.env`：

```bash
cp .env.example .env
```

填入你的值：
```
SANITY_PROJECT_ID=你的project_id
SANITY_DATASET=production
PUBLIC_SNIPCART_KEY=你的snipcart_public_key
PUBLIC_WA_NUMBER=8613912345678
PUBLIC_TG_USERNAME=dongxi_official
```

同时在 `studio/sanity.config.ts` 里填入同一个 `projectId`。

---

## 第三步：启动 Sanity Studio 后台

```bash
cd studio
npm install
npm run dev
# 打开 http://localhost:3333
```

在后台里你可以：
- 点 "Product 产品" → 添加新产品（填名字、上传图片、填价格）
- 点 "Showcase 作品展示" → 添加展示案例

---

## 第四步：启动 Astro 前端

回到根目录：
```bash
cd ..       # 回到 dongxi-astro/
npm run dev
# 打开 http://localhost:4321/shop
```

---

## 第五步：部署

### Sanity Studio（后台管理界面）
```bash
cd studio
npm run deploy
# 部署后你会得到一个 https://dongxi.sanity.studio 的地址
# 以后就在这里管理所有产品，不需要动代码
```

### Astro 前端（Cloudflare Pages）
1. 把 `dongxi-astro/` 文件夹推到 GitHub
2. Cloudflare Pages → 连接 GitHub 仓库
3. 构建命令: `npm run build`
4. 输出目录: `dist`
5. 在 Cloudflare Pages 的环境变量里填入 `.env` 里的所有值

### 自动重新部署（改了 Sanity 内容自动更新网站）
- Cloudflare Pages → Settings → Webhooks → 复制 Deploy Hook URL
- Sanity Dashboard → API → Webhooks → 粘贴 URL
- 以后你在 Sanity 后台点 "Publish"，网站约 1 分钟后自动更新

---

## 添加产品（日常操作）

1. 打开 https://dongxi.sanity.studio
2. 左侧点 "Product 产品" → 右上角 "New document"
3. 填写：名称、分类、图片（直接拖拽上传）、价格、描述
4. 点 "Publish" → 等约 1 分钟 → 网站自动更新
