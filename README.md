# Live2D 看板娘 · 用户脚本

给 [脚本猫](https://scriptcat.org/) / [篡改猴](https://www.tampermonkey.net/) 用的看板娘脚本。

看板娘本体来自 [live2d-waifu](https://github.com/whyyy-404/live2d-waifu) 库，
模型数据来自 [live2d-models](https://github.com/whyyy-404/live2d-models)。
**本仓库不复制库的任何代码**，只通过 `@require` 引用。

---

## 两个版本

| 脚本 | 说明 | 大小 |
|---|---|---|
| **live2d-lite.user.js** | 只引用库，没有任何增强功能 | ~5 KB |
| **live2d-waifu.user.js** | 完整版：配置面板 / 健康提醒 / 待办 / 天气 / 自定义台词 | 开发中 |

两个脚本**互相独立**，装哪个用哪个。

### 轻量版

把库加载起来，剩下全部交给库：

- 换角色 / 换皮肤
- 拖拽吸附 + 位置记忆
- 拍照
- 悬停隐藏
- 工具栏 8 个按钮（库默认）

### 完整版

在库的基础上增加：

- **配置面板**（图形化设置，GM 存储跨网站同步）
- **健康提醒**（喝水 / 休息 / 坐姿 / 睡觉）
- **待办提醒**
- **天气查询**
- **自定义台词**（支持 `{nickname}`）
- 工具栏 10 个按钮（首页 / 一言 / 天气 / 换角色 / 换皮肤 / 拍照 / 待办 / 设置 / 赞赏 / 关闭）

---

## 安装

### 脚本猫

打开脚本猫管理面板 → 新建脚本 → 粘贴对应脚本内容 → `Ctrl + S`

### 篡改猴

把 `.user.js` 文件拖到浏览器窗口，或在管理面板里新建后粘贴。

---

## 目录

```
live2d-script/
├── live2d-lite.user.js    轻量版
├── live2d-waifu.user.js   完整版
├── README.md
└── LICENSE
```

---

## 依赖

| 依赖 | 说明 |
|---|---|
| **jQuery 3.3.1** | 库的上游实现与引擎内部都依赖它 |
| **element-ui icons** | 工具栏图标字体 |
| **live2d-waifu** | 看板娘库（`@require`，跟随 `@main`） |
| **live2d-models** | 模型数据（运行时 fetch `models.json`） |
| 脚本管理器 | 脚本猫 / Tampermonkey，提供 `GM_setValue` 等能力 |

详见库的 [关于 jQuery](https://github.com/whyyy-404/live2d-waifu#关于-jquery)。

---

## 关于版本号

脚本里的 `@require` 用的是 `@main`，即永远跟随库的最新提交。

好处是改库之后脚本自动受益，不用每次改版本号。
代价是 jsDelivr 对分支引用有最长约 12 小时的缓存。

---

## 致谢

**上游项目**

- [fghrsh/live2d_demo](https://github.com/fghrsh/live2d_demo)（GPL-2.0）—— 库与脚本的共同源头
- [fghrsh/live2d_api](https://github.com/fghrsh/live2d_api) —— 模型数据与接口语义
- [Live2D Inc.](https://www.live2d.com/) —— Cubism 2 SDK

**参考项目**

| 项目 | 借鉴了什么 |
|---|---|
| [stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget) | 工具栏按钮的模块化组织、按需加载 |
| [summerscar/live2dDemo](https://github.com/summerscar/live2dDemo) | 多模型切换流程 |

**CDN 与接口服务**

| 服务 | 用途 |
|---|---|
| [jsDelivr](https://www.jsdelivr.com/) | 免费 CDN，加载库与模型仓库 |
| [GitHub](https://github.com/) | 代码托管 |
| [脚本猫](https://scriptcat.org/) / [Tampermonkey](https://www.tampermonkey.net/) | 脚本运行环境 |
| [一言 Hitokoto](https://hitokoto.cn/) | 一言接口 |
| [今日诗词](https://www.jinrishici.com/) | 古诗词接口 |

**模型版权**

模型素材版权归各自作者所有，详见
[live2d-models 的说明](https://github.com/whyyy-404/live2d-models#著作权)。

---

## 许可

GPL-2.0，详见 [LICENSE](./LICENSE)。
