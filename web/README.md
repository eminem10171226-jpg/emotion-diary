# AI Emotion Diary - Web 版

与桌面/Kivy 版共用同一套 `ai_client.py` 和 `models.py`（以及同一个 `emotion_diary.db`），仅多一个网页界面。

## 运行方式

在**项目根目录**（`PYTHON_Project`）下执行：

```bash
# 安装网页版依赖（若尚未安装）
pip install -r web/requirements.txt

# 启动（会占用 5000 端口）
python web/app.py
```

浏览器打开：**http://127.0.0.1:5000**

## 功能

- 写日记、选人格、选语言（Auto/中文/English）
- 点击「Analyze my emotion」调用火山方舟分析并保存
- History 查看历史记录
- Trends 查看最近 7 天情绪折线图与 14 天高频关键词

API Key 与 Kivy 版相同，使用项目根目录的 `.env` 或环境变量 `ARK_API_KEY`。

---

## 手机端 Chrome 打不开时怎么办

电脑上能打开 `http://127.0.0.1:5000`，但手机用 Chrome 访问不到，多半是**网络/防火墙**导致。可以用下面几种方式之一。

### 办法一：内网穿透（推荐，几分钟搞定）

在电脑上把本机 5000 端口暴露成一个 **公网 HTTPS 地址**，手机用流量或任意 WiFi 都能打开，且支持 PWA「添加到主屏幕」。

**1. 用 ngrok（需注册一个免费账号）**

- 下载：https://ngrok.com/download  
- 解压后，在项目根目录打开终端：

```bash
# 先启动网页（保持运行）
python web/app.py
```

- 再开一个终端，运行（把 YOUR_TOKEN 换成 ngrok 官网给你的 token）：

```bash
ngrok config add-authtoken YOUR_TOKEN
ngrok http 5000
```

- 终端里会显示一行 **https://xxxx.ngrok-free.app**，用手机 Chrome 打开这个地址即可。

**2. 用 Cloudflare Tunnel（无需账号即可试用）**

- 下载 cloudflared：https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/  
- 终端执行：

```bash
cloudflared tunnel --url http://127.0.0.1:5000
```

- 会给出一个 `https://xxx.trycloudflare.com` 的链接，手机打开即可。

### 办法二：部署到公网（长期可用，固定网址）

把 Web 版部署到免费云服务，会得到一个**固定网址**（如 `https://emotion-diary.onrender.com`），手机、电脑随时可访问，不用开着自家电脑，也不用临时隧道。

下面以 **Render** 为例（免费、步骤少）；用 **Railway** 或 **PythonAnywhere** 也可以，思路类似。

---

#### 用 Render 部署（推荐）

1. **把项目放到 GitHub**  
   - 在 GitHub 新建一个仓库，把当前项目（含 `web/`、`ai_client.py`、`models.py` 等）推上去。  
   - 不要提交 `.env`（把 `.env` 写在 `.gitignore` 里），API Key 用环境变量配置。

2. **在 Render 创建 Web Service**  
   - 打开 https://render.com ，用 GitHub 登录。  
   - 点击 **New → Web Service**，选中你刚推送的仓库。  
   - 按下面填写（其余可默认）：

   | 项 | 填什么 |
   |----|--------|
   | **Root Directory** | 留空（用仓库根目录） |
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r web/requirements.txt` |
   | **Start Command** | `python web/app.py` |

3. **配置环境变量**  
   - 在同一个页面找到 **Environment**，添加变量：  
     - **Key**：`ARK_API_KEY`  
     - **Value**：你的火山方舟 API Key（和本地 `.env` 里的一样）。  
   - 保存。

4. **部署**  
   - 点 **Create Web Service**，等几分钟。  
   - 完成后会给你一个固定地址，例如：  
     `https://emotion-diary-xxxx.onrender.com`  
   - 用手机 Chrome 打开这个链接即可长期使用；也可以「添加到主屏幕」当 PWA 用。

**说明：**  
- Render 免费版在一段时间无访问后会让服务休眠，下次打开时可能要等几十秒唤醒，属正常。  
- 数据默认存在服务器上的 SQLite 里；若以后重建/换机，数据可能丢失，重要记录可定期在本地备份或以后改用云数据库。

---

#### 其他选择

- **Railway**：https://railway.app — 连接 GitHub 后新建项目，Root 选仓库根目录，Build 填 `pip install -r web/requirements.txt`，Start 填 `python web/app.py`，在 Variables 里加 `ARK_API_KEY`，部署后得到 `https://xxx.railway.app`。  
- **PythonAnywhere**：https://www.pythonanywhere.com — 免费版可部署 Flask，手动上传代码或从 GitHub 拉取，配置 WSGI 和虚拟环境后即可得到固定网址。

### 办法三：同 WiFi 下用电脑 IP 访问

手机和电脑在**同一 WiFi** 时，可先试「电脑 IP:5000」：

1. 电脑上查本机 IP（PowerShell 执行 `ipconfig`，看「IPv4 地址」，例如 `192.168.1.100`）。
2. 手机 Chrome 打开：`http://192.168.1.100:5000`。

若打不开：

- **Windows 防火墙**：允许 Python 或端口 5000 入站。  
  设置 → 隐私和安全性 → Windows 安全中心 → 防火墙和网络保护 → 高级设置 → 入站规则 → 新建规则 → 端口 → TCP 5000 → 允许连接。
- 部分路由器会「隔离」设备，手机无法访问电脑，这种情况只能用**办法一**或**办法二**。

---

## PWA：添加到主屏幕（方式 1）

本网页版支持 **PWA**，可在手机上「添加到主屏幕」当 App 使用，无需打包 APK。

### 条件

- 手机和电脑需在同一局域网（或用内网穿透/ngrok 暴露本机 5000 端口）。
- 访问地址需为 **HTTPS** 或 **localhost**，Chrome 才允许「安装」。  
  - 本机调试：手机用 `http://电脑IP:5000` 可打开，但「添加到主屏幕」可能受限于 HTTP，建议用 ngrok 等提供 HTTPS 再安装。

### 安卓步骤（Chrome）

1. 用 Chrome 打开网站（例如 `https://你的域名或ngrok地址`）。
2. 点右上角 **⋮** → **「添加到主屏幕」** 或 **「安装应用」**。
3. 确认后，主屏幕会出现「EmotionDiary」图标，点开即全屏应用形式打开。

### 图标

- 已提供 `web/static/icon.svg`，用作标签页图标和 Apple 设备主屏幕图标。
- 如需在安卓上显示更好看的安装图标，可自行添加：
  - `web/static/icon-192.png`（192×192）
  - `web/static/icon-512.png`（512×512）  
  并在 `web/static/manifest.json` 中已预留引用。
