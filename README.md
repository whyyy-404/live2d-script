# Live2D 看板娘 · 用户脚本

给 [脚本猫](https://scriptcat.org/) / [篡改猴](https://www.tampermonkey.net/) 用的看板娘脚本。

> **状态：尚未开始编写。**
>
> 本仓库先占位，等库（[live2d-waifu](https://github.com/whyyy-404/live2d-waifu)）稳定后再写。

---

## 规划

脚本会复用库的资源，而不是把样式和逻辑再抄一遍：

```
live2d-script/
└── live2d-waifu.user.js        用户脚本
        ↓ 引用
   live2d-waifu/assets/         库：引擎 / 逻辑 / 样式 / 静态 API
   live2d-models/               模型数据
```

好处：**改库 → 脚本用户和博客用户同时受益**，不用改两遍。

---

## 计划中的功能

| 功能 | 说明 |
|---|---|
| 看板娘本体 | 直接引用库，不重复实现 |
| 自定义台词 | 配置面板里改，存 GM 存储 |
| 健康提醒 | 喝水 / 休息 / 坐姿 / 睡觉 |
| 待办提醒 | 指定时间或按间隔 |
| 天气查询 | 按省市查询 |
| 每日一言 | 一键获取 |
| 配置面板 | 图形化设置，**跨网站同步**（用库的 storage 钩子换成 GM 存储） |

---

### 为什么面板放在脚本里，而不是库里

库的使用者是**站长**——改一行配置就行，不需要给访客一个面板。

脚本的使用者是**每个访客**——他们改不了代码，只能点鼠标，而且配置要跨网站保留。
这需要 `GM_setValue` 这类脚本管理器能力，库本身没有。

所以职责是分开的：

```
库   →  43 个配置项，改代码即可
脚本 →  配置面板 + GM 存储持久化
```

面板的 UI 会尽量和库的视觉保持一致，但**不会把面板塞进库**——
否则每个引用库的站长都会被强加一个用不上的设置按钮。

---

## 与库的关系

本仓库**不复制**库的任何代码。脚本启动时按顺序加载：

```
1. jQuery                                  库依赖，见下
2. live2d-waifu/assets/live2d.js            引擎
3. live2d-waifu/assets/live2d-static-api.js 静态模型 API
4. live2d-waifu/assets/waifu-tips.js        控制逻辑
5. live2d-waifu/assets/waifu.css            样式
```

模型数据来自 [live2d-models](https://github.com/whyyy-404/live2d-models) 的 `models.json`。

**改库 = 脚本自动受益**，不用改两遍。

---

## 依赖

| 依赖 | 说明 |
|---|---|
| **jQuery 3.3.1** | 库的上游（fghrsh 实现）与引擎内部都用 jQuery，脚本里同样需要 |
| **element-ui icons** | 工具栏图标字体 |
| 脚本管理器 | 脚本猫 / Tampermonkey，提供 `GM_setValue` 等能力 |

详见库的 [关于 jQuery](https://github.com/whyyy-404/live2d-waifu#关于-jquery) 说明。

---

## 致谢

**上游项目**

- [fghrsh/live2d_demo](https://github.com/fghrsh/live2d_demo)（GPL-2.0）—— 库与脚本的共同源头
- [fghrsh/live2d_api](https://github.com/fghrsh/live2d_api) —— 模型数据与接口语义
- [Live2D Inc.](https://www.live2d.com/) —— Cubism 2 SDK

**参考项目**

本脚本的增强功能（健康提醒、待办、天气、配置面板）在设计时参考了这些项目：

| 项目 | 借鉴了什么 |
|---|---|
| [stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget) | 工具栏按钮的模块化组织方式、按需加载 |
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
