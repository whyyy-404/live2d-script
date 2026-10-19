// ==UserScript==
// @name         Live2D 看板娘
// @namespace    https://github.com/whyyy-404
// @version      2.0.0
// @description  Live2D 看板娘（2233娘，Potion Maker的Pio酱，Tia酱等等）+ 自定义台词 + 健康提醒 + 待办提醒 + 天气查询 + 每日一言 + 精美配置面板
// @author       yyy404
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      cdn.jsdelivr.net
// @connect      api.open-meteo.com
// @connect      geocoding-api.open-meteo.com
// @connect      t.weather.itboy.net
// @connect      v.api.aa1.cn
// @connect      v1.hitokoto.cn
// @require      https://cdn.jsdelivr.net/npm/jquery@3.3.1/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@main/assets/live2d.js
// @require      https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@main/assets/live2d-static-api.js
// @require      https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@main/assets/waifu-tips.js
// @license      GPL-2.0
// @run-at       document-end
// @icon         https://cdn.jsdelivr.net/gh/whyyy-404/live2d-models@main/model/Potion-Maker/Pio/textures/default-costume.png
// ==/UserScript==
 /*

    く__,.ヘヽ.　　　　/　,ー､ 〉
    　　　　　＼ ', !-─‐-i　/　/´
    　　　 　 ／｀ｰ'　　　 L/／｀ヽ､
    　　 　 /　 ／,　 /|　 ,　 ,　　　 ',
    　　　ｲ 　/ /-‐/　ｉ　L_ ﾊ ヽ!　 i
    　　　 ﾚ ﾍ 7ｲ｀ﾄ　 ﾚ'ｧ-ﾄ､!ハ|　 |
    　　　　 !,/7 '0'　　 ´0iソ| 　 |
    　　　　 |.从"　　_　　 ,,,, / |./ 　 |
    　　　　 ﾚ'| i＞.､,,__　_,.イ / 　.i 　|
    　　　　　 ﾚ'| | / k_７_/ﾚ'ヽ,　ﾊ.　|
    　　　　　　 | |/i 〈|/　 i　,.ﾍ |　i　|
    　　　　　　.|/ /　ｉ： 　 ﾍ!　　＼　|
    　　　 　 　 kヽ>､ﾊ 　 _,.ﾍ､ 　 /､!
    　　　　　　 !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
    　　　　　　 ﾚ'ヽL__|___i,___,ンﾚ|ノ
    　　　　　 　　　ﾄ-,/　|___./
    　　　　　 　　　'ｰ'　　!_,.
    */


(function() {
    'use strict';

    // ========== 自建资源地址 ==========
    // 库版本用 commit hash 锁定，避开 jsDelivr 对 @main 的长缓存。
    // 库更新后把 LIB_VER 换成新的 hash 即可。
    const LIB_VER = 'main';
    const LIB_BASE = 'https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@' + LIB_VER;
    const MODEL_BASE = 'https://cdn.jsdelivr.net/gh/whyyy-404/live2d-models@main';
    const MODEL_API = MODEL_BASE + '/api';   // 静态 API 的伪装前缀，由 live2d-static-api.js 拦截
    const TIPS_JSON = LIB_BASE + '/assets/waifu-tips.json';

    // ========== 默认配置 ==========
    const DEFAULT_CONFIG = {
        enabled: true,
        loadDelay: 1000,
        showLoadingTip: true,
        useBlacklist: true,
        blacklist: ['localhost', '127.0.0.1'],

        // 用户昵称
        nickname: '宝宝',

        // 看板娘设置（跨网站同步）
        waifu: {
            modelId: 1,
            // 每个角色各自记住自己穿第几套皮肤：{ "1": 5, "2": 30, ... }
            // ⚠️ 不能只存一个 modelTexturesId —— 换角色时会被覆盖，
            //    导致「给 Pio 挑了衣服，换一圈回来又变回原皮」。
            textures: {},
            dockSide: 'right' // 'left' 或 'right'，记住停靠位置
        },

        // 工具栏按钮显隐（key 对应图标，见 TOOLBAR_ICONS）
        toolbar: {
            house: true,
            hitokoto: true,
            sunny: true,
            user: true,
            magic: true,
            camera: true,
            todo: true,
            setting: true,
            donate: true,
            close: true,
            view: false,        // 悬停隐藏：默认不显示
            discover: false,    // 关于：默认不显示
        },

        // 天气设置
        weather: {
            province: '广东',
            city: '广州'
        },

        // 待办提醒设置
        todos: {
            enabled: true,
            list: []
        },

        customMessages: {
            welcome: {
                morning: ["早上好呀{nickname}！新的一天开始了~<i class=\"el-icon-sunrise-1\"></i>", "早安{nickname}！今天也要加油哦！<i class=\"el-icon-sunrise-1\"></i>", "美好的早晨，{nickname}要吃早餐哦~<i class=\"el-icon-sunrise-1\"></i>"],
                noon: ["{nickname}中午好！该吃午饭啦~<i class=\"el-icon-knife-fork\"></i>", "午餐时间到{nickname}！<i class=\"el-icon-knife-fork\"></i>", "{nickname}中午了，休息一下吧~<i class=\"el-icon-knife-fork\"></i>"],
                afternoon: ["{nickname}下午好！工作累了吗？<i class=\"el-icon-milk-tea\"></i>", "午后时光，{nickname}要不要休息一下？<i class=\"el-icon-milk-tea\"></i>", "{nickname}下午茶时间到~<i class=\"el-icon-milk-tea\"></i>"],
                evening: ["{nickname}晚上好！今天过得怎么样？<i class=\"el-icon-table-lamp\"></i>", "夜深了{nickname}，早点休息哦~<i class=\"el-icon-table-lamp\"></i>", "晚安{nickname}，做个好梦~<i class=\"el-icon-table-lamp\"></i>"],
                night: ["{nickname}这么晚还不睡吗？<i class=\"el-icon-moon\"></i>", "{nickname}熬夜对身体不好哦~<i class=\"el-icon-moon\"></i>", "夜猫子{nickname}，该睡觉啦！<i class=\"el-icon-moon\"></i>"]
            },
            idle: ["{nickname}在干嘛呢？", "{nickname}无聊了吗？", "{nickname}要不要聊聊天？", "{nickname}陪我玩会儿吧~"],
            click: ["不要戳我啦{nickname}！", "讨厌~{nickname}", "{nickname}再戳我就生气了！", "呜...好痒...{nickname}", "{nickname}你想干嘛？", "你看到我的小熊了吗？{nickname}", "再戳我可要报警了！", "110吗，这里有个变态一直在摸我(ó﹏ò｡)"],
        },

        healthReminders: {
            enabled: true,
            workingHours: { start: 9, end: 23 },
            water: {
                enabled: true,
                interval: 30,
                messages: ["{nickname}该喝水啦！<i class=\"el-icon-water-cup\"></i>", "{nickname}记得补充水分哦~<i class=\"el-icon-hot-water\"></i>", "{nickname}喝口水休息一下吧！<i class=\"el-icon-water-cup\"></i>", "水是生命之源~{nickname}<i class=\"el-icon-hot-water\"></i>"]
            },
            rest: {
                enabled: true,
                interval: 60,
                messages: ["{nickname}休息一下眼睛吧！<i class=\"el-icon-view\"></i>", "{nickname}站起来活动活动~<i class=\"el-icon-video-play\"></i>", "{nickname}工作一小时了，该休息啦！<i class=\"el-icon-video-play\"></i>", "眺望远方，放松眼睛~{nickname}<i class=\"el-icon-view\"></i>"]
            },
            posture: {
                enabled: true,
                interval: 45,
                messages: ["{nickname}注意坐姿哦！<i class=\"el-icon-user\"></i>", "{nickname}腰背挺直，保持好姿势~<i class=\"el-icon-user\"></i>", "{nickname}久坐伤身，站起来走走吧~<i class=\"el-icon-video-play\"></i>"]
            },
            sleep: {
                enabled: true,
                time: 23,
                messages: ["{nickname}已经很晚了，该睡觉了！<i class=\"el-icon-moon\"></i>", "{nickname}熬夜对身体不好哦~<i class=\"el-icon-moon\"></i>", "{nickname}早点休息，明天才有精神~<i class=\"el-icon-table-lamp\"></i>"]
            }
        }
    };

    let config = Object.assign({}, DEFAULT_CONFIG, GM_getValue('live2d_config', {}));
    let reminderSystem = null;
    let todoSystem = null;

    // 消息优先级系统
    let messageSystem = {
        isImportantMessageShowing: false,

        // 显示重要消息（一言、天气等）
        showImportant: function(text, timeout) {
            this.isImportantMessageShowing = true;
            if (typeof showMessage === 'function') {
                showMessage(text, timeout, true);
            }
            // 消息显示完毕后解除锁定
            setTimeout(() => {
                this.isImportantMessageShowing = false;
            }, timeout || 5000);
        },

        // 显示普通消息（鼠标悬停等）
        showNormal: function(text, timeout) {
            // 如果有重要消息正在显示，忽略普通消息
            if (this.isImportantMessageShowing) {
                return;
            }
            if (typeof showMessage === 'function') {
                showMessage(text, timeout);
            }
        }
    };

    function saveConfig() {
        GM_setValue('live2d_config', config);
        console.log('[Live2D] 配置已保存');
    }

    /* ---- 皮肤记忆：每个角色各自一份 ---- */

    /**
     * 读取某个角色记住的皮肤编号。
     * @param {number} modelId 角色 id
     * @returns {number} 皮肤编号，没记过则 0（原皮）
     */
    function getTexturesId(modelId) {
        const bag = config.waifu.textures || {};
        const v = parseInt(bag[String(modelId)], 10);
        return isNaN(v) || v < 0 ? 0 : v;
    }

    /**
     * 记住某个角色当前穿的皮肤。
     * @param {number} modelId  角色 id
     * @param {number} texturesId 皮肤编号
     */
    function setTexturesId(modelId, texturesId) {
        if (!config.waifu.textures) config.waifu.textures = {};
        config.waifu.textures[String(modelId)] = parseInt(texturesId, 10) || 0;
    }

    /**
     * 旧版数据迁移。
     *
     * 以前的配置只有 waifu.modelTexturesId（单一值），换角色时会被覆盖。
     * 现在改成 waifu.textures = { 角色id: 皮肤 } 。
     *
     * 迁移策略：把旧的那个单一值，认定为「当前这个角色」的皮肤。
     * 其他角色的历史无法恢复（因为早就被覆盖掉了），只能从原皮开始。
     */
    (function migrateTextures() {
        const w = config.waifu;
        if (w.modelTexturesId !== undefined) {
            const old = parseInt(w.modelTexturesId, 10) || 0;
            if (!w.textures) w.textures = {};
            // 只有当前角色没记过时才写入，避免覆盖新数据
            if (w.textures[String(w.modelId)] === undefined && old > 0) {
                w.textures[String(w.modelId)] = old;
                console.log('[Live2D] 已迁移旧皮肤记录: 角色 ' + w.modelId + ' → 第 ' + old + ' 套');
            }
            delete w.modelTexturesId;
            saveConfig();
        }
        if (!w.textures || typeof w.textures !== 'object') w.textures = {};
    })();

    function shouldLoad() {
        if (!config.enabled) return false;
        const hostname = window.location.hostname;
        if (config.useBlacklist) {
            return !config.blacklist.some(site => hostname.includes(site));
        }
        return true;
    }

    if (!shouldLoad()) {
        console.log('[Live2D] 已禁用或在黑名单中');
        return;
    }

    // 防止在 iframe 中运行
    if (window.self !== window.top) {
        console.log('[Live2D] 检测到 iframe 环境，跳过加载');
        return;
    }

    console.log('[Live2D] 看板娘增强版开始加载...');

    GM_registerMenuCommand('⚙ 看板娘设置', showConfigPanel);

    // ========== 引入 Element UI 样式 ==========
    const elementUILink = document.createElement('link');
    elementUILink.rel = 'stylesheet';
    elementUILink.href = 'https://unpkg.com/element-ui/lib/theme-chalk/index.css';
    document.head.appendChild(elementUILink);

    // ========== 样式 ==========
    GM_addStyle(`
        /* 看板娘基础样式 */
        .waifu {
            position: fixed;
            bottom: 0;
            right: 0;
            z-index: 999999 !important;
            font-size: 0;
            transform: translateY(3px);
            opacity: 0;
            transition: opacity 0.5s ease-in-out, transform 0.3s ease-in-out;
        }
        .waifu.loaded { opacity: 1; }
        .waifu:hover { transform: translateY(0); }

        .waifu-tips {
            opacity: 0;
            margin: -50px 20px;
            padding: 8px 14px;
            border: 1px solid rgb(211, 211, 211);
            border-radius: 12px;
            background-color: rgb(255, 255, 255);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            position: absolute;
            min-width: 80px !important;
            max-width: 250px !important;
            width: fit-content !important;
            height: auto !important;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.4;
            color: rgb(0, 0, 0);
            transition: opacity 0.3s ease-in-out, transform 0.3s;
            word-wrap: break-word;
            white-space: normal;
            display: inline-block;
            text-align: center;
        }

        /* 对话框小三角箭头 - 相对于看板娘固定位置 */
        .waifu-tips::before {
            content: "";
            position: absolute;
            width: 16px;
            height: 16px;
            bottom: -8px;
            right: 30px;
            transform: rotate(45deg);
            background-color: rgb(255, 255, 255);
            border-right: 1px solid rgb(211, 211, 211);
            border-bottom: 1px solid rgb(211, 211, 211);
        }

        /* 显示动画 */
        .waifu-tips.active {
            opacity: 1;
            transform: translateY(-5px);
        }

        .waifu-tool {
            display: none;
            color: #aaa;
            top: 5px;
            right: 10px;
            position: absolute;
            font-size: 14px;
        }
        .waifu:hover .waifu-tool { display: block; }
        .waifu-tool span {
            display: block;
            cursor: pointer;
            color: #5b6c7d;
            transition: 0.2s;
            margin: 5px 0;
            line-height: 20px;
        }
        .waifu-tool span:hover { color: #34495e; }

        /* 左侧工具栏样式 */
        .waifu-tool.left-side {
            left: 10px;
            right: auto;
        }

        .waifu #live2d { position: relative; }

        /* 加载动画 */
        .waifu-loading {
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        .waifu-loading svg {
            width: 60px;
            height: 60px;
        }
        .waifu-loading svg polyline {
            fill: none;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        .waifu-loading svg polyline#back {
            fill: none;
            stroke: #ff4d5033;
        }
        .waifu-loading svg polyline#front {
            fill: none;
            stroke: #ff4d4f;
            stroke-dasharray: 48, 144;
            stroke-dashoffset: 192;
            animation: dash_682 1.4s linear infinite;
        }
        @keyframes dash_682 {
            72.5% { opacity: 0; }
            to { stroke-dashoffset: 0; }
        }
        .waifu-loading-text {
            font-size: 12px;
            color: #ff4d4f;
            font-weight: bold;
            text-shadow: 0 0 5px rgba(255, 77, 79, 0.5);
        }

        @keyframes shake {
            2% { transform: translate(0.5px, -1.5px) rotate(-0.5deg); }
            4% { transform: translate(0.5px, 1.5px) rotate(1.5deg); }
            50% { transform: translate(-1.5px, 1.5px) rotate(0.5deg); }
            0%, 100% { transform: translate(0, 0) rotate(0); }
        }

        /* Element UI 图标样式调整 */
        .waifu-tool [class^="el-icon-"] {
            font-size: 16px;
        }

        /* 待办面板样式 */
        .todo-panel {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-height: 80vh;
            background: #FFFFFF;
            box-shadow: 0px 187px 75px rgba(0, 0, 0, 0.01), 0px 105px 63px rgba(0, 0, 0, 0.05), 0px 47px 47px rgba(0, 0, 0, 0.09), 0px 12px 26px rgba(0, 0, 0, 0.1);
            border-radius: 26px;
            z-index: 999999;
            overflow: hidden;
        }

        .todo-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 28px 20px;
            border-bottom: 1px solid #f0f0f0;
        }

        .todo-title {
            font-size: 20px;
            color: #1d1d1f;
            font-weight: 600;
            letter-spacing: -0.3px;
        }

        .todo-title i {
            margin-right: 8px;
            color: #0071e3;
        }

        .todo-close {
            cursor: pointer;
            font-size: 28px;
            color: #86868b;
            line-height: 1;
            transition: color 0.2s;
            font-weight: 300;
        }
        .todo-close:hover {
            color: #1d1d1f;
        }

        .todo-body {
            max-height: calc(80vh - 200px);
            overflow-y: auto;
            padding: 20px 28px;
        }

        .todo-body::-webkit-scrollbar {
            width: 6px;
        }
        .todo-body::-webkit-scrollbar-track {
            background: transparent;
        }
        .todo-body::-webkit-scrollbar-thumb {
            background: #d1d1d6;
            border-radius: 3px;
        }

        .todo-item {
            display: flex;
            align-items: flex-start;
            padding: 16px;
            margin-bottom: 12px;
            background: #f5f5f7;
            border-radius: 12px;
            transition: all 0.2s;
        }

        .todo-item:hover {
            background: #e8e8ed;
        }

        .todo-checkbox {
            width: 20px;
            height: 20px;
            min-width: 20px;
            border: 2px solid #d1d1d6;
            border-radius: 50%;
            margin-right: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .todo-checkbox:hover {
            border-color: #34c759;
        }

        .todo-content {
            flex: 1;
        }

        .todo-text {
            font-size: 14px;
            color: #1d1d1f;
            margin-bottom: 6px;
            font-weight: 500;
        }

        .todo-time {
            font-size: 12px;
            color: #86868b;
        }

        .todo-delete {
            cursor: pointer;
            color: #ff3b30;
            font-size: 18px;
            padding: 0 8px;
            transition: opacity 0.2s;
        }

        .todo-delete:hover {
            opacity: 0.7;
        }

        .todo-add-form {
            padding: 20px 28px;
            border-top: 1px solid #f0f0f0;
        }

        .todo-input-group {
            margin-bottom: 12px;
        }

        .todo-input-label {
            font-size: 13px;
            color: #1d1d1f;
            margin-bottom: 8px;
            display: block;
            font-weight: 500;
        }

        .todo-input {
            width: 100%;
            padding: 10px 12px;
            background: #f5f5f7;
            border: 1px solid transparent;
            border-radius: 8px;
            color: #1d1d1f;
            font-size: 14px;
            transition: all 0.2s;
            box-sizing: border-box;
        }

        .todo-input:focus {
            outline: none;
            background-color: #ffffff;
            border: 1px solid #0071e3;
            box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }

        .todo-input-row {
            display: flex;
            gap: 12px;
        }

        .todo-input-row .todo-input-group {
            flex: 1;
        }

        .todo-select {
            width: 100%;
            padding: 10px 12px;
            background: #f5f5f7;
            border: 1px solid transparent;
            border-radius: 8px;
            color: #1d1d1f;
            font-size: 14px;
            transition: all 0.2s;
            cursor: pointer;
        }

        .todo-select:focus {
            outline: none;
            background-color: #ffffff;
            border: 1px solid #0071e3;
            box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }

        .todo-add-btn {
            cursor: pointer;
            padding: 12px;
            width: 100%;
            background: linear-gradient(180deg, #0071e3 0%, #005bb5 100%);
            font-size: 14px;
            color: #ffffff;
            border: 0;
            border-radius: 12px;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0, 113, 227, 0.3);
            margin-top: 12px;
        }

        .todo-add-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 113, 227, 0.4);
        }

        .todo-add-btn:active {
            transform: translateY(0);
        }

        .todo-empty {
            text-align: center;
            padding: 40px 20px;
            color: #86868b;
            font-size: 14px;
        }

        /* 赞赏面板样式 */
        .donate-panel {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: auto;
            background: transparent;
            box-shadow: none;
            border-radius: 0;
            z-index: 999999;
            overflow: visible;
        }

        .donate-header {
            display: none;
        }

        .donate-title {
            display: none;
        }

        .donate-close {
            position: absolute;
            top: -15px;
            right: -15px;
            cursor: pointer;
            font-size: 32px;
            color: #ff4d4f;
            line-height: 1;
            transition: all 0.2s;
            font-weight: bold;
            background: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 10;
        }
        .donate-close:hover {
            color: #fff;
            background: #ff4d4f;
            transform: rotate(90deg);
        }

        .donate-body {
            padding: 0;
            text-align: center;
            background: transparent;
        }

        .donate-qrcode {
            width: auto;
            height: auto;
            margin: 0;
            display: block;
            background: transparent;
            border-radius: 0;
        }

        .donate-qrcode img {
            max-width: 100%;
            max-height: 100%;
            border-radius: 0;
            display: block;
        }

        .donate-message {
            margin-top: 20px;
            font-size: 16px;
            color: #1d1d1f;
            text-align: center;
            line-height: 1.6;
            font-weight: 500;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .donate-text {
            display: none;
        }

        .donate-tip {
            display: none;
        }

        .donate-upload {
            display: none;
        }

        .donate-upload input[type="file"] {
            display: none;
        }

        .donate-upload-label {
            display: none;
        }

        /* 配置面板样式 - 苹果风格简约设计 */
        .live2d-config-panel {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 480px;
            max-height: 85vh;
            background: #FFFFFF;
            box-shadow: 0px 187px 75px rgba(0, 0, 0, 0.01), 0px 105px 63px rgba(0, 0, 0, 0.05), 0px 47px 47px rgba(0, 0, 0, 0.09), 0px 12px 26px rgba(0, 0, 0, 0.1);
            border-radius: 26px;
            z-index: 999999;
            overflow: hidden;
        }

        .live2d-config-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 28px 20px;
            border-bottom: 1px solid #f0f0f0;
        }

        .live2d-config-title {
            font-size: 20px;
            color: #1d1d1f;
            font-weight: 600;
            letter-spacing: -0.3px;
        }

        .live2d-config-close {
            cursor: pointer;
            font-size: 28px;
            color: #86868b;
            line-height: 1;
            transition: color 0.2s;
            font-weight: 300;
        }
        .live2d-config-close:hover {
            color: #1d1d1f;
        }

        /* 标签页切换 */
        .config-tabs {
            display: flex;
            position: relative;
            background-color: #f5f5f7;
            margin: 20px 28px;
            padding: 4px;
            border-radius: 12px;
        }

        .config-tabs input[type="radio"] {
            display: none;
        }

        .config-tab {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            height: 36px;
            font-size: 13px;
            color: #1d1d1f;
            font-weight: 500;
            border-radius: 10px;
            cursor: pointer;
            transition: color 0.2s ease;
            z-index: 2;
        }

        .config-tabs input[type="radio"]:checked + label {
            color: #1d1d1f;
        }

        .config-tabs input[id="tab-basic"]:checked ~ .tab-glider {
            transform: translateX(0);
        }

        .config-tabs input[id="tab-weather"]:checked ~ .tab-glider {
            transform: translateX(100%);
        }

        .config-tabs input[id="tab-health"]:checked ~ .tab-glider {
            transform: translateX(200%);
        }

        .config-tabs input[id="tab-messages"]:checked ~ .tab-glider {
            transform: translateX(300%);
        }

        .config-tabs input[id="tab-todo"]:checked ~ .tab-glider {
            transform: translateX(400%);
        }

        .config-tabs input[id="tab-donate"]:checked ~ .tab-glider {
            transform: translateX(500%);
        }

        .tab-glider {
            position: absolute;
            display: flex;
            height: 36px;
            width: calc(16.666% - 3px);
            background-color: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            z-index: 1;
            border-radius: 10px;
            transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* 待办徽章样式 */
        .todo-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ff4d4f;
            color: white;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 18px;
            height: 18px;
            line-height: 14px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(255, 77, 79, 0.4);
        }

        .config-tab {
            position: relative;
        }

        .live2d-config-body {
            max-height: calc(85vh - 250px);
            overflow-y: auto;
            padding: 0 28px 20px;
        }

        .live2d-config-body::-webkit-scrollbar {
            width: 6px;
        }
        .live2d-config-body::-webkit-scrollbar-track {
            background: transparent;
        }
        .live2d-config-body::-webkit-scrollbar-thumb {
            background: #d1d1d6;
            border-radius: 3px;
        }

        .config-section {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .config-section.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .config-section-title {
            font-size: 15px;
            color: #1d1d1f;
            margin: 10px 0 8px;
            font-weight: 600;
        }

        .config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .config-item:last-child {
            border-bottom: none;
        }

        .config-label {
            font-size: 14px;
            color: #1d1d1f;
            flex: 1;
        }

        .config-desc {
            font-size: 12px;
            color: #1d1d1f;
            margin-top: 4px;
        }

        .config-input-number {
            width: 70px;
            height: 36px;
            padding: 0 12px;
            background: #f5f5f7;
            border: 1px solid transparent;
            border-radius: 8px;
            color: #1d1d1f;
            font-size: 14px;
            text-align: center;
            transition: all 0.2s;
        }

        .config-input-number:focus {
            outline: none;
            background-color: #ffffff;
            border: 1px solid #0071e3;
            box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }

        /* 开关按钮 - 苹果风格 */
        .switch {
            position: relative;
            width: 51px;
            height: 31px;
        }

        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #e5e5ea;
            transition: 0.3s;
            border-radius: 31px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 27px;
            width: 27px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .switch input:checked + .slider {
            background-color: #34c759;
        }

        .switch input:checked + .slider:before {
            transform: translateX(20px);
        }

        /* 保存按钮 */
        .config-button {
            cursor: pointer;
            padding: 14px;
            width: calc(100% - 56px);
            margin: 20px 28px;
            background: linear-gradient(180deg, #0071e3 0%, #005bb5 100%);
            font-size: 14px;
            color: #ffffff;
            border: 0;
            border-radius: 12px;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0, 113, 227, 0.3);
        }

        .config-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 113, 227, 0.4);
        }

        .config-button:active {
            transform: translateY(0);
        }

        /* 台词编辑区域 */
        .message-editor {
            margin-top: 4px;
        }

        .message-editor textarea {
            width: 100%;
            min-height: 90px;
            padding: 12px;
            background: #f5f5f7;
            border: 1px solid transparent;
            border-radius: 10px;
            color: #1d1d1f;
            font-size: 13px;
            resize: vertical;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5;
            transition: all 0.2s;
        }

        .message-editor textarea:focus {
            outline: none;
            background-color: #ffffff;
            border: 1px solid #0071e3;
            box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }

        .message-editor-label {
            font-size: 13px;
            color: #1d1d1f;
            margin-bottom: 8px;
            display: block;
            font-weight: 500;
        }

        .message-editor-hint {
            font-size: 11px;
            color: #86868b;
            margin-top: 6px;
        }

        /* 恢复默认按钮 */
        .reset-button {
            cursor: pointer;
            padding: 6px 14px;
            background: transparent;
            border: 1px solid #d1d1d6;
            border-radius: 8px;
            font-size: 12px;
            color: #86868b;
            transition: all 0.2s;
            font-weight: 500;
        }

        .reset-button:hover {
            background: #f5f5f7;
            border-color: #86868b;
            color: #1d1d1f;
        }

        .reset-button:active {
            transform: scale(0.98);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
    `);

    // ========== 更新待办徽章 ==========
    function updateTodoBadge() {
        const count = config.todos.list ? config.todos.list.length : 0;
        const badge = $('.todo-badge');

        if (count > 0) {
            if (badge.length === 0) {
                $('label[for="tab-todo"]').append(`<span class="todo-badge">${count}</span>`);
            } else {
                badge.text(count);
            }
        } else {
            badge.remove();
        }
    }

    // ========== 渲染配置面板中的待办列表 ==========
    function renderConfigTodoList() {
        const todoList = $('#configTodoList');
        todoList.empty();

        if (!config.todos.list || config.todos.list.length === 0) {
            todoList.html('<div class="todo-empty">暂无待办事项<br>点击下方添加吧~</div>');
            return;
        }

        config.todos.list.forEach((todo, index) => {
            const timeText = todo.type === 'time'
                ? `<i class="el-icon-alarm-clock"></i> ${todo.time}`
                : `<i class="el-icon-refresh"></i> 每${todo.interval}分钟`;

            const todoHtml = `
                <div class="todo-item" data-index="${index}">
                    <div class="todo-checkbox" data-index="${index}"></div>
                    <div class="todo-content">
                        <div class="todo-text">${todo.text}</div>
                        <div class="todo-time">${timeText}</div>
                    </div>
                    <div class="todo-delete" data-index="${index}">×</div>
                </div>
            `;
            todoList.append(todoHtml);
        });

        // 绑定完成事件
        $('#configTodoList .todo-checkbox').click((e) => {
            const index = $(e.target).data('index');
            if (todoSystem) {
                todoSystem.completeTodo(index);
                setTimeout(() => {
                    renderConfigTodoList();
                    updateTodoBadge();
                }, 1000);
            }
        });

        // 绑定删除事件
        $('#configTodoList .todo-delete').click((e) => {
            const index = $(e.target).data('index');
            if (todoSystem) {
                todoSystem.deleteTodo(index);
                renderConfigTodoList();
                updateTodoBadge();
            }
        });
    }

    // ========== 配置面板 ==========
    function showConfigPanel() {
        const panel = `
            <div class="live2d-config-panel" id="live2dConfigPanel">
                <div class="live2d-config-header">
                    <div class="live2d-config-title">看板娘设置</div>
                    <div class="live2d-config-close" id="live2dConfigClose">×</div>
                </div>

                <!-- 标签页切换 -->
                <div class="config-tabs">
                    <input type="radio" id="tab-basic" name="tabs" checked>
                    <label class="config-tab" for="tab-basic">基础</label>

                    <input type="radio" id="tab-waifu" name="tabs">
                    <label class="config-tab" for="tab-waifu">看板娘</label>

                    <input type="radio" id="tab-toolbar" name="tabs">
                    <label class="config-tab" for="tab-toolbar">工具栏</label>

                    <input type="radio" id="tab-weather" name="tabs">
                    <label class="config-tab" for="tab-weather">天气</label>

                    <input type="radio" id="tab-health" name="tabs">
                    <label class="config-tab" for="tab-health">健康</label>

                    <input type="radio" id="tab-messages" name="tabs">
                    <label class="config-tab" for="tab-messages">台词</label>

                    <input type="radio" id="tab-todo" name="tabs">
                    <label class="config-tab" for="tab-todo">
                        待办
                        <el-badge class="todo-badge" :value="todoCount" v-if="todoCount > 0"></el-badge>
                    </label>

                    <input type="radio" id="tab-donate" name="tabs">
                    <label class="config-tab" for="tab-donate">赞赏</label>

                    <div class="tab-glider"></div>
                </div>

                <div class="live2d-config-body">
                    <!-- 基础设置 -->
                    <div class="config-section active" data-tab="basic">
                        <div class="section-header">
                            <div class="config-section-title">基础设置</div>
                            <button class="reset-button" data-reset="basic">恢复默认</button>
                        </div>

                        <div class="config-item">
                            <div class="config-label">你的昵称</div>
                            <input type="text" class="config-input-number" id="cfg_nickname" value="${config.nickname}" placeholder="宝宝" style="width: 120px; text-align: left;">
                        </div>

                        <div class="config-desc" style="margin-top: -6px; margin-bottom: 4px;">
                            看板娘会用这个昵称称呼你哦~
                        </div>

                        <div class="config-item">
                            <div class="config-label">启用黑名单</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_useBlacklist" ${config.useBlacklist ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-desc" style="margin-bottom: 4px;">在黑名单中的网站不会显示看板娘</div>

                        <div class="message-editor">
                            <label class="message-editor-label">黑名单网站</label>
                            <textarea id="cfg_blacklist" placeholder="localhost&#10;127.0.0.1&#10;example.com" style="min-height: 55px;">${config.blacklist.join('\n')}</textarea>
                            <div class="message-editor-hint">每行一个域名或关键词</div>
                        </div>

                        <div style="margin-top: 4px;">
                            <button class="reset-button" id="addCurrentSite" style="width: 100%; padding: 8px;">添加当前网站到黑名单</button>
                        </div>

                        <div class="config-desc" style="margin-top: 4px;">
                            当前网站：<strong>${window.location.hostname}</strong>
                        </div>
                    </div>

                    <!-- 看板娘设置 -->
                    <div class="config-section" data-tab="waifu">
                        <div class="section-header">
                            <div class="config-section-title">看板娘设置</div>
                            <button class="reset-button" data-reset="waifu">恢复默认</button>
                        </div>

                        <div class="config-item">
                            <div class="config-label">当前角色</div>
                            <select class="config-input-number" id="cfg_modelId" style="width: 160px; text-align: left;">
                                <option value="1">1 · Pio（Potion Maker）</option>
                                <option value="2">2 · Tia（Potion Maker）</option>
                                <option value="3">3 · 22 娘（bilibili）</option>
                                <option value="4">4 · 33 娘（bilibili）</option>
                                <option value="5">5 · 雫（ShizukuTalk）</option>
                                <option value="6">6 · 海王星</option>
                                <option value="7">7 · 舰娘</option>
                            </select>
                        </div>

                        <div class="config-desc" style="margin-top: -6px; margin-bottom: 12px;">
                            每个角色会各自记住自己穿的皮肤，切换角色不会丢失
                        </div>

                        <div class="config-item">
                            <div class="config-label">当前皮肤</div>
                            <input type="number" class="config-input-number" id="cfg_modelTexturesId" min="0" value="0" style="width: 120px;">
                        </div>

                        <div class="config-desc" style="margin-top: -6px; margin-bottom: 12px;">
                            0 表示该角色的原皮。也可以在工具栏点魔法棒随机换
                        </div>

                        <div class="config-item">
                            <div class="config-label">停靠位置</div>
                            <select class="config-input-number" id="cfg_dockSide" style="width: 120px; text-align: left;">
                                <option value="right">右侧</option>
                                <option value="left">左侧</option>
                            </select>
                        </div>

                        <div class="config-desc" style="margin-top: -6px; margin-bottom: 12px;">
                            拖动看板娘松手后会自动吸附到最近的边缘
                        </div>

                        <div class="config-item">
                            <div class="config-label">加载延迟（毫秒）</div>
                            <input type="number" class="config-input-number" id="cfg_loadDelay" min="0" step="100" value="1000" style="width: 120px;">
                        </div>

                        <div class="config-desc" style="margin-top: -6px;">
                            页面打开后等这么久再加载看板娘，避免和页面抢资源
                        </div>
                    </div>

                    <!-- 工具栏设置 -->
                    <div class="config-section" data-tab="toolbar">
                        <div class="section-header">
                            <div class="config-section-title">工具栏按钮</div>
                            <button class="reset-button" data-reset="toolbar">恢复默认</button>
                        </div>

                        <div class="config-desc" style="margin-bottom: 16px;">
                            勾选显示、取消隐藏。改完需要刷新页面生效
                        </div>

                        <div class="config-item">
                            <div class="config-label">首页</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_house" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">一言</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_hitokoto" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">天气</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_sunny" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">换角色</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_user" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">换皮肤</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_magic" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">拍照</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_camera" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">待办</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_todo" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">设置</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_setting" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">赞赏</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_donate" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">关闭</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_close" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">悬停隐藏</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_view">
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-item">
                            <div class="config-label">关于</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_tool_discover">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 天气设置 -->
                    <div class="config-section" data-tab="weather">
                        <div class="section-header">
                            <div class="config-section-title">天气设置</div>
                            <button class="reset-button" data-reset="weather">恢复默认</button>
                        </div>

                        <div class="config-desc" style="margin-bottom: 16px;">
                            设置你所在的省份和城市，点击天气图标即可查看天气信息
                        </div>

                        <div class="config-item">
                            <div class="config-label">省份</div>
                            <input type="text" class="config-input-number" id="cfg_province" value="${config.weather.province}" placeholder="广东" style="width: 120px; text-align: left;">
                        </div>

                        <div class="config-desc" style="margin-top: -10px; margin-bottom: 12px;">
                            不用加"省"，如：广东、浙江、北京
                        </div>

                        <div class="config-item">
                            <div class="config-label">城市</div>
                            <input type="text" class="config-input-number" id="cfg_city" value="${config.weather.city}" placeholder="广州" style="width: 120px; text-align: left;">
                        </div>

                        <div class="config-desc" style="margin-top: -10px; margin-bottom: 12px;">
                            不用加"市"，如：广州、深圳、杭州
                        </div>

                        <div class="config-desc" style="color: #86868b; font-size: 11px; margin-top: 16px;">
                            <i class="el-icon-warning-outline"></i> 想要定制其他功能，可以联系 <a href="https://scriptcat.org/zh-CN/users/162063" target="_blank" style="color: #ff69b4; font-weight: 600; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; transition: all 0.2s;">yyy404</a>
                        </div>

                        <div style="margin-top: 20px; padding: 12px; background: #f5f5f7; border-radius: 10px;">
                            <div style="font-size: 13px; color: #1d1d1f; margin-bottom: 8px; font-weight: 500;">测试天气功能</div>
                            <button class="reset-button" id="testWeather" style="width: 100%; padding: 10px;">
                                <i class="el-icon-sunny"></i> 立即获取天气
                            </button>
                        </div>
                    </div>

                    <!-- 健康提醒 -->
                    <div class="config-section" data-tab="health">
                        <div class="section-header">
                            <div class="config-section-title">健康提醒</div>
                            <button class="reset-button" data-reset="health">恢复默认</button>
                        </div>

                        <div class="config-item">
                            <div class="config-label">启用健康提醒</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_healthEnabled" ${config.healthReminders.enabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="config-desc">提醒时间段：${config.healthReminders.workingHours.start}:00 - ${config.healthReminders.workingHours.end}:00</div>

                        <div class="config-section-title" style="margin-top: 20px;">喝水提醒</div>
                        <div class="config-item">
                            <div class="config-label">启用</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_waterEnabled" ${config.healthReminders.water.enabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="config-item">
                            <div class="config-label">间隔（分钟）</div>
                            <input type="number" class="config-input-number" id="cfg_waterInterval" value="${config.healthReminders.water.interval}" min="5" max="120" step="5">
                        </div>

                        <div class="config-section-title" style="margin-top: 20px;">休息提醒</div>
                        <div class="config-item">
                            <div class="config-label">启用</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_restEnabled" ${config.healthReminders.rest.enabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="config-item">
                            <div class="config-label">间隔（分钟）</div>
                            <input type="number" class="config-input-number" id="cfg_restInterval" value="${config.healthReminders.rest.interval}" min="5" max="120" step="5">
                        </div>

                        <div class="config-section-title" style="margin-top: 20px;">坐姿提醒</div>
                        <div class="config-item">
                            <div class="config-label">启用</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_postureEnabled" ${config.healthReminders.posture.enabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="config-item">
                            <div class="config-label">间隔（分钟）</div>
                            <input type="number" class="config-input-number" id="cfg_postureInterval" value="${config.healthReminders.posture.interval}" min="5" max="120" step="5">
                        </div>

                        <div class="config-section-title" style="margin-top: 20px;">睡觉提醒</div>
                        <div class="config-item">
                            <div class="config-label">启用</div>
                            <label class="switch">
                                <input type="checkbox" id="cfg_sleepEnabled" ${config.healthReminders.sleep.enabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="config-item">
                            <div class="config-label">提醒时间（小时）</div>
                            <input type="number" class="config-input-number" id="cfg_sleepTime" value="${config.healthReminders.sleep.time}" min="0" max="23" step="1">
                        </div>

                        <div class="config-section-title" style="margin-top: 24px;">自定义提醒台词</div>
                        <div class="config-desc" style="margin-bottom: 12px;">每行一句台词，随机显示。使用 <code style="background: #f5f5f7; padding: 2px 6px; border-radius: 4px; color: #ff69b4;">{nickname}</code> 可显示昵称</div>

                        <div class="message-editor">
                            <label class="message-editor-label">喝水提醒台词</label>
                            <textarea id="cfg_waterMessages" placeholder="该喝水啦！&#10;记得补充水分哦~&#10;喝口水休息一下吧！&#10;水是生命之源~">${config.healthReminders.water.messages.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">休息提醒台词</label>
                            <textarea id="cfg_restMessages" placeholder="休息一下眼睛吧！&#10;站起来活动活动~&#10;工作一小时了，该休息啦！&#10;眺望远方，放松眼睛~">${config.healthReminders.rest.messages.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">坐姿提醒台词</label>
                            <textarea id="cfg_postureMessages" placeholder="注意坐姿哦！&#10;腰背挺直，保持好姿势~&#10;久坐伤身，站起来走走吧~">${config.healthReminders.posture.messages.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">睡觉提醒台词</label>
                            <textarea id="cfg_sleepMessages" placeholder="已经很晚了，该睡觉了！&#10;熬夜对身体不好哦~&#10;早点休息，明天才有精神~">${config.healthReminders.sleep.messages.join('\n')}</textarea>
                        </div>
                    </div>

                    <!-- 自定义台词 -->
                    <div class="config-section" data-tab="messages">
                        <div class="section-header">
                            <div class="config-section-title">自定义台词</div>
                            <button class="reset-button" data-reset="messages">恢复默认</button>
                        </div>

                        <div class="config-desc" style="margin-bottom: 16px;">
                            每行一句台词，随机显示。使用 <code style="background: #f5f5f7; padding: 2px 6px; border-radius: 4px; color: #ff69b4;">{nickname}</code> 可显示昵称
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">点击回应</label>
                            <textarea id="cfg_clickMessages" placeholder="不要戳我啦{nickname}！&#10;讨厌~{nickname}&#10;{nickname}再戳我就生气了！&#10;呜...好痒...{nickname}&#10;{nickname}你想干嘛？&#10;你看到我的小熊了吗？{nickname}&#10;再戳我可要报警了！&#10;110吗，这里有个变态一直在摸我(ó﹏ò｡)">${config.customMessages.click.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">空闲对话</label>
                            <textarea id="cfg_idleMessages" placeholder="在干嘛呢？&#10;无聊了吗？&#10;要不要聊聊天？&#10;陪我玩会儿吧~">${config.customMessages.idle.join('\n')}</textarea>
                            <div class="message-editor-hint">1分钟无操作后有30%概率触发</div>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">早安问候（5-11点）</label>
                            <textarea id="cfg_morningMessages" placeholder="早上好呀！新的一天开始了~&#10;早安！今天也要加油哦！&#10;美好的早晨，要吃早餐哦~">${config.customMessages.welcome.morning.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">午安问候（11-13点）</label>
                            <textarea id="cfg_noonMessages" placeholder="中午好！该吃午饭啦~&#10;午餐时间到！&#10;中午了，休息一下吧~">${config.customMessages.welcome.noon.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">下午问候（13-18点）</label>
                            <textarea id="cfg_afternoonMessages" placeholder="下午好！工作累了吗？&#10;午后时光，要不要休息一下？&#10;下午茶时间到~">${config.customMessages.welcome.afternoon.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">晚安问候（18-22点）</label>
                            <textarea id="cfg_eveningMessages" placeholder="晚上好！今天过得怎么样？&#10;夜深了，早点休息哦~&#10;晚安，做个好梦~">${config.customMessages.welcome.evening.join('\n')}</textarea>
                        </div>

                        <div class="message-editor">
                            <label class="message-editor-label">深夜问候（22点后）</label>
                            <textarea id="cfg_nightMessages" placeholder="这么晚还不睡吗？&#10;熬夜对身体不好哦~&#10;夜猫子，该睡觉啦！">${config.customMessages.welcome.night.join('\n')}</textarea>
                        </div>
                    </div>

                    <!-- 待办事项 -->
                    <div class="config-section" data-tab="todo">
                        <div class="section-header">
                            <div class="config-section-title">我的待办</div>
                        </div>

                        <div class="todo-body" id="configTodoList" style="max-height: none; padding: 0; margin-bottom: 20px;"></div>

                        <div class="todo-add-form" style="padding: 0; border-top: none;">
                            <div class="todo-input-group">
                                <label class="todo-input-label">待办事项</label>
                                <input type="text" class="todo-input" id="configTodoText" placeholder="输入要做的事情...">
                            </div>
                            <div class="todo-input-row">
                                <div class="todo-input-group">
                                    <label class="todo-input-label">提醒类型</label>
                                    <select class="todo-select" id="configTodoType">
                                        <option value="time">指定时间</option>
                                        <option value="interval">间隔提醒</option>
                                    </select>
                                </div>
                                <div class="todo-input-group" id="configTodoTimeGroup">
                                    <label class="todo-input-label">提醒时间</label>
                                    <input type="time" class="todo-input" id="configTodoTime">
                                </div>
                                <div class="todo-input-group" id="configTodoIntervalGroup" style="display:none;">
                                    <label class="todo-input-label">间隔(分钟)</label>
                                    <input type="number" class="todo-input" id="configTodoInterval" min="1" value="30">
                                </div>
                            </div>
                            <button class="todo-add-btn" id="configTodoAddBtn"><i class="el-icon-plus"></i> 添加待办</button>
                        </div>
                    </div>

                    <!-- 赞赏设置 -->
                    <div class="config-section" data-tab="donate">
                        <div style="text-align: center; margin: 40px 0;">
                            <div style="display: flex; justify-content: center; align-items: flex-start; gap: 20px;">
                                <!-- 左边：爱与正义的化身 (280×250px) -->
                                <div style="text-align: center;margin-top: -50px;">
                                    <div style="width: 280px; height: 250px; display: flex; align-items: center; justify-content: center;">
                                        <img src="data:image/png;base64,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" alt="爱与正义的化身" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                                    </div>
                                    <div style="margin-top: 10px; font-size: 14px; color: #86868b;">爱与正义的化身</div>
                                </div>

                                <!-- 右边：赞赏码 (141×140px) -->
                                <div style="text-align: center;margin-top: 50px;">
                                    <div style="width: 141px; height: 140px; display: flex; align-items: center; justify-content: center;">
                                        <img src="data:image/jpeg;base64,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" alt="君子爱财取之有道" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                                    </div>
                                    <div style="margin-top: 10px; font-size: 14px; color: #86868b;">爱与正义</div>
                                </div>
                            </div>

                            <div style="margin-top: 20px; font-size: 16px; color: #1d1d1f; line-height: 1.6;">
                                可以请 <a href="https://scriptcat.org/zh-CN/users/162063" target="_blank" style="color: #ff69b4; font-weight: 600; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; transition: all 0.2s;">yyy404</a> 喝杯 <span style="color: #8B4513;">coffee</span> <i class="el-icon-coffee-cup" style="color: #8B4513;"></i> 吗？<br>
                                我都那么<span style="color: #ff69b4; font-weight: 600;">萌</span>了喵喵喵~
                            </div>
                        </div>
                    </div>
                </div>

                <button class="config-button" id="live2dConfigSave">保存设置</button>
            </div>
        `;

        $('#live2dConfigPanel').remove();
        $('body').append(panel);
        $('#live2dConfigPanel').fadeIn(300);

        // 更新待办徽章
        updateTodoBadge();

        // 标签页切换
        $('input[name="tabs"]').change(function() {
            const tabId = $(this).attr('id').replace('tab-', '');
            $('.config-section').removeClass('active');
            $(`.config-section[data-tab="${tabId}"]`).addClass('active');

            // 如果切换到待办标签，渲染待办列表
            if (tabId === 'todo') {
                if (todoSystem) {
                    renderConfigTodoList();
                }
            }

            // 如果切换到待办或赞赏标签，隐藏保存按钮
            if (tabId === 'todo' || tabId === 'donate') {
                $('#live2dConfigSave').hide();
            } else {
                $('#live2dConfigSave').show();
            }
        });

        // 待办类型切换
        $('#configTodoType').change(function() {
            if ($(this).val() === 'time') {
                $('#configTodoTimeGroup').show();
                $('#configTodoIntervalGroup').hide();
            } else {
                $('#configTodoTimeGroup').hide();
                $('#configTodoIntervalGroup').show();
            }
        });

        // 添加待办
        $('#configTodoAddBtn').click(function() {
            const text = $('#configTodoText').val().trim();
            const type = $('#configTodoType').val();

            if (!text) {
                if (typeof showMessage === 'function') {
                    showMessage('请输入待办事项', 2000);
                }
                return;
            }

            let value;
            if (type === 'time') {
                value = $('#configTodoTime').val();
                if (!value) {
                    if (typeof showMessage === 'function') {
                        showMessage('请选择提醒时间', 2000);
                    }
                    return;
                }
            } else {
                value = parseInt($('#configTodoInterval').val());
                if (!value || value < 1) {
                    if (typeof showMessage === 'function') {
                        showMessage('请输入有效的间隔时间', 2000);
                    }
                    return;
                }
            }

            if (todoSystem) {
                todoSystem.addTodo(text, type, value);
                $('#configTodoText').val('');
                $('#configTodoTime').val('');
                $('#configTodoInterval').val('30');
                renderConfigTodoList();
                updateTodoBadge();
            }
        });

        // 测试天气功能
        $('#testWeather').click(function() {
            // 临时更新配置
            config.weather.province = $('#cfg_province').val().trim() || '广东';
            config.weather.city = $('#cfg_city').val().trim() || '广州';

            // 关闭面板
            $('#live2dConfigPanel').fadeOut(300);

            // 延迟一下再调用天气功能
            setTimeout(() => {
                getWeather();
            }, 500);
        });

        // 添加当前网站到黑名单
        $('#addCurrentSite').click(function() {
            const currentHost = window.location.hostname;
            const blacklistText = $('#cfg_blacklist').val();
            const blacklistArray = blacklistText.split('\n').filter(line => line.trim());

            if (!blacklistArray.includes(currentHost)) {
                blacklistArray.push(currentHost);
                $('#cfg_blacklist').val(blacklistArray.join('\n'));
                if (typeof showMessage === 'function') {
                    showMessage('已添加当前网站到黑名单', 2000);
                }
            } else {
                if (typeof showMessage === 'function') {
                    showMessage('当前网站已在黑名单中', 2000);
                }
            }
        });

        // 绑定关闭事件
        $('#live2dConfigClose').click(function() {
            $('#live2dConfigPanel').fadeOut(300);
        });

        // 绑定恢复默认按钮事件
        $('.reset-button').click(function() {
            const resetType = $(this).data('reset');

            switch(resetType) {
                case 'basic':
                    // 恢复基础设置
                    $('#cfg_nickname').val(DEFAULT_CONFIG.nickname);
                    $('#cfg_useBlacklist').prop('checked', DEFAULT_CONFIG.useBlacklist);
                    $('#cfg_blacklist').val(DEFAULT_CONFIG.blacklist.join('\n'));
                    if (typeof showMessage === 'function') {
                        showMessage('基础设置已恢复默认', 2000);
                    }
                    break;

                case 'weather':
                    // 恢复天气设置
                    $('#cfg_province').val(DEFAULT_CONFIG.weather.province);
                    $('#cfg_city').val(DEFAULT_CONFIG.weather.city);
                    if (typeof showMessage === 'function') {
                        showMessage('天气设置已恢复默认', 2000);
                    }
                    break;

                case 'health':
                    // 恢复健康提醒设置
                    $('#cfg_healthEnabled').prop('checked', DEFAULT_CONFIG.healthReminders.enabled);
                    $('#cfg_waterEnabled').prop('checked', DEFAULT_CONFIG.healthReminders.water.enabled);
                    $('#cfg_waterInterval').val(DEFAULT_CONFIG.healthReminders.water.interval);
                    $('#cfg_waterMessages').val(DEFAULT_CONFIG.healthReminders.water.messages.join('\n'));
                    $('#cfg_restEnabled').prop('checked', DEFAULT_CONFIG.healthReminders.rest.enabled);
                    $('#cfg_restInterval').val(DEFAULT_CONFIG.healthReminders.rest.interval);
                    $('#cfg_restMessages').val(DEFAULT_CONFIG.healthReminders.rest.messages.join('\n'));
                    $('#cfg_postureEnabled').prop('checked', DEFAULT_CONFIG.healthReminders.posture.enabled);
                    $('#cfg_postureInterval').val(DEFAULT_CONFIG.healthReminders.posture.interval);
                    $('#cfg_postureMessages').val(DEFAULT_CONFIG.healthReminders.posture.messages.join('\n'));
                    $('#cfg_sleepEnabled').prop('checked', DEFAULT_CONFIG.healthReminders.sleep.enabled);
                    $('#cfg_sleepTime').val(DEFAULT_CONFIG.healthReminders.sleep.time);
                    $('#cfg_sleepMessages').val(DEFAULT_CONFIG.healthReminders.sleep.messages.join('\n'));
                    if (typeof showMessage === 'function') {
                        showMessage('健康提醒设置已恢复默认', 2000);
                    }
                    break;

                case 'messages':
                    // 恢复自定义台词
                    $('#cfg_clickMessages').val(DEFAULT_CONFIG.customMessages.click.join('\n'));
                    $('#cfg_idleMessages').val(DEFAULT_CONFIG.customMessages.idle.join('\n'));
                    $('#cfg_morningMessages').val(DEFAULT_CONFIG.customMessages.welcome.morning.join('\n'));
                    $('#cfg_noonMessages').val(DEFAULT_CONFIG.customMessages.welcome.noon.join('\n'));
                    $('#cfg_afternoonMessages').val(DEFAULT_CONFIG.customMessages.welcome.afternoon.join('\n'));
                    $('#cfg_eveningMessages').val(DEFAULT_CONFIG.customMessages.welcome.evening.join('\n'));
                    $('#cfg_nightMessages').val(DEFAULT_CONFIG.customMessages.welcome.night.join('\n'));
                    if (typeof showMessage === 'function') {
                        showMessage('自定义台词已恢复默认', 2000);
                    }
                    break;
            }
        });

        // 绑定保存事件 - 实时生效
        $('#live2dConfigSave').click(function() {
            // 保存基础配置
            config.nickname = $('#cfg_nickname').val().trim() || '宝宝';
            config.useBlacklist = $('#cfg_useBlacklist').is(':checked');
            config.blacklist = $('#cfg_blacklist').val().split('\n').filter(line => line.trim());
            config.weather.province = $('#cfg_province').val().trim() || '广东';
            config.weather.city = $('#cfg_city').val().trim() || '广州';

            // 保存看板娘配置
            const newModelId = parseInt($('#cfg_modelId').val()) || 1;
            const newTexturesId = parseInt($('#cfg_modelTexturesId').val()) || 0;
            config.waifu.modelId = newModelId;
            setTexturesId(newModelId, newTexturesId);
            config.waifu.dockSide = $('#cfg_dockSide').val() === 'left' ? 'left' : 'right';
            config.loadDelay = parseInt($('#cfg_loadDelay').val()) || 0;

            // 保存工具栏开关
            config.toolbar = {
                house:     $('#cfg_tool_house').is(':checked'),
                hitokoto:  $('#cfg_tool_hitokoto').is(':checked'),
                sunny:     $('#cfg_tool_sunny').is(':checked'),
                user:      $('#cfg_tool_user').is(':checked'),
                magic:     $('#cfg_tool_magic').is(':checked'),
                camera:    $('#cfg_tool_camera').is(':checked'),
                todo:      $('#cfg_tool_todo').is(':checked'),
                setting:   $('#cfg_tool_setting').is(':checked'),
                donate:    $('#cfg_tool_donate').is(':checked'),
                close:     $('#cfg_tool_close').is(':checked'),
                view:      $('#cfg_tool_view').is(':checked'),
                discover:  $('#cfg_tool_discover').is(':checked'),
            };

            // 保存健康提醒配置
            const oldHealthEnabled = config.healthReminders.enabled;
            config.healthReminders.enabled = $('#cfg_healthEnabled').is(':checked');
            config.healthReminders.water.enabled = $('#cfg_waterEnabled').is(':checked');
            config.healthReminders.water.interval = parseInt($('#cfg_waterInterval').val());
            config.healthReminders.water.messages = $('#cfg_waterMessages').val().split('\n').filter(line => line.trim());
            config.healthReminders.rest.enabled = $('#cfg_restEnabled').is(':checked');
            config.healthReminders.rest.interval = parseInt($('#cfg_restInterval').val());
            config.healthReminders.rest.messages = $('#cfg_restMessages').val().split('\n').filter(line => line.trim());
            config.healthReminders.posture.enabled = $('#cfg_postureEnabled').is(':checked');
            config.healthReminders.posture.interval = parseInt($('#cfg_postureInterval').val());
            config.healthReminders.posture.messages = $('#cfg_postureMessages').val().split('\n').filter(line => line.trim());
            config.healthReminders.sleep.enabled = $('#cfg_sleepEnabled').is(':checked');
            config.healthReminders.sleep.time = parseInt($('#cfg_sleepTime').val());
            config.healthReminders.sleep.messages = $('#cfg_sleepMessages').val().split('\n').filter(line => line.trim());

            // 保存自定义台词
            config.customMessages.click = $('#cfg_clickMessages').val().split('\n').filter(line => line.trim());
            config.customMessages.idle = $('#cfg_idleMessages').val().split('\n').filter(line => line.trim());
            config.customMessages.welcome.morning = $('#cfg_morningMessages').val().split('\n').filter(line => line.trim());
            config.customMessages.welcome.noon = $('#cfg_noonMessages').val().split('\n').filter(line => line.trim());
            config.customMessages.welcome.afternoon = $('#cfg_afternoonMessages').val().split('\n').filter(line => line.trim());
            config.customMessages.welcome.evening = $('#cfg_eveningMessages').val().split('\n').filter(line => line.trim());
            config.customMessages.welcome.night = $('#cfg_nightMessages').val().split('\n').filter(line => line.trim());

            saveConfig();

            // 实时更新健康提醒系统
            if (reminderSystem) {
                reminderSystem.stop();
            }
            if (config.healthReminders.enabled) {
                reminderSystem = new HealthReminderSystem();
                reminderSystem.init();
            }

            $('#live2dConfigPanel').fadeOut(300);

            if (typeof showMessage === 'function') {
                showMessage('设置已保存！黑名单修改需刷新页面生效', 4000, true);
            }
        });
    }

    // ========== 待办提醒系统 ==========
    class TodoReminderSystem {
        constructor() {
            this.timers = {};
            this.lastReminders = {};
        }

        init() {
            if (!config.todos.enabled) {
                console.log('[Live2D] 待办提醒已禁用');
                return;
            }

            console.log('[Live2D] 待办提醒系统启动');
            this.loadTodos();
            this.startAllReminders();
        }

        loadTodos() {
            this.renderTodoList();
        }

        renderTodoList() {
            const todoList = $('#todoList');
            todoList.empty();

            if (!config.todos.list || config.todos.list.length === 0) {
                todoList.html('<div class="todo-empty">暂无待办事项<br>点击下方添加吧~</div>');
                return;
            }

            config.todos.list.forEach((todo, index) => {
                const timeText = todo.type === 'time'
                    ? `<i class="el-icon-alarm-clock"></i> ${todo.time}`
                    : `<i class="el-icon-refresh"></i> 每${todo.interval}分钟`;

                const todoHtml = `
                    <div class="todo-item" data-index="${index}">
                        <div class="todo-checkbox" data-index="${index}"></div>
                        <div class="todo-content">
                            <div class="todo-text">${todo.text}</div>
                            <div class="todo-time">${timeText}</div>
                        </div>
                        <div class="todo-delete" data-index="${index}">×</div>
                    </div>
                `;
                todoList.append(todoHtml);
            });

            // 绑定完成事件
            $('.todo-checkbox').click((e) => {
                const index = $(e.target).data('index');
                this.completeTodo(index);
            });

            // 绑定删除事件
            $('.todo-delete').click((e) => {
                const index = $(e.target).data('index');
                this.deleteTodo(index);
            });
        }

        addTodo(text, type, value) {
            const nickname = config.nickname || '宝宝';
            const todo = {
                id: Date.now(),
                text: text,
                type: type,
                [type === 'time' ? 'time' : 'interval']: value,
                lastReminded: null
            };

            config.todos.list.push(todo);
            saveConfig();
            this.renderTodoList();
            this.startReminder(todo);
            updateTodoBadge(); // 更新徽章

            if (typeof showMessage === 'function') {
                showMessage(`待办已添加！${nickname}我会按时提醒你的~`, 3000, true);
            }
        }

        deleteTodo(index) {
            const todo = config.todos.list[index];
            if (this.timers[todo.id]) {
                clearInterval(this.timers[todo.id]);
                delete this.timers[todo.id];
            }

            config.todos.list.splice(index, 1);
            saveConfig();
            this.renderTodoList();
            updateTodoBadge(); // 更新徽章

            if (typeof showMessage === 'function') {
                showMessage('待办已删除', 2000);
            }
        }

        completeTodo(index) {
            const todo = config.todos.list[index];
            const nickname = config.nickname || '宝宝';

            if (typeof showMessage === 'function') {
                showMessage(`太棒了${nickname}！又完成一件事~`, 3000, true);
            }

            setTimeout(() => {
                this.deleteTodo(index);
            }, 1000);
        }

        startAllReminders() {
            config.todos.list.forEach(todo => {
                this.startReminder(todo);
            });
        }

        startReminder(todo) {
            if (todo.type === 'time') {
                // 指定时间提醒
                this.timers[todo.id] = setInterval(() => {
                    this.checkTimeReminder(todo);
                }, 60000); // 每分钟检查一次
                this.checkTimeReminder(todo); // 立即检查一次
            } else {
                // 间隔提醒
                const intervalMs = todo.interval * 60 * 1000;
                this.timers[todo.id] = setInterval(() => {
                    this.showTodoReminder(todo);
                }, intervalMs);
            }
        }

        checkTimeReminder(todo) {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            if (currentTime === todo.time) {
                const today = now.toDateString();
                if (todo.lastReminded !== today) {
                    this.showTodoReminder(todo);
                    todo.lastReminded = today;
                    saveConfig();
                }
            }
        }

        showTodoReminder(todo) {
            const nickname = config.nickname || '宝宝';
            if (typeof showMessage === 'function') {
                showMessage(`<i class="el-icon-document"></i> ${nickname}待办提醒：<span style="color: #0071e3; font-weight: 600;">${todo.text}</span>`, 6000, true);
            }
        }

        stop() {
            Object.keys(this.timers).forEach(key => {
                clearInterval(this.timers[key]);
            });
            this.timers = {};
            console.log('[Live2D] 待办提醒系统已停止');
        }
    }

    // ========== 健康提醒系统 ==========
    class HealthReminderSystem {
        constructor() {
            this.timers = {};
            this.startTime = Date.now();
            this.lastReminders = {};
        }

        init() {
            if (!config.healthReminders.enabled) {
                console.log('[Live2D] 健康提醒已禁用');
                return;
            }

            console.log('[Live2D] 健康提醒系统启动');

            if (config.healthReminders.water.enabled) {
                this.startReminder('water', config.healthReminders.water.interval);
            }

            if (config.healthReminders.rest.enabled) {
                this.startReminder('rest', config.healthReminders.rest.interval);
            }

            if (config.healthReminders.posture.enabled) {
                this.startReminder('posture', config.healthReminders.posture.interval);
            }

            if (config.healthReminders.sleep.enabled) {
                this.checkSleepTime();
                this.timers.sleep = setInterval(() => this.checkSleepTime(), 60000);
            }
        }

        startReminder(type, intervalMinutes) {
            const intervalMs = intervalMinutes * 60 * 1000;

            this.timers[type] = setInterval(() => {
                if (this.shouldShowReminder()) {
                    this.showReminder(type);
                }
            }, intervalMs);

            console.log(`[Live2D] ${type} 提醒已启动，间隔 ${intervalMinutes} 分钟`);
        }

        shouldShowReminder() {
            const now = new Date();
            const hour = now.getHours();
            const { start, end } = config.healthReminders.workingHours;
            return hour >= start && hour < end;
        }

        showReminder(type) {
            let messages;
            switch(type) {
                case 'water':
                    messages = config.healthReminders.water.messages;
                    break;
                case 'rest':
                    messages = config.healthReminders.rest.messages;
                    break;
                case 'posture':
                    messages = config.healthReminders.posture.messages;
                    break;
                default:
                    return;
            }

            const message = messages[Math.floor(Math.random() * messages.length)];
            this.displayMessage(message);
        }

        checkSleepTime() {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();

            if (hour === config.healthReminders.sleep.time && minute === 0) {
                const today = now.toDateString();
                if (this.lastReminders.sleep !== today) {
                    const messages = config.healthReminders.sleep.messages;
                    const message = messages[Math.floor(Math.random() * messages.length)];
                    this.displayMessage(message);
                    this.lastReminders.sleep = today;
                }
            }
        }

        displayMessage(text) {
            const nickname = config.nickname || '宝宝';
            const message = text.replace(/\{nickname\}/g, nickname);
            if (typeof showMessage === 'function') {
                showMessage(message, 5000, true);
            } else {
                console.log('[Live2D] 提醒:', message);
            }
        }

        stop() {
            Object.keys(this.timers).forEach(key => {
                clearInterval(this.timers[key]);
            });
            this.timers = {};
            console.log('[Live2D] 健康提醒系统已停止');
        }
    }

    // ========== 城市代码数据（完整版本） ==========
    const CITY_CODES_DATA = [
        {id:1,pid:0,city_code:"101010100",city_name:"北京",post_code:"100000",area_code:"010",ctime:"2019-07-11 17:30:06"}
    ];

    // 查找城市代码的函数（和脚本猫完全一样的逻辑）
    function findCityCode(province, city) {
        let provinceData = null;

        // 先找省份
        if (province) {
            const cleanProvince = province.replace(/[省市]$/,"");
            provinceData = CITY_CODES_DATA.find(item => item.city_name.indexOf(cleanProvince) !== -1 && item.pid === 0);
        }

        if (!provinceData) {
            console.log(`您当前填写的province: 【${province}】, 找不到该城市或省份，城市天气可能会因此不准确。请知悉`);
        }

        // 再找城市
        if (city) {
            const cleanCity = city.replace(/[市区县]$/,"");
            // 尝试不同的后缀：县|区|市|（空字符串）
            for (const suffix of "县|区|市|".split("|")) {
                const cityData = CITY_CODES_DATA.find(item => {
                    if (provinceData) {
                        return item.pid === provinceData.id && item.city_name === `${cleanCity}${suffix}`;
                    } else {
                        return item.city_name === `${cleanCity}${suffix}`;
                    }
                });

                if (cityData) {
                    return cityData;
                }
            }
        }

        // 如果找不到城市，返回省份数据
        return provinceData && provinceData.city_code ? provinceData : null;
    }

    // ========== Live2D 模型切换功能 ==========
    function loadOtherModel() {
        const modelId = config.waifu.modelId;
        const modelRandMode = 'switch'; // 可选 'rand'(随机) 或 'switch'(顺序)

        if (typeof showMessage === 'function') {
            showMessage('正在切换看板娘...', 2000);
        }

        $.ajax({
            cache: modelRandMode === 'switch',
            url: `${MODEL_API}/${modelRandMode}/?id=${modelId}`,
            dataType: "json",
            success: function(result) {
                if (result && result.model) {
                    const newModelId = result.model.id;
                    const message = result.model.message || '新的看板娘来啦~';

                    // 切到这个角色【上次穿的皮肤】，没记录过才用原皮
                    const restoredTexturesId = getTexturesId(newModelId);

                    // 保存到配置中，实现跨网站同步
                    config.waifu.modelId = newModelId;
                    saveConfig();
                    console.log('[Live2D] 模型已切换并保存:', newModelId + '-' + restoredTexturesId);

                    if (typeof loadModel === 'function') {
                        loadModel(newModelId, restoredTexturesId);
                    } else if (typeof loadlive2d === 'function') {
                        // 同时保存到localStorage以兼容Live2D库
                        localStorage.setItem('modelId', newModelId);
                        localStorage.setItem('modelTexturesId', restoredTexturesId);
                        loadlive2d('live2d', `${MODEL_API}/get/?id=${newModelId}-${restoredTexturesId}`);
                    }

                    if (typeof showMessage === 'function') {
                        showMessage(message, 3000, true);
                    }
                }
            },
            error: function() {
                if (typeof showMessage === 'function') {
                    showMessage('切换失败了...', 3000);
                }
            }
        });
    }

    function loadRandTextures() {
        const modelId = config.waifu.modelId;
        // 读这个角色【自己】记住的皮肤，而不是全局单一值
        const modelTexturesId = getTexturesId(modelId);
        const modelTexturesRandMode = 'rand'; // 可选 'rand'(随机) 或 'switch'(顺序)

        if (typeof showMessage === 'function') {
            showMessage('正在换装中...', 2000);
        }

        $.ajax({
            cache: modelTexturesRandMode === 'switch',
            url: `${MODEL_API}/${modelTexturesRandMode}_textures/?id=${modelId}-${modelTexturesId}`,
            dataType: "json",
            success: function(result) {
                if (result && result.textures) {
                    const newTexturesId = result.textures.id;

                    if (newTexturesId === 1 && (modelTexturesId === 1 || modelTexturesId === 0)) {
                        if (typeof showMessage === 'function') {
                            showMessage('我还没有其他衣服呢', 3000, true);
                        }
                    } else {
                        if (typeof showMessage === 'function') {
                            showMessage('我的新衣服好看嘛', 3000, true);
                        }
                    }

                    // 只更新【这个角色】的皮肤记录，别的角色不受影响
                    setTexturesId(modelId, newTexturesId);
                    saveConfig();
                    console.log('[Live2D] 材质已切换并保存: 角色 ' + modelId + ' → 第 ' + newTexturesId + ' 套');

                    if (typeof loadModel === 'function') {
                        loadModel(modelId, newTexturesId);
                    } else if (typeof loadlive2d === 'function') {
                        // 同时保存到localStorage以兼容Live2D库
                        localStorage.setItem('modelTexturesId', newTexturesId);
                        loadlive2d('live2d', `${MODEL_API}/get/?id=${modelId}-${newTexturesId}`);
                    }
                }
            },
            error: function() {
                if (typeof showMessage === 'function') {
                    showMessage('换装失败了...', 3000);
                }
            }
        });
    }

    // ========== 天气功能 ==========
    function getWeather() {
        const province = config.weather.province;
        const city = config.weather.city;

        messageSystem.showImportant('正在获取天气信息...', 2000);

        console.log('[Live2D] 开始获取天气，省份:', province, '城市:', city);

        // 获取城市数据
        const cityData = findCityCode(province, city);
        console.log('[Live2D] 查找到的城市数据:', cityData);

        if (!cityData || !cityData.city_code) {
            console.error('[Live2D] 找不到城市代码');
            messageSystem.showImportant(`抱歉，暂不支持${city}的天气查询哦~\n请在设置中检查省份和城市配置`, 4000);
            return;
        }

        // 使用和脚本猫完全一样的天气API
        const apiUrl = `http://t.weather.itboy.net/api/weather/city/${cityData.city_code}`;
        console.log('[Live2D] 天气API地址:', apiUrl);

        // 使用 GM_xmlhttpRequest 绕过 CORS 和混合内容限制
        GM_xmlhttpRequest({
            url: apiUrl,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('[Live2D] 天气API响应:', data);

                    if (data && data.status === 200 && data.data) {
                        const weatherData = data.data;
                        const forecast = weatherData.forecast && weatherData.forecast[0];

                        if (!forecast) {
                            console.error('[Live2D] 天气数据格式错误');
                            messageSystem.showImportant('天气信息获取失败，请稍后再试', 3000);
                            return;
                        }

                        // 分段显示天气信息
                        const messages = [
                            `今日${city}天气：${forecast.type}\n当前温度：${weatherData.wendu}°C 湿度：${weatherData.shidu}`,
                            `${forecast.high.replace('高温 ', '最高温度：')}\n${forecast.low.replace('低温 ', '最低温度：')}\n${forecast.fx} ${forecast.fl}`,
                            `空气质量：${weatherData.quality}（PM2.5: ${weatherData.pm25}）\n${forecast.notice}`,
                            `健康提示：${weatherData.ganmao}`
                        ];

                        // 依次显示每段信息
                        messages.forEach((msg, index) => {
                            setTimeout(() => {
                                messageSystem.showImportant(msg, 5000);
                            }, index * 5500);
                        });
                    } else {
                        console.error('[Live2D] 天气API返回状态异常:', data);
                        messageSystem.showImportant('天气信息获取失败，请检查城市设置', 3000);
                    }
                } catch (e) {
                    console.error('[Live2D] 解析天气数据失败:', e);
                    messageSystem.showImportant('天气信息解析失败', 3000);
                }
            },
            onerror: function(error) {
                console.error('[Live2D] 天气API请求失败:', error);
                messageSystem.showImportant('天气信息获取失败，请稍后再试', 3000);
            },
            ontimeout: function() {
                console.error('[Live2D] 天气API请求超时');
                messageSystem.showImportant('天气信息获取超时，请稍后再试', 3000);
            }
        });
    }

    // ========== 自定义消息 ==========
    function showCustomWelcome() {
        const now = new Date();
        const hour = now.getHours();
        const nickname = config.nickname || '宝宝';
        let messages;

        if (hour >= 5 && hour < 11) {
            messages = config.customMessages.welcome.morning.map(msg => msg.replace(/\{nickname\}/g, nickname));
        } else if (hour >= 11 && hour < 13) {
            messages = config.customMessages.welcome.noon.map(msg => msg.replace(/\{nickname\}/g, nickname));
        } else if (hour >= 13 && hour < 18) {
            messages = config.customMessages.welcome.afternoon.map(msg => msg.replace(/\{nickname\}/g, nickname));
        } else if (hour >= 18 && hour < 22) {
            messages = config.customMessages.welcome.evening.map(msg => msg.replace(/\{nickname\}/g, nickname));
        } else {
            messages = config.customMessages.welcome.night.map(msg => msg.replace(/\{nickname\}/g, nickname));
        }

        const message = messages[Math.floor(Math.random() * messages.length)];

        setTimeout(() => {
            if (typeof showMessage === 'function') {
                showMessage(message, 6000, true);
            }
        }, 3000);
    }

    /**
     * 把脚本里配置的自定义台词，注入库的 waifu_tips 对象。
     *
     * 库负责：节日祝福、来源识别、悬停图标台词、模型招呼语
     * 脚本负责：欢迎词（按时段）、点击台词、空闲台词
     *
     * 替换的是库对象里的对应字段，其余原样保留 —— 所以节日和来源识别不受影响。
     */
    function injectCustomMessages() {
        const tips = window.waifu_tips;
        if (!tips || typeof tips !== 'object') {
            console.log('[Live2D] 库的台词对象还没就绪，稍后重试');
            return false;
        }

        const nickname = config.nickname || '宝宝';
        const cm = config.customMessages;

        // 统一替换占位符
        function render(list) {
            return (list && list.length ? list : ['']).map(function (t) {
                return String(t).replace(/\{nickname\}/g, nickname);
            });
        }

        // 欢迎词：库用 hour_tips 的 9 个时段键
        const w = cm.welcome || {};
        tips.hour_tips = {
            't5-7':   render(w.morning),
            't7-11':  render(w.morning),
            't11-14': render(w.noon),
            't14-17': render(w.afternoon),
            't17-19': render(w.afternoon),
            't19-21': render(w.evening),
            't21-23': render(w.night || w.evening),
            't23-5':  render(w.night || w.evening),
            'default': render(w.morning),
        };

        // 点击台词 / 悬停台词
        // ⚠️ 库把 mouseover / click 存在 result 顶层，不在 waifu 对象里，
        //    所以这里只处理 waifu 内部字段，顶层数组用下面的 injectTipsArrays 处理。
        if (cm.click && cm.click.length) {
            const clickText = render(cm.click);
            tips.load_rand_textures = tips.load_rand_textures || [];
            // 把点击台词挂到一个自定义键上，供库外部读取
            tips.__customClick = clickText;
        }

        if (cm.idle && cm.idle.length) {
            tips.__customIdle = render(cm.idle);
        }

        console.log('[Live2D] 自定义台词已注入（昵称：' + nickname + '）');
        return true;
    }

    function setupCustomMessages() {
        // 尝试把自定义台词注入库（库的台词对象可能在 initModel 之后才就绪）
        if (!injectCustomMessages()) {
            let tries = 0;
            const retry = setInterval(function () {
                tries++;
                if (injectCustomMessages() || tries >= 10) clearInterval(retry);
            }, 500);
        }

        $(document).on('click', '.waifu #live2d', function() {
            const nickname = config.nickname || '宝宝';
            const messages = config.customMessages.click;
            let message = messages[Math.floor(Math.random() * messages.length)];
            message = message.replace(/\{nickname\}/g, nickname);
            if (typeof showMessage === 'function') {
                showMessage(message, 3000, true);
            }
        });

        let idleTimer;
        $(document).on('mousemove keydown', function() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (Math.random() < 0.3) {
                    const nickname = config.nickname || '宝宝';
                    const messages = config.customMessages.idle;
                    let message = messages[Math.floor(Math.random() * messages.length)];
                    message = message.replace(/\{nickname\}/g, nickname);
                    if (typeof showMessage === 'function') {
                        showMessage(message, 4000);
                    }
                }
            }, 60000);
        });

        // ⚠️ 悬停台词交给库处理（waifu-tips.json 里的 .waifu #live2d 条目）。
        //    以前这里会先 off 掉库的绑定再自己绑一份，结果和库打架，
        //    表现为台词闪烁、或者重要消息被顶掉。现在不要这段。
    }

    // ========== 拖拽停靠功能（修复版） ==========
    function initDragDocking() {
        setTimeout(() => {
            const $waifu = $('.waifu');
            const $tool = $('.waifu-tool');
            if (!$waifu.length) return;
            let isDragging = false;
            let startX = 0;
            let startWaifuLeft = 0;

            // 监听鼠标按下（开始拖拽）
            $waifu.on('mousedown', function(e) {
                const rect = this.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                // 排除工具栏区域（右侧60px），仅本体可拖拽
                if (mouseX > rect.width - 60) return;

                isDragging = true;
                startX = e.clientX;

                // 获取看板娘当前的实际位置
                const rect2 = this.getBoundingClientRect();
                startWaifuLeft = rect2.left;

                // 拖拽开始时立即切换到left定位，强制清除right定位
                $waifu[0].style.setProperty('right', 'auto', 'important');
                $waifu[0].style.setProperty('left', startWaifuLeft + 'px', 'important');
                $waifu[0].style.setProperty('transition', 'none', 'important');

                console.log('开始拖拽，初始位置:', startWaifuLeft);
                e.preventDefault();
            });

            // 监听鼠标移动（拖拽过程，实时更新位置）
            $(document).on('mousemove', function(e) {
                if (!isDragging) return;
                const moveX = e.clientX - startX;
                let newLeft = startWaifuLeft + moveX;
                const currentPageWidth = $(window).width();
                const currentWaifuWidth = $waifu.outerWidth();
                newLeft = Math.max(0, Math.min(newLeft, currentPageWidth - currentWaifuWidth));
                $waifu[0].style.setProperty('left', newLeft + 'px', 'important');
                $waifu[0].style.setProperty('right', 'auto', 'important');
            });

            // 监听鼠标松开（结束拖拽，执行平滑停靠动画）
            $(document).on('mouseup', function() {
                if (!isDragging) return;
                isDragging = false;

                const currentLeft = parseFloat($waifu.css('left'));
                const currentPageWidth = $(window).width();
                const currentWaifuWidth = $waifu.outerWidth();

                console.log('拖拽结束，当前位置:', currentLeft, '页面宽度:', currentPageWidth, '看板娘宽度:', currentWaifuWidth);

                if (currentLeft + currentWaifuWidth/2 < currentPageWidth/2) {
                    // 停靠左侧 - 使用平滑动画
                    console.log('判定停靠到左边，目标位置: 0');

                    const startLeft = currentLeft;
                    const targetLeft = 0;
                    const duration = 1000;
                    const startTime = performance.now();

                    function animateToLeft(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);

                        // 使用缓动函数
                        const easeProgress = 1 - Math.pow(1 - progress, 3);
                        const newLeft = startLeft + (targetLeft - startLeft) * easeProgress;

                        // 强制设置位置
                        $waifu[0].style.setProperty('left', newLeft + 'px', 'important');
                        $waifu[0].style.setProperty('right', 'auto', 'important');

                        if (progress < 1) {
                            requestAnimationFrame(animateToLeft);
                        } else {
                            // 动画完成，最终确保位置正确
                            $waifu[0].style.setProperty('left', '0px', 'important');
                            $waifu[0].style.setProperty('right', 'auto', 'important');
                            console.log('左侧停靠完成，最终位置:', $waifu.css('left'));
                        }
                    }

                    requestAnimationFrame(animateToLeft);
                    $tool.addClass('left-side').css({ left: '10px', right: 'auto' });

                    // 保存停靠位置到配置
                    config.waifu.dockSide = 'left';
                    saveConfig();

                } else {
                    // 停靠右侧 - 使用平滑动画
                    console.log('判定停靠到右边');

                    const startLeft = currentLeft;
                    const targetLeft = currentPageWidth - currentWaifuWidth;
                    const duration = 1000;
                    const startTime = performance.now();

                    function animateToRight(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);

                        // 使用缓动函数
                        const easeProgress = 1 - Math.pow(1 - progress, 3);
                        const newLeft = startLeft + (targetLeft - startLeft) * easeProgress;

                        // 强制设置位置
                        $waifu[0].style.setProperty('left', newLeft + 'px', 'important');
                        $waifu[0].style.setProperty('right', 'auto', 'important');

                        if (progress < 1) {
                            requestAnimationFrame(animateToRight);
                        } else {
                            // 动画完成后，改用right定位
                            $waifu[0].style.setProperty('left', 'auto', 'important');
                            $waifu[0].style.setProperty('right', '0px', 'important');
                            console.log('右侧停靠完成，最终位置:', $waifu.css('right'));
                        }
                    }

                    requestAnimationFrame(animateToRight);
                    $tool.removeClass('left-side').css({ right: '10px', left: 'auto' });

                    // 保存停靠位置到配置
                    config.waifu.dockSide = 'right';
                    saveConfig();
                }
            });

            // 鼠标离开页面时强制结束拖拽，避免卡死
            $(document).on('mouseleave', function() {
                if (isDragging) {
                    isDragging = false;
                }
            });
        }, 2000);
    }

    // ========== 初始化 ==========
    function init() {
        console.log('[Live2D] 开始初始化...');

        // 加载动画 SVG
        const loadingSvg = config.showLoadingTip ? `
            <div class="waifu-loading">
                <svg viewBox="0 0 44 44">
                    <polyline id="back" points="1 6 4 6 6 11 10 11 12 6 15 6 18 6 20 11 24 11 27 6 30 6 33 6 35 11 39 11 41 6 44 6"></polyline>
                    <polyline id="front" points="1 6 4 6 6 11 10 11 12 6 15 6 18 6 20 11 24 11 27 6 30 6 33 6 35 11 39 11 41 6 44 6"></polyline>
                </svg>
                <div class="waifu-loading-text">加载中...</div>
            </div>
        ` : '';

        const waifuHtml = `
            <div class="waifu">
                ${loadingSvg}
                <div class="waifu-tips"></div>
                <canvas id="live2d" class="live2d" width="280" height="250"></canvas>
                <div class="waifu-tool">
                    <span class="el-icon-house"></span>
                    <span class="el-icon-chat-dot-round"></span>
                    <span class="el-icon-sunny"></span>
                    <span class="el-icon-user"></span>
                    <span class="el-icon-magic-stick"></span>
                    <span class="el-icon-camera"></span>
                    <span class="el-icon-document-checked"></span>
                    <span class="el-icon-setting"></span>
                    <span class="el-icon-coffee-cup"></span>
                    <span class="el-icon-switch-button"></span>
                </div>
            </div>
        `;

        // 检查是否已经存在看板娘，避免重复创建
        if ($('.waifu').length > 0) {
            console.log('[Live2D] 看板娘已存在，跳过创建');
            return;
        }

        $('body').append(waifuHtml);

        if (typeof initModel !== 'function') {
            console.error('[Live2D] initModel 函数未定义');
            $('.waifu-loading').html('<div style="color:#ff4d4f;font-size:12px;">加载失败</div>');
            return;
        }

        if (typeof live2d_settings === 'undefined') {
            console.error('[Live2D] live2d_settings 未定义');
            $('.waifu-loading').html('<div style="color:#ff4d4f;font-size:12px;">加载失败</div>');
            return;
        }

        // ---- 安装静态模型 API：把 fghrsh 的 PHP 接口在本地实现掉 ----
        // 必须在 initModel 之前完成，否则模型加载会去请求已关闭的服务器。
        if (typeof createStaticModelAPI !== 'function') {
            console.error('[Live2D] createStaticModelAPI 未定义，检查 @require');
            return;
        }

        fetch(MODEL_BASE + '/models.json')
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                const api = createStaticModelAPI({
                    base: MODEL_BASE + '/',
                    data: data,
                    onLog: function (m) { console.log('[Live2D][api]', m); },
                });
                const hooks = api.install();
                console.log('[Live2D] 静态 API 就绪: xhr=' + hooks.xhr +
                            ' ajax=' + hooks.ajax + ' loadlive2d=' + hooks.loadlive2d);
                console.log('[Live2D] 模型: ' + data.models.length + ' 个 / ' +
                            data.variantCount + ' 形态');
                startLive2D();
            })
            .catch(function (e) {
                console.error('[Live2D] models.json 加载失败:', e);
                $('.waifu-loading').html('<div style="color:#ff4d4f;font-size:12px;">模型数据加载失败</div>');
            });

        /** 模型数据就绪后再启动引擎 */
        function startLive2D() {
        // 把 GM 存储接到库上：这样换网站也能记住你选的角色 / 皮肤 / 位置
        live2d_settings['storage'] = {
            save: function (key, value) {
                try { GM_setValue('yyy404_lib_' + key, value); } catch (e) {}
            },
            load: function (key) {
                try { return GM_getValue('yyy404_lib_' + key, null); } catch (e) { return null; }
            },
        };

        console.log('[Live2D] 配置参数...');

        // 启动时读当前角色【自己】记住的皮肤
        const startTexturesId = getTexturesId(config.waifu.modelId);

        // 将配置同步到localStorage，确保Live2D库能读取到正确的模型
        localStorage.setItem('modelId', config.waifu.modelId);
        localStorage.setItem('modelTexturesId', startTexturesId);
        console.log('[Live2D] 模型同步:', config.waifu.modelId, '-', startTexturesId);

        live2d_settings['modelId'] = config.waifu.modelId;
        live2d_settings['modelTexturesId'] = startTexturesId;
        live2d_settings['waifuEdgeSide'] = config.waifu.dockSide === 'left' ? 'left:0' : 'right:0';
        live2d_settings['waifuDraggable'] = 'disable';
        live2d_settings['modelStorage'] = true;
        live2d_settings['modelAPI'] = MODEL_API + '/';

        console.log('[Live2D] 调用 initModel...');
        initModel(TIPS_JSON);
        }

        // 强制覆盖对话框样式，使其自动调整大小
        setTimeout(() => {
            $('.waifu-tips').css({
                'width': 'fit-content',
                'height': 'auto',
                'min-width': '80px',
                'max-width': '250px'
            });
        }, 100);

        setTimeout(() => {
            $('.waifu-loading').fadeOut(300, function() {
                $(this).remove();
            });
            $('.waifu').addClass('loaded');
            console.log('[Live2D] 看板娘加载完成！');

            // 根据配置设置初始停靠位置
            setTimeout(() => {
                const $waifu = $('.waifu');
                const $tool = $('.waifu-tool');
                if (config.waifu.dockSide === 'left') {
                    // 设置到左边
                    $waifu[0].style.setProperty('left', '0px', 'important');
                    $waifu[0].style.setProperty('right', 'auto', 'important');
                    $tool.addClass('left-side').css({ left: '10px', right: 'auto' });
                    console.log('[Live2D] 初始位置设置为左侧');
                } else {
                    // 设置到右边（默认）
                    $waifu[0].style.setProperty('left', 'auto', 'important');
                    $waifu[0].style.setProperty('right', '0px', 'important');
                    $tool.removeClass('left-side').css({ right: '10px', left: 'auto' });
                    console.log('[Live2D] 初始位置设置为右侧');
                }
            }, 500);

            showCustomWelcome();
            setupCustomMessages();

            // ========== 工具栏按钮事件绑定 ==========

            // 主页面按钮
            // ============================================================
            // 工具栏事件
            // ------------------------------------------------------------
            // ⚠️ 库（waifu-tips.js）已经给这几个按钮绑过 click：
            //      首页 / 一言 / 换角色 / 换皮肤 / 拍照 / 关闭
            //    如果这里再绑一次，一次点击会执行两遍（比如换角色直接跳两个）。
            //
            //    所以先解绑库的那几个，再由本脚本按需要的逻辑重新绑定。
            //    库没有的四个（天气 / 待办 / 设置 / 赞助）直接绑，不受影响。
            // ============================================================

            // 解绑库绑过的工具栏按钮。
            // ⚠️ 不写死图标名 —— 库绑了哪几个由库决定，
            //    这里把工具栏上每个 span 的 click 都清掉，再按需要重新绑。
            // ⚠️ 唯独「悬停隐藏」（el-icon-view）保留库的绑定：
            //    它的切换状态（hidden / peeking）是 initHideMode 的闭包变量，
            //    外部拿不到，自己重绑反而会坏掉。
            $('.waifu-tool span').not('.el-icon-view').off('click');

            // ---------- 按配置显示 / 隐藏工具栏按钮 ----------
            // key 与 DEFAULT_CONFIG.toolbar 对应
            const TOOLBAR_ICONS = {
                house:    '.el-icon-house',
                hitokoto: '.el-icon-chat-dot-round',
                sunny:    '.el-icon-sunny',
                user:     '.el-icon-user',
                magic:    '.el-icon-magic-stick',
                camera:   '.el-icon-camera',
                todo:     '.el-icon-document-checked',
                setting:  '.el-icon-setting',
                donate:   '.el-icon-coffee-cup',
                close:    '.el-icon-switch-button',
                view:     '.el-icon-view',
                discover: '.el-icon-discover',
            };

            Object.keys(TOOLBAR_ICONS).forEach(function (key) {
                const sel = '.waifu-tool ' + TOOLBAR_ICONS[key];
                const visible = config.toolbar && config.toolbar[key];

                if (visible) {
                    // 悬停隐藏和关于默认不在容器的 HTML 里，需要动态补上
                    if (!$(sel).length) {
                        const icon = TOOLBAR_ICONS[key].replace('.', '');
                        const title = key === 'view' ? '悬停隐藏' : '关于';
                        $('.waifu-tool').append('<span class="' + icon + '" title="' + title + '"></span>');
                    }
                } else {
                    $(sel).hide();
                }
            });

            // ---------- 首页：和库一样，跳站点根目录 ----------
            $('.waifu-tool .el-icon-house').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`点击前往首页，${nickname}想回到上一页可以使用浏览器的后退功能哦`, 3000);
            });
            $('.waifu-tool .el-icon-house').click(function() {
                window.location.href = window.location.origin;
            });

            // ---------- 一言：走 hitokoto.cn ----------
            $('.waifu-tool .el-icon-chat-dot-round').hover(function() {
                messageSystem.showNormal('一言一语，一颦一笑。一字一句，一颗赛艇。', 3000);
            });
            $('.waifu-tool .el-icon-chat-dot-round').click(function() {
                messageSystem.showImportant('正在获取一言...', 2000);

                $.getJSON('https://v1.hitokoto.cn', function (result) {
                    if (!result || !result.hitokoto) {
                        messageSystem.showImportant('获取一言失败了...', 3000);
                        return;
                    }
                    let src = '';
                    if (result.from) {
                        src = '\n—— ' + result.from;
                        if (result.from_who) src = '\n—— ' + result.from_who + '《' + result.from + '》';
                    }
                    messageSystem.showImportant(result.hitokoto + src, 8000);
                }).fail(function () {
                    messageSystem.showImportant('获取一言失败了...', 3000);
                });
            });

            // ---------- 天气 ----------
            $('.waifu-tool .el-icon-sunny').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`要看看今天天气怎么样吗？${nickname}`, 3000);
            });
            $('.waifu-tool .el-icon-sunny').click(function() {
                getWeather();
            });

            // ---------- 换角色：静态 API + 记住选择 ----------
            $('.waifu-tool .el-icon-user').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`嗯··· ${nickname}要切换看板娘吗？`, 3000);
            });
            $('.waifu-tool .el-icon-user').click(function() {
                loadOtherModel();
            });

            // ---------- 换皮肤：静态 API + 记住选择 ----------
            $('.waifu-tool .el-icon-magic-stick').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`${nickname}喜欢换装 Play 吗？`, 3000);
            });
            $('.waifu-tool .el-icon-magic-stick').click(function() {
                loadRandTextures();
            });

            // ---------- 拍照：库已经实现，这里只加 hover 提示 ----------
            $('.waifu-tool .el-icon-camera').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`${nickname}要拍张纪念照片吗？`, 3000);
            });

            // ---------- 待办 ----------
            $('.waifu-tool .el-icon-document-checked').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`${nickname}来查看待办事项吧~`, 3000);
            });
            $('.waifu-tool .el-icon-document-checked').click(function() {
                showConfigPanel();
                setTimeout(() => {
                    $('#tab-todo').prop('checked', true).trigger('change');
                }, 100);
            });

            // ---------- 设置 ----------
            $('.waifu-tool .el-icon-setting').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`请尽情吩咐小娘子，${nickname}`, 3000);
            });
            $('.waifu-tool .el-icon-setting').click(function() {
                showConfigPanel();
            });

            // ---------- 赞助 ----------
            $('.waifu-tool .el-icon-coffee-cup').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`${nickname}请我喝杯咖啡吧~`, 3000);
            });
            $('.waifu-tool .el-icon-coffee-cup').click(function() {
                showConfigPanel();
                setTimeout(() => {
                    $('#tab-donate').prop('checked', true).trigger('change');
                }, 100);
            });

            // ---------- 关闭：交给库（它会记住隐藏状态，刷新后不自动出现） ----------
            $('.waifu-tool .el-icon-switch-button').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`${nickname}不喜欢我了吗...`, 3000);
            });

            // ---------- 悬停隐藏：click 由库自己绑，这里只加悬停提示 ----------
            $('.waifu-tool .el-icon-view').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`${nickname}想让我躲起来吗？`, 3000);
            });

            // ---------- 关于（面板里开启后才会出现）----------
            $('.waifu-tool .el-icon-discover').hover(function() {
                const nickname = config.nickname || '宝宝';
                messageSystem.showNormal(`${nickname}想认识我吗？`, 3000);
            });
            $('.waifu-tool .el-icon-discover').click(function() {
                window.open('https://github.com/whyyy-404/live2d-waifu', '_blank');
            });

            reminderSystem = new HealthReminderSystem();
            reminderSystem.init();

            // 初始化待办系统
            todoSystem = new TodoReminderSystem();
            todoSystem.init();

            // 初始化拖拽停靠功能
            initDragDocking();

            // 赞赏面板事件
            $('#donateClose').click(function() {
                $('#donatePanel').fadeOut(300);
            });

            $('#donatePanel').click(function(e) {
                if (e.target.id === 'donatePanel') {
                    $('#donatePanel').fadeOut(300);
                }
            });
        }, 2000);
    }

    setTimeout(() => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }, config.loadDelay);

    console.log('[Live2D] 脚本加载完成，等待初始化...');

})();