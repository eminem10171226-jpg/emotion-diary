## AI 情绪日记（Python + Kivy）

这是一个简化版、可以直接在 Windows 上运行的 “AI 情绪日记” 应用：

- 使用 **Python + Kivy** 做图形界面。
- 使用你提供的 **火山方舟 Ark chat/completions 接口** 分析日记情绪。
- 本地使用 **SQLite** 保存日记和分析结果。
- 展示：
  - 写日记并分析情绪。
  - 查看历史日记。
  - 最近 7 天的情绪趋势折线图 + 最近 14 天高频关键词。
- 可以在顶部通过下拉选择 AI 的人格。

---

### 1. 先确认文件是否存在

请在 `cmd` 中执行下面命令，进入项目目录并列出文件：

```bash
cd C:\Users\emine\Desktop\PYTHON_Project
dir
```

你应该能看到至少这些文件：

- `main.py`
- `ai_client.py`
- `models.py`
- `requirements.txt`
- `README.md`

如果 `dir` 里看不到这些文件，请截图给我，我来帮你排查路径问题。

---

### 2. 安装依赖

在 `cmd` 中，确保当前目录是：

```bash
cd C:\Users\emine\Desktop\PYTHON_Project
```

然后执行：

```bash
pip install -r requirements.txt
```

> 如果你机器上有多个 Python 版本，`pip` 可能对应的是别的版本，可以改用：
>
> ```bash
> python -m pip install -r requirements.txt
> ```

---

### 3. 配置 Ark API Key（可先不改，默认用你给的）

现在的代码里，`ai_client.py` 默认用的是你给的这个密钥：

```text
cac93c9b-7e90-4b8c-808d-e0d528421a39
```

所以**可以先不配置 `.env` 就直接跑起来**，只是正式使用建议你换成自己的。

如果你以后要换成自己的密钥，可以新建一个 `.env` 文件，写入：

```text
ARK_API_KEY=你的真实密钥
```

---

### 4. 运行应用（最关键的一步）

仍然在项目目录下（确保 `dir` 能看到 `main.py`）：

```bash
cd C:\Users\emine\Desktop\PYTHON_Project
python main.py
```

注意几点：

- **一定要先 `cd` 到包含 `main.py` 的目录**，否则会出现 “找不到 main.py” 或 “无法打开” 的错误。
- 命令一定是 `python main.py`，不要写成 `py main` 或 `python .\AI情绪日记.py` 之类。

如果运行时 cmd 显示类似：

- `python: can't open file 'main.py': [Errno 2] No such file or directory`  
  说明当前目录下确实没有 `main.py`，请先用 `dir` 看看当前目录对不对。

---

### 5. 打开后如何使用

- 打开窗口后默认是“写日记”界面：
  - 上面下拉框可以选人格（温暖导师 / 理性教练 / 元气好友）。
  - 中间文本框里写内容（可以包含 emoji）。
  - 点击“分析我的情绪”，等待几秒。
  - 下方显示情绪、分数、总结、建议、音乐/食物推荐。
- 点击“历史”可以看之前写过的。
- 点击“趋势”可以看最近 7 天的情绪折线图 & 高频关键词。

---

### 6. 如果还是提示“找不到”怎么办？

请你按下面顺序操作，并把**命令和报错的整行文字**复制给我（或者截图）：

```bash
cd C:\Users\emine\Desktop\PYTHON_Project
dir
python main.py
```

我会根据你实际看到的输出，帮你精准排查是：

- 路径写错（比如 `Desktop` 拼写不对）。
- 当前目录不是你想要的目录。
- 文件名和大小写不一致（例如 `Main.py` / `main .py`）。
- 还是别的环境问题。 

