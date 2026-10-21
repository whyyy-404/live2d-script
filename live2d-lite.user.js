// ==UserScript==
// @name         Live2D 看板娘（轻量版）
// @namespace    https://github.com/whyyy-404
// @version      2.0.0
// @description  Live2D 看板娘，只引用库本身。7 个模型 / 27 形态，支持换角色、换皮肤、拖拽吸附、拍照。
// @author       yyy404
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      cdn.jsdelivr.net
// @require      https://cdn.jsdelivr.net/npm/jquery@3.3.1/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@v2.0.0/assets/live2d.js
// @require      https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@v2.0.0/assets/live2d-static-api.js
// @require      https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@v2.0.0/assets/waifu-tips.js
// @license      GPL-2.0
// @run-at       document-end
// @icon         https://cdn.jsdelivr.net/gh/whyyy-404/live2d-models@main/model/Potion-Maker/Pio/textures/default-costume.png
// ==/UserScript==

(function () {
    'use strict';

    var LIB = 'https://cdn.jsdelivr.net/gh/whyyy-404/live2d-waifu@v2.0.0';
    var ASSETS = LIB + '/assets';
    var MODELS = 'https://cdn.jsdelivr.net/gh/whyyy-404/live2d-models@main';

    var log = function () {
        if (window.console) console.log.apply(console, ['[看板娘]'].concat([].slice.call(arguments)));
    };

    try {
        if (window.self !== window.top) return;
    } catch (e) { return; }

    if (document.querySelector('.waifu')) {
        log('页面已有看板娘，跳过');
        return;
    }

    if (typeof window.initModel !== 'function' || typeof window.createStaticModelAPI !== 'function') {
        console.error('[看板娘] 库未加载（initModel / createStaticModelAPI 不存在）');
        return;
    }

    function loadStyles() {
        [
            'https://cdn.jsdelivr.net/npm/element-ui@2.15.14/lib/theme-chalk/icon.css',
            ASSETS + '/waifu.css',
        ].forEach(function (href) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        });
    }

    function createContainer() {
        var el = document.createElement('div');
        el.className = 'waifu';
        el.innerHTML =
            '<div class="waifu-tips"></div>' +
            '<canvas id="live2d" class="live2d" width="280" height="250"></canvas>' +
            '<div class="waifu-tool">' +
            '  <span class="el-icon-house" title="首页"></span>' +
            '  <span class="el-icon-chat-dot-round" title="一言"></span>' +
            '  <span class="el-icon-user" title="换角色"></span>' +
            '  <span class="el-icon-magic-stick" title="换皮肤"></span>' +
            '  <span class="el-icon-camera" title="拍照"></span>' +
            '  <span class="el-icon-view" title="悬停隐藏"></span>' +
            '  <span class="el-icon-discover" title="关于"></span>' +
            '  <span class="el-icon-switch-button" title="关闭"></span>' +
            '</div>';
        document.body.appendChild(el);
    }

    function boot() {
        fetch(MODELS + '/models.json')
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                var api = window.createStaticModelAPI({
                    base: MODELS + '/',
                    data: data,
                    onLog: function (m) { log('[api]', m); },
                });
                api.install();
                log('模型数据：' + data.models.length + ' 个 / ' + data.variantCount + ' 形态');

                var s = window.live2d_settings;

                s['modelAPI'] = MODELS + '/api/';

                s['storage'] = {
                    save: function (key, value) {
                        try { GM_setValue('yyy404_lite_' + key, value); } catch (e) {}
                    },
                    load: function (key) {
                        try { return GM_getValue('yyy404_lite_' + key, null); } catch (e) { return null; }
                    },
                };
                s['modelStorage'] = true;

                s['modelId'] = 1;
                s['modelTexturesId'] = 0;

                s['waifuEdgeSide'] = 'right:0';
                s['waifuDraggable'] = 'axis-x';
                s['waifuDraggableSnap'] = 1000;
                s['waifuMinWidth'] = '768px';

                s['showHitokoto'] = true;
                s['hitokotoInterval'] = 0;

                s['aboutPageUrl'] = 'https://github.com/whyyy-404';

                log('启动中…');
                window.initModel(ASSETS + '/waifu-tips.json');
            })
            .catch(function (e) {
                console.error('[看板娘] models.json 加载失败：', e);
            });
    }

    loadStyles();
    createContainer();
    boot();
})();
