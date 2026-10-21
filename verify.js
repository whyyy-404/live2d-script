#!/usr/bin/env node
/**
 * live2d-script 的自动化检查。
 *
 * 不依赖浏览器，检查的是「配置结构是否完整」「关键函数是否就位」
 * 「有没有重复实现库的功能」这类能静态判断的东西。
 *
 * 用法：node verify.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const A = (f) => path.join(ROOT, f);

let pass = 0;
let fail = 0;

function ok(msg) { pass++; console.log('  ✓ ' + msg); }
function bad(msg) { fail++; console.log('  ✗ ' + msg); }
function head(msg) { console.log('\n' + msg); }

const LITE = 'live2d-lite.user.js';
const FULL = 'live2d-waifu.user.js';

/* ========================================================================== */
head('=== ① 文件存在与语法 ===');

[LITE, FULL].forEach(function (f) {
    const p = A(f);
    if (!fs.existsSync(p)) { bad(f + ' 不存在'); return; }

    const src = fs.readFileSync(p, 'utf8');
    try {
        new vm.Script(src, { filename: f });
        ok(f + ' 语法正确（' + Math.round(Buffer.byteLength(src) / 1024 * 10) / 10 + ' KB）');
    } catch (e) {
        bad(f + ' 语法错误: ' + e.message);
    }
});

/* ========================================================================== */
head('=== ② 元数据 ===');

[LITE, FULL].forEach(function (f) {
    const src = fs.readFileSync(A(f), 'utf8');

    /\/\/ @name\s+\S/.test(src) ? ok(f + ' 有 @name') : bad(f + ' 缺少 @name');
    /\/\/ @version\s+[\d.]+/.test(src) ? ok(f + ' 有 @version') : bad(f + ' 缺少 @version');
    /\/\/ @match\s+\*:\/\/\*\/\*/.test(src) ? ok(f + ' 匹配全部网站') : bad(f + ' @match 不完整');

    // 库引用必须锁定在 tag 上（不用 @main，避免库改动影响已发布的脚本）
    const libReqs = (src.match(/@require\s+\S*live2d-waifu@\S*\/assets\//g) || []);
    libReqs.length === 3
        ? ok(f + ' 通过 @require 引用库（3 个文件）')
        : bad(f + ' 库引用数量不对: ' + libReqs.length);

    libReqs.every(function (u) { return /live2d-waifu@v[\d.]+/.test(u); })
        ? ok(f + ' 库引用锁定在 tag 版本')
        : bad(f + ' 库引用没有锁定到 tag（仍在用 @main 或 hash）');

    libReqs.every(function (u) { return u.indexOf('@main') === -1; })
        ? ok(f + ' 库引用未使用 @main')
        : bad(f + ' 库引用仍在用 @main');
});

/* ========================================================================== */
head('=== ③ 轻量版不应包含任何增强功能 ===');

{
    const src = fs.readFileSync(A(LITE), 'utf8');

    const forbidden = [
        ['配置面板', /showConfigPanel|config-panel|live2d-config/],
        ['健康提醒', /HealthReminder|健康提醒/],
        ['待办系统', /TodoReminder|todoSystem/],
        ['天气查询', /getWeather|itboy\.net/],
        ['自定义台词', /customMessages/],
    ];

    forbidden.forEach(function (item) {
        item[1].test(src)
            ? bad('轻量版不该有「' + item[0] + '」')
            : ok('轻量版没有「' + item[0] + '」');
    });

    // 必须有的
    ['initModel', 'createStaticModelAPI', 'models.json'].forEach(function (k) {
        src.indexOf(k) !== -1 ? ok('轻量版包含 ' + k) : bad('轻量版缺少 ' + k);
    });
}

/* ========================================================================== */
head('=== ④ 完整版：功能完整性 ===');

{
    const src = fs.readFileSync(A(FULL), 'utf8');

    const required = [
        ['配置面板', /function showConfigPanel/],
        ['健康提醒类', /class HealthReminderSystem/],
        ['待办提醒类', /class TodoReminderSystem/],
        ['天气查询', /function getWeather/],
        ['城市码表', /CITY_CODES_DATA/],
        ['赞赏面板', /donatePanel/],
        ['台词注入库', /function injectCustomMessages/],
        ['静态 API 接入', /createStaticModelAPI/],
    ];

    required.forEach(function (item) {
        item[1].test(src) ? ok('完整版有「' + item[0] + '」') : bad('完整版缺少「' + item[0] + '」');
    });

    // 8 个标签页
    const tabs = ['basic', 'waifu', 'toolbar', 'weather', 'health', 'messages', 'todo', 'donate'];
    const missingTabs = tabs.filter(function (t) {
        return src.indexOf('tab-' + t) === -1;
    });
    missingTabs.length === 0
        ? ok('完整版有全部 8 个配置标签页')
        : bad('缺少标签页: ' + missingTabs.join(', '));

    // 12 个工具栏开关
    const tools = ['house', 'hitokoto', 'sunny', 'user', 'magic', 'camera',
                   'todo', 'setting', 'donate', 'close', 'view', 'discover'];
    const missingTools = tools.filter(function (t) {
        return src.indexOf('cfg_tool_' + t) === -1;
    });
    missingTools.length === 0
        ? ok('完整版有全部 12 个工具栏开关')
        : bad('缺少工具栏开关: ' + missingTools.join(', '));
}

/* ========================================================================== */
head('=== ⑤ 不应重复实现库的功能 ===');

{
    const fullSrc = fs.readFileSync(A(FULL), 'utf8');
    const liteSrc = fs.readFileSync(A(LITE), 'utf8');
    const libSrc = fs.readFileSync(
        path.join(ROOT, '..', 'live2d-waifu', 'assets', 'waifu-tips.js'), 'utf8');

    // 库导出的函数，脚本里不该再定义一份
    const libFns = ['showMessage', 'hideMessage', 'loadModel',
                    'initDraggable', 'initHideMode', 'storageGet', 'storageSet'];

    libFns.forEach(function (fn) {
        const inLib = libSrc.indexOf('window.' + fn) !== -1;
        if (!inLib) return;

        const dupFull = new RegExp('function ' + fn + '\\s*\\(').test(fullSrc);
        const dupLite = new RegExp('function ' + fn + '\\s*\\(').test(liteSrc);

        (!dupFull && !dupLite)
            ? ok('未重复定义库导出的 ' + fn)
            : bad('重复定义了库导出的 ' + fn);
    });

    // 样式：脚本不该重新定义库已有的选择器
    const libCss = fs.readFileSync(
        path.join(ROOT, '..', 'live2d-waifu', 'assets', 'waifu.css'), 'utf8');

    const dupSelectors = ['.waifu {', '.waifu:hover', '.waifu-tips {', '.waifu-tool {'];
    dupSelectors.forEach(function (sel) {
        const inLib = libCss.indexOf(sel) !== -1;
        if (!inLib) return;

        fullSrc.indexOf(sel) === -1
            ? ok('未重复定义库样式 ' + sel.trim())
            : bad('重复定义库样式 ' + sel.trim());
    });

    // transform 冲突：这是拖拽卡顿的根因
    /\.waifu\s*\{[^}]*transform/.test(fullSrc)
        ? bad('脚本仍给 .waifu 写 transform（会和拖拽冲突）')
        : ok('脚本没有给 .waifu 写 transform（不与拖拽冲突）');
}

/* ========================================================================== */
head('=== ⑥ 加载动画应已移除 ===');

{
    const fullSrc = fs.readFileSync(A(FULL), 'utf8');
    ['waifu-loading', 'loadingSvg', 'showLoadingTip'].forEach(function (k) {
        fullSrc.indexOf(k) === -1
            ? ok('已移除 ' + k)
            : bad('仍残留 ' + k);
    });
}

/* ========================================================================== */
head('=== ⑦ 运行时冒烟测试 ===');

function smoke(file) {
    const src = fs.readFileSync(A(file), 'utf8');
    const start = src.indexOf('(function');
    if (start < 0) { bad(file + ' 找不到主体'); return; }

    function makeJQ() {
        const o = {};
        ['on','off','hover','click','append','appendTo','css','hide','show','fadeOut',
         'fadeIn','html','find','not','each','attr','addClass','removeClass',
         'toggleClass','trigger','parent','remove','delay','stop','fadeTo','prop','eq'
        ].forEach(function (m) { o[m] = function () { return o; }; });
        o.length = 0;
        o.val = function () { return ''; };
        o.is = function () { return false; };
        o.text = function () { return ''; };
        o.data = function () { return null; };
        o.ready = function () { return o; };
        o.width = function () { return 280; };
        o.height = function () { return 250; };
        o.outerWidth = function () { return 280; };
        o.offset = function () { return { left: 0, top: 0 }; };
        o.get = function () { return undefined; };
        return o;
    }

    const el = function () {
        return {
            style: { setProperty() {}, removeProperty() {} },
            classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
            appendChild() {}, setAttribute() {}, remove() {},
            dataset: {}, innerHTML: '', textContent: '',
        };
    };

    const sandbox = {
        console: { log() {}, error() {}, warn() {}, info() {} },
        document: {
            readyState: 'complete',
            addEventListener() {}, removeEventListener() {},
            querySelector() { return null; }, querySelectorAll() { return []; },
            createElement: el,
            body: { appendChild() {}, style: {}, contains() { return true; } },
            head: { appendChild() {} },
            getElementById() { return null; },
            documentElement: { clientWidth: 1200, clientHeight: 800 },
            title: 'test', referrer: '', visibilityState: 'visible',
        },
        localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
        sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
        GM_getValue: (k, d) => d,
        GM_setValue: () => {},
        GM_addStyle: () => {},
        GM_registerMenuCommand: () => {},
        GM_xmlhttpRequest: () => {},
        setTimeout: () => 0, setInterval: () => 0,
        clearTimeout: () => {}, clearInterval: () => {},
        fetch: () => new Promise(() => {}),
        location: { hostname: 'test.com', href: 'https://test.com', origin: 'https://test.com' },
        navigator: { userAgent: 'node' },
        alert() {}, confirm() { return false; },
        performance: { now: () => 0 },
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.top = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.jQuery = function () { return makeJQ(); };
    sandbox.jQuery.each = function () {};
    sandbox.jQuery.ajax = function () {};
    sandbox.$ = sandbox.jQuery;

    try {
        vm.createContext(sandbox);
        vm.runInContext(src.slice(start), sandbox, { timeout: 8000, filename: file });
        ok(file + ' 能在模拟环境中执行');
    } catch (e) {
        bad(file + ' 执行出错: ' + e.message);
    }
}

smoke(LITE);
smoke(FULL);

/* ========================================================================== */
console.log('\n================================');
console.log('  通过 ' + pass + ' / 失败 ' + fail);
if (fail) process.exit(1);
console.log('  全部通过 ✓');
