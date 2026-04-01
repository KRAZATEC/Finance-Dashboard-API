# Deployment Guide: Finance Dashboard API

Follow these steps to deploy your API to a live environment (e.g., Render) and get your "Live Demo" and "API Documentation" URLs.

---

## 1. Prepare Your Repository (GitHub)

Render and other modern platforms deploy directly from **GitHub**. If your project isn't on GitHub yet, follow these steps:

1.  **Initialize Git** (if not already done):
    ```bash
    git init
    git add .
    git commit -m "Initial commit: API with Swagger documentation"
    ```
2.  **Create a New Repository** on [GitHub](https://github.com/new).
3.  **Push Your Code**:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git branch -M main
    git push -u origin main
    ```

---

## 2. Deploy to Render (Recommended)

[Render](https://render.com/) is a great, free-tier friendly platform for Node.js APIs.

1.  **Create a Render Account**: Sign up at [dashboard.render.com](https://dashboard.render.com/).
2.  **New Web Service**: Click **New +** and select **Web Service**.
3.  **Connect GitHub**: Find your repository in the list and click **Connect**.
4.  **Configure Settings**:
    *   **Name**: `finance-dashboard-api` (or your choice).
    *   **Environment**: `Node`.
    *   **Region**: Select the one closest to you.
    *   **Branch**: `main`.
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
5.  **Environment Variables**:
    Click **Advanced** > **Add Environment Variable**:
    *   `JWT_SECRET`: (Generate a long, random string).
    *   `NODE_ENV`: `production`
6.  **Deploy**: Click **Create Web Service**.

---

## 3. Verify Your Live API

Once Render stays "Live", you will see a URL like `https://finance-dashboard-api-xyz.onrender.com`.

### Test Your Documentation
Your interactive Swagger UI will be available at:
`https://finance-dashboard-api-xyz.onrender.com/api-docs`

### Update Your README
Go back to your [README.md](./README.md) and replace the placeholder URLs with your real Render URLs.

---

## Alternative: Railway

[Railway](https://railway.app/) is another excellent option:
1.  Connect your GitHub repo.
2.  It will automatically detect the Node.js environment.
3.  Add your `JWT_SECRET` in the **Variables** tab.
4.  It will provide a public URL once the build finishes.
