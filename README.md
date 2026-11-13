# PoseAtlas · 角色姿势资产库

一个纯静态的中文（可切换英文）角色参考资产索引：**288 组姿势 × 5 视角（线稿 / 灰模·深度图一一对应）**、**2,727 套衣装**（写实 1,407 + 二次元 1,320）、**1,499 张人像**，每一项都能一键复制中英文生图 prompt。

> **本站不托管、不转存、不批量抓取原站图片。** 列表按滚动加载原站官方缩略图；打开详情时从原站加载这一张原图预览。请勿批量下载。

---

## 1. 本地打开

不需要安装任何东西，也没有构建步骤。

- **直接双击** `index.html`（Chrome / Edge / Firefox / Safari 均可）。数据以 `<script>` 方式加载，`file://` 下也能用。
- 或者用任意静态服务器：

```bash
cd pose-atlas-site
python3 -m http.server 8080      # 然后打开 http://localhost:8080
# 或：npx serve .
```

## 2. 部署

站点根目录就是本文件夹，没有构建命令、没有输出目录。

### Cloudflare Pages

**方式 A：直接上传（最快）**
1. Cloudflare 控制台 → Workers & Pages → Create → Pages → *Upload assets*。
2. 项目名随意，把整个 `pose-atlas-site` 文件夹拖进去 → Deploy。

**方式 B：命令行**
```bash
npx wrangler pages deploy . --project-name pose-atlas
```

**方式 C：连 Git 仓库**
把本文件夹推到你的 GitHub 仓库 → Pages → Connect to Git →
Framework preset 选 *None*，Build command 留空，Build output directory 填 `/`（若站点在子目录就填子目录名）。

`_headers` 会被 Cloudflare Pages 自动识别：设置了缓存与内容安全策略。CSP 的 `img-src` 仅允许本站资源以及原站（线稿 / 深度 / 衣装 / 人像）域名，用于列表官方缩略图和详情原图预览。

### GitHub Pages

1. 把本文件夹内容推到一个仓库（根目录或 `docs/`）。
2. 仓库 Settings → Pages → Source 选 *Deploy from a branch*，分支 `main`，目录 `/ (root)` 或 `/docs`。
3. 稍等即可访问 `https://<用户名>.github.io/<仓库名>/`。已附 `.nojekyll`，所有路径均为相对路径，子路径部署无问题。

## 3. 功能

| 功能 | 说明 |
|---|---|
| 三个图库 | 姿势 / 衣装（写实、二次元两套）/ 人像，顶部标签切换，标签上显示条数 |
| 线稿 ⇄ 灰模 ⇄ 对照 | 列表与详情均显示原站预览（列表用官方缩略图，详情用原图，均不转存）；姿势页可切换图类型与视角 |
| 视角 | 正面 / 斜侧 / 侧面 / 俯视 / 仰视；卡片右下角圆点显示该姿势有哪些视角（原站缺失的视角为空心） |
| 搜索 | 即时搜索（中 / 英 / 日 / ID / 分类 / 英文关键词，空格分词 AND），按 `/` 聚焦 |
| 筛选 | 姿势：体系、分类（随体系联动）；衣装：图库、分类、22 种颜色；人像：分区、发长、51 种发型 |
| Prompt | 每项都有中文 / 英文 prompt，卡片上直接复制，详情里可看全文；复制有按钮态 + toast 反馈；`file://` 下自动回退到兼容复制 |
| 组合配方 | 人像 + 衣装 + 姿势（线稿或深度、任一视角）+ 12 种画风预设 → 一条多参考图 prompt，并按图号列出要上传的原站单图链接 |
| 收藏 | ☆ 收藏任意条目，存于浏览器本地（localStorage） |
| 18+ 过滤 | 默认隐藏成人向条目；开启需确认年满 18 岁；成人向条目有醒目的 18+ 标记 |
| 深链接 | `#poses/pose:full_sexy_P001` 这样的地址可直接打开某条详情 |
| 键盘 | 详情里 ← → 切视角，↑ ↓ 上/下一条，Esc 关闭 |
| 响应式 / 中英界面 | 手机、平板、桌面；右上角切换中文 / English |

## 4. 数据与数量

| 数据 | 数量 | 文件 |
|---|---|---|
| 姿势组 | 288（全身性感 80 / 全身标准 73 / 上半身 80 / 双人 55），26 个分类 | `data/poses.js` |
| 视角 | 5；线稿 1,439 张、深度 1,439 张（原站 `full_sexy_P018` 缺仰视） | `data/poses.js` |
| 衣装·写实 COSTUME-DB-01 | 1,407（8 类） | `data/costumes.js` |
| 衣装·二次元 COSTUME-ANIME-DB | 1,320（8 类） | `data/costumes.js` |
| 人像 | 1,499（脸部 893 / 造型 606，4 种发长，51 种发型） | `data/portraits.js` |
| Prompt | 7,104 个可选组合 × 中英 = **14,208 条**（姿势 1,439×2 种图×2 语，衣装 2,727×2，人像 1,499×2） | 由 `assets/js/prompts.js` 按元数据生成 |
| 18+ 标记 | 姿势 190 组、衣装 675 套 | 同上 |

需要 prompt 文本文件时：`node scripts/export_prompts.mjs` → `exports/prompts.csv`（只有文字，无图片）。

### Prompt 是怎么来的

- 姿势：体系（全身 / 上半身 / 双人）→ 构图；视角 → 镜头描述；姿势名 + 分类（中英文名来自 RuiC-PoseAtlas，日文原名来自原站）；线稿或深度决定「参考图类型」。没有虚构任何姿势名。
- 衣装：英文部分直接使用原站每套衣装的英文关键词；中文名与标签来自 anhao/ai-pose-gallery-zh。
- 人像：分区 + 发长 + 发型名（日文原名来自原站，中文来自 anhao/ai-pose-gallery-zh，英文为本站翻译）。
- 句式与 12 种画风预设参考 anhao/ai-pose-gallery-zh 中 `buildRecipePrompt` / `STYLE_PRESETS`（MIT 代码）。

### 重新生成数据

```bash
# 只拉文字元数据（跳过图片）
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/HRuiCcc/RuiC-PoseAtlas ../src/RuiC-PoseAtlas
cd ../src/RuiC-PoseAtlas && git sparse-checkout set --no-cone '/data/' && git checkout && cd -
# anhao/ai-pose-gallery-zh 同理，只要 data/
# 原站清单：各站 index.html 里内嵌的 const D=[...]（每站 1 次页面请求），人像站为 /data/images.js
python3 scripts/build_data.py ../src
```

脚本会断言线稿站与深度站的 ID 完全一致、每个姿势名与原站日文名一致。

## 5. 来源与授权

### 原站（图片版权方）

| 站点 | 作者 | 授权要点 |
|---|---|---|
| [POSE-DB-01 线稿](https://ai-pose-gallery.pages.dev/) | ギア [@giaaibusi](https://x.com/giaaibusi) | 见下 |
| [POSE-DB-02 深度图](https://ai-pose-depth-gallery.pages.dev/) | ギア | 见下 |
| [COSTUME-DB-01](https://ai-costume-gallery.pages.dev/) | ギア | 见下 |
| [COSTUME-ANIME-DB](https://ai-costume-anime-gallery.pages.dev/) | ギア | 见下 |
| [AIモデル顔データベース](https://ai-portrait-gallery.pages.dev/) | あぎ [@agi_aibusi](https://x.com/agi_aibusi) | CC0 1.0；作者请求勿再分发、转载图片本身；不得冒充真实人物 |

ギア 各站的利用规约（2026-11 核对原文）：

- 免费使用，**允许作为参考用于创作（含商用、编辑、参考利用）**；署名可选。
- **禁止**对图片数据本身（含原尺寸与加工后）**再分发、转载、转售**。
- **禁止批量下载**（含用工具自动抓取），以及对所得图片的再分发、转载、销售；生成时逐张参考使用不受影响。深度图站点在页首再次强调此条。
- 不得用于表现真实人物或未成年人，或违反公序良俗的用途。

### 本站怎么遵守

- 仓库与站点内 **0 张原站图片**；不使用 `<img>` 热链接，CSP 也禁止外链图片。
- 只用链接把用户带到原站：「原站单图」打开原站服务器上的那一张图（例：`https://ai-pose-depth-gallery.pages.dev/img/full_sexy_P001_front.png`），「打开原站并复制 ID」打开原站首页并复制 ID 供其搜索框定位。
- 构建数据时只读文字元数据（每个原站一次页面请求），没有下载任何图片。
- 原站是单页应用，**没有逐条详情页**，所以无法链到「某条姿势的页面」；单图链接是能直达的最细粒度。人像站支持 `#sec=styling&hair=ロング` 这类筛选链接，本站直接使用。

### 元数据仓库

| 仓库 | 授权 | 用途 |
|---|---|---|
| [HRuiCcc/RuiC-PoseAtlas](https://github.com/HRuiCcc/RuiC-PoseAtlas) | MIT | 姿势中/英/日名、分类英文名、衣装颜色/类别、人像分区与发长 |
| [anhao/ai-pose-gallery-zh](https://github.com/anhao/ai-pose-gallery-zh) | MIT（仅代码；其 LICENSE 声明图片和原始数据归原作者） | 衣装中文名与标签、人像发型中文名、prompt 句式与画风预设 |
| [Brilliant666/ai-pose-depth-gallery-cn](https://github.com/Brilliant666/ai-pose-depth-gallery-cn) | MIT | 核对深度站 288 组 / 1,439 张 |
| [fairyliuying/ai-pose-depth-gallery-zh](https://github.com/fairyliuying/ai-pose-depth-gallery-zh) | — | 核对 |
| [GodAI-Master/ai-reference-atlas-zh](https://github.com/GodAI-Master/ai-reference-atlas-zh)、[mugicha-AI/ComfyUI-PoseAtlas](https://github.com/mugicha-AI/ComfyUI-PoseAtlas) | — | 参考，未取数据 |

本站代码：MIT（见 `LICENSE`）。**图片版权归原作者，不随 MIT 授权。**

## 6. 已知缺口

- 原站本身缺 `full_sexy_P018_low`（线稿与深度都没有），所以是 1,439 而不是 1,440。
- 原站没有逐条详情页 URL，「在原站查看」只能做到单图链接 + 复制 ID 搜索。
- 人像英文发型名是本站翻译。
- 未收录其他作者的扩展衣装库：Shisei（wquguru，CC0，57 套历史服饰）、CharaDB（たき，440 套二次元服装）。

## 7. 文件结构

```
pose-atlas-site/
├── index.html              # 入口（双击即可）
├── assets/
│   ├── css/app.css         # 深色主题、响应式
│   ├── js/app.js           # 路由、搜索、筛选、卡片、详情、配方、收藏、18+
│   ├── js/prompts.js       # prompt 模板 + 原站链接（浏览器 / Node 通用）
│   ├── js/i18n.js          # 界面中英文案
│   └── favicon.svg
├── data/                   # 由 scripts/build_data.py 生成，纯文字
│   ├── poses.js  costumes.js  portraits.js  meta.js
├── scripts/
│   ├── build_data.py       # 从元数据源生成 data/*.js
│   ├── export_prompts.mjs  # 导出全部 prompt 为 CSV
│   └── portrait-style-en.json
├── _headers  .nojekyll  404.html  robots.txt  LICENSE  README.md
```
