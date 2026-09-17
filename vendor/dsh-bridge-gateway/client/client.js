window.__ModuleLoader__.load({ id: "dsh-bridge-gateway", factory: (require) => { var module = { exports: {} }; var exports = module.exports; var React = require("react");
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// lib/bridge-rpc-constants.js
var BRIDGE_RPC_CHANNEL = "/dsh-bridge";
var BRIDGE_ENDPOINTS = {
  getStatus: "getStatus",
  startCustomTunnel: "startCustomTunnel",
  stopCustomTunnel: "stopCustomTunnel",
  startCloudflared: "startCloudflared",
  stopCloudflared: "stopCloudflared",
  resetCloudflared: "resetCloudflared",
  saveCloudflaredConfig: "saveCloudflaredConfig",
  setTunnelAutoStart: "setTunnelAutoStart",
  saveCustomTunnelConfig: "saveCustomTunnelConfig",
  setLanIp: "setLanIp",
  // 公网直连网关（0.0.0.0:port HTTPS + 强制登录门禁）
  gatewayGetStatus: "gatewayGetStatus",
  gatewayStart: "gatewayStart",
  gatewayStop: "gatewayStop",
  gatewaySaveConfig: "gatewaySaveConfig",
  gatewaySetAutoStart: "gatewaySetAutoStart",
  checkVersion: "checkVersion",
  upgradePlugin: "upgradePlugin",
  restartDsh: "restartDsh",
  exportBackup: "exportBackup",
  importBackup: "importBackup",
  diagnoseNetwork: "diagnoseNetwork",
  getSystemMetrics: "getSystemMetrics",
  // 远程工作区管理与目录浏览
  listRemoteDirectories: "listRemoteDirectories",
  addRemoteWorkspace: "addRemoteWorkspace",
  listWorkspaces: "listWorkspaces",
  // 访问安全认证（密码保护 / 扫码免密 Token）
  authGetStatus: "authGetStatus",
  authUpdateConfig: "authUpdateConfig",
  authRegenerateToken: "authRegenerateToken",
  authAdminUnlock: "authAdminUnlock",
  authAdminLock: "authAdminLock",
  // 平台管理器（多 IM 平台统一接口）
  listPlatforms: "listPlatforms",
  platformLogin: "platformLogin",
  platformSetAllowFrom: "platformSetAllowFrom",
  platformSetConfig: "platformSetConfig",
  platformStop: "platformStop",
  platformStart: "platformStart",
  platformUnbind: "platformUnbind",
  // 微信 Bot（v1.x 向后兼容别名，deprecated）
  wechatGetStatus: "wechatGetStatus",
  wechatLogin: "wechatLogin",
  wechatSetAllowFrom: "wechatSetAllowFrom",
  wechatSetConfig: "wechatSetConfig",
  wechatStop: "wechatStop",
  wechatStart: "wechatStart",
  wechatUnbind: "wechatUnbind"
};

// client/i18n.js
var NS = "dsh-bridge-gateway";
var zh = {
  "section.remote": "\u8FDC\u7A0B\u8BBF\u95EE",
  "status.running": "\u8FD0\u884C\u4E2D",
  "status.stopped": "\u672A\u542F\u52A8",
  "status.connected": "\u5DF2\u8FDE\u63A5",
  "status.connecting": "\u8FDE\u63A5\u4E2D\u2026",
  "status.reconnecting": "\u91CD\u8FDE\u4E2D\u2026",
  "status.paused": "\u6682\u505C\u4E2D",
  "status.pausedExpired": "\u6682\u505C\uFF08\u4F1A\u8BDD\u8FC7\u671F\uFF09",
  "status.error": "\u5F02\u5E38",
  "status.errorShort": "\u9519\u8BEF",
  "status.disconnected": "\u672A\u8FDE\u63A5",
  "status.comingSoon": "\u5373\u5C06\u652F\u6301",
  "status.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "status.switching": "\u5207\u6362\u4E2D\u2026",
  "status.downloading": "\u4E0B\u8F7D\u4E2D\u2026",
  "status.processing": "\u5904\u7406\u4E2D\u2026",
  "status.verifying": "\u9A8C\u8BC1\u4E2D\u2026",
  "status.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "btn.save": "\u4FDD\u5B58\u914D\u7F6E",
  "btn.saved": "\u2713 \u5DF2\u4FDD\u5B58",
  "btn.saveFail": "\u4FDD\u5B58\u5931\u8D25",
  "btn.saveConfigFail": "\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25",
  "btn.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "btn.start": "\u5F00\u542F",
  "btn.stop": "\u5173\u95ED",
  "btn.clear": "\u6E05\u9664",
  "btn.add": "\u6DFB\u52A0",
  "btn.hide": "\u9690\u85CF",
  "btn.show": "\u663E\u793A",
  "btn.cancel": "\u53D6\u6D88",
  "btn.close": "\u5173\u95ED",
  "btn.retry": "\u{1F504} \u91CD\u8BD5",
  "btn.copyLink": "\u590D\u5236\u94FE\u63A5",
  "btn.copied": "\u2713 \u5DF2\u590D\u5236",
  "btn.hideQr": "\u9690\u85CF\u4E8C\u7EF4\u7801",
  "btn.showQr": "\u663E\u793A\u4E8C\u7EF4\u7801",
  "btn.resetLink": "\u{1F504} \u91CD\u7F6E\u94FE\u63A5",
  "btn.saveCf": "\u4FDD\u5B58\u56FA\u5B9A\u57DF\u540D\u914D\u7F6E",
  "btn.savePort": "\u4FDD\u5B58\u7AEF\u53E3",
  "btn.startGw": "\u5F00\u542F\u76F4\u8FDE\u7F51\u5173",
  "btn.stopGw": "\u5173\u95ED\u76F4\u8FDE\u7F51\u5173",
  "btn.saveAccessPw": "\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801",
  "btn.saveAdminPw": "\u4FDD\u5B58\u7BA1\u7406\u5BC6\u7801",
  "btn.savedOk": "\u2713 \u5DF2\u6210\u529F\u4FDD\u5B58\uFF01",
  "btn.saveConnect": "\u4FDD\u5B58\u5E76\u8FDE\u63A5",
  "btn.reconnect": "\u91CD\u65B0\u8FDE\u63A5",
  "btn.disconnect": "\u65AD\u5F00",
  "btn.scanLogin": "\u626B\u7801\u767B\u5F55",
  "btn.unlock": "\u89E3\u9501\u7BA1\u7406\u6743\u9650",
  "btn.unlockNow": "\u{1F511} \u7ACB\u5373\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501",
  "btn.unlockImmediate": "\u7ACB\u5373\u89E3\u9501",
  "btn.unlockAdmin": "\u{1F511} \u89E3\u9501\u7BA1\u7406\u6743\u9650",
  "btn.relock": "\u{1F512} \u91CD\u65B0\u9501\u5B9A\u540E\u53F0",
  "btn.hideSecret": "\u{1F648} \u9690\u85CF",
  "btn.showSecret": "\u{1F441}\uFE0F \u663E\u793A",
  "btn.goEnable": "\u53BB\u5F00\u542F \u2794",
  "btn.settings": "\u8BBE\u7F6E \u2794",
  "btn.collapse": "\u25B4 \u6298\u53E0",
  "btn.expand": "\u25BE \u5C55\u5F00",
  "qr.authOnTitle": "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u914D\u7F6E",
  "qr.authOn": "\u{1F6E1}\uFE0F \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u751F\u6548 \xB7 \u626B\u7801\u8BBE\u5907\u514D\u5BC6",
  "qr.authOffTitle": "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u8BBF\u95EE\u4FDD\u62A4",
  "qr.authOff": "\u26A0\uFE0F \u5F53\u524D\u672A\u5F00\u542F\u8BBF\u95EE\u8BA4\u8BC1\uFF0C\u5EFA\u8BAE\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u5BC6\u7801\u6216\u626B\u7801\u4FDD\u62A4\u3002",
  "qr.privateHint": "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u4F7F\u7528",
  "qr.pwaHint": "\u{1F4F1} \u63D0\u793A\uFF1A\u624B\u673A\u6D4F\u89C8\u5668\u626B\u7801\u6253\u5F00\u540E\uFF0C\u5728\u83DC\u5355\u70B9\u51FB\u300C\u6DFB\u52A0\u5230\u4E3B\u5C4F\u5E55\u300D\u5373\u53EF\u4F5C\u4E3A\u72EC\u7ACB\u5168\u5C4F App \u8FD0\u884C\u3002",
  "qr.resetTitle": "\u5173\u95ED\u96A7\u9053\u5E76\u91CD\u65B0\u5F00\u542F\uFF0C\u53EF\u83B7\u5F97\u65B0\u7684 URL",
  "lan.ifaceTitle": "\u{1F6DC} \u5C40\u57DF\u7F51\u7F51\u5361 / IP \u9009\u62E9",
  "lan.ifaceHint": "\u68C0\u6D4B\u5230\u4E3B\u673A\u5B58\u5728\u591A\u5F20\u7F51\u5361\uFF08\u5982\u7269\u7406 Wi-Fi\u3001\u4EE5\u592A\u7F51\u3001WSL \u6216\u865A\u62DF\u673A\uFF09\u3002\u82E5\u9ED8\u8BA4 IP \u65E0\u6CD5\u88AB\u79FB\u52A8\u7AEF\u8BBF\u95EE\uFF0C\u53EF\u624B\u52A8\u5207\u6362\uFF1A",
  "lan.autoRecommend": "\u26A1 \u81EA\u52A8\u63A8\u8350 ({addr} \xB7 {label})",
  "lan.virtualTag": " [\u865A\u62DF/WSL]",
  "lan.title": "\u5C40\u57DF\u7F51\u8BBF\u95EE",
  "lan.desc": "\u540C\u4E00 Wi-Fi \u4E0B\u7684\u8BBE\u5907\u53EF\u76F4\u63A5\u626B\u7801\u8BBF\u95EE",
  "tunnel.guide": "\u67E5\u770B\u81EA\u5EFA\u96A7\u9053\u670D\u52A1\u5668\u642D\u5EFA\u6559\u7A0B",
  "tunnel.serverConfig": "\u96A7\u9053\u670D\u52A1\u5668\u914D\u7F6E",
  "tunnel.wsPlaceholder": "WebSocket \u5730\u5740\uFF0C\u4F8B\u5982 wss://tunnel.example.com/connect",
  "tunnel.tokenPlaceholder": "\u96A7\u9053\u670D\u52A1\u7AEF\u8FDE\u63A5\u4EE4\u724C\uFF08Tunnel Access Token\uFF09",
  "tunnel.tokenHint": "\u{1F4A1} \u7528\u4E8E\u4E0E\u60A8\u7684 VPS \u96A7\u9053\u670D\u52A1\u7AEF\u5EFA\u7ACB\u53CD\u5411\u901A\u9053\uFF08\u4E0E Web \u7F51\u9875\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u4E92\u76F8\u72EC\u7ACB\uFF09\u3002",
  "tunnel.autostartTitle": "DSH \u542F\u52A8\u65F6\u81EA\u52A8\u6062\u590D\u8BE5\u96A7\u9053\u7684\u8FD0\u884C\u72B6\u6001",
  "tunnel.autostart": "\u968F DSH \u542F\u52A8\u81EA\u52A8\u5F00\u542F",
  "tunnel.saveFirst": "\u8BF7\u5148\u4FDD\u5B58\u670D\u52A1\u5668\u914D\u7F6E",
  "tunnel.methods": "\u516C\u7F51\u8BBF\u95EE\u65B9\u5F0F\uFF08\u96A7\u9053 / \u76F4\u8FDE\u7F51\u5173\uFF0C\u6309\u9700\u9009\u7528\uFF09",
  "tunnel.customTitle": "\u81EA\u5EFA\u96A7\u9053",
  "tunnel.customDesc": "\u8FDE\u63A5\u81EA\u5DF1\u90E8\u7F72\u7684\u96A7\u9053\u670D\u52A1\u5668\uFF0C\u83B7\u5F97\u56FA\u5B9A\u57DF\u540D",
  "cf.saved": "\u2713 \u56FA\u5B9A\u57DF\u540D\u914D\u7F6E\u5DF2\u4FDD\u5B58",
  "cf.advanced": "\u2699\uFE0F \u9AD8\u7EA7\u914D\u7F6E\uFF1A\u56FA\u5B9A\u57DF\u540D (Cloudflare Token) ",
  "cf.configured": "\u25CF \u5DF2\u914D\u7F6E\u56FA\u5B9A\u57DF\u540D",
  "cf.help": "\u5728 Cloudflare Zero Trust \u63A7\u5236\u53F0\u521B\u5EFA Tunnel\uFF0C\u586B\u5165 Token \u4E0E\u56FA\u5B9A\u57DF\u540D\u3002Public Hostname \u7684 Service \u5FC5\u987B\u6307\u5411\u672C\u63D2\u4EF6\u4EE3\u7406\u7AEF\u53E3\uFF08\u9ED8\u8BA4 http://127.0.0.1:3082\uFF09\uFF0C\u4E0D\u8981\u586B DSH \u539F\u7AEF\u53E3 3080\uFF0C\u5426\u5219\u9875\u9762\u80FD\u5F00\u4F46 API \u4F1A 403\u3002\u4E0D\u586B Token \u5219\u4F7F\u7528\u4E34\u65F6\u968F\u673A\u57DF\u540D\u3002",
  "cf.hostnamePlaceholder": "\u81EA\u5B9A\u4E49\u56FA\u5B9A\u57DF\u540D (\u4F8B\u5982: dsh.yourdomain.com)",
  "cf.tokenPlaceholder": "Tunnel Token (\u4F8B\u5982: eyJhIjoi...)",
  "cf.title": "Cloudflare \u96A7\u9053",
  "cf.namedMode": "\u56FA\u5B9A\u57DF\u540D\u6A21\u5F0F\uFF08Token \u8FD0\u884C \xB7 \u91CD\u542F URL \u4FDD\u6301\u4E0D\u53D8\uFF09",
  "cf.quickMode": "\u4E00\u952E\u83B7\u53D6\u516C\u7F51\u5730\u5740\uFF08\u514D\u767B\u5F55\u4E34\u65F6\u968F\u673A\u57DF\u540D\uFF09",
  "gw.portInvalid": "\u7AEF\u53E3\u9700\u4E3A 1-65535 \u4E4B\u95F4\u7684\u6574\u6570",
  "gw.portSaved": "\u2713 \u7AEF\u53E3\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u9700\u300C\u5F00\u542F\u300D\u6216\u91CD\u542F\u540E\u751F\u6548",
  "gw.title": "\u76F4\u8FDE\u7F51\u5173",
  "gw.desc": "\u7ED5\u8FC7\u96A7\u9053\uFF0C\u7531\u7535\u8111\u76F4\u63A5\u76D1\u542C\u516C\u7F51\u7AEF\u53E3\uFF1A(\u7AEF\u53E3\u81EA\u5E26 HTTPS \u81EA\u7B7E\u8BC1\u4E66 + \u5F3A\u5236\u767B\u5F55\u95E8\u7981)",
  "gw.autostartTitle": "DSH \u542F\u52A8\u65F6\u81EA\u52A8\u6062\u590D\u76F4\u8FDE\u7F51\u5173\u7684\u8FD0\u884C\u72B6\u6001",
  "gw.publicReady": "\u2705 \u516C\u7F51\u76F4\u8FBE\uFF1A",
  "gw.mapPort": "\u5728\u8DEF\u7531\u5668/\u4E91\u670D\u52A1\u5668\u4E0A\u628A\u7AEF\u53E3 0.0.0.0:{port} \u6620\u5C04\u5230\u672C\u673A\u540E\uFF0C\u516C\u7F51\u53EF\u8BBF\u95EE\u3002",
  "gw.listening": "\u5DF2\u76D1\u542C 0.0.0.0:{port}\uFF0C\u8BBF\u95EE https://<\u516C\u7F51IP\u6216\u57DF\u540D>{suffix}",
  "gw.gate": "\u{1F512} \u5F3A\u5236\u95E8\u7981\uFF1A\u8BE5\u7F51\u5173\u59CB\u7EC8\u8981\u6C42\u767B\u5F55\uFF08\u81EA\u52A8\u7EE7\u627F\u4F60\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u4E2D\u8BBE\u7F6E\u7684\u5BC6\u7801\uFF0C\u4E0E\u5C40\u57DF\u7F51\u7B56\u7565\u76F8\u4E92\u72EC\u7ACB\uFF09\uFF0C",
  "gw.needPassword": "\u516C\u7F51\u8BBF\u95EE\u5FC5\u987B\u8F93\u5165\u5BC6\u7801\u3002",
  "gw.noPassword": "\u5F53\u524D\u5C1A\u672A\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\uFF0C\u8BF7\u5148\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u4E2D\u8BBE\u7F6E\u3002",
  "gw.tls": "\u{1F510} \u4F20\u8F93\u52A0\u5BC6\uFF1A\u672C\u673A\u81EA\u52A8\u751F\u6210 HTTPS \u81EA\u7B7E\u8BC1\u4E66\uFF0C\u6D4F\u89C8\u5668\u4F1A\u63D0\u793A\u4E0D\u5B89\u5168\uFF0C\u5728\u8BC1\u4E66\u8BE6\u60C5\u4E2D\u52FE\u9009\u300C\u59CB\u7EC8\u5141\u8BB8\u300D\u540E\u5373\u53EF\u6B63\u5E38\u8BBF\u95EE\u3002",
  "gw.port": "\u516C\u7F51\u7AEF\u53E3",
  "gw.closeFirst": "\u8FD0\u884C\u4E2D\u8BF7\u5148\u5173\u95ED\u518D\u6539\u7AEF\u53E3",
  "auth.updateFail": "\u66F4\u65B0\u5931\u8D25",
  "auth.enabled": "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5F00\u542F\uFF08\u73B0\u6709\u767B\u5F55\u6001\u5DF2\u5237\u65B0\uFF09",
  "auth.disabled": "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5173\u95ED",
  "auth.modeSwitched": "\u2713 \u5916\u90E8\u9A8C\u8BC1\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u5DF2\u5237\u65B0\u5168\u57DF\u767B\u5F55\u6001",
  "auth.scopeUpdated": "\u2713 \u9632\u62A4\u751F\u6548\u8303\u56F4\u5DF2\u66F4\u65B0",
  "auth.adminPolicyUpdated": "\u2713 \u8FDC\u7A0B\u7BA1\u7406\u9632\u7BE1\u6539\u7B56\u7565\u5DF2\u66F4\u65B0",
  "auth.accessSaved": "\u2713 \u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u539F\u6709\u7684\u5386\u53F2\u8BBF\u5BA2\u4F1A\u8BDD\u5DF2\u5168\u90E8\u5B89\u5168\u5237\u65B0\u3002",
  "auth.adminSaved": "\u2713 \u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u8FDC\u7A0B\u7BA1\u7406\u89E3\u9501\u72B6\u6001\u5DF2\u91CD\u7F6E\u751F\u6548\u3002",
  "auth.resetConfirm": "\u91CD\u7F6E\u540E\uFF0C\u4E4B\u524D\u5305\u542B\u65E7 Token \u7684\u4E8C\u7EF4\u7801\u548C\u5206\u4EAB\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u3002\u662F\u5426\u786E\u8BA4\u91CD\u7F6E\uFF1F",
  "auth.resetFail": "\u91CD\u7F6E\u5931\u8D25",
  "auth.tokenReset": "\u2713 \u5B89\u5168 Token \u5DF2\u91CD\u7F6E\uFF0C\u4E8C\u7EF4\u7801\u4E0E\u4E13\u5C5E\u94FE\u63A5\u5DF2\u5237\u65B0",
  "auth.scopeAll": "\u5168\u90E8\u901A\u9053 (\u5C40\u57DF\u7F51+\u516C\u7F51)",
  "auth.scopePublic": "\u4EC5\u516C\u7F51\u96A7\u9053",
  "auth.scopeLan": "\u4EC5\u5C40\u57DF\u7F51",
  "auth.modeTokenPassword": "\u626B\u7801\u514D\u5BC6 + \u5BC6\u7801",
  "auth.modePassword": "\u4EC5\u5BC6\u7801\u767B\u5F55",
  "auth.modeToken": "\u4EC5\u5B89\u5168 Token",
  "auth.adminUnlock": "\u9700\u5BC6\u7801\u89E3\u9501",
  "auth.adminLocal": "\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406",
  "auth.adminOpen": "\u5BBD\u677E\u6A21\u5F0F",
  "auth.systemTitle": "\u{1F510} \u5168\u5C40\u8BBF\u95EE\u5B89\u5168\u9632\u62A4\u4F53\u7CFB",
  "auth.systemDesc": "\u96C6\u6210\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\u62E6\u622A\u4E0E\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\u63A7\u5236\uFF0C\u53CC\u91CD\u5B88\u62A4\u8FDC\u7A0B\u4F1A\u8BDD\u4E0E\u7F51\u7EDC\u914D\u7F6E\u5B89\u5168",
  "auth.protectionOn": "\u2713 \u5DF2\u542F\u7528\u5B89\u5168\u9632\u62A4",
  "auth.protectionOff": "\u672A\u5F00\u542F\u5B89\u5168\u9632\u62A4",
  "auth.scopeLabel": "\u{1F310} \u4FDD\u62A4\u8303\u56F4: ",
  "auth.modeLabel": "\u{1F511} \u5916\u90E8\u9A8C\u8BC1: ",
  "auth.adminLabel": "\u{1F512} \u540E\u53F0\u9632\u7BE1\u6539: ",
  "auth.layer1Title": "\u{1F6E1}\uFE0F \u7B2C\u4E00\u9053\u9632\u7EBF\uFF1A\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\uFF08\u63A7\u5236\u8C01\u80FD\u4F7F\u7528 AI\uFF09",
  "auth.layer1Desc": "\u63A7\u5236\u5916\u90E8\u8BBE\u5907\u901A\u8FC7\u5C40\u57DF\u7F51 IP \u6216\u516C\u7F51\u96A7\u9053\uFF08Cloudflare/\u81EA\u5EFA\u96A7\u9053\uFF09\u8FDB\u5165 DSH \u804A\u5929\u754C\u9762\u65F6\u7684\u8EAB\u4EFD\u9A8C\u8BC1\u65B9\u5F0F",
  "auth.modeSelect": "\u9A8C\u8BC1\u6A21\u5F0F\u9009\u62E9",
  "auth.modeTokenPasswordTitle": "\u{1F7E2} \u626B\u7801\u514D\u5BC6 + \u5BC6\u7801\u8BA4\u8BC1 (\u63A8\u8350)",
  "auth.modeTokenPasswordDesc": "\u4E8C\u7EF4\u7801\u81EA\u5E26\u4E13\u5C5E Token \u626B\u7801\u79D2\u8FDB\uFF1B\u76F4\u63A5\u8F93 IP/\u516C\u7F51\u57DF\u540D\u9700\u8F93\u5BC6\u7801",
  "auth.modePasswordTitle": "\u{1F511} \u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55",
  "auth.modePasswordDesc": "\u6240\u6709\u5916\u90E8\u8BBF\u95EE\u5FC5\u987B\u624B\u52A8\u8F93\u5165\u8BBF\u95EE\u5BC6\u7801\u65B9\u53EF\u8FDB\u5165",
  "auth.modeTokenTitle": "\u{1F3AB} \u4EC5\u5B89\u5168 Token \u514D\u5BC6",
  "auth.modeTokenDesc": "\u4EC5\u6301\u6709\u5E26\u5B89\u5168 Token \u7684\u4E8C\u7EF4\u7801\u6216\u4E13\u5C5E\u5206\u4EAB\u94FE\u63A5\u65B9\u53EF\u8FDB\u5165",
  "auth.scopeSelect": "\u9632\u62A4\u751F\u6548\u901A\u9053",
  "auth.scopeAllTitle": "\u5168\u90E8\u901A\u9053\u9632\u62A4 (\u63A8\u8350)",
  "auth.scopeAllDesc": "\u5C40\u57DF\u7F51 IP \u76F4\u8FDE\u4E0E\u516C\u7F51\u96A7\u9053\u5168\u90E8\u53D7\u5B89\u5168\u4FDD\u62A4",
  "auth.scopePublicTitle": "\u4EC5\u516C\u7F51\u96A7\u9053\u5F00\u542F\u9632\u62A4",
  "auth.scopePublicDesc": "\u5C40\u57DF\u7F51\u5185\u8BBE\u5907\u76F4\u63A5\u514D\u5BC6\u76F4\u8FDE\uFF0C\u516C\u7F51\u96A7\u9053\u5F3A\u5236\u9A8C\u8BC1",
  "auth.scopeLanTitle": "\u4EC5\u5C40\u57DF\u7F51\u5F00\u542F\u9632\u62A4",
  "auth.scopeLanDesc": "\u4EC5\u5C40\u57DF\u7F51\u76F4\u8FDE\u9700\u9A8C\u8BC1\uFF0C\u516C\u7F51\u96A7\u9053\u4E0D\u5F00\u542F",
  "auth.accessPwLabel": "\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 {hint}",
  "auth.accessPwSet": "(\u2713 \u5DF2\u8BBE\u7F6E\u8BBF\u5BA2\u5BC6\u7801)",
  "auth.accessPwUnset": "(\u26A0\uFE0F \u5C1A\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u76F4\u63A5\u8F93\u5165 IP \u5C06\u514D\u5BC6)",
  "auth.accessPwPlaceholderChange": "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u8BBF\u5BA2\u5BC6\u7801\uFF09",
  "auth.accessPwPlaceholderSet": "\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801",
  "auth.accessPwHint": "\u{1F4A1} \u5F53\u5916\u90E8\u670B\u53CB\u6216\u540C\u4E8B\u672A\u901A\u8FC7\u4E8C\u7EF4\u7801\u626B\u7801\uFF0C\u800C\u662F\u76F4\u63A5\u8F93\u5165 IP \u6216\u516C\u7F51\u57DF\u540D\u8BBF\u95EE\u65F6\uFF0C\u9700\u8F93\u5165\u6B64\u5BC6\u7801\u767B\u5F55\u3002",
  "auth.tokenLabel": "\u514D\u5BC6\u626B\u7801 Token (\u4E13\u5C5E\u8BBF\u95EE\u51ED\u636E)",
  "auth.tokenNone": "\u672A\u751F\u6210",
  "auth.resetTokenTitle": "\u91CD\u65B0\u751F\u6210 Token\uFF0C\u4F7F\u4E4B\u524D\u5206\u4EAB\u7684\u65E7\u4E8C\u7EF4\u7801\u548C\u94FE\u63A5\u7ACB\u5373\u5931\u6548",
  "auth.resetToken": "\u{1F504} \u91CD\u7F6E\u5B89\u5168 Token",
  "auth.tokenHint": "\u{1F4A1} \u63A7\u5236\u53F0\u751F\u6210\u7684\u5C40\u57DF\u7F51\u4E0E\u516C\u7F51\u4E8C\u7EF4\u7801\u5DF2\u81EA\u52A8\u5D4C\u5165\u6B64 Token\uFF0C\u624B\u673A\u626B\u7801\u5373\u53EF\u514D\u5BC6\u8FDB\u5165\u804A\u5929\u754C\u9762\uFF08\u4F46\u4E0D\u8D4B\u4E88\u540E\u53F0\u7BA1\u7406\u8BBE\u7F6E\u6743\u9650\uFF09\u3002",
  "auth.layer2Title": "\u{1F512} \u7B2C\u4E8C\u9053\u9632\u7EBF\uFF1A\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\uFF08\u63A7\u5236\u8C01\u80FD\u4FEE\u6539\u672C\u63D2\u4EF6\u6240\u6709\u8BBE\u7F6E\uFF09",
  "auth.layer2Desc": "\u9501\u5B9A\u6574\u4E2A\u63D2\u4EF6\u8BBE\u7F6E\u540E\u53F0\uFF08\u5305\u542B\u5C40\u57DF\u7F51\u3001\u516C\u7F51\u96A7\u9053\u3001IM \u673A\u5668\u4EBA\u5BC6\u94A5\u4E0E\u5B89\u5168\u8BBE\u7F6E\uFF09\uFF0C\u9632\u6B62\u4ED6\u4EBA\u968F\u610F\u7BE1\u6539\u914D\u7F6E",
  "auth.adminPwLabel": "\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5458\u5BC6\u7801 {hint}",
  "auth.adminPwSet": "(\u2713 \u5DF2\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801)",
  "auth.adminPwUnset": "(\u672A\u5355\u72EC\u8BBE\u7F6E\uFF0C\u9ED8\u8BA4\u4F7F\u7528\u4E0A\u8FF0\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801)",
  "auth.adminPwPlaceholderChange": "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF09",
  "auth.adminPwPlaceholderSet": "\u8BBE\u7F6E\u540E\u53F0\u7BA1\u7406\u89E3\u9501\u5BC6\u7801\uFF08\u5EFA\u8BAE\u4E0E\u8BBF\u5BA2\u5BC6\u7801\u4E0D\u540C\uFF09",
  "auth.adminPwHint": "\u{1F511} \u6838\u5FC3\u4F5C\u7528\uFF1A\u7528\u4E8E\u8FDC\u7A0B\u8BBE\u5907\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u65F6\u7684\u89E3\u9501\u9A8C\u8BC1\u3002\u8BBE\u7F6E\u540E\uFF0C\u5373\u4FBF\u628A\u8BBF\u95EE\u5BC6\u7801\u544A\u77E5\u4ED6\u4EBA\uFF0C\u4ED6\u4EBA\u4E5F\u65E0\u6CD5\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u6539\u914D\u7F6E\u3002",
  "auth.adminPolicyLabel": "\u8FDC\u7A0B\u8BBE\u5907\u7BA1\u7406\u6743\u9650\u7B56\u7565",
  "auth.policyUnlockTitle": "\u{1F512} \u9700\u5BC6\u7801\u89E3\u9501 (\u63A8\u8350)",
  "auth.policyUnlockDesc": "\u8FDC\u7A0B\u624B\u673A/\u5916\u7F51\u6253\u5F00\u672C\u63D2\u4EF6\u8BBE\u7F6E\u65F6\u9ED8\u8BA4\u5168\u5C40\u9501\u5B9A\uFF0C\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\u540E\u65B9\u53EF\u4F7F\u7528",
  "auth.policyLocalTitle": "\u{1F6AB} \u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406 (\u6700\u4E25\u683C)",
  "auth.policyLocalDesc": "\u8FDC\u7A0B\u8BBE\u5907\u5F7B\u5E95\u9501\u5B9A\u6574\u4E2A\u8BBE\u7F6E\u540E\u53F0\uFF0C\u4EC5\u5141\u8BB8\u5728 127.0.0.1 \u7535\u8111\u672C\u673A\u4E0A\u64CD\u4F5C",
  "auth.policyOpenTitle": "\u{1F513} \u5BBD\u677E\u6A21\u5F0F",
  "auth.policyOpenDesc": "\u4EFB\u4F55\u5DF2\u901A\u8FC7\u7B2C\u4E00\u9053\u9632\u7EBF\u767B\u5F55\u7684\u8BBE\u5907\u5747\u53EF\u76F4\u63A5\u4FEE\u6539\u6240\u6709\u914D\u7F6E",
  "auth.cfTitle": "Cloudflare Zero Trust (Access)",
  "auth.cfDesc": "\u901A\u8FC7 Cloudflare \u96A7\u9053\u7684\u8BBF\u95EE\u6539\u7528 Access \u767B\u5F55\u9A8C\u8BC1\u3002Cloudflare \u4EEA\u8868\u677F\u5B8C\u6210\u767B\u5F55\u540E\uFF0C\u8BBF\u95EE\u8005\u4E0D\u518D\u770B\u5230\u672C\u63D2\u4EF6\u7684\u5BC6\u7801\u9875\u3002",
  "auth.cfEnabled": "Cloudflare Access \u5DF2\u542F\u7528",
  "auth.cfDisabled": "\u542F\u7528 Cloudflare Access",
  "auth.cfTeamPlaceholder": "\u56E2\u961F\u57DF\u540D (\u4F8B\u5982 name.cloudflareaccess.com)",
  "auth.cfAudPlaceholder": "\u5E94\u7528\u7684 AUD \u6807\u7B7E",
  "auth.cfHint": "\u{1F4A1} \u5728 Cloudflare Zero Trust \u2192 Access \u2192 Applications \u4E2D\u4E3A\u516C\u5F00\u57DF\u540D\u521B\u5EFA Self-hosted \u5E94\u7528\u540E\uFF0C\u8F93\u5165\u56E2\u961F\u57DF\u540D\u548C\u8BE5\u5E94\u7528\u7684 AUD\u3002\u96A7\u9053\u8BBF\u95EE\u53EA\u63A5\u53D7\u6709\u6548 JWT\uFF1B\u5C40\u57DF\u7F51\u8BBF\u95EE\u4E0D\u53D7\u5F71\u54CD\u3002",
  "auth.cfSaved": "\u5DF2\u4FDD\u5B58 Cloudflare Access \u8BBE\u7F6E",
  "auth.cfOn": "Cloudflare Access \u5DF2\u5F00\u542F",
  "auth.cfOff": "Cloudflare Access \u5DF2\u5173\u95ED",
  "im.allowFail": "\u6DFB\u52A0\u767D\u540D\u5355\u5931\u8D25",
  "im.docsWechat": "\u{1F4D6} \u5FAE\u4FE1\u4F7F\u7528\u8BF4\u660E",
  "im.docsQq": "\u{1F4D6} QQ \u4F7F\u7528\u8BF4\u660E",
  "im.openQq": "\u{1F310} QQ \u5F00\u653E\u5E73\u53F0",
  "im.docsFeishu": "\u{1F4D6} \u98DE\u4E66\u4F7F\u7528\u8BF4\u660E",
  "im.openFeishu": "\u{1F310} \u98DE\u4E66\u5F00\u653E\u5E73\u53F0",
  "im.docsTelegram": "\u{1F4D6} Telegram \u4F7F\u7528\u8BF4\u660E",
  "im.openBotFather": "\u{1F310} @BotFather \u7533\u8BF7 Bot",
  "im.collapseCmds": "\u6536\u8D77\u547D\u4EE4",
  "im.cmdList": "\u547D\u4EE4\u5217\u8868",
  "im.cmdNew": "/new <\u63D0\u793A\u8BCD> \u2014 \u65B0\u5EFA\u4F1A\u8BDD\u5E76\u5F00\u59CB\uFF08\u5F53\u524D\u5DE5\u4F5C\u533A\uFF09",
  "im.cmdNewAt": "/new <\u63D0\u793A\u8BCD> @N \u2014 \u5728\u6307\u5B9A\u5DE5\u4F5C\u533A\u65B0\u5EFA\u4F1A\u8BDD",
  "im.cmdSessions": "/sessions\uFF08\u6216 /list\uFF09\u2014 \u5217\u51FA\u4F1A\u8BDD\uFF08\u6309\u5DE5\u4F5C\u533A\u5206\u7EC4\uFF0C\u5E26\u6807\u9898\uFF09",
  "im.cmdUse": "/use N\uFF08\u6216 /resume N\uFF09\u2014 \u5207\u6362\u5230\u4F1A\u8BDD N",
  "im.cmdWorkspaces": "/workspaces \u2014 \u5217\u51FA\u6240\u6709\u53EF\u7528\u5DE5\u4F5C\u533A",
  "im.cmdEnd": "/end \u2014 \u7ED3\u675F\u5F53\u524D\u4F1A\u8BDD\uFF08\u56DE\u5230\u65E0\u6D3B\u52A8\u4F1A\u8BDD\u72B6\u6001\uFF09",
  "im.cmdStop": "/stop \u2014 \u505C\u6B62\u5F53\u524D\u4EFB\u52A1",
  "im.cmdStatus": "/status \u2014 \u67E5\u770B Agent \u72B6\u6001\u4E0E\u4F1A\u8BDD\u6458\u8981",
  "im.cmdYesNo": "/yes \u6216 /no\uFF08\u6216 1/2\uFF09\u2014 \u56DE\u5E94\u6743\u9650\u5BA1\u6279\u8BF7\u6C42",
  "im.cmdHelp": "/help \u2014 \u663E\u793A\u5B8C\u6574\u547D\u4EE4\u5E2E\u52A9",
  "im.connStatus": "\u8FDE\u63A5\u72B6\u6001",
  "im.loginAccount": "\u767B\u5F55\u8D26\u53F7",
  "im.activeSession": "\u6D3B\u52A8\u4F1A\u8BDD",
  "im.allowList": "\u767D\u540D\u5355 (\u5DF2\u6388\u6743 {count} \u4E2A\u8D26\u53F7/\u7FA4):",
  "im.removeAllow": "\u79FB\u51FA\u767D\u540D\u5355",
  "im.allowEmptyWechat": "(\u7A7A \u2014 \u626B\u7801\u540E\u9996\u4E2A\u53D1\u6D88\u606F\u7684\u5FAE\u4FE1\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)",
  "im.allowEmpty": "(\u7A7A \u2014 \u9996\u4E2A\u53D1\u6D88\u606F\u7684\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)",
  "im.allowPlaceholderWechat": "\u6DFB\u52A0\u5141\u8BB8\u7684\u5FAE\u4FE1 ID\uFF08\u5982 xxx@im.wechat\uFF09\uFF0C\u6309 Enter \u6DFB\u52A0",
  "im.allowPlaceholder": "\u6DFB\u52A0\u5141\u8BB8\u7684\u7528\u6237/\u7FA4 ID\uFF0C\u6309 Enter \u6DFB\u52A0",
  "im.unbindConfirm": "\u786E\u8BA4\u89E3\u7ED1\uFF1F\u8FD9\u5C06\u6E05\u9664\u4FDD\u5B58\u7684\u51ED\u8BC1\u3002",
  "im.unbindTitle": "\u6E05\u9664\u767B\u5F55\u51ED\u8BC1\uFF0C\u4E0B\u6B21\u9700\u91CD\u65B0\u914D\u7F6E",
  "im.unbind": "\u89E3\u7ED1\u8D26\u53F7",
  "im.scanChatTitle": "\u{1F4F1} \u624B\u673A {name} \u626B\u7801\u76F4\u8FBE\u5BF9\u8BDD",
  "im.scanChatDesc": "\u7528 {name} \u626B\u63CF\u5DE6\u4FA7\u4E8C\u7EF4\u7801\uFF0C\u7ACB\u5373\u6253\u5F00\u4E0E Bot \u5BF9\u8BDD\uFF1B\u53D1\u9001\u9996\u6761\u6D88\u606F\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002",
  "im.openClient": "\u5728 {name} \u5BA2\u6237\u7AEF\u6253\u5F00 \u2197",
  "im.scanned": "\u5DF2\u626B\u7801\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u786E\u8BA4\u2026",
  "im.scanWechat": "\u8BF7\u4F7F\u7528\u5FAE\u4FE1\u626B\u7801\u767B\u5F55\uFF08ClawBot\uFF09",
  "im.scanGeneric": "\u8BF7\u626B\u7801\u767B\u5F55",
  "im.scanCreateHint": "\u{1F4A1} \u626B\u7801\u81EA\u52A8\u521B\u5EFA\u5F15\u5BFC\uFF1A",
  "im.runInTerminal": " \u53EF\u5728\u7EC8\u7AEF\u8FD0\u884C ",
  "im.scanCreateManual": " \u624B\u673A\u626B\u7801\u4E00\u952E\u81EA\u52A8\u521B\u5EFA\u5E94\u7528\u5E76\u8F93\u51FA\u51ED\u8BC1\uFF1B\u6216\u5728\u4E0B\u65B9\u624B\u52A8\u586B\u5165\u51ED\u8BC1\u3002",
  "im.tgTokenLabel": "Bot Token \u2014 Telegram @BotFather \u4E0B\u53D1\u7684\u673A\u5668\u4EBA Token",
  "im.tgTokenPlaceholder": "\u8BF7\u8F93\u5165 Telegram Bot Token (\u5982 123456789:ABCdef...)",
  "im.hideSecretTitle": "\u9690\u85CF\u5BC6\u94A5",
  "im.showSecretTitle": "\u663E\u793A\u660E\u6587",
  "im.proxyLabel": "\u7F51\u7EDC\u4EE3\u7406 (\u53EF\u9009) \u2014 \u652F\u6301\u56FD\u5185 HTTP / HTTPS \u4EE3\u7406",
  "im.proxyPlaceholder": "\u53EF\u9009\uFF0C\u4F8B\u5982 http://127.0.0.1:7890\uFF08\u4E3A\u7A7A\u5219\u76F4\u8FDE\u6216\u8BFB\u53D6\u73AF\u5883\u53D8\u91CF\uFF09",
  "im.qqAppIdLabel": "AppID \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5E94\u7528 ID",
  "im.feishuAppIdLabel": "App ID \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u81EA\u5EFA\u5E94\u7528 ID (cli_xxx)",
  "im.qqAppIdPlaceholder": "\u8BF7\u8F93\u5165 AppID",
  "im.feishuAppIdPlaceholder": "\u8BF7\u8F93\u5165 App ID (\u5982 cli_a1b2c3d4...)",
  "im.qqSecretLabel": "ClientSecret \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5BC6\u94A5",
  "im.feishuSecretLabel": "App Secret \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u5E94\u7528\u5BC6\u94A5",
  "im.qqSecretPlaceholder": "\u8BF7\u8F93\u5165 ClientSecret",
  "im.feishuSecretPlaceholder": "\u8BF7\u8F93\u5165 App Secret",
  "im.qqApply": "\u{1F4D6} \u524D\u5F80 QQ \u5F00\u653E\u5E73\u53F0\u7533\u8BF7\u673A\u5668\u4EBA",
  "im.feishuApply": "\u{1F4D6} \u524D\u5F80\u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u521B\u5EFA\u4F01\u4E1A\u81EA\u5EFA\u5E94\u7528",
  "im.connectFail": "\u8FDE\u63A5\u5931\u8D25",
  "im.loginFail": "\u767B\u5F55\u5931\u8D25",
  "im.noteWechat": "\u8BF4\u660E: \u626B\u7801\u6210\u529F\u540E\uFF0C\u5411\u8BE5\u5FAE\u4FE1 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u5FAE\u4FE1\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002\u4F7F\u7528\u4E13\u7528\u5FAE\u4FE1\u53F7\uFF0C\u907F\u514D\u5F71\u54CD\u4E3B\u53F7\u3002",
  "im.noteQq": "\u8BF4\u660E: \u586B\u5165 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u7684 AppID \u4E0E ClientSecret \u540E\u4FDD\u5B58\u5373\u81EA\u52A8\u8FDE\u63A5\u3002\u7528\u6237\u5411 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684 QQ \u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002",
  "im.noteGeneric": "\u8BF4\u660E: \u767B\u5F55\u6210\u529F\u540E\uFF0C\u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002",
  "im.wechat": "\u5FAE\u4FE1",
  "im.wechatDesc": "ClawBot \u626B\u7801\u76F4\u8FDE \xB7 \u65E0\u9700\u516C\u7F51",
  "im.qq": "QQ",
  "im.qqDesc": "\u5B98\u65B9\u673A\u5668\u4EBA \xB7 \u79C1\u804A/\u7FA4\u804A/\u6309\u94AE",
  "im.feishu": "\u98DE\u4E66",
  "im.feishuDesc": "\u5B98\u65B9 WebSocket \u957F\u8FDE\u63A5 \xB7 \u514D\u516C\u7F51",
  "im.telegram": "Telegram",
  "im.telegramDesc": "\u5B98\u65B9 Bot API",
  "ops.uptimeDays": "{days}\u5929 {hrs}\u5C0F\u65F6 {mins}\u5206",
  "ops.uptimeHours": "{hrs}\u5C0F\u65F6 {mins}\u5206",
  "ops.uptimeMins": "{mins}\u5206\u949F",
  "ops.metricsTitle": "\u{1F4CA} \u5BBF\u4E3B\u7CFB\u7EDF\u4E0E\u8FD0\u884C\u770B\u677F",
  "ops.cpu": "CPU \u6838\u5FC3\u4E0E\u578B\u53F7",
  "ops.cpuCores": "{n} \u6838\u5FC3 ({model})",
  "ops.uptime": "DSH \u8FD0\u884C\u65F6\u95F4 (Uptime)",
  "ops.heap": "Node \u8FDB\u7A0B\u5806\u5185\u5B58",
  "ops.memUsage": "\u7CFB\u7EDF\u5185\u5B58\u5360\u7528: {used} GB / {total} GB",
  "ops.diagErr": "\u8BCA\u65AD\u8BF7\u6C42\u5F02\u5E38",
  "ops.diagTitle": "\u{1F50D} \u7F51\u7EDC\u8FDE\u901A\u6027\u4E00\u952E\u8BCA\u65AD",
  "ops.diagDesc": "\u4E00\u952E\u68C0\u6D4B\u672C\u5730\u53CD\u5411\u4EE3\u7406\u7AEF\u53E3\u3001\u5C40\u57DF\u7F51 IPv4\u3001Cloudflare Anycast \u5EF6\u8FDF\u4EE5\u53CA\u56FD\u5185 npmmirror \u955C\u50CF\u6E90\u8FDE\u901A\u6027\u3002",
  "ops.diagRunning": "\u6B63\u5728\u63A2\u6D4B\u8FDE\u901A\u6027\u2026",
  "ops.diagRetry": "\u{1F504} \u91CD\u65B0\u8BCA\u65AD\u7F51\u7EDC",
  "ops.diagStart": "\u{1F50D} \u5F00\u59CB\u4E00\u952E\u8BCA\u65AD",
  "ops.diagOk": "\u2713 \u6240\u6709\u7F51\u7EDC\u63A2\u6D4B\u9879\u6B63\u5E38",
  "ops.diagWarn": "\u25B2 \u68C0\u6D4B\u5230\u90E8\u5206\u5EF6\u8FDF\u8F83\u9AD8\u6216\u5F02\u5E38",
  "ops.diagProbing": "\u6B63\u5728\u6267\u884C\u7F51\u7EDC\u7AEF\u53E3\u4E0E\u4E91\u7AEF\u8282\u70B9\u8FDE\u901A\u6027\u63A2\u6D4B\u2026",
  "ops.exportOk": "\u2713 \u5907\u4EFD\u6587\u4EF6\u5DF2\u6210\u529F\u5BFC\u51FA\u5E76\u4E0B\u8F7D\u5230\u672C\u5730\uFF01",
  "ops.exportFail": "\u5BFC\u51FA\u5907\u4EFD\u5931\u8D25",
  "ops.exportErr": "\u5BFC\u51FA\u5F02\u5E38",
  "ops.importOk": "\u2713 \u914D\u7F6E\u5DF2\u6210\u529F\u5BFC\u5165\u5E76\u5237\u65B0\u751F\u6548\uFF01",
  "ops.importFail": "\u5BFC\u5165\u914D\u7F6E\u5931\u8D25",
  "ops.importParseFail": "\u5BFC\u5165\u89E3\u6790\u5931\u8D25: {message}",
  "ops.backupTitle": "\u{1F5C4}\uFE0F \u5168\u5C40\u914D\u7F6E\u5907\u4EFD\u4E0E\u6062\u590D",
  "ops.backupDesc": "\u652F\u6301\u4E00\u952E\u5BFC\u51FA\u6216\u5BFC\u5165\u6062\u590D\u672C\u63D2\u4EF6\u6240\u6709\u914D\u7F6E\uFF08\u5305\u542B\u5404 IM \u5E73\u53F0\u51ED\u8BC1\u3001\u6388\u6743\u767D\u540D\u5355\u3001\u516C\u7F51\u96A7\u9053\u4E0E\u5B89\u5168\u8BA4\u8BC1\u89C4\u5219\uFF09\u3002",
  "ops.exporting": "\u6B63\u5728\u5BFC\u51FA\u2026",
  "ops.export": "\u{1F4E5} \u5BFC\u51FA\u914D\u7F6E\u5907\u4EFD (.json)",
  "ops.importing": "\u6B63\u5728\u5BFC\u5165\u2026",
  "ops.import": "\u{1F4E4} \u5BFC\u5165\u914D\u7F6E\u6062\u590D",
  "ops.restartSending": "\u6B63\u5728\u5411 DSH \u670D\u52A1\u53D1\u9001\u91CD\u542F\u6307\u4EE4\u2026",
  "ops.restartReconnecting": "DSH \u670D\u52A1\u6B63\u5728\u91CD\u542F\u4E2D\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u65B0\u8FDE\u63A5\u2026",
  "ops.restartSuccess": "\u{1F389} \u91CD\u542F\u6210\u529F\uFF01\u5DF2\u91CD\u65B0\u5EFA\u7ACB\u8FDE\u63A5\uFF0C\u6B63\u5728\u5237\u65B0\u9875\u9762\u2026",
  "ops.restartTimeout": "\u91CD\u8FDE\u7B49\u5F85\u8D85\u65F6\uFF0C\u8BF7\u624B\u52A8\u5237\u65B0\u9875\u9762\u3002",
  "ops.restartTitle": "\u{1F504} DSH \u670D\u52A1\u5E73\u6ED1\u91CD\u542F",
  "ops.restartDesc": "\u4F18\u96C5\u9000\u51FA\u5E76\u91CD\u65B0\u62C9\u8D77\u5F53\u524D DSH \u8FDB\u7A0B\u4E0E\u6240\u6709\u63D2\u4EF6\u670D\u52A1\uFF0C\u524D\u7AEF\u5C06\u5728\u51E0\u79D2\u540E\u81EA\u52A8\u63A2\u6D4B\u91CD\u8FDE\u5E76\u5237\u65B0\u9875\u9762\u3002",
  "ops.restartNow": "\u{1F504} \u7ACB\u5373\u91CD\u542F DSH \u670D\u52A1",
  "ops.restartScheduling": "\u6B63\u5728\u8C03\u5EA6\u2026",
  "ops.wsTitle": "\u{1F5C2}\uFE0F \u8FDC\u7A0B\u5DE5\u4F5C\u533A\u7BA1\u7406 (\u76EE\u5F55\u6D4F\u89C8\u5668)",
  "ops.wsDesc": "\u5728\u79FB\u52A8\u7AEF\u6216\u8FDC\u7A0B\u8BBE\u5907\u4E0A\u53EF\u89C6\u70B9\u9009\u7535\u8111\u4E0A\u7684\u6587\u4EF6\u5939\u6216\u76F4\u63A5\u8F93\u5165\u8DEF\u5F84\u6DFB\u52A0\u81F3 DSH\u3002",
  "ops.wsAdd": "+ \u8FDC\u7A0B\u6DFB\u52A0\u5DE5\u4F5C\u533A",
  "ops.wsLoading": "\u6B63\u5728\u8BFB\u53D6\u5DE5\u4F5C\u533A\u5217\u8868\u2026",
  "ops.wsEmpty": "\u6682\u65E0\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u300C+ \u8FDC\u7A0B\u6DFB\u52A0\u5DE5\u4F5C\u533A\u300D\u5373\u53EF\u6D4F\u89C8\u6DFB\u52A0\u3002",
  "ver.upgraded": "\u5DF2\u6210\u529F\u5347\u7EA7\u5230 v{latest}\uFF01",
  "ver.upgradeFail": "\u5347\u7EA7\u5931\u8D25",
  "ver.upgradeReqFail": "\u5347\u7EA7\u8BF7\u6C42\u5931\u8D25",
  "ver.restartScheduling": "\u6B63\u5728\u8C03\u5EA6 DSH \u670D\u52A1\u91CD\u542F\u2026",
  "ver.restartReconnecting": "DSH \u670D\u52A1\u6B63\u5728\u91CD\u542F\u4E2D\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u65B0\u8FDE\u63A5\u2026",
  "ver.restartLoaded": "\u{1F389} \u91CD\u542F\u6210\u529F\uFF01\u5DF2\u81EA\u52A8\u52A0\u8F7D\u6700\u65B0\u7248\u672C\u3002\u6B63\u5728\u5237\u65B0\u9875\u9762\u2026",
  "ver.restartOk": "\u{1F389} \u91CD\u542F\u6210\u529F\uFF01\u5DF2\u91CD\u65B0\u5EFA\u7ACB\u8FDE\u63A5\uFF0C\u6B63\u5728\u5237\u65B0\u9875\u9762\u2026",
  "ver.restartTimeout": "\u91CD\u8FDE\u7B49\u5F85\u8D85\u65F6\uFF0C\u8BF7\u624B\u52A8\u5237\u65B0\u9875\u9762\u3002",
  "ver.changelog": "\u66F4\u65B0\u65E5\u5FD7",
  "ver.feedback": "\u53CD\u9988 Issue",
  "ver.checking": "\u7248\u672C\u68C0\u67E5\u4E2D\u2026",
  "ver.latest": "\xB7 \u5DF2\u662F\u6700\u65B0",
  "ver.timeout": "(\u7F51\u7EDC\u8D85\u65F6)",
  "ver.recheck": "\u91CD\u65B0\u68C0\u67E5 npm \u7EBF\u4E0A\u7248\u672C",
  "ver.checkBusy": "\u68C0\u67E5\u4E2D\u2026",
  "ver.check": "\u68C0\u67E5\u66F4\u65B0",
  "ver.newVersion": "\u53D1\u73B0\u65B0\u7248\u672C v{latest}\uFF08\u5F53\u524D v{current}\uFF09",
  "ver.upgrading": "\u6B63\u5728\u81EA\u52A8\u5347\u7EA7\u2026",
  "ver.upgradeDone": "\u2713 \u5347\u7EA7\u5B8C\u6210",
  "ver.upgradeTo": "\u4E00\u952E\u5347\u7EA7\u5230 v{latest}",
  "ver.highlights": "\u2728 \u66F4\u65B0\u4EAE\u70B9\uFF1A",
  "ver.needRestart": "\u5DF2\u6210\u529F\u5347\u7EA7\u5230 v{latest}\uFF01\u9700\u8981\u91CD\u542F DSH \u670D\u52A1\u4F7F\u65B0\u7248\u672C\u751F\u6548",
  "ver.restartLater": "\u7A0D\u540E\u624B\u52A8\u91CD\u542F",
  "ver.processing": "\u6B63\u5728\u5904\u7406\u2026",
  "ver.collapseManual": "\u25B4 \u6298\u53E0\u624B\u52A8\u547D\u4EE4\u884C",
  "ver.showManual": "\u25BE \u67E5\u770B\u624B\u52A8\u5347\u7EA7\u547D\u4EE4 (\u5982\u9700)",
  "tab.lan": "\u5C40\u57DF\u7F51",
  "tab.tunnel": "\u516C\u7F51\u8BBF\u95EE",
  "tab.im": "IM \u673A\u5668\u4EBA",
  "tab.security": "\u5B89\u5168\u8BA4\u8BC1",
  "tab.ops": "\u8FD0\u7EF4\u76D1\u63A7",
  "lock.localOnlyTitle": "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A\uFF08\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\uFF09",
  "lock.localOnlyBody": "\u5F53\u524D\u8BBE\u5907\u901A\u8FC7\u8FDC\u7A0B\u5C40\u57DF\u7F51\u6216\u516C\u7F51\u63A5\u5165\u3002\u5DF2\u5F00\u542F\u300C\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\u300D\u6700\u9AD8\u5B89\u5168\u7B56\u7565\uFF0C\u8FDC\u7A0B\u8BBE\u5907\u7981\u6B62\u67E5\u770B\u4E0E\u4FEE\u6539\u4EFB\u4F55\u7F51\u7EDC\u4E0E\u673A\u5668\u4EBA\u914D\u7F6E\u3002\u5982\u9700\u7BA1\u7406\u8BF7\u5728\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u4E0A\u64CD\u4F5C\u3002",
  "lock.howUnlock": "\u2753 \u8FDC\u7A0B\u5982\u4F55\u6551\u6025\u89E3\u9664\u9501\u5B9A\uFF1F",
  "lock.guideTitle": "\u{1F6DF} \u6551\u6025\u89E3\u9664\u9501\u5B9A\u6307\u5F15\uFF1A",
  "lock.step1Label": "\u7535\u8111\u672C\u673A\u76F4\u8FDE\u4FEE\u6539",
  "lock.step1Body": "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u7B56\u7565\u6216\u6E05\u9664\u5BC6\u7801\u3002",
  "lock.step2Label": "\u670D\u52A1\u5668\u6551\u6025\u6307\u4EE4",
  "lock.step2Body": "\uFF1A\u5728\u5BBF\u4E3B\u7535\u8111/\u670D\u52A1\u5668\u7EC8\u7AEF\u6267\u884C ",
  "lock.step2Tail": " \u5373\u53EF\u77AC\u95F4\u6E05\u7A7A\u5BC6\u7801\u6062\u590D\u521D\u59CB\u72B6\u6001\u3002",
  "lock.title": "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A",
  "lock.body": "\u5F53\u524D\u8BBE\u5907\u4E3A\u8FDC\u7A0B\u8BBF\u95EE\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u4E0E\u5E73\u53F0\u914D\u7F6E\u5B89\u5168\uFF0C\u8BF7\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u7801\u89E3\u9501\u7BA1\u7406\u6743\u9650\u3002",
  "lock.pwPlaceholder": "\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801",
  "lock.forgot": "\u2753 \u5FD8\u8BB0\u540E\u53F0\u7BA1\u7406\u5BC6\u7801\uFF1F",
  "lock.resetGuideTitle": "\u{1F6DF} \u627E\u56DE\u4E0E\u91CD\u7F6E\u5BC6\u7801\u6307\u5F15\uFF1A",
  "lock.step1BodyPw": "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u7BA1\u7406\u5BC6\u7801\u3002",
  "lock.step2BodyHost": "\uFF1A\u5728\u5BBF\u4E3B\u7535\u8111\u7EC8\u7AEF\u6267\u884C ",
  "lock.unlocked": "\u{1F513} \u7BA1\u7406\u5458\u6743\u9650\u5DF2\u89E3\u9501\uFF08\u5F53\u524D\u4E34\u65F6\u4F1A\u8BDD\u6709\u6548\uFF09",
  "lock.lockedHint": "\u{1F512} \u540E\u53F0\u7BA1\u7406\u6743\u9650\u672A\u89E3\u9501\uFF08\u4FEE\u6539\u654F\u611F\u914D\u7F6E\u9700\u5148\u89E3\u9501\uFF09",
  "lock.modalTitle": "\u{1F512} \u89E3\u9501\u540E\u53F0\u7BA1\u7406\u6743\u9650",
  "lock.modalBody": "\u5F53\u524D\u64CD\u4F5C\u9700\u8981\u540E\u53F0\u7BA1\u7406\u5458\u6743\u9650\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u914D\u7F6E\u4E0E\u673A\u5668\u4EBA\u5E73\u53F0\u5B89\u5168\uFF0C\u8BF7\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\uFF1A",
  "lock.modalPlaceholder": "\u8BF7\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801",
  "lock.modalHint": "\u{1F4A1} \u63D0\u793A\uFF1A\u82E5\u672A\u5355\u72EC\u914D\u7F6E\u7BA1\u7406\u5BC6\u7801\uFF0C\u8BF7\u8F93\u5165\u521D\u6B21\u8BBE\u7F6E\u7684\u8BBF\u95EE\u5BC6\u7801\uFF1B\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u8BBF\u95EE\u4EAB\u6709\u514D\u5BC6\u7BA1\u7406\u7279\u6743\u3002",
  "err.adminPassword": "\u7BA1\u7406\u5458\u5BC6\u7801\u9519\u8BEF",
  "err.unlockFail": "\u89E3\u9501\u8BF7\u6C42\u5931\u8D25",
  "err.loadTimeout": "\u52A0\u8F7D\u8D85\u65F6\uFF08\u5BBF\u4E3B\u8FDE\u63A5\u53EF\u80FD\u5728\u5207\u6362\u6216\u672A\u5EFA\u7ACB\uFF09\u3002\u8BF7\u70B9\u51FB\u300C\u{1F504} \u91CD\u8BD5\u300D\u5237\u65B0\u3002",
  "err.loadFail": "\u52A0\u8F7D\u5931\u8D25",
  "mobile.openMenu": "\u6253\u5F00\u83DC\u5355",
  "mobile.newSession": "\u65B0\u5EFA\u4F1A\u8BDD",
  "mobile.newSessionFallback": "\u65B0\u4F1A\u8BDD",
  "mobile.sessionFallback": "\u4F1A\u8BDD",
  "mobile.backToChat": "\u8FD4\u56DE\u5BF9\u8BDD",
  "mobile.chatFallback": "\u5BF9\u8BDD",
  "ws.pickTitle": "\u9009\u62E9\u7535\u8111\u5DE5\u4F5C\u533A",
  "ws.pickSubtitle": "\u70B9\u51FB\u8FDB\u5165\u6587\u4EF6\u5939\uFF0C\u6216\u70B9\u51FB\u300C+ \u9009\u4E3A\u5DE5\u4F5C\u533A\u300D\u76F4\u63A5\u6DFB\u52A0\u5E76\u5207\u6362",
  "ws.upTitle": "\u8FD4\u56DE\u4E0A\u4E00\u7EA7",
  "ws.up": "\u2B06\uFE0F \u4E0A\u7EA7",
  "ws.refresh": "\u5237\u65B0\u76EE\u5F55",
  "ws.currentDir": "\u5F53\u524D\u76EE\u5F55:",
  "ws.adding": "\u6B63\u5728\u6DFB\u52A0\u5E76\u5207\u6362\u2026",
  "ws.setAndEnter": "\u{1F449} \u8BBE\u4E3A\u5F53\u524D\u5DE5\u4F5C\u533A\u5E76\u8FDB\u5165",
  "ws.filterPlaceholder": "\u8FC7\u6EE4\u5B50\u6587\u4EF6\u5939\u2026",
  "ws.folderCount": "{n} \u4E2A\u6587\u4EF6\u5939",
  "ws.reading": "\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55\u5185\u5BB9\u2026",
  "ws.noMatch": "\u672A\u627E\u5230\u5339\u914D\u7684\u5B50\u6587\u4EF6\u5939",
  "ws.noChildren": "\u5F53\u524D\u6587\u4EF6\u5939\u4E0B\u6CA1\u6709\u66F4\u591A\u5B50\u6587\u4EF6\u5939",
  "ws.clickBlue": "\uFF08\u76F4\u63A5\u70B9\u51FB\u4E0A\u65B9\u84DD\u8272\u6309\u94AE\u5373\u53EF\u8FDB\u5165\u5F53\u524D\u76EE\u5F55\uFF09",
  "ws.pickEntryTitle": "\u76F4\u63A5\u6DFB\u52A0\u6B64\u5B50\u6587\u4EF6\u5939\u4E3A\u5DE5\u4F5C\u533A\u5E76\u8FDB\u5165",
  "ws.pickEntry": "+ \u9009\u4E3A\u5DE5\u4F5C\u533A",
  "ws.hideManual": "\u25BC \u6536\u8D77\u7EDD\u5BF9\u8DEF\u5F84\u624B\u52A8\u8F93\u5165",
  "ws.showManual": "\u25B6 \u624B\u52A8\u7C98\u8D34/\u8F93\u5165\u7EDD\u5BF9\u8DEF\u5F84",
  "ws.pathPlaceholder": "\u8F93\u5165\u7535\u8111\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u4F8B\u5982 C:\\Projects\\my-app",
  "ws.go": "\u524D\u5F80",
  "ws.addAndEnter": "\u6DFB\u52A0\u5E76\u8FDB\u5165",
  "ws.registered": "\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A ({n} \u4E2A\uFF0C\u70B9\u51FB\u76F4\u63A5\u5207\u6362)\uFF1A",
  "ws.enter": "\u8FDB\u5165 \u2794",
  "ws.clickFolders": "\u{1F4A1} \u70B9\u51FB\u6587\u4EF6\u5939\u53EF\u9010\u7EA7\u8FDB\u5165",
  "ws.switching": "\u6B63\u5728\u5207\u6362\u5DE5\u4F5C\u533A\u2026",
  "ws.switched": "\u2713 \u5DF2\u5207\u6362\u81F3\u5DE5\u4F5C\u533A\uFF01",
  "ws.readFail": "\u8BFB\u53D6\u76EE\u5F55\u5931\u8D25",
  "ws.needPath": "\u8BF7\u8F93\u5165\u6216\u9009\u62E9\u5DE5\u4F5C\u533A\u8DEF\u5F84",
  "ws.selected": "\u2713 \u5DE5\u4F5C\u533A\u300C{title}\u300D\u5DF2\u9009\u5B9A\uFF0C\u6B63\u5728\u5207\u6362\u2026",
  "ws.addFail": "\u6DFB\u52A0\u5DE5\u4F5C\u533A\u5931\u8D25",
  "ws.addErr": "\u6DFB\u52A0\u5DE5\u4F5C\u533A\u5F02\u5E38"
};
var en = {
  "section.remote": "Remote Access",
  "status.running": "Running",
  "status.stopped": "Stopped",
  "status.connected": "Connected",
  "status.connecting": "Connecting\u2026",
  "status.reconnecting": "Reconnecting\u2026",
  "status.paused": "Paused",
  "status.pausedExpired": "Paused (session expired)",
  "status.error": "Error",
  "status.errorShort": "Error",
  "status.disconnected": "Not connected",
  "status.comingSoon": "Coming soon",
  "status.loading": "Loading\u2026",
  "status.switching": "Switching\u2026",
  "status.downloading": "Downloading\u2026",
  "status.processing": "Working\u2026",
  "status.verifying": "Verifying\u2026",
  "status.saving": "Saving\u2026",
  "btn.save": "Save",
  "btn.saved": "\u2713 Saved",
  "btn.saveFail": "Save failed",
  "btn.saveConfigFail": "Failed to save config",
  "btn.saving": "Saving\u2026",
  "btn.start": "Start",
  "btn.stop": "Stop",
  "btn.clear": "Clear",
  "btn.add": "Add",
  "btn.hide": "Hide",
  "btn.show": "Show",
  "btn.cancel": "Cancel",
  "btn.close": "Close",
  "btn.retry": "\u{1F504} Retry",
  "btn.copyLink": "Copy link",
  "btn.copied": "\u2713 Copied",
  "btn.hideQr": "Hide QR",
  "btn.showQr": "Show QR",
  "btn.resetLink": "\u{1F504} Reset link",
  "btn.saveCf": "Save hostname config",
  "btn.savePort": "Save port",
  "btn.startGw": "Enable Direct Gateway",
  "btn.stopGw": "Disable Direct Gateway",
  "btn.saveAccessPw": "Save access password",
  "btn.saveAdminPw": "Save admin password",
  "btn.savedOk": "\u2713 Saved!",
  "btn.saveConnect": "Save & connect",
  "btn.reconnect": "Reconnect",
  "btn.disconnect": "Disconnect",
  "btn.scanLogin": "Scan to log in",
  "btn.unlock": "Unlock admin",
  "btn.unlockNow": "\u{1F511} Enter admin password",
  "btn.unlockImmediate": "Unlock",
  "btn.unlockAdmin": "\u{1F511} Unlock admin",
  "btn.relock": "\u{1F512} Lock admin again",
  "btn.hideSecret": "\u{1F648} Hide",
  "btn.showSecret": "\u{1F441}\uFE0F Show",
  "btn.goEnable": "Enable \u2794",
  "btn.settings": "Settings \u2794",
  "btn.collapse": "\u25B4 Collapse",
  "btn.expand": "\u25BE Expand",
  "qr.authOnTitle": "Open Security to configure",
  "qr.authOn": "\u{1F6E1}\uFE0F Access auth is on \xB7 QR devices skip the password",
  "qr.authOffTitle": "Open Security to enable access protection",
  "qr.authOff": "\u26A0\uFE0F Access auth is off. Enable a password or QR token under Security.",
  "qr.privateHint": "Use in a private environment",
  "qr.pwaHint": "\u{1F4F1} Tip: after scanning in a phone browser, use \u201CAdd to Home Screen\u201D to run as a fullscreen app.",
  "qr.resetTitle": "Stop and restart the tunnel to get a new URL",
  "lan.ifaceTitle": "\u{1F6DC} LAN adapter / IP",
  "lan.ifaceHint": "This host has multiple adapters (Wi-Fi, Ethernet, WSL, or a VM). Switch if the default IP is not reachable from your phone:",
  "lan.autoRecommend": "\u26A1 Auto ({addr} \xB7 {label})",
  "lan.virtualTag": " [virtual/WSL]",
  "lan.title": "LAN access",
  "lan.desc": "Scan the QR code from a device on the same Wi-Fi",
  "tunnel.guide": "Custom tunnel server setup guide",
  "tunnel.serverConfig": "Tunnel server",
  "tunnel.wsPlaceholder": "WebSocket URL, e.g. wss://tunnel.example.com/connect",
  "tunnel.tokenPlaceholder": "Tunnel Access Token",
  "tunnel.tokenHint": "\u{1F4A1} Used to open a reverse channel to your VPS tunnel server (independent of the web visitor password).",
  "tunnel.autostartTitle": "Restore this tunnel when DSH starts",
  "tunnel.autostart": "Start with DSH",
  "tunnel.saveFirst": "Save server config first",
  "tunnel.methods": "Public access (tunnel / direct gateway \u2014 pick what you need)",
  "tunnel.customTitle": "Custom tunnel",
  "tunnel.customDesc": "Connect to your own tunnel server for a fixed hostname",
  "cf.saved": "\u2713 Fixed hostname saved",
  "cf.advanced": "\u2699\uFE0F Advanced: fixed hostname (Cloudflare Token) ",
  "cf.configured": "\u25CF Fixed hostname configured",
  "cf.help": "Create a Tunnel in the Cloudflare Zero Trust console, then paste the token and hostname. The Public Hostname service MUST point at this plugin proxy (default http://127.0.0.1:3082), not DSH port 3080 \u2014 otherwise the page loads but APIs return 403. Leave empty for a temporary random hostname.",
  "cf.hostnamePlaceholder": "Custom hostname (e.g. dsh.yourdomain.com)",
  "cf.tokenPlaceholder": "Tunnel Token (e.g. eyJhIjoi...)",
  "cf.title": "Cloudflare tunnel",
  "cf.namedMode": "Fixed hostname (token \xB7 URL survives restart)",
  "cf.quickMode": "One-click public URL (temporary random hostname)",
  "gw.portInvalid": "Port must be an integer between 1 and 65535",
  "gw.portSaved": "\u2713 Port saved. Start or restart for it to take effect",
  "gw.title": "Direct Gateway",
  "gw.desc": "Skip the tunnel: this computer listens on a public port (HTTPS self-signed cert + forced login gate)",
  "gw.autostartTitle": "Restore the direct gateway when DSH starts",
  "gw.publicReady": "\u2705 Public access:",
  "gw.mapPort": "Map port 0.0.0.0:{port} to this machine on your router / cloud server, then it is reachable from the internet.",
  "gw.listening": "Listening on 0.0.0.0:{port}. Open https://<public-IP-or-domain>{suffix}",
  "gw.gate": "\u{1F512} Forced login: this gateway always requires auth (inherits the password from Security, independent of LAN policy). ",
  "gw.needPassword": "Public access requires the password.",
  "gw.noPassword": "No access password yet. Set one under Security first.",
  "gw.tls": "\u{1F510} Transport encryption: a self-signed HTTPS cert is generated locally. The browser will warn; allow it in the certificate details to continue.",
  "gw.port": "Public port",
  "gw.closeFirst": "Stop the gateway before changing the port",
  "auth.updateFail": "Update failed",
  "auth.enabled": "\u2713 Access auth enabled (existing sessions refreshed)",
  "auth.disabled": "\u2713 Access auth disabled",
  "auth.modeSwitched": "\u2713 Auth mode switched; all login sessions refreshed",
  "auth.scopeUpdated": "\u2713 Protection scope updated",
  "auth.adminPolicyUpdated": "\u2713 Remote admin lock policy updated",
  "auth.accessSaved": "\u2713 Visitor password saved. Previous visitor sessions were refreshed.",
  "auth.adminSaved": "\u2713 Admin password saved. Remote admin unlock state was reset.",
  "auth.resetConfirm": "After reset, QR codes and share links with the old token stop working immediately. Reset now?",
  "auth.resetFail": "Reset failed",
  "auth.tokenReset": "\u2713 Security token reset. QR codes and private links refreshed",
  "auth.scopeAll": "All channels (LAN + public)",
  "auth.scopePublic": "Public tunnel only",
  "auth.scopeLan": "LAN only",
  "auth.modeTokenPassword": "QR skip + password",
  "auth.modePassword": "Password only",
  "auth.modeToken": "Token only",
  "auth.adminUnlock": "Password unlock",
  "auth.adminLocal": "This computer only",
  "auth.adminOpen": "Open",
  "auth.systemTitle": "\u{1F510} Access security",
  "auth.systemDesc": "Visitor gate plus admin tamper lock \u2014 two layers for remote sessions and network config",
  "auth.protectionOn": "\u2713 Protection on",
  "auth.protectionOff": "Protection off",
  "auth.scopeLabel": "\u{1F310} Scope: ",
  "auth.modeLabel": "\u{1F511} Auth: ",
  "auth.adminLabel": "\u{1F512} Admin lock: ",
  "auth.layer1Title": "\u{1F6E1}\uFE0F Layer 1: visitor gate (who can use the AI)",
  "auth.layer1Desc": "How external devices authenticate when they open the DSH chat UI over LAN IP or a public tunnel (Cloudflare / custom)",
  "auth.modeSelect": "Auth mode",
  "auth.modeTokenPasswordTitle": "\u{1F7E2} QR skip + password (recommended)",
  "auth.modeTokenPasswordDesc": "QR embeds a private token for instant entry; typing an IP or public hostname requires the password",
  "auth.modePasswordTitle": "\u{1F511} Password / PIN only",
  "auth.modePasswordDesc": "Every external visit must enter the access password",
  "auth.modeTokenTitle": "\u{1F3AB} Security token only",
  "auth.modeTokenDesc": "Only QR codes or share links that carry the security token can enter",
  "auth.scopeSelect": "Protected channels",
  "auth.scopeAllTitle": "All channels (recommended)",
  "auth.scopeAllDesc": "LAN IP and public tunnels are both protected",
  "auth.scopePublicTitle": "Public tunnel only",
  "auth.scopePublicDesc": "LAN devices connect freely; public tunnels require auth",
  "auth.scopeLanTitle": "LAN only",
  "auth.scopeLanDesc": "LAN requires auth; public tunnels do not",
  "auth.accessPwLabel": "Visitor access password {hint}",
  "auth.accessPwSet": "(\u2713 visitor password set)",
  "auth.accessPwUnset": "(\u26A0\uFE0F no password yet \u2014 typing the IP will skip login)",
  "auth.accessPwPlaceholderChange": "New password (save empty to clear the visitor password)",
  "auth.accessPwPlaceholderSet": "Set visitor password / PIN",
  "auth.accessPwHint": "\u{1F4A1} Required when friends open the IP or public hostname instead of scanning the QR code.",
  "auth.tokenLabel": "Password-free QR token (private credential)",
  "auth.tokenNone": "Not generated",
  "auth.resetTokenTitle": "Regenerate the token so previously shared QR codes and links stop working",
  "auth.resetToken": "\u{1F504} Reset security token",
  "auth.tokenHint": "\u{1F4A1} LAN and public QR codes already embed this token, so a phone scan enters chat without a password (it does not grant admin settings).",
  "auth.layer2Title": "\u{1F512} Layer 2: admin tamper lock (who can change settings)",
  "auth.layer2Desc": "Lock the whole plugin settings panel (LAN, public tunnels, IM bot secrets, and security) so others cannot change config",
  "auth.adminPwLabel": "Separate admin password {hint}",
  "auth.adminPwSet": "(\u2713 separate admin password set)",
  "auth.adminPwUnset": "(not set \u2014 falls back to the visitor password above)",
  "auth.adminPwPlaceholderChange": "New password (save empty to clear the admin password)",
  "auth.adminPwPlaceholderSet": "Set admin unlock password (use a different one from the visitor password)",
  "auth.adminPwHint": "\u{1F511} Unlocks the settings panel on remote devices. After this is set, sharing the visitor password does not let others change config.",
  "auth.adminPolicyLabel": "Remote admin policy",
  "auth.policyUnlockTitle": "\u{1F512} Password unlock (recommended)",
  "auth.policyUnlockDesc": "Remote phones / WAN default to locked; unlock with the admin password to edit settings",
  "auth.policyLocalTitle": "\u{1F6AB} This computer only (strictest)",
  "auth.policyLocalDesc": "Remote devices cannot open settings at all; manage only on 127.0.0.1",
  "auth.policyOpenTitle": "\u{1F513} Open",
  "auth.policyOpenDesc": "Any device that passed the visitor gate can change all settings",
  "auth.cfTitle": "Cloudflare Zero Trust (Access)",
  "auth.cfDesc": "Requests arriving through the Cloudflare tunnel are authenticated by Access instead of the password page.",
  "auth.cfEnabled": "Cloudflare Access on",
  "auth.cfDisabled": "Enable Cloudflare Access",
  "auth.cfTeamPlaceholder": "Team domain (e.g. name.cloudflareaccess.com)",
  "auth.cfAudPlaceholder": "Application AUD tag",
  "auth.cfHint": "\u{1F4A1} Create a Self-hosted application for the public hostname in Cloudflare Zero Trust \u2192 Access \u2192 Applications, then enter the team domain and its AUD. Tunnel requests require a valid JWT; LAN access is unchanged.",
  "auth.cfSaved": "Cloudflare Access settings saved",
  "auth.cfOn": "Cloudflare Access enabled",
  "auth.cfOff": "Cloudflare Access disabled",
  "im.allowFail": "Failed to add allowlist entry",
  "im.docsWechat": "\u{1F4D6} WeChat guide",
  "im.docsQq": "\u{1F4D6} QQ guide",
  "im.openQq": "\u{1F310} QQ Open Platform",
  "im.docsFeishu": "\u{1F4D6} Feishu / Lark guide",
  "im.openFeishu": "\u{1F310} Feishu Open Platform",
  "im.docsTelegram": "\u{1F4D6} Telegram guide",
  "im.openBotFather": "\u{1F310} Get a bot from @BotFather",
  "im.collapseCmds": "Hide commands",
  "im.cmdList": "Commands",
  "im.cmdNew": "/new <prompt> \u2014 new conversation in the current workspace",
  "im.cmdNewAt": "/new <prompt> @N \u2014 new conversation in workspace N",
  "im.cmdSessions": "/sessions (or /list) \u2014 list conversations (grouped by workspace, with titles)",
  "im.cmdUse": "/use N (or /resume N) \u2014 switch to conversation N",
  "im.cmdWorkspaces": "/workspaces \u2014 list available workspaces",
  "im.cmdEnd": "/end \u2014 end the current conversation (back to no active session)",
  "im.cmdStop": "/stop \u2014 stop the current task",
  "im.cmdStatus": "/status \u2014 agent status and conversation summary",
  "im.cmdYesNo": "/yes or /no (or 1/2) \u2014 answer a permission prompt",
  "im.cmdHelp": "/help \u2014 full command help",
  "im.connStatus": "Connection",
  "im.loginAccount": "Account",
  "im.activeSession": "Active session",
  "im.allowList": "Allowlist ({count} accounts/groups):",
  "im.removeAllow": "Remove from allowlist",
  "im.allowEmptyWechat": "(empty \u2014 the first WeChat user who messages after scan is added)",
  "im.allowEmpty": "(empty \u2014 the first user who messages is added)",
  "im.allowPlaceholderWechat": "Allow a WeChat ID (e.g. xxx@im.wechat), press Enter",
  "im.allowPlaceholder": "Allow a user/group ID, press Enter",
  "im.unbindConfirm": "Unbind? This clears saved credentials.",
  "im.unbindTitle": "Clear login credentials; you will need to configure again",
  "im.unbind": "Unbind account",
  "im.scanChatTitle": "\u{1F4F1} Scan with {name} to open chat",
  "im.scanChatDesc": "Scan the QR with {name} to open the bot chat. The first message completes allowlist authorization.",
  "im.openClient": "Open in {name} \u2197",
  "im.scanned": "Scanned \u2014 confirm on your phone\u2026",
  "im.scanWechat": "Scan with WeChat to log in (ClawBot)",
  "im.scanGeneric": "Scan to log in",
  "im.scanCreateHint": "\u{1F4A1} Scan-to-create:",
  "im.runInTerminal": " Run in a terminal: ",
  "im.scanCreateManual": " Scan from your phone to create the app and print credentials, or paste them below.",
  "im.tgTokenLabel": "Bot Token \u2014 from Telegram @BotFather",
  "im.tgTokenPlaceholder": "Telegram Bot Token (e.g. 123456789:ABCdef...)",
  "im.hideSecretTitle": "Hide secret",
  "im.showSecretTitle": "Show secret",
  "im.proxyLabel": "Network proxy (optional) \u2014 HTTP / HTTPS",
  "im.proxyPlaceholder": "Optional, e.g. http://127.0.0.1:7890 (empty = direct or env)",
  "im.qqAppIdLabel": "AppID \u2014 QQ Open Platform bot app ID",
  "im.feishuAppIdLabel": "App ID \u2014 Feishu/Lark self-built app ID (cli_xxx)",
  "im.qqAppIdPlaceholder": "AppID",
  "im.feishuAppIdPlaceholder": "App ID (e.g. cli_a1b2c3d4...)",
  "im.qqSecretLabel": "ClientSecret \u2014 QQ Open Platform bot secret",
  "im.feishuSecretLabel": "App Secret \u2014 Feishu/Lark app secret",
  "im.qqSecretPlaceholder": "ClientSecret",
  "im.feishuSecretPlaceholder": "App Secret",
  "im.qqApply": "\u{1F4D6} Create a bot on QQ Open Platform",
  "im.feishuApply": "\u{1F4D6} Create a self-built app on Feishu Open Platform",
  "im.connectFail": "Connection failed",
  "im.loginFail": "Login failed",
  "im.noteWechat": "Note: after a successful scan, the first message to this WeChat bot completes allowlist authorization. Only allowlisted WeChat users can drive the agent; others are ignored. Use a dedicated WeChat account.",
  "im.noteQq": "Note: save the QQ Open Platform AppID and ClientSecret to connect. The first message to the bot completes allowlist authorization. Only allowlisted QQ users can drive the agent; others are ignored.",
  "im.noteGeneric": "Note: after login, the first message completes allowlist authorization. Only allowlisted users can drive the agent; others are ignored.",
  "im.wechat": "WeChat",
  "im.wechatDesc": "ClawBot QR login \xB7 no public IP",
  "im.qq": "QQ",
  "im.qqDesc": "Official bot \xB7 DM / group / buttons",
  "im.feishu": "Feishu / Lark",
  "im.feishuDesc": "Official WebSocket \xB7 no public IP",
  "im.telegram": "Telegram",
  "im.telegramDesc": "Official Bot API",
  "ops.uptimeDays": "{days}d {hrs}h {mins}m",
  "ops.uptimeHours": "{hrs}h {mins}m",
  "ops.uptimeMins": "{mins}m",
  "ops.metricsTitle": "\u{1F4CA} Host system",
  "ops.cpu": "CPU cores & model",
  "ops.cpuCores": "{n} cores ({model})",
  "ops.uptime": "DSH uptime",
  "ops.heap": "Node heap",
  "ops.memUsage": "System memory: {used} GB / {total} GB",
  "ops.diagErr": "Diagnostic request failed",
  "ops.diagTitle": "\u{1F50D} Network diagnostics",
  "ops.diagDesc": "Checks the local reverse-proxy port, LAN IPv4, Cloudflare Anycast latency, and npmmirror connectivity.",
  "ops.diagRunning": "Probing\u2026",
  "ops.diagRetry": "\u{1F504} Run again",
  "ops.diagStart": "\u{1F50D} Run diagnostics",
  "ops.diagOk": "\u2713 All probes healthy",
  "ops.diagWarn": "\u25B2 High latency or failures detected",
  "ops.diagProbing": "Probing local ports and cloud nodes\u2026",
  "ops.exportOk": "\u2713 Backup downloaded",
  "ops.exportFail": "Export failed",
  "ops.exportErr": "Export error",
  "ops.importOk": "\u2713 Config imported and applied",
  "ops.importFail": "Import failed",
  "ops.importParseFail": "Import parse failed: {message}",
  "ops.backupTitle": "\u{1F5C4}\uFE0F Config backup & restore",
  "ops.backupDesc": "Export or import all plugin config (IM credentials, allowlists, public tunnels, and security rules).",
  "ops.exporting": "Exporting\u2026",
  "ops.export": "\u{1F4E5} Export backup (.json)",
  "ops.importing": "Importing\u2026",
  "ops.import": "\u{1F4E4} Import config",
  "ops.restartSending": "Sending restart to DSH\u2026",
  "ops.restartReconnecting": "DSH is restarting. Reconnecting\u2026",
  "ops.restartSuccess": "\u{1F389} Restarted. Reconnected \u2014 refreshing\u2026",
  "ops.restartTimeout": "Reconnect timed out. Refresh the page.",
  "ops.restartTitle": "\u{1F504} Graceful DSH restart",
  "ops.restartDesc": "Quit and relaunch the DSH process and all plugins. The UI will reconnect and refresh in a few seconds.",
  "ops.restartNow": "\u{1F504} Restart DSH now",
  "ops.restartScheduling": "Scheduling\u2026",
  "ops.wsTitle": "\u{1F5C2}\uFE0F Remote workspaces (directory browser)",
  "ops.wsDesc": "On a phone or remote device, pick a folder on this computer or paste a path to add it to DSH.",
  "ops.wsAdd": "+ Add remote workspace",
  "ops.wsLoading": "Loading workspaces\u2026",
  "ops.wsEmpty": "No workspaces yet. Use \u201C+ Add remote workspace\u201D in the top right to browse.",
  "ver.upgraded": "Upgraded to v{latest}!",
  "ver.upgradeFail": "Upgrade failed",
  "ver.upgradeReqFail": "Upgrade request failed",
  "ver.restartScheduling": "Scheduling DSH restart\u2026",
  "ver.restartReconnecting": "DSH is restarting. Reconnecting\u2026",
  "ver.restartLoaded": "\u{1F389} Restarted with the new version. Refreshing\u2026",
  "ver.restartOk": "\u{1F389} Restarted and reconnected. Refreshing\u2026",
  "ver.restartTimeout": "Reconnect timed out. Refresh the page.",
  "ver.changelog": "Changelog",
  "ver.feedback": "File an issue",
  "ver.checking": "Checking version\u2026",
  "ver.latest": "\xB7 up to date",
  "ver.timeout": "(timed out)",
  "ver.recheck": "Recheck npm version",
  "ver.checkBusy": "Checking\u2026",
  "ver.check": "Check for updates",
  "ver.newVersion": "New version v{latest} (you have v{current})",
  "ver.upgrading": "Upgrading\u2026",
  "ver.upgradeDone": "\u2713 Upgrade complete",
  "ver.upgradeTo": "Upgrade to v{latest}",
  "ver.highlights": "\u2728 Highlights:",
  "ver.needRestart": "Upgraded to v{latest}! Restart DSH to load it",
  "ver.restartLater": "Restart later",
  "ver.processing": "Working\u2026",
  "ver.collapseManual": "\u25B4 Hide manual commands",
  "ver.showManual": "\u25BE Manual upgrade commands",
  "tab.lan": "LAN",
  "tab.tunnel": "Public access",
  "tab.im": "IM bots",
  "tab.security": "Security",
  "tab.ops": "Ops",
  "lock.localOnlyTitle": "Admin console locked (this computer only)",
  "lock.localOnlyBody": "This device is on LAN or the public internet. \u201CThis computer only\u201D is on, so remote devices cannot view or change network or bot settings. Manage from 127.0.0.1 on the host.",
  "lock.howUnlock": "\u2753 How do I unlock remotely?",
  "lock.guideTitle": "\u{1F6DF} Emergency unlock:",
  "lock.step1Label": "Edit on this computer",
  "lock.step1Body": ": open this console on the host (127.0.0.1 is never locked) to change policy or clear the password.",
  "lock.step2Label": "Server emergency command",
  "lock.step2Body": ": on the host / server terminal run ",
  "lock.step2Tail": " to clear the password and restore the initial state.",
  "lock.title": "Admin console locked",
  "lock.body": "This device is remote. Enter the admin password to unlock management.",
  "lock.pwPlaceholder": "Admin password",
  "lock.forgot": "\u2753 Forgot the admin password?",
  "lock.resetGuideTitle": "\u{1F6DF} Recover / reset password:",
  "lock.step1BodyPw": ": open this console on the host (127.0.0.1 is never locked) to change the admin password.",
  "lock.step2BodyHost": ": on the host terminal run ",
  "lock.unlocked": "\u{1F513} Admin unlocked (this temporary session)",
  "lock.lockedHint": "\u{1F512} Admin is locked (unlock to change sensitive settings)",
  "lock.modalTitle": "\u{1F512} Unlock admin",
  "lock.modalBody": "This action needs admin. Enter the admin password to protect network and bot settings:",
  "lock.modalPlaceholder": "Admin password",
  "lock.modalHint": "\u{1F4A1} If you did not set a separate admin password, use the visitor password. Loopback (127.0.0.1) skips the lock.",
  "err.adminPassword": "Wrong admin password",
  "err.unlockFail": "Unlock request failed",
  "err.loadTimeout": "Load timed out (host connection may be switching or down). Tap \u{1F504} Retry.",
  "err.loadFail": "Load failed",
  "mobile.openMenu": "Open menu",
  "mobile.newSession": "New conversation",
  "mobile.newSessionFallback": "New conversation",
  "mobile.sessionFallback": "Conversation",
  "mobile.backToChat": "Back to chat",
  "mobile.chatFallback": "Chat",
  "ws.pickTitle": "Pick a workspace on this computer",
  "ws.pickSubtitle": "Open a folder, or tap \u201C+ Use as workspace\u201D to add and switch",
  "ws.upTitle": "Go up",
  "ws.up": "\u2B06\uFE0F Up",
  "ws.refresh": "Refresh",
  "ws.currentDir": "Current folder:",
  "ws.adding": "Adding and switching\u2026",
  "ws.setAndEnter": "\u{1F449} Use this folder and enter",
  "ws.filterPlaceholder": "Filter subfolders\u2026",
  "ws.folderCount": "{n} folders",
  "ws.reading": "Reading folder\u2026",
  "ws.noMatch": "No matching subfolders",
  "ws.noChildren": "No more subfolders here",
  "ws.clickBlue": "(tap the blue button above to enter this folder)",
  "ws.pickEntryTitle": "Add this subfolder as a workspace and enter",
  "ws.pickEntry": "+ Use as workspace",
  "ws.hideManual": "\u25BC Hide absolute path",
  "ws.showManual": "\u25B6 Paste / type an absolute path",
  "ws.pathPlaceholder": "Absolute path, e.g. C:\\Projects\\my-app",
  "ws.go": "Go",
  "ws.addAndEnter": "Add & enter",
  "ws.registered": "Registered workspaces ({n}, tap to switch):",
  "ws.enter": "Enter \u2794",
  "ws.clickFolders": "\u{1F4A1} Tap a folder to go deeper",
  "ws.switching": "Switching workspace\u2026",
  "ws.switched": "\u2713 Switched workspace",
  "ws.readFail": "Failed to read folder",
  "ws.needPath": "Enter or pick a workspace path",
  "ws.selected": "\u2713 Workspace \u201C{title}\u201D selected, switching\u2026",
  "ws.addFail": "Failed to add workspace",
  "ws.addErr": "Error adding workspace"
};
var ja = {
  "section.remote": "\u30EA\u30E2\u30FC\u30C8\u30A2\u30AF\u30BB\u30B9",
  "status.running": "\u7A3C\u50CD\u4E2D",
  "status.stopped": "\u505C\u6B62\u4E2D",
  "status.connected": "\u63A5\u7D9A\u6E08\u307F",
  "status.connecting": "\u63A5\u7D9A\u4E2D\u2026",
  "status.reconnecting": "\u518D\u63A5\u7D9A\u4E2D\u2026",
  "status.paused": "\u4E00\u6642\u505C\u6B62",
  "status.pausedExpired": "\u4E00\u6642\u505C\u6B62\uFF08\u30BB\u30C3\u30B7\u30E7\u30F3\u671F\u9650\u5207\u308C\uFF09",
  "status.error": "\u7570\u5E38",
  "status.errorShort": "\u30A8\u30E9\u30FC",
  "status.disconnected": "\u672A\u63A5\u7D9A",
  "status.comingSoon": "\u8FD1\u65E5\u5BFE\u5FDC",
  "status.loading": "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
  "status.switching": "\u5207\u308A\u66FF\u3048\u4E2D\u2026",
  "status.downloading": "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D\u2026",
  "status.processing": "\u51E6\u7406\u4E2D\u2026",
  "status.verifying": "\u78BA\u8A8D\u4E2D\u2026",
  "status.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "btn.save": "\u4FDD\u5B58",
  "btn.saved": "\u2713 \u4FDD\u5B58\u3057\u307E\u3057\u305F",
  "btn.saveFail": "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "btn.saveConfigFail": "\u8A2D\u5B9A\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "btn.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "btn.start": "\u958B\u59CB",
  "btn.stop": "\u505C\u6B62",
  "btn.clear": "\u30AF\u30EA\u30A2",
  "btn.add": "\u8FFD\u52A0",
  "btn.hide": "\u96A0\u3059",
  "btn.show": "\u8868\u793A",
  "btn.cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
  "btn.close": "\u9589\u3058\u308B",
  "btn.retry": "\u{1F504} \u518D\u8A66\u884C",
  "btn.copyLink": "\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC",
  "btn.copied": "\u2713 \u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
  "btn.hideQr": "QR \u3092\u96A0\u3059",
  "btn.showQr": "QR \u3092\u8868\u793A",
  "btn.resetLink": "\u{1F504} \u30EA\u30F3\u30AF\u3092\u30EA\u30BB\u30C3\u30C8",
  "btn.saveCf": "\u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\u8A2D\u5B9A\u3092\u4FDD\u5B58",
  "btn.savePort": "\u30DD\u30FC\u30C8\u3092\u4FDD\u5B58",
  "btn.startGw": "\u76F4\u901A\u30B2\u30FC\u30C8\u30A6\u30A7\u30A4\u3092\u958B\u59CB",
  "btn.stopGw": "\u76F4\u901A\u30B2\u30FC\u30C8\u30A6\u30A7\u30A4\u3092\u505C\u6B62",
  "btn.saveAccessPw": "\u30A2\u30AF\u30BB\u30B9\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u4FDD\u5B58",
  "btn.saveAdminPw": "\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u4FDD\u5B58",
  "btn.savedOk": "\u2713 \u4FDD\u5B58\u3057\u307E\u3057\u305F",
  "btn.saveConnect": "\u4FDD\u5B58\u3057\u3066\u63A5\u7D9A",
  "btn.reconnect": "\u518D\u63A5\u7D9A",
  "btn.disconnect": "\u5207\u65AD",
  "btn.scanLogin": "\u30B9\u30AD\u30E3\u30F3\u3057\u3066\u30ED\u30B0\u30A4\u30F3",
  "btn.unlock": "\u7BA1\u7406\u3092\u89E3\u9664",
  "btn.unlockNow": "\u{1F511} \u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B",
  "btn.unlockImmediate": "\u89E3\u9664\u3059\u308B",
  "btn.unlockAdmin": "\u{1F511} \u7BA1\u7406\u3092\u89E3\u9664",
  "btn.relock": "\u{1F512} \u7BA1\u7406\u3092\u518D\u30ED\u30C3\u30AF",
  "btn.hideSecret": "\u{1F648} \u96A0\u3059",
  "btn.showSecret": "\u{1F441}\uFE0F \u8868\u793A",
  "btn.goEnable": "\u6709\u52B9\u306B\u3059\u308B \u2794",
  "btn.settings": "\u8A2D\u5B9A \u2794",
  "btn.collapse": "\u25B4 \u6298\u308A\u305F\u305F\u3080",
  "btn.expand": "\u25BE \u5C55\u958B",
  "qr.authOnTitle": "\u300C\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u300D\u3067\u8A2D\u5B9A\u3059\u308B",
  "qr.authOn": "\u{1F6E1}\uFE0F \u30A2\u30AF\u30BB\u30B9\u8A8D\u8A3C\u306F\u6709\u52B9\u3067\u3059 \xB7 QR \u7AEF\u672B\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u4E0D\u8981",
  "qr.authOffTitle": "\u300C\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u300D\u3067\u30A2\u30AF\u30BB\u30B9\u4FDD\u8B77\u3092\u6709\u52B9\u306B\u3059\u308B",
  "qr.authOff": "\u26A0\uFE0F \u30A2\u30AF\u30BB\u30B9\u8A8D\u8A3C\u304C\u30AA\u30D5\u3067\u3059\u3002\u300C\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u300D\u3067\u30D1\u30B9\u30EF\u30FC\u30C9\u307E\u305F\u306F QR \u4FDD\u8B77\u3092\u6709\u52B9\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "qr.privateHint": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8\u306A\u74B0\u5883\u3067\u3054\u5229\u7528\u304F\u3060\u3055\u3044",
  "qr.pwaHint": "\u{1F4F1} \u30D2\u30F3\u30C8: \u30B9\u30DE\u30DB\u306E\u30D6\u30E9\u30A6\u30B6\u3067\u958B\u3044\u305F\u3042\u3068\u3001\u30E1\u30CB\u30E5\u30FC\u306E\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u5168\u753B\u9762\u30A2\u30D7\u30EA\u3068\u3057\u3066\u4F7F\u3048\u307E\u3059\u3002",
  "qr.resetTitle": "\u30C8\u30F3\u30CD\u30EB\u3092\u4E00\u5EA6\u6B62\u3081\u3066\u518D\u958B\u3059\u308B\u3068\u3001\u65B0\u3057\u3044 URL \u304C\u767A\u884C\u3055\u308C\u307E\u3059",
  "lan.ifaceTitle": "\u{1F6DC} LAN \u30A2\u30C0\u30D7\u30BF\u30FC / IP",
  "lan.ifaceHint": "\u3053\u306E\u30DB\u30B9\u30C8\u306B\u306F\u8907\u6570\u306E\u30A2\u30C0\u30D7\u30BF\u30FC\uFF08Wi-Fi\u3001Ethernet\u3001WSL\u3001\u4EEE\u60F3\u30DE\u30B7\u30F3\u306A\u3069\uFF09\u304C\u3042\u308A\u307E\u3059\u3002\u65E2\u5B9A IP \u306B\u30B9\u30DE\u30DB\u304B\u3089\u5C4A\u304B\u306A\u3044\u5834\u5408\u306F\u5207\u308A\u66FF\u3048\u3066\u304F\u3060\u3055\u3044\u3002",
  "lan.autoRecommend": "\u26A1 \u81EA\u52D5\u63A8\u5968 ({addr} \xB7 {label})",
  "lan.virtualTag": " [\u4EEE\u60F3/WSL]",
  "lan.title": "LAN \u30A2\u30AF\u30BB\u30B9",
  "lan.desc": "\u540C\u3058 Wi-Fi \u4E0A\u306E\u7AEF\u672B\u304B\u3089 QR \u3092\u30B9\u30AD\u30E3\u30F3\u3057\u3066\u5165\u308C\u307E\u3059",
  "tunnel.guide": "\u81EA\u524D\u30C8\u30F3\u30CD\u30EB\u30B5\u30FC\u30D0\u30FC\u306E\u69CB\u7BC9\u30AC\u30A4\u30C9",
  "tunnel.serverConfig": "\u30C8\u30F3\u30CD\u30EB\u30B5\u30FC\u30D0\u30FC\u8A2D\u5B9A",
  "tunnel.wsPlaceholder": "WebSocket \u30A2\u30C9\u30EC\u30B9\uFF08\u4F8B: wss://tunnel.example.com/connect\uFF09",
  "tunnel.tokenPlaceholder": "\u30C8\u30F3\u30CD\u30EB\u30B5\u30FC\u30D0\u30FC\u63A5\u7D9A\u30C8\u30FC\u30AF\u30F3\uFF08Tunnel Access Token\uFF09",
  "tunnel.tokenHint": "\u{1F4A1} VPS \u4E0A\u306E\u30C8\u30F3\u30CD\u30EB\u30B5\u30FC\u30D0\u30FC\u3068\u9006\u65B9\u5411\u30C1\u30E3\u30CD\u30EB\u3092\u5F35\u308A\u307E\u3059\uFF08Web \u306E\u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u3068\u306F\u5225\u3067\u3059\uFF09\u3002",
  "tunnel.autostartTitle": "DSH \u8D77\u52D5\u6642\u306B\u3053\u306E\u30C8\u30F3\u30CD\u30EB\u306E\u72B6\u614B\u3092\u5FA9\u5143\u3057\u307E\u3059",
  "tunnel.autostart": "DSH \u8D77\u52D5\u6642\u306B\u81EA\u52D5\u958B\u59CB",
  "tunnel.saveFirst": "\u5148\u306B\u30B5\u30FC\u30D0\u30FC\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044",
  "tunnel.methods": "Cloudflare \u30C8\u30F3\u30CD\u30EB",
  "tunnel.customTitle": "\u81EA\u524D\u30C8\u30F3\u30CD\u30EB",
  "tunnel.customDesc": "\u81EA\u5206\u3067\u7ACB\u3066\u305F\u30C8\u30F3\u30CD\u30EB\u30B5\u30FC\u30D0\u30FC\u306B\u63A5\u7D9A\u3057\u3001\u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\u3092\u4F7F\u3044\u307E\u3059",
  "cf.saved": "\u2713 \u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F",
  "cf.advanced": "\u2699\uFE0F \u8A73\u7D30: \u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\uFF08Cloudflare Token\uFF09 ",
  "cf.configured": "\u25CF \u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\u8A2D\u5B9A\u6E08\u307F",
  "cf.help": "Cloudflare Zero Trust \u30B3\u30F3\u30BD\u30FC\u30EB\u3067 Tunnel \u3092\u4F5C\u308A\u3001Token \u3068\u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\u3092\u5165\u529B\u3057\u307E\u3059\u3002Public Hostname \u306E Service \u306F\u672C\u30D7\u30E9\u30B0\u30A4\u30F3\u306E\u30D7\u30ED\u30AD\u30B7\uFF08\u65E2\u5B9A http://127.0.0.1:3082\uFF09\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002DSH \u672C\u4F53\u306E 3080 \u3092\u6307\u5B9A\u3059\u308B\u3068\u30DA\u30FC\u30B8\u306F\u958B\u3044\u3066\u3082 API \u304C 403 \u306B\u306A\u308A\u307E\u3059\u3002\u7A7A\u6B04\u306A\u3089\u4E00\u6642\u7684\u306A\u30E9\u30F3\u30C0\u30E0\u30C9\u30E1\u30A4\u30F3\u3067\u3059\u3002",
  "cf.hostnamePlaceholder": "\u30AB\u30B9\u30BF\u30E0\u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\uFF08\u4F8B: dsh.yourdomain.com\uFF09",
  "cf.tokenPlaceholder": "Tunnel Token\uFF08\u4F8B: eyJhIjoi...\uFF09",
  "cf.title": "Cloudflare \u30C8\u30F3\u30CD\u30EB",
  "cf.namedMode": "\u56FA\u5B9A\u30C9\u30E1\u30A4\u30F3\uFF08Token \u904B\u7528 \xB7 \u518D\u8D77\u52D5\u3057\u3066\u3082 URL \u306F\u540C\u3058\uFF09",
  "cf.quickMode": "\u30EF\u30F3\u30AF\u30EA\u30C3\u30AF\u3067\u516C\u958B URL\uFF08\u30ED\u30B0\u30A4\u30F3\u4E0D\u8981\u306E\u4E00\u6642\u30C9\u30E1\u30A4\u30F3\uFF09",
  "gw.portInvalid": "\u30DD\u30FC\u30C8\u306F 1\u301C65535 \u306E\u6574\u6570\u306B\u3057\u3066\u304F\u3060\u3055\u3044",
  "gw.portSaved": "\u2713 \u30DD\u30FC\u30C8\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u300C\u958B\u59CB\u300D\u307E\u305F\u306F\u518D\u8D77\u52D5\u5F8C\u306B\u53CD\u6620\u3055\u308C\u307E\u3059",
  "gw.title": "\u76F4\u901A\u30B2\u30FC\u30C8\u30A6\u30A7\u30A4",
  "gw.desc": "\u30C8\u30F3\u30CD\u30EB\u3092\u4F7F\u308F\u305A\u3001\u3053\u306E\u30D1\u30BD\u30B3\u30F3\u304C\u516C\u958B\u30DD\u30FC\u30C8\u3092\u5F85\u3061\u53D7\u3051\u307E\u3059\uFF08HTTPS \u81EA\u5DF1\u7F72\u540D\u8A3C\u660E\u66F8 + \u5F37\u5236\u30ED\u30B0\u30A4\u30F3\uFF09",
  "gw.autostartTitle": "DSH \u8D77\u52D5\u6642\u306B\u76F4\u901A\u30B2\u30FC\u30C8\u30A6\u30A7\u30A4\u306E\u72B6\u614B\u3092\u5FA9\u5143\u3057\u307E\u3059",
  "gw.publicReady": "\u2705 \u516C\u958B\u5230\u9054:",
  "gw.mapPort": "\u30EB\u30FC\u30BF\u30FC / \u30AF\u30E9\u30A6\u30C9\u30B5\u30FC\u30D0\u30FC\u3067\u30DD\u30FC\u30C8 0.0.0.0:{port} \u3092\u3053\u306E\u30DE\u30B7\u30F3\u306B\u8EE2\u9001\u3059\u308B\u3068\u3001\u30A4\u30F3\u30BF\u30FC\u30CD\u30C3\u30C8\u304B\u3089\u5230\u9054\u3067\u304D\u307E\u3059\u3002",
  "gw.listening": "0.0.0.0:{port} \u3067\u5F85\u3061\u53D7\u3051\u4E2D\u3002https://<\u516C\u958BIP\u307E\u305F\u306F\u30C9\u30E1\u30A4\u30F3>{suffix} \u306B\u30A2\u30AF\u30BB\u30B9",
  "gw.gate": "\u{1F512} \u5F37\u5236\u9580\u7981: \u3053\u306E\u30B2\u30FC\u30C8\u30A6\u30A7\u30A4\u306F\u5E38\u306B\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\uFF08\u300C\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u300D\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u7D99\u627F\u3057\u3001LAN \u65B9\u91DD\u3068\u306F\u72EC\u7ACB\u3067\u3059\uFF09\u3002",
  "gw.needPassword": "\u516C\u958B\u30A2\u30AF\u30BB\u30B9\u306B\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059\u3002",
  "gw.noPassword": "\u30A2\u30AF\u30BB\u30B9\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002\u5148\u306B\u300C\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u300D\u3067\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "gw.tls": "\u{1F510} \u901A\u4FE1\u306E\u6697\u53F7\u5316: \u672C\u6A5F\u3067 HTTPS \u81EA\u5DF1\u7F72\u540D\u8A3C\u660E\u66F8\u3092\u81EA\u52D5\u751F\u6210\u3057\u307E\u3059\u3002\u30D6\u30E9\u30A6\u30B6\u306F\u8B66\u544A\u3092\u51FA\u3057\u307E\u3059\u3002\u8A3C\u660E\u66F8\u306E\u8A73\u7D30\u3067\u300C\u5E38\u306B\u8A31\u53EF\u300D\u3092\u9078\u3076\u3068\u7D9A\u884C\u3067\u304D\u307E\u3059\u3002",
  "gw.port": "\u516C\u958B\u30DD\u30FC\u30C8",
  "gw.closeFirst": "\u7A3C\u50CD\u4E2D\u306F\u5148\u306B\u505C\u6B62\u3057\u3066\u304B\u3089\u30DD\u30FC\u30C8\u3092\u5909\u66F4\u3057\u3066\u304F\u3060\u3055\u3044",
  "auth.updateFail": "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "auth.enabled": "\u2713 \u30A2\u30AF\u30BB\u30B9\u8A8D\u8A3C\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F\uFF08\u65E2\u5B58\u306E\u30ED\u30B0\u30A4\u30F3\u72B6\u614B\u3092\u66F4\u65B0\u6E08\u307F\uFF09",
  "auth.disabled": "\u2713 \u30A2\u30AF\u30BB\u30B9\u8A8D\u8A3C\u3092\u30AA\u30D5\u306B\u3057\u307E\u3057\u305F",
  "auth.modeSwitched": "\u2713 \u8A8D\u8A3C\u65B9\u5F0F\u3092\u5207\u308A\u66FF\u3048\u3001\u3059\u3079\u3066\u306E\u30ED\u30B0\u30A4\u30F3\u72B6\u614B\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F",
  "auth.scopeUpdated": "\u2713 \u4FDD\u8B77\u7BC4\u56F2\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F",
  "auth.adminPolicyUpdated": "\u2713 \u30EA\u30E2\u30FC\u30C8\u7BA1\u7406\u30ED\u30C3\u30AF\u65B9\u91DD\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F",
  "auth.accessSaved": "\u2713 \u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u4EE5\u524D\u306E\u8A2A\u554F\u8005\u30BB\u30C3\u30B7\u30E7\u30F3\u306F\u3059\u3079\u3066\u66F4\u65B0\u3055\u308C\u3066\u3044\u307E\u3059\u3002",
  "auth.adminSaved": "\u2713 \u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u30EA\u30E2\u30FC\u30C8\u7BA1\u7406\u306E\u89E3\u9664\u72B6\u614B\u306F\u30EA\u30BB\u30C3\u30C8\u6E08\u307F\u3067\u3059\u3002",
  "auth.resetConfirm": "\u30EA\u30BB\u30C3\u30C8\u3059\u308B\u3068\u3001\u65E7 Token \u3092\u542B\u3080 QR \u3068\u5171\u6709\u30EA\u30F3\u30AF\u306F\u3059\u3050\u306B\u7121\u52B9\u306B\u306A\u308A\u307E\u3059\u3002\u5B9F\u884C\u3057\u307E\u3059\u304B\uFF1F",
  "auth.resetFail": "\u30EA\u30BB\u30C3\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "auth.tokenReset": "\u2713 \u30BB\u30AD\u30E5\u30EA\u30C6\u30A3 Token \u3092\u30EA\u30BB\u30C3\u30C8\u3057\u3001QR \u3068\u5C02\u7528\u30EA\u30F3\u30AF\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F",
  "auth.scopeAll": "\u3059\u3079\u3066\u306E\u7D4C\u8DEF\uFF08LAN + \u516C\u958B\uFF09",
  "auth.scopePublic": "\u516C\u958B\u30C8\u30F3\u30CD\u30EB\u306E\u307F",
  "auth.scopeLan": "LAN \u306E\u307F",
  "auth.modeTokenPassword": "QR \u514D\u9664 + \u30D1\u30B9\u30EF\u30FC\u30C9",
  "auth.modePassword": "\u30D1\u30B9\u30EF\u30FC\u30C9\u306E\u307F",
  "auth.modeToken": "Token \u306E\u307F",
  "auth.adminUnlock": "\u30D1\u30B9\u30EF\u30FC\u30C9\u3067\u89E3\u9664",
  "auth.adminLocal": "\u3053\u306E\u30D1\u30BD\u30B3\u30F3\u306E\u307F",
  "auth.adminOpen": "\u30AA\u30FC\u30D7\u30F3",
  "auth.systemTitle": "\u{1F510} \u30A2\u30AF\u30BB\u30B9\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3",
  "auth.systemDesc": "\u8A2A\u554F\u8005\u30B2\u30FC\u30C8\u3068\u7BA1\u7406\u753B\u9762\u306E\u6539\u3056\u3093\u9632\u6B62\u3002\u30EA\u30E2\u30FC\u30C8\u30BB\u30C3\u30B7\u30E7\u30F3\u3068\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u8A2D\u5B9A\u3092\u4E8C\u91CD\u306B\u5B88\u308A\u307E\u3059",
  "auth.protectionOn": "\u2713 \u4FDD\u8B77\u306F\u6709\u52B9",
  "auth.protectionOff": "\u4FDD\u8B77\u306F\u30AA\u30D5",
  "auth.scopeLabel": "\u{1F310} \u4FDD\u8B77\u7BC4\u56F2: ",
  "auth.modeLabel": "\u{1F511} \u5916\u90E8\u8A8D\u8A3C: ",
  "auth.adminLabel": "\u{1F512} \u7BA1\u7406\u30ED\u30C3\u30AF: ",
  "auth.layer1Title": "\u{1F6E1}\uFE0F \u7B2C1\u5C64: \u8A2A\u554F\u8005\u30B2\u30FC\u30C8\uFF08\u8AB0\u304C AI \u3092\u4F7F\u3048\u308B\u304B\uFF09",
  "auth.layer1Desc": "LAN IP \u307E\u305F\u306F Cloudflare \u30C8\u30F3\u30CD\u30EB\u304B\u3089 DSH \u306B\u5165\u308B\u3068\u304D\u306E\u8A8D\u8A3C\u65B9\u6CD5\u3067\u3059",
  "auth.modeSelect": "\u8A8D\u8A3C\u65B9\u5F0F",
  "auth.modeTokenPasswordTitle": "\u{1F7E2} QR \u514D\u9664 + \u30D1\u30B9\u30EF\u30FC\u30C9\u8A8D\u8A3C\uFF08\u63A8\u5968\uFF09",
  "auth.modeTokenPasswordDesc": "QR \u306B\u5C02\u7528 Token \u304C\u5165\u308A\u3001\u30B9\u30AD\u30E3\u30F3\u3067\u3059\u3050\u5165\u308C\u307E\u3059\u3002IP \u3084\u516C\u958B\u30C9\u30E1\u30A4\u30F3\u3092\u76F4\u63A5\u5165\u529B\u3059\u308B\u5834\u5408\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059",
  "auth.modePasswordTitle": "\u{1F511} \u30D1\u30B9\u30EF\u30FC\u30C9 / PIN \u306E\u307F",
  "auth.modePasswordDesc": "\u5916\u90E8\u304B\u3089\u306E\u30A2\u30AF\u30BB\u30B9\u306F\u3059\u3079\u3066\u30A2\u30AF\u30BB\u30B9\u30D1\u30B9\u30EF\u30FC\u30C9\u306E\u5165\u529B\u304C\u5FC5\u8981\u3067\u3059",
  "auth.modeTokenTitle": "\u{1F3AB} \u30BB\u30AD\u30E5\u30EA\u30C6\u30A3 Token \u306E\u307F",
  "auth.modeTokenDesc": "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3 Token \u4ED8\u304D\u306E QR \u307E\u305F\u306F\u5171\u6709\u30EA\u30F3\u30AF\u3060\u3051\u304C\u5165\u308C\u307E\u3059",
  "auth.scopeSelect": "\u4FDD\u8B77\u3059\u308B\u7D4C\u8DEF",
  "auth.scopeAllTitle": "\u3059\u3079\u3066\u306E\u7D4C\u8DEF\uFF08\u63A8\u5968\uFF09",
  "auth.scopeAllDesc": "LAN IP \u76F4\u7D50\u3068\u516C\u958B\u30C8\u30F3\u30CD\u30EB\u306E\u4E21\u65B9\u3092\u4FDD\u8B77\u3057\u307E\u3059",
  "auth.scopePublicTitle": "\u516C\u958B\u30C8\u30F3\u30CD\u30EB\u306E\u307F\u4FDD\u8B77",
  "auth.scopePublicDesc": "LAN \u5185\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u306A\u3057\u3001\u516C\u958B\u30C8\u30F3\u30CD\u30EB\u306F\u8A8D\u8A3C\u5FC5\u9808",
  "auth.scopeLanTitle": "LAN \u306E\u307F\u4FDD\u8B77",
  "auth.scopeLanDesc": "LAN \u76F4\u7D50\u3060\u3051\u8A8D\u8A3C\u3057\u3001\u516C\u958B\u30C8\u30F3\u30CD\u30EB\u306F\u4FDD\u8B77\u3057\u307E\u305B\u3093",
  "auth.accessPwLabel": "\u8A2A\u554F\u8005\u30A2\u30AF\u30BB\u30B9\u30D1\u30B9\u30EF\u30FC\u30C9 {hint}",
  "auth.accessPwSet": "\uFF08\u2713 \u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u8A2D\u5B9A\u6E08\u307F\uFF09",
  "auth.accessPwUnset": "\uFF08\u26A0\uFE0F \u672A\u8A2D\u5B9A\u3002IP \u3092\u76F4\u63A5\u5165\u529B\u3059\u308B\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u306A\u3057\u306B\u306A\u308A\u307E\u3059\uFF09",
  "auth.accessPwPlaceholderChange": "\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\uFF08\u7A7A\u306E\u307E\u307E\u4FDD\u5B58\u3059\u308B\u3068\u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u524A\u9664\uFF09",
  "auth.accessPwPlaceholderSet": "\u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9 / PIN \u3092\u8A2D\u5B9A",
  "auth.accessPwHint": "\u{1F4A1} QR \u3067\u306F\u306A\u304F IP \u3084\u516C\u958B\u30C9\u30E1\u30A4\u30F3\u3092\u76F4\u63A5\u958B\u304F\u53CB\u4EBA\u30FB\u540C\u50DA\u306B\u306F\u3001\u3053\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059\u3002",
  "auth.tokenLabel": "\u30D1\u30B9\u30EF\u30FC\u30C9\u306A\u3057 QR Token\uFF08\u5C02\u7528\u30A2\u30AF\u30BB\u30B9\u8A3C\uFF09",
  "auth.tokenNone": "\u672A\u751F\u6210",
  "auth.resetTokenTitle": "Token \u3092\u518D\u767A\u884C\u3057\u3001\u4EE5\u524D\u5171\u6709\u3057\u305F QR \u3068\u30EA\u30F3\u30AF\u3092\u7121\u52B9\u306B\u3057\u307E\u3059",
  "auth.resetToken": "\u{1F504} \u30BB\u30AD\u30E5\u30EA\u30C6\u30A3 Token \u3092\u30EA\u30BB\u30C3\u30C8",
  "auth.tokenHint": "\u{1F4A1} \u30B3\u30F3\u30BD\u30FC\u30EB\u306E LAN / \u516C\u958B QR \u306B\u306F\u3053\u306E Token \u304C\u57CB\u3081\u8FBC\u307E\u308C\u3001\u30B9\u30DE\u30DB\u3067\u30B9\u30AD\u30E3\u30F3\u3059\u308B\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u306A\u3057\u3067\u30C1\u30E3\u30C3\u30C8\u306B\u5165\u308C\u307E\u3059\uFF08\u7BA1\u7406\u8A2D\u5B9A\u306E\u6A29\u9650\u306F\u4ED8\u304D\u307E\u305B\u3093\uFF09\u3002",
  "auth.layer2Title": "\u{1F512} \u7B2C2\u5C64: \u7BA1\u7406\u753B\u9762\u306E\u6539\u3056\u3093\u9632\u6B62\uFF08\u8AB0\u304C\u8A2D\u5B9A\u3092\u5909\u3048\u3089\u308C\u308B\u304B\uFF09",
  "auth.layer2Desc": "\u30D7\u30E9\u30B0\u30A4\u30F3\u8A2D\u5B9A\u5168\u4F53\uFF08LAN\u3001\u516C\u958B\u30C8\u30F3\u30CD\u30EB\u3001IM \u30DC\u30C3\u30C8\u306E\u79D8\u5BC6\u60C5\u5831\u3001\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\uFF09\u3092\u30ED\u30C3\u30AF\u3057\u3001\u4ED6\u4EBA\u304C\u52DD\u624B\u306B\u5909\u3048\u3089\u308C\u306A\u3044\u3088\u3046\u306B\u3057\u307E\u3059",
  "auth.adminPwLabel": "\u72EC\u7ACB\u3057\u305F\u7BA1\u7406\u8005\u30D1\u30B9\u30EF\u30FC\u30C9 {hint}",
  "auth.adminPwSet": "\uFF08\u2713 \u72EC\u7ACB\u3057\u305F\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u8A2D\u5B9A\u6E08\u307F\uFF09",
  "auth.adminPwUnset": "\uFF08\u672A\u8A2D\u5B9A\u3002\u4E0A\u8A18\u306E\u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u4F7F\u3044\u307E\u3059\uFF09",
  "auth.adminPwPlaceholderChange": "\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\uFF08\u7A7A\u306E\u307E\u307E\u4FDD\u5B58\u3059\u308B\u3068\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u524A\u9664\uFF09",
  "auth.adminPwPlaceholderSet": "\u7BA1\u7406\u89E3\u9664\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u8A2D\u5B9A\uFF08\u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u3068\u306F\u5225\u304C\u304A\u3059\u3059\u3081\uFF09",
  "auth.adminPwHint": "\u{1F511} \u30EA\u30E2\u30FC\u30C8\u7AEF\u672B\u3067\u8A2D\u5B9A\u753B\u9762\u306B\u5165\u308B\u3068\u304D\u306E\u89E3\u9664\u78BA\u8A8D\u3067\u3059\u3002\u8A2D\u5B9A\u5F8C\u306F\u3001\u8A2A\u554F\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u4F1D\u3048\u3066\u3082\u8A2D\u5B9A\u306F\u5909\u3048\u3089\u308C\u307E\u305B\u3093\u3002",
  "auth.adminPolicyLabel": "\u30EA\u30E2\u30FC\u30C8\u7AEF\u672B\u306E\u7BA1\u7406\u6A29\u9650",
  "auth.policyUnlockTitle": "\u{1F512} \u30D1\u30B9\u30EF\u30FC\u30C9\u3067\u89E3\u9664\uFF08\u63A8\u5968\uFF09",
  "auth.policyUnlockDesc": "\u30EA\u30E2\u30FC\u30C8\u306E\u30B9\u30DE\u30DB / \u5916\u90E8\u30CD\u30C3\u30C8\u3067\u306F\u8A2D\u5B9A\u3092\u30ED\u30C3\u30AF\u3057\u3001\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3067\u89E3\u9664\u3057\u3066\u304B\u3089\u4F7F\u3048\u307E\u3059",
  "auth.policyLocalTitle": "\u{1F6AB} \u3053\u306E\u30D1\u30BD\u30B3\u30F3\u306E\u307F\uFF08\u6700\u3082\u53B3\u3057\u3044\uFF09",
  "auth.policyLocalDesc": "\u30EA\u30E2\u30FC\u30C8\u7AEF\u672B\u306F\u8A2D\u5B9A\u753B\u9762\u3092\u5B8C\u5168\u306B\u30ED\u30C3\u30AF\u3002\u64CD\u4F5C\u306F 127.0.0.1 \u306E\u672C\u6A5F\u3060\u3051",
  "auth.policyOpenTitle": "\u{1F513} \u30AA\u30FC\u30D7\u30F3",
  "auth.policyOpenDesc": "\u7B2C1\u5C64\u3092\u901A\u904E\u3057\u305F\u7AEF\u672B\u306F\u3001\u3059\u3079\u3066\u306E\u8A2D\u5B9A\u3092\u76F4\u63A5\u5909\u66F4\u3067\u304D\u307E\u3059",
  "auth.cfTitle": "Cloudflare Zero Trust (Access)",
  "auth.cfDesc": "Cloudflare \u30C8\u30F3\u30CD\u30EB\u7D4C\u7531\u306E\u30A2\u30AF\u30BB\u30B9\u3092 Access \u306E\u30ED\u30B0\u30A4\u30F3\u8A8D\u8A3C\u306B\u5207\u308A\u66FF\u3048\u307E\u3059\u3002Cloudflare \u5074\u3067\u30ED\u30B0\u30A4\u30F3\u3059\u308B\u305F\u3081\u3001\u30D1\u30B9\u30EF\u30FC\u30C9\u753B\u9762\u306F\u8868\u793A\u3055\u308C\u307E\u305B\u3093\u3002",
  "auth.cfEnabled": "Cloudflare Access \u3092\u4F7F\u7528\u4E2D",
  "auth.cfDisabled": "Cloudflare Access \u3092\u6709\u52B9\u5316",
  "auth.cfTeamPlaceholder": "\u30C1\u30FC\u30E0\u30C9\u30E1\u30A4\u30F3 (\u4F8B: name.cloudflareaccess.com)",
  "auth.cfAudPlaceholder": "\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u306E AUD \u30BF\u30B0",
  "auth.cfHint": "\u{1F4A1} Cloudflare Zero Trust \u2192 Access \u2192 Applications \u3067\u516C\u958B\u30C9\u30E1\u30A4\u30F3\u306E Self-hosted \u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u3092\u4F5C\u6210\u3057\u3001\u30C1\u30FC\u30E0\u30C9\u30E1\u30A4\u30F3\u3068 AUD \u3092\u5165\u529B\u3057\u307E\u3059\u3002\u30C8\u30F3\u30CD\u30EB\u7D4C\u7531\u306F\u6709\u52B9\u306A JWT \u306E\u307F\u901A\u3057\u3001LAN \u5074\u306E\u30A2\u30AF\u30BB\u30B9\u306F\u5909\u308F\u308A\u307E\u305B\u3093\u3002",
  "auth.cfSaved": "Cloudflare Access \u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F",
  "auth.cfOn": "Cloudflare Access \u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F",
  "auth.cfOff": "Cloudflare Access \u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F",
  "im.allowFail": "\u8A31\u53EF\u30EA\u30B9\u30C8\u3078\u306E\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "im.docsWechat": "\u{1F4D6} WeChat \u306E\u4F7F\u3044\u65B9",
  "im.docsQq": "\u{1F4D6} QQ \u306E\u4F7F\u3044\u65B9",
  "im.openQq": "\u{1F310} QQ \u30AA\u30FC\u30D7\u30F3\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0",
  "im.docsFeishu": "\u{1F4D6} \u30D5\u30A3\u30FC\u30B7\u30E5\u30FC / Lark\uFF08Feishu\uFF09\u306E\u4F7F\u3044\u65B9",
  "im.openFeishu": "\u{1F310} \u30D5\u30A3\u30FC\u30B7\u30E5\u30FC\u958B\u653E\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0",
  "im.docsTelegram": "\u{1F4D6} Telegram \u306E\u4F7F\u3044\u65B9",
  "im.openBotFather": "\u{1F310} @BotFather \u3067 Bot \u3092\u7533\u8ACB",
  "im.collapseCmds": "\u30B3\u30DE\u30F3\u30C9\u3092\u96A0\u3059",
  "im.cmdList": "\u30B3\u30DE\u30F3\u30C9\u4E00\u89A7",
  "im.cmdNew": "/new <\u30D7\u30ED\u30F3\u30D7\u30C8> \u2014 \u73FE\u5728\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3067\u65B0\u3057\u3044\u4F1A\u8A71\u3092\u958B\u59CB",
  "im.cmdNewAt": "/new <\u30D7\u30ED\u30F3\u30D7\u30C8> @N \u2014 \u6307\u5B9A\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3067\u65B0\u3057\u3044\u4F1A\u8A71",
  "im.cmdSessions": "/sessions\uFF08\u307E\u305F\u306F /list\uFF09\u2014 \u4F1A\u8A71\u3092\u4E00\u89A7\uFF08\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3054\u3068\u3001\u30BF\u30A4\u30C8\u30EB\u4ED8\u304D\uFF09",
  "im.cmdUse": "/use N\uFF08\u307E\u305F\u306F /resume N\uFF09\u2014 \u4F1A\u8A71 N \u306B\u5207\u308A\u66FF\u3048",
  "im.cmdWorkspaces": "/workspaces \u2014 \u5229\u7528\u53EF\u80FD\u306A\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u4E00\u89A7",
  "im.cmdEnd": "/end \u2014 \u73FE\u5728\u306E\u4F1A\u8A71\u3092\u7D42\u4E86\uFF08\u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u3057\u306E\u72B6\u614B\u3078\uFF09",
  "im.cmdStop": "/stop \u2014 \u73FE\u5728\u306E\u30BF\u30B9\u30AF\u3092\u505C\u6B62",
  "im.cmdStatus": "/status \u2014 Agent \u306E\u72B6\u614B\u3068\u4F1A\u8A71\u306E\u8981\u7D04",
  "im.cmdYesNo": "/yes \u307E\u305F\u306F /no\uFF08\u307E\u305F\u306F 1/2\uFF09\u2014 \u6A29\u9650\u78BA\u8A8D\u306B\u5FDC\u7B54",
  "im.cmdHelp": "/help \u2014 \u30B3\u30DE\u30F3\u30C9\u306E\u5168\u30D8\u30EB\u30D7",
  "im.connStatus": "\u63A5\u7D9A\u72B6\u614B",
  "im.loginAccount": "\u30ED\u30B0\u30A4\u30F3\u30A2\u30AB\u30A6\u30F3\u30C8",
  "im.activeSession": "\u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u4F1A\u8A71",
  "im.allowList": "\u8A31\u53EF\u30EA\u30B9\u30C8\uFF08\u627F\u8A8D\u6E08\u307F {count} \u30A2\u30AB\u30A6\u30F3\u30C8/\u30B0\u30EB\u30FC\u30D7\uFF09:",
  "im.removeAllow": "\u8A31\u53EF\u30EA\u30B9\u30C8\u304B\u3089\u5916\u3059",
  "im.allowEmptyWechat": "\uFF08\u7A7A \u2014 \u30B9\u30AD\u30E3\u30F3\u5F8C\u3001\u6700\u521D\u306B\u30E1\u30C3\u30BB\u30FC\u30B8\u3057\u305F WeChat \u30E6\u30FC\u30B6\u30FC\u304C\u81EA\u52D5\u8FFD\u52A0\u3055\u308C\u307E\u3059\uFF09",
  "im.allowEmpty": "\uFF08\u7A7A \u2014 \u6700\u521D\u306B\u30E1\u30C3\u30BB\u30FC\u30B8\u3057\u305F\u30E6\u30FC\u30B6\u30FC\u304C\u81EA\u52D5\u8FFD\u52A0\u3055\u308C\u307E\u3059\uFF09",
  "im.allowPlaceholderWechat": "\u8A31\u53EF\u3059\u308B WeChat ID\uFF08\u4F8B: xxx@im.wechat\uFF09\u3092\u5165\u529B\u3057\u3001Enter \u3067\u8FFD\u52A0",
  "im.allowPlaceholder": "\u8A31\u53EF\u3059\u308B\u30E6\u30FC\u30B6\u30FC / \u30B0\u30EB\u30FC\u30D7 ID \u3092\u5165\u529B\u3057\u3001Enter \u3067\u8FFD\u52A0",
  "im.unbindConfirm": "\u9023\u643A\u3092\u89E3\u9664\u3057\u307E\u3059\u304B\uFF1F\u4FDD\u5B58\u6E08\u307F\u306E\u8A8D\u8A3C\u60C5\u5831\u306F\u6D88\u3048\u307E\u3059\u3002",
  "im.unbindTitle": "\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u3092\u6D88\u3057\u3001\u6B21\u56DE\u306F\u518D\u8A2D\u5B9A\u304C\u5FC5\u8981\u3067\u3059",
  "im.unbind": "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u89E3\u9664",
  "im.scanChatTitle": "\u{1F4F1} {name} \u3067\u30B9\u30AD\u30E3\u30F3\u3057\u3066\u4F1A\u8A71\u3078",
  "im.scanChatDesc": "{name} \u3067\u5DE6\u306E QR \u3092\u30B9\u30AD\u30E3\u30F3\u3059\u308B\u3068 Bot \u3068\u306E\u4F1A\u8A71\u304C\u958B\u304D\u307E\u3059\u3002\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3067\u8A31\u53EF\u30EA\u30B9\u30C8\u767B\u9332\u304C\u5B8C\u4E86\u3057\u307E\u3059\u3002",
  "im.openClient": "{name} \u30A2\u30D7\u30EA\u3067\u958B\u304F \u2197",
  "im.scanned": "\u30B9\u30AD\u30E3\u30F3\u6E08\u307F\u3002\u30B9\u30DE\u30DB\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u2026",
  "im.scanWechat": "WeChat \u3067\u30B9\u30AD\u30E3\u30F3\u3057\u3066\u30ED\u30B0\u30A4\u30F3\uFF08ClawBot\uFF09",
  "im.scanGeneric": "\u30B9\u30AD\u30E3\u30F3\u3057\u3066\u30ED\u30B0\u30A4\u30F3",
  "im.scanCreateHint": "\u{1F4A1} \u30B9\u30AD\u30E3\u30F3\u3067\u81EA\u52D5\u4F5C\u6210:",
  "im.runInTerminal": " \u30BF\u30FC\u30DF\u30CA\u30EB\u3067\u5B9F\u884C: ",
  "im.scanCreateManual": " \u30B9\u30DE\u30DB\u3067\u30B9\u30AD\u30E3\u30F3\u3059\u308B\u3068\u30A2\u30D7\u30EA\u4F5C\u6210\u3068\u8CC7\u683C\u60C5\u5831\u306E\u51FA\u529B\u307E\u3067\u81EA\u52D5\u3067\u3059\u3002\u4E0B\u306B\u624B\u5165\u529B\u3082\u3067\u304D\u307E\u3059\u3002",
  "im.tgTokenLabel": "Bot Token \u2014 Telegram @BotFather \u304C\u767A\u884C\u3059\u308B Token",
  "im.tgTokenPlaceholder": "Telegram Bot Token\uFF08\u4F8B: 123456789:ABCdef...\uFF09",
  "im.hideSecretTitle": "\u30B7\u30FC\u30AF\u30EC\u30C3\u30C8\u3092\u96A0\u3059",
  "im.showSecretTitle": "\u5E73\u6587\u3092\u8868\u793A",
  "im.proxyLabel": "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30D7\u30ED\u30AD\u30B7\uFF08\u4EFB\u610F\uFF09\u2014 HTTP / HTTPS",
  "im.proxyPlaceholder": "\u4EFB\u610F\u3002\u4F8B: http://127.0.0.1:7890\uFF08\u7A7A\u306A\u3089\u76F4\u7D50\u3001\u307E\u305F\u306F\u74B0\u5883\u5909\u6570\uFF09",
  "im.qqAppIdLabel": "AppID \u2014 QQ \u30AA\u30FC\u30D7\u30F3\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u306E\u30DC\u30C3\u30C8\u30A2\u30D7\u30EA ID",
  "im.feishuAppIdLabel": "App ID \u2014 \u30D5\u30A3\u30FC\u30B7\u30E5\u30FC / Lark \u81EA\u793E\u30A2\u30D7\u30EA ID\uFF08cli_xxx\uFF09",
  "im.qqAppIdPlaceholder": "AppID \u3092\u5165\u529B",
  "im.feishuAppIdPlaceholder": "App ID \u3092\u5165\u529B\uFF08\u4F8B: cli_a1b2c3d4...\uFF09",
  "im.qqSecretLabel": "ClientSecret \u2014 QQ \u30AA\u30FC\u30D7\u30F3\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u306E\u30DC\u30C3\u30C8\u30B7\u30FC\u30AF\u30EC\u30C3\u30C8",
  "im.feishuSecretLabel": "App Secret \u2014 \u30D5\u30A3\u30FC\u30B7\u30E5\u30FC / Lark \u30A2\u30D7\u30EA\u30B7\u30FC\u30AF\u30EC\u30C3\u30C8",
  "im.qqSecretPlaceholder": "ClientSecret \u3092\u5165\u529B",
  "im.feishuSecretPlaceholder": "App Secret \u3092\u5165\u529B",
  "im.qqApply": "\u{1F4D6} QQ \u30AA\u30FC\u30D7\u30F3\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u3067\u30DC\u30C3\u30C8\u3092\u7533\u8ACB",
  "im.feishuApply": "\u{1F4D6} \u30D5\u30A3\u30FC\u30B7\u30E5\u30FC\u958B\u653E\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u3067\u4F01\u696D\u81EA\u793E\u30A2\u30D7\u30EA\u3092\u4F5C\u6210",
  "im.connectFail": "\u63A5\u7D9A\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "im.loginFail": "\u30ED\u30B0\u30A4\u30F3\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "im.noteWechat": "\u8AAC\u660E: \u30B9\u30AD\u30E3\u30F3\u6210\u529F\u5F8C\u3001\u3053\u306E WeChat Bot \u306B\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9001\u308B\u3068\u8A31\u53EF\u30EA\u30B9\u30C8\u767B\u9332\u304C\u5B8C\u4E86\u3057\u307E\u3059\u3002\u8A31\u53EF\u30EA\u30B9\u30C8\u5185\u306E WeChat \u30E6\u30FC\u30B6\u30FC\u3060\u3051\u304C agent \u3092\u52D5\u304B\u305B\u307E\u3059\u3002\u5C02\u7528\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u4F7F\u3044\u3001\u30E1\u30A4\u30F3\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u306F\u5F71\u97FF\u3055\u305B\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
  "im.noteQq": "\u8AAC\u660E: QQ \u30AA\u30FC\u30D7\u30F3\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u306E AppID \u3068 ClientSecret \u3092\u4FDD\u5B58\u3059\u308B\u3068\u81EA\u52D5\u63A5\u7D9A\u3057\u307E\u3059\u3002Bot \u3078\u306E\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3067\u8A31\u53EF\u30EA\u30B9\u30C8\u767B\u9332\u304C\u5B8C\u4E86\u3057\u307E\u3059\u3002\u8A31\u53EF\u30EA\u30B9\u30C8\u5185\u306E QQ \u30E6\u30FC\u30B6\u30FC\u3060\u3051\u304C agent \u3092\u52D5\u304B\u305B\u307E\u3059\u3002",
  "im.noteGeneric": "\u8AAC\u660E: \u30ED\u30B0\u30A4\u30F3\u5F8C\u3001\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3067\u8A31\u53EF\u30EA\u30B9\u30C8\u767B\u9332\u304C\u5B8C\u4E86\u3057\u307E\u3059\u3002\u8A31\u53EF\u30EA\u30B9\u30C8\u5185\u306E\u30E6\u30FC\u30B6\u30FC\u3060\u3051\u304C agent \u3092\u52D5\u304B\u305B\u307E\u3059\u3002",
  "im.wechat": "WeChat",
  "im.wechatDesc": "ClawBot \u30B9\u30AD\u30E3\u30F3\u63A5\u7D9A \xB7 \u516C\u958B IP \u4E0D\u8981",
  "im.qq": "QQ",
  "im.qqDesc": "\u516C\u5F0F\u30DC\u30C3\u30C8 \xB7 \u500B\u5225/\u30B0\u30EB\u30FC\u30D7/\u30DC\u30BF\u30F3",
  "im.feishu": "\u30D5\u30A3\u30FC\u30B7\u30E5\u30FC / Lark",
  "im.feishuDesc": "\u516C\u5F0F WebSocket \u9577\u63A5\u7D9A \xB7 \u516C\u958B IP \u4E0D\u8981",
  "im.telegram": "Telegram",
  "im.telegramDesc": "\u516C\u5F0F Bot API",
  "ops.uptimeDays": "{days}\u65E5 {hrs}\u6642\u9593 {mins}\u5206",
  "ops.uptimeHours": "{hrs}\u6642\u9593 {mins}\u5206",
  "ops.uptimeMins": "{mins}\u5206",
  "ops.metricsTitle": "\u{1F4CA} \u30DB\u30B9\u30C8\u306E\u7A3C\u50CD\u72B6\u6CC1",
  "ops.cpu": "CPU \u30B3\u30A2\u3068\u578B\u756A",
  "ops.cpuCores": "{n} \u30B3\u30A2\uFF08{model}\uFF09",
  "ops.uptime": "DSH \u7A3C\u50CD\u6642\u9593\uFF08Uptime\uFF09",
  "ops.heap": "Node \u30D7\u30ED\u30BB\u30B9\u306E\u30D2\u30FC\u30D7",
  "ops.memUsage": "\u30B7\u30B9\u30C6\u30E0\u30E1\u30E2\u30EA: {used} GB / {total} GB",
  "ops.diagErr": "\u8A3A\u65AD\u30EA\u30AF\u30A8\u30B9\u30C8\u7570\u5E38",
  "ops.diagTitle": "\u{1F50D} \u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u4E00\u62EC\u8A3A\u65AD",
  "ops.diagDesc": "\u30ED\u30FC\u30AB\u30EB\u9006\u30D7\u30ED\u30AD\u30B7\u30DD\u30FC\u30C8\u3001LAN IPv4\u3001Cloudflare Anycast \u306E\u9045\u5EF6\u3001\u56FD\u5185 npmmirror \u306E\u758E\u901A\u3092\u307E\u3068\u3081\u3066\u78BA\u8A8D\u3057\u307E\u3059\u3002",
  "ops.diagRunning": "\u758E\u901A\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",
  "ops.diagRetry": "\u{1F504} \u3082\u3046\u4E00\u5EA6\u8A3A\u65AD",
  "ops.diagStart": "\u{1F50D} \u8A3A\u65AD\u3092\u958B\u59CB",
  "ops.diagOk": "\u2713 \u3059\u3079\u3066\u306E\u30D7\u30ED\u30FC\u30D6\u306F\u6B63\u5E38\u3067\u3059",
  "ops.diagWarn": "\u25B2 \u9045\u5EF6\u304C\u9AD8\u3044\u9805\u76EE\u3001\u307E\u305F\u306F\u7570\u5E38\u304C\u3042\u308A\u307E\u3059",
  "ops.diagProbing": "\u30DD\u30FC\u30C8\u3068\u30AF\u30E9\u30A6\u30C9\u30CE\u30FC\u30C9\u306E\u758E\u901A\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",
  "ops.exportOk": "\u2713 \u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u66F8\u304D\u51FA\u3057\u3066\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u307E\u3057\u305F",
  "ops.exportFail": "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u66F8\u304D\u51FA\u3057\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "ops.exportErr": "\u66F8\u304D\u51FA\u3057\u30A8\u30E9\u30FC",
  "ops.importOk": "\u2713 \u8A2D\u5B9A\u3092\u53D6\u308A\u8FBC\u307F\u3001\u53CD\u6620\u3057\u307E\u3057\u305F",
  "ops.importFail": "\u8A2D\u5B9A\u306E\u53D6\u308A\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "ops.importParseFail": "\u53D6\u308A\u8FBC\u307F\u306E\u89E3\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F: {message}",
  "ops.backupTitle": "\u{1F5C4}\uFE0F \u8A2D\u5B9A\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3068\u5FA9\u5143",
  "ops.backupDesc": "\u3053\u306E\u30D7\u30E9\u30B0\u30A4\u30F3\u306E\u5168\u8A2D\u5B9A\uFF08\u5404 IM \u306E\u8CC7\u683C\u60C5\u5831\u3001\u8A31\u53EF\u30EA\u30B9\u30C8\u3001\u516C\u958B\u30C8\u30F3\u30CD\u30EB\u3001\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u898F\u5247\uFF09\u3092\u66F8\u304D\u51FA\u3057 / \u53D6\u308A\u8FBC\u307F\u3067\u304D\u307E\u3059\u3002",
  "ops.exporting": "\u66F8\u304D\u51FA\u3057\u4E2D\u2026",
  "ops.export": "\u{1F4E5} \u8A2D\u5B9A\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u66F8\u304D\u51FA\u3059\uFF08.json\uFF09",
  "ops.importing": "\u53D6\u308A\u8FBC\u307F\u4E2D\u2026",
  "ops.import": "\u{1F4E4} \u8A2D\u5B9A\u3092\u53D6\u308A\u8FBC\u3080",
  "ops.restartSending": "DSH \u306B\u518D\u8D77\u52D5\u3092\u9001\u3063\u3066\u3044\u307E\u3059\u2026",
  "ops.restartReconnecting": "DSH \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002\u518D\u63A5\u7D9A\u4E2D\u2026",
  "ops.restartSuccess": "\u{1F389} \u518D\u8D77\u52D5\u3057\u307E\u3057\u305F\u3002\u518D\u63A5\u7D9A\u3067\u304D\u305F\u306E\u3067\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u307E\u3059\u2026",
  "ops.restartTimeout": "\u518D\u63A5\u7D9A\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u624B\u52D5\u3067\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "ops.restartTitle": "\u{1F504} DSH \u306E\u30B9\u30E0\u30FC\u30BA\u518D\u8D77\u52D5",
  "ops.restartDesc": "\u73FE\u5728\u306E DSH \u30D7\u30ED\u30BB\u30B9\u3068\u30D7\u30E9\u30B0\u30A4\u30F3\u3092\u7D42\u4E86\u3057\u3066\u7ACB\u3061\u4E0A\u3052\u76F4\u3057\u307E\u3059\u3002\u6570\u79D2\u5F8C\u306B UI \u304C\u518D\u63A5\u7D9A\u3057\u3001\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u307E\u3059\u3002",
  "ops.restartNow": "\u{1F504} DSH \u3092\u4ECA\u3059\u3050\u518D\u8D77\u52D5",
  "ops.restartScheduling": "\u30B9\u30B1\u30B8\u30E5\u30FC\u30EB\u4E2D\u2026",
  "ops.wsTitle": "\u{1F5C2}\uFE0F \u30EA\u30E2\u30FC\u30C8\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\uFF08\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u4E00\u89A7\uFF09",
  "ops.wsDesc": "\u30B9\u30DE\u30DB\u3084\u30EA\u30E2\u30FC\u30C8\u7AEF\u672B\u304B\u3089\u3001\u3053\u306E\u30D1\u30BD\u30B3\u30F3\u306E\u30D5\u30A9\u30EB\u30C0\u3092\u9078\u3076\u304B\u30D1\u30B9\u3092\u5165\u529B\u3057\u3066 DSH \u306B\u8FFD\u52A0\u3067\u304D\u307E\u3059\u3002",
  "ops.wsAdd": "+ \u30EA\u30E2\u30FC\u30C8\u3067\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u8FFD\u52A0",
  "ops.wsLoading": "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u4E00\u89A7\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
  "ops.wsEmpty": "\u767B\u9332\u6E08\u307F\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u53F3\u4E0A\u306E\u300C+ \u30EA\u30E2\u30FC\u30C8\u3067\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u8FFD\u52A0\u300D\u304B\u3089\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "ver.upgraded": "v{latest} \u306B\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u3057\u307E\u3057\u305F\uFF01",
  "ver.upgradeFail": "\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "ver.upgradeReqFail": "\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u8981\u6C42\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "ver.restartScheduling": "DSH \u306E\u518D\u8D77\u52D5\u3092\u30B9\u30B1\u30B8\u30E5\u30FC\u30EB\u3057\u3066\u3044\u307E\u3059\u2026",
  "ver.restartReconnecting": "DSH \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002\u518D\u63A5\u7D9A\u4E2D\u2026",
  "ver.restartLoaded": "\u{1F389} \u518D\u8D77\u52D5\u3057\u3001\u65B0\u3057\u3044\u30D0\u30FC\u30B8\u30E7\u30F3\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u307E\u3059\u2026",
  "ver.restartOk": "\u{1F389} \u518D\u8D77\u52D5\u3057\u3066\u518D\u63A5\u7D9A\u3057\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u307E\u3059\u2026",
  "ver.restartTimeout": "\u518D\u63A5\u7D9A\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u624B\u52D5\u3067\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "ver.changelog": "\u66F4\u65B0\u5C65\u6B74",
  "ver.feedback": "Issue \u3092\u9001\u308B",
  "ver.checking": "\u30D0\u30FC\u30B8\u30E7\u30F3\u78BA\u8A8D\u4E2D\u2026",
  "ver.latest": "\xB7 \u6700\u65B0\u3067\u3059",
  "ver.timeout": "\uFF08\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\uFF09",
  "ver.recheck": "npm \u306E\u6700\u65B0\u7248\u3092\u518D\u78BA\u8A8D",
  "ver.checkBusy": "\u78BA\u8A8D\u4E2D\u2026",
  "ver.check": "\u66F4\u65B0\u3092\u78BA\u8A8D",
  "ver.newVersion": "\u65B0\u3057\u3044\u30D0\u30FC\u30B8\u30E7\u30F3 v{latest}\uFF08\u73FE\u5728 v{current}\uFF09",
  "ver.upgrading": "\u81EA\u52D5\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u4E2D\u2026",
  "ver.upgradeDone": "\u2713 \u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u5B8C\u4E86",
  "ver.upgradeTo": "v{latest} \u306B\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9",
  "ver.highlights": "\u2728 \u66F4\u65B0\u30CF\u30A4\u30E9\u30A4\u30C8:",
  "ver.needRestart": "v{latest} \u306B\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u3057\u307E\u3057\u305F\u3002DSH \u3092\u518D\u8D77\u52D5\u3059\u308B\u3068\u65B0\u3057\u3044\u30D0\u30FC\u30B8\u30E7\u30F3\u304C\u6709\u52B9\u306B\u306A\u308A\u307E\u3059",
  "ver.restartLater": "\u3042\u3068\u3067\u518D\u8D77\u52D5",
  "ver.processing": "\u51E6\u7406\u4E2D\u2026",
  "ver.collapseManual": "\u25B4 \u624B\u52D5\u30B3\u30DE\u30F3\u30C9\u3092\u96A0\u3059",
  "ver.showManual": "\u25BE \u624B\u52D5\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u30B3\u30DE\u30F3\u30C9\uFF08\u5FC5\u8981\u306A\u5834\u5408\uFF09",
  "tab.lan": "LAN",
  "tab.tunnel": "\u516C\u958B\u30A2\u30AF\u30BB\u30B9",
  "tab.im": "IM \u30DC\u30C3\u30C8",
  "tab.security": "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3",
  "tab.ops": "\u904B\u7528",
  "lock.localOnlyTitle": "\u7BA1\u7406\u30B3\u30F3\u30BD\u30FC\u30EB\u306F\u30ED\u30C3\u30AF\u4E2D\uFF08\u3053\u306E\u30D1\u30BD\u30B3\u30F3\u306E\u307F\uFF09",
  "lock.localOnlyBody": "\u3053\u306E\u7AEF\u672B\u306F\u30EA\u30E2\u30FC\u30C8\u306E LAN \u307E\u305F\u306F\u516C\u958B\u30CD\u30C3\u30C8\u304B\u3089\u3067\u3059\u3002\u300C\u3053\u306E\u30D1\u30BD\u30B3\u30F3\u306E\u307F\u300D\u306E\u6700\u53B3\u683C\u65B9\u91DD\u304C\u6709\u52B9\u306A\u305F\u3081\u3001\u30EA\u30E2\u30FC\u30C8\u304B\u3089\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3084\u30DC\u30C3\u30C8\u8A2D\u5B9A\u306F\u898B\u3048\u307E\u305B\u3093\u3002\u7BA1\u7406\u306F\u30DB\u30B9\u30C8\u306E 127.0.0.1 \u3067\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
  "lock.howUnlock": "\u2753 \u30EA\u30E2\u30FC\u30C8\u304B\u3089\u7DCA\u6025\u89E3\u9664\u3059\u308B\u306B\u306F\uFF1F",
  "lock.guideTitle": "\u{1F6DF} \u7DCA\u6025\u89E3\u9664\u306E\u624B\u9806:",
  "lock.step1Label": "\u672C\u6A5F\u304B\u3089\u76F4\u63A5\u5909\u66F4",
  "lock.step1Body": "\uFF1A\u3053\u306E\u30D7\u30ED\u30B0\u30E9\u30E0\u3092\u52D5\u304B\u3057\u3066\u3044\u308B\u30D1\u30BD\u30B3\u30F3\u3067\u3053\u306E\u30B3\u30F3\u30BD\u30FC\u30EB\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044\uFF08127.0.0.1 \u306F\u7269\u7406\u7684\u306B\u30ED\u30C3\u30AF\u3055\u308C\u307E\u305B\u3093\uFF09\u3002\u65B9\u91DD\u306E\u5909\u66F4\u3084\u30D1\u30B9\u30EF\u30FC\u30C9\u306E\u524A\u9664\u304C\u3044\u3064\u3067\u3082\u3067\u304D\u307E\u3059\u3002",
  "lock.step2Label": "\u30B5\u30FC\u30D0\u30FC\u7DCA\u6025\u30B3\u30DE\u30F3\u30C9",
  "lock.step2Body": "\uFF1A\u30DB\u30B9\u30C8 / \u30B5\u30FC\u30D0\u30FC\u306E\u30BF\u30FC\u30DF\u30CA\u30EB\u3067 ",
  "lock.step2Tail": " \u3092\u5B9F\u884C\u3059\u308B\u3068\u3001\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5373\u5EA7\u306B\u6D88\u3057\u3066\u521D\u671F\u72B6\u614B\u306B\u623B\u305B\u307E\u3059\u3002",
  "lock.title": "\u7BA1\u7406\u30B3\u30F3\u30BD\u30FC\u30EB\u306F\u30ED\u30C3\u30AF\u4E2D",
  "lock.body": "\u3053\u306E\u7AEF\u672B\u306F\u30EA\u30E2\u30FC\u30C8\u30A2\u30AF\u30BB\u30B9\u3067\u3059\u3002\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3068\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u8A2D\u5B9A\u3092\u5B88\u308B\u305F\u3081\u3001\u7BA1\u7406\u8005\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u89E3\u9664\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "lock.pwPlaceholder": "\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B",
  "lock.forgot": "\u2753 \u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5FD8\u308C\u307E\u3057\u305F\u304B\uFF1F",
  "lock.resetGuideTitle": "\u{1F6DF} \u30D1\u30B9\u30EF\u30FC\u30C9\u306E\u56DE\u5FA9\u3068\u30EA\u30BB\u30C3\u30C8:",
  "lock.step1BodyPw": "\uFF1A\u3053\u306E\u30D7\u30ED\u30B0\u30E9\u30E0\u3092\u52D5\u304B\u3057\u3066\u3044\u308B\u30D1\u30BD\u30B3\u30F3\u3067\u3053\u306E\u30B3\u30F3\u30BD\u30FC\u30EB\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044\uFF08127.0.0.1 \u306F\u7269\u7406\u7684\u306B\u30ED\u30C3\u30AF\u3055\u308C\u307E\u305B\u3093\uFF09\u3002\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u3044\u3064\u3067\u3082\u5909\u66F4\u3067\u304D\u307E\u3059\u3002",
  "lock.step2BodyHost": "\uFF1A\u30DB\u30B9\u30C8\u306E\u30BF\u30FC\u30DF\u30CA\u30EB\u3067 ",
  "lock.unlocked": "\u{1F513} \u7BA1\u7406\u8005\u6A29\u9650\u306F\u89E3\u9664\u6E08\u307F\uFF08\u3053\u306E\u4E00\u6642\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u307F\u6709\u52B9\uFF09",
  "lock.lockedHint": "\u{1F512} \u7BA1\u7406\u6A29\u9650\u306F\u672A\u89E3\u9664\uFF08\u6A5F\u5FAE\u306A\u8A2D\u5B9A\u306E\u5909\u66F4\u306B\u306F\u89E3\u9664\u304C\u5FC5\u8981\uFF09",
  "lock.modalTitle": "\u{1F512} \u7BA1\u7406\u6A29\u9650\u3092\u89E3\u9664",
  "lock.modalBody": "\u3053\u306E\u64CD\u4F5C\u306B\u306F\u7BA1\u7406\u8005\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059\u3002\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u8A2D\u5B9A\u3068\u30DC\u30C3\u30C8\u3092\u5B88\u308B\u305F\u3081\u3001\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "lock.modalPlaceholder": "\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B",
  "lock.modalHint": "\u{1F4A1} \u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5225\u306B\u8A2D\u5B9A\u3057\u3066\u3044\u306A\u3044\u5834\u5408\u306F\u3001\u6700\u521D\u306B\u6C7A\u3081\u305F\u30A2\u30AF\u30BB\u30B9\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u672C\u6A5F\uFF08127.0.0.1\uFF09\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u306A\u3057\u3067\u7BA1\u7406\u3067\u304D\u307E\u3059\u3002",
  "err.adminPassword": "\u7BA1\u7406\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u9055\u3044\u307E\u3059",
  "err.unlockFail": "\u89E3\u9664\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "err.loadTimeout": "\u8AAD\u307F\u8FBC\u307F\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\uFF08\u30DB\u30B9\u30C8\u63A5\u7D9A\u306E\u5207\u308A\u66FF\u3048\u4E2D\u3001\u307E\u305F\u306F\u672A\u78BA\u7ACB\u306E\u53EF\u80FD\u6027\uFF09\u3002\u300C\u{1F504} \u518D\u8A66\u884C\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "err.loadFail": "\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "mobile.openMenu": "\u30E1\u30CB\u30E5\u30FC\u3092\u958B\u304F",
  "mobile.newSession": "\u65B0\u3057\u3044\u4F1A\u8A71",
  "mobile.newSessionFallback": "\u65B0\u3057\u3044\u4F1A\u8A71",
  "mobile.sessionFallback": "\u4F1A\u8A71",
  "mobile.backToChat": "\u4F1A\u8A71\u306B\u623B\u308B",
  "mobile.chatFallback": "\u30C1\u30E3\u30C3\u30C8",
  "ws.pickTitle": "\u30D1\u30BD\u30B3\u30F3\u4E0A\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u9078\u3076",
  "ws.pickSubtitle": "\u30D5\u30A9\u30EB\u30C0\u3092\u958B\u304F\u304B\u3001\u300C+ \u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306B\u3059\u308B\u300D\u3067\u8FFD\u52A0\u3057\u3066\u5207\u308A\u66FF\u3048\u307E\u3059",
  "ws.upTitle": "\u4E00\u3064\u4E0A\u3078",
  "ws.up": "\u2B06\uFE0F \u4E0A\u3078",
  "ws.refresh": "\u66F4\u65B0",
  "ws.currentDir": "\u73FE\u5728\u306E\u30D5\u30A9\u30EB\u30C0:",
  "ws.adding": "\u8FFD\u52A0\u3057\u3066\u5207\u308A\u66FF\u3048\u4E2D\u2026",
  "ws.setAndEnter": "\u{1F449} \u3053\u306E\u30D5\u30A9\u30EB\u30C0\u3092\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306B\u3057\u3066\u5165\u308B",
  "ws.filterPlaceholder": "\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u3092\u7D5E\u308A\u8FBC\u307F\u2026",
  "ws.folderCount": "{n} \u30D5\u30A9\u30EB\u30C0",
  "ws.reading": "\u30D5\u30A9\u30EB\u30C0\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
  "ws.noMatch": "\u4E00\u81F4\u3059\u308B\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u304C\u3042\u308A\u307E\u305B\u3093",
  "ws.noChildren": "\u3053\u306E\u30D5\u30A9\u30EB\u30C0\u306B\u3053\u308C\u4EE5\u4E0A\u306E\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u306F\u3042\u308A\u307E\u305B\u3093",
  "ws.clickBlue": "\uFF08\u4E0A\u306E\u9752\u3044\u30DC\u30BF\u30F3\u3067\u73FE\u5728\u306E\u30D5\u30A9\u30EB\u30C0\u306B\u5165\u308C\u307E\u3059\uFF09",
  "ws.pickEntryTitle": "\u3053\u306E\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u3092\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306B\u8FFD\u52A0\u3057\u3066\u5165\u308B",
  "ws.pickEntry": "+ \u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306B\u3059\u308B",
  "ws.hideManual": "\u25BC \u7D76\u5BFE\u30D1\u30B9\u5165\u529B\u3092\u96A0\u3059",
  "ws.showManual": "\u25B6 \u7D76\u5BFE\u30D1\u30B9\u3092\u8CBC\u308A\u4ED8\u3051 / \u5165\u529B",
  "ws.pathPlaceholder": "\u30D1\u30BD\u30B3\u30F3\u306E\u7D76\u5BFE\u30D1\u30B9\uFF08\u4F8B: C:\\Projects\\my-app\uFF09",
  "ws.go": "\u79FB\u52D5",
  "ws.addAndEnter": "\u8FFD\u52A0\u3057\u3066\u5165\u308B",
  "ws.registered": "\u767B\u9332\u6E08\u307F\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\uFF08{n} \u4EF6\u3001\u30BF\u30C3\u30D7\u3067\u5207\u308A\u66FF\u3048\uFF09:",
  "ws.enter": "\u5165\u308B \u2794",
  "ws.clickFolders": "\u{1F4A1} \u30D5\u30A9\u30EB\u30C0\u3092\u30BF\u30C3\u30D7\u3057\u3066\u4E00\u6BB5\u305A\u3064\u9032\u3081\u307E\u3059",
  "ws.switching": "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u5207\u308A\u66FF\u3048\u4E2D\u2026",
  "ws.switched": "\u2713 \u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u5207\u308A\u66FF\u3048\u307E\u3057\u305F",
  "ws.readFail": "\u30D5\u30A9\u30EB\u30C0\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "ws.needPath": "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306E\u30D1\u30B9\u3092\u5165\u529B\u307E\u305F\u306F\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044",
  "ws.selected": "\u2713 \u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u300C{title}\u300D\u3092\u9078\u3073\u307E\u3057\u305F\u3002\u5207\u308A\u66FF\u3048\u4E2D\u2026",
  "ws.addFail": "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306E\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  "ws.addErr": "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u8FFD\u52A0\u3067\u30A8\u30E9\u30FC"
};
function format(s2, params) {
  if (!params) return s2;
  return String(s2).replace(/\{(\w+)\}/g, (_, k) => params[k] == null ? "" : String(params[k]));
}
var _t = (key, params) => format(ja[key] || zh[key] || key, params);
function bindT(fn) {
  _t = fn;
}
function t(key, params) {
  return _t(key, params);
}
function installLocale(locale) {
  if (!locale?.register) return () => {
  };
  const disposers = [
    locale.register(NS, "zh", zh),
    locale.register(NS, "en", en),
    locale.register(NS, "ja", ja)
  ];
  if (typeof locale.bind === "function") bindT(locale.bind(NS));
  return () => {
    disposers.forEach((d) => {
      try {
        d();
      } catch {
      }
    });
  };
}

// client/index.js
if (typeof window !== "undefined") {
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function() {
      if (typeof window.crypto.getRandomValues === "function") {
        return ("10000000-1000-4000-8000" + -1e11).replace(/[018]/g, function(c) {
          return (c ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
        });
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    };
  }
}
var _globalAdminToken = "";
function setGlobalAdminToken(t2) {
  _globalAdminToken = t2 || "";
  if (typeof window !== "undefined") {
    try {
      if (t2) sessionStorage.setItem("dsh_admin_token", t2);
      else sessionStorage.removeItem("dsh_admin_token");
    } catch {
    }
  }
}
function getGlobalAdminToken() {
  if (_globalAdminToken) return _globalAdminToken;
  if (typeof window !== "undefined") {
    try {
      const saved = sessionStorage.getItem("dsh_admin_token");
      if (saved) {
        _globalAdminToken = saved;
        return saved;
      }
    } catch {
    }
  }
  return "";
}
var TUNNEL_DOCS_URL = "https://github.com/daraskme/dsh-bridge-gateway/blob/main/docs/custom-tunnel.ja.md";
var name = "dsh-bridge";
var inject = ["slots", "connection", "locale"];
function useLocaleRevision() {
  const loc = typeof window !== "undefined" ? window.__dshClientCtx?.locale : null;
  const [rev, setRev] = React.useState(() => loc?.getSnapshot?.()?.revision ?? 0);
  React.useEffect(() => {
    if (!loc?.subscribe) return;
    return loc.subscribe(() => setRev(loc.getSnapshot?.()?.revision ?? 0));
  }, [loc]);
  return rev;
}
function isAdminBlockedMessage(msg) {
  const s2 = String(msg || "");
  return /管理员权限|管理密码解锁|管理者権限|管理パスワード|admin (password|unlock|privile)/i.test(s2);
}
var s = {
  card: { background: "var(--dsw-alias-bg-layer-2,#f9fafb)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 12, padding: "16px 18px", marginBottom: 16, boxSizing: "border-box" },
  block: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 12, paddingTop: 12 },
  muted: { color: "var(--dsw-alias-label-tertiary,#8b93a1)", fontSize: 12, lineHeight: 1.5 },
  label: { color: "var(--dsw-alias-label-primary,currentColor)", fontSize: 13, fontWeight: 500 },
  code: { fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, wordBreak: "break-all", color: "var(--dsw-alias-label-primary,currentColor)" },
  btnPri: { font: "inherit", cursor: "pointer", border: "none", background: "var(--dsw-alias-brand-primary,#4f6ef7)", color: "var(--dsw-alias-label-primary-foreground,#fff)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 },
  btnGhost: { font: "inherit", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-2,#f9fafb)", color: "var(--dsw-alias-label-primary,currentColor)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" },
  btnLink: { font: "inherit", cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontSize: 12, padding: 0, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" },
  qr: { width: 200, height: 200, maxWidth: "100%", borderRadius: 10, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", margin: "8px 0", display: "block", background: "#ffffff", padding: 6, boxSizing: "border-box" },
  tag: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, minWidth: "max-content", lineHeight: 1.4 },
  input: { width: "100%", font: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-2,#f9fafb)", color: "var(--dsw-alias-label-primary,currentColor)", outline: "none", boxSizing: "border-box" },
  warn: { background: "var(--dsw-alias-state-warn-bg, var(--dsw-alias-bg-layer-2, #fffbeb))", border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-state-warn-primary,#92400e)", lineHeight: 1.6 },
  tip: { background: "var(--dsw-alias-bg-layer-2,#f9fafb)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.6 }
};
var Icons = {
  wechat: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M8.5 2C4.36 2 1 4.91 1 8.5c0 2.01 1.05 3.81 2.69 4.97l-.69 2.06 2.45-1.22c.94.43 1.98.69 3.05.69.21 0 .42-.01.62-.03-.23-.62-.37-1.28-.37-1.97 0-3.59 3.36-6.5 7.5-6.5.21 0 .41.01.62.03C15.87 4.54 12.44 2 8.5 2zM6 6.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm7.5 3.5c-3.59 0-6.5 2.46-6.5 5.5 0 1.66.86 3.14 2.21 4.1l-.56 1.69 2.01-1c.78.36 1.64.57 2.54.57 3.59 0 6.5-2.46 6.5-5.5s-2.91-5.5-6.5-5.5zm-2 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" })
  ),
  qq: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2C7.58 2 4 5.37 4 9.53c0 1.95.78 3.73 2.07 5.07-.37 1.15-.99 2.19-1.8 3.08-.18.2-.04.52.23.52 2.22 0 3.99-1.07 4.9-1.86.8.25 1.66.39 2.6.39 4.42 0 8-3.37 8-7.53S16.42 2 12 2zm-3 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm6 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" })
  ),
  feishu: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2.5L3.5 11.2l6.8 1.8 2.2 6.5 1.8-4.7 5.2-1.4L12 2.5zm-.8 11.1l-4.1-1.1 6.5-6.6-4.2 8.3 1.8-.6z" })
  ),
  telegram: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" })
  ),
  lan: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.29 19.3a1 1 0 0 0 1.41 1.41l1.7-1.7C9.02 19.64 10.46 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" })
  ),
  tunnel: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" })
  ),
  security: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" })
  ),
  bot: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" })
  ),
  github: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 13, height: 13, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" })
  ),
  refresh: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    React.createElement("path", { d: "M23 4v6h-6M1 20v-6h6" }),
    React.createElement("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
  ),
  check: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    React.createElement("polyline", { points: "20 6 9 17 4 12" })
  ),
  ops: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    React.createElement("circle", { cx: 12, cy: 12, r: 3 }),
    React.createElement("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })
  )
};
function StatusTag({ running, status }) {
  useLocaleRevision();
  let bg = "var(--dsw-alias-bg-layer-2,#f3f4f6)";
  let color = "var(--dsw-alias-label-secondary,#6b7280)";
  let text = running ? t("status.running") : t("status.stopped");
  if (status === "connected") {
    bg = "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))";
    color = "var(--dsw-alias-state-success-primary,#059669)";
    text = t("status.connected");
  } else if (status === "starting") {
    bg = "var(--dsw-alias-state-info-bg, var(--dsw-alias-bg-layer-2, #eff6ff))";
    color = "var(--dsw-alias-state-info-primary,#3b82f6)";
    text = t("status.connecting");
  } else if (status === "reconnecting") {
    bg = "var(--dsw-alias-state-warn-bg, var(--dsw-alias-bg-layer-2, #fffbeb))";
    color = "var(--dsw-alias-state-warn-primary,#d97706)";
    text = t("status.reconnecting");
  } else if (status === "paused") {
    bg = "var(--dsw-alias-state-warn-bg, var(--dsw-alias-bg-layer-2, #fffbeb))";
    color = "var(--dsw-alias-state-warn-primary,#d97706)";
    text = t("status.paused");
  } else if (status === "error") {
    bg = "var(--dsw-alias-state-error-bg, var(--dsw-alias-bg-layer-2, #fef2f2))";
    color = "var(--dsw-alias-state-error-primary,#dc2626)";
    text = t("status.error");
  } else if (running) {
    bg = "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))";
    color = "var(--dsw-alias-state-success-primary,#059669)";
    text = t("status.running");
  }
  return React.createElement("span", {
    style: { ...s.tag, background: bg, color }
  }, text);
}
function QrBlock({ url, qr, onReset, auth, onNavigateSecurity }) {
  useLocaleRevision();
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(true);
  const copy = React.useCallback(() => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      }).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      }
    }
  }, [url]);
  const toggleQr = React.useCallback(() => setShowQr((v) => !v), []);
  return React.createElement(
    "div",
    { style: { marginTop: 10 } },
    auth?.enabled ? React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "6px 10px",
          background: "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))",
          border: "1px solid var(--dsw-alias-state-success-primary,#10b981)",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--dsw-alias-state-success-primary,#059669)",
          marginBottom: 8,
          fontWeight: 500,
          flexWrap: "wrap",
          cursor: onNavigateSecurity ? "pointer" : "default"
        },
        onClick: onNavigateSecurity,
        title: onNavigateSecurity ? t("qr.authOnTitle") : void 0
      },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, t("qr.authOn")),
      onNavigateSecurity && React.createElement("span", { style: { textDecoration: "underline", fontSize: 11, fontWeight: 600 } }, t("btn.settings"))
    ) : React.createElement(
      "div",
      {
        style: { ...s.warn, cursor: onNavigateSecurity ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
        onClick: onNavigateSecurity,
        title: onNavigateSecurity ? t("qr.authOffTitle") : void 0
      },
      React.createElement("span", null, t("qr.authOff")),
      onNavigateSecurity && React.createElement("span", { style: { fontWeight: 600, textDecoration: "underline", fontSize: 12, color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, t("btn.goEnable"))
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 } },
      React.createElement(
        "div",
        { style: { padding: "6px 10px", background: "var(--dsw-alias-bg-layer-1,#ffffff)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 8 } },
        React.createElement("code", { style: { ...s.code, display: "block", wordBreak: "break-all", fontSize: 12, lineHeight: 1.5 } }, url)
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        React.createElement("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12, flex: "1 1 auto", justifyContent: "center" },
          onClick: copy
        }, copied ? t("btn.copied") : t("btn.copyLink")),
        React.createElement("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12, flex: "1 1 auto", justifyContent: "center" },
          onClick: toggleQr
        }, showQr ? t("btn.hideQr") : t("btn.showQr"))
      )
    ),
    showQr && qr && React.createElement(
      "div",
      { style: { marginTop: 10 } },
      React.createElement("img", { src: qr, alt: "QR", style: s.qr }),
      React.createElement("div", { style: { ...s.muted, marginTop: 4 } }, t("qr.privateHint")),
      React.createElement(
        "div",
        { style: { ...s.muted, marginTop: 4, fontSize: 11, color: "var(--dsw-alias-brand-primary, #4f6ef7)" } },
        t("qr.pwaHint")
      )
    ),
    onReset && React.createElement(
      "div",
      { style: { marginTop: 8 } },
      React.createElement("button", {
        style: { ...s.btnGhost, fontSize: 12, height: 28 },
        onClick: onReset,
        title: t("qr.resetTitle")
      }, t("btn.resetLink"))
    )
  );
}
var LanNetworkSelector = React.memo(function LanNetworkSelector2({ lan, onSelectIp }) {
  useLocaleRevision();
  const interfaces = lan?.interfaces || [];
  const selectedIp = lan?.selectedIp || "";
  const currentIp = lan?.ip || "";
  const [switching, setSwitching] = React.useState(false);
  if (!interfaces || interfaces.length <= 1) return null;
  const handleChange = async (e) => {
    const val = e.target.value;
    setSwitching(true);
    try {
      await onSelectIp(val || null);
    } finally {
      setSwitching(false);
    }
  };
  return React.createElement(
    "div",
    {
      style: {
        ...s.block,
        background: "var(--dsw-alias-bg-layer-2, rgba(243, 244, 246, 0.6))",
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid var(--dsw-alias-border-l2, #e5e7eb)",
        marginTop: 8,
        marginBottom: 6
      }
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 500,
          color: "var(--dsw-alias-label-primary, currentColor)"
        }
      },
      React.createElement(
        "span",
        { style: { display: "inline-flex", alignItems: "center", gap: 5 } },
        t("lan.ifaceTitle")
      ),
      switching && React.createElement("span", {
        style: { fontSize: 11, color: "var(--dsw-alias-brand-primary, #4f6ef7)" }
      }, t("status.switching"))
    ),
    React.createElement(
      "div",
      { style: { ...s.muted, fontSize: 11, marginBottom: 6 } },
      t("lan.ifaceHint")
    ),
    React.createElement(
      "select",
      {
        style: {
          ...s.input,
          height: 32,
          fontSize: 12,
          padding: "0 8px",
          background: "var(--dsw-alias-bg-layer-1, #ffffff)",
          cursor: "pointer"
        },
        value: selectedIp,
        onChange: handleChange,
        disabled: switching
      },
      React.createElement("option", { value: "" }, t("lan.autoRecommend", { addr: interfaces[0]?.address || currentIp, label: interfaces[0]?.label || interfaces[0]?.name || "" })),
      interfaces.map((iface) => React.createElement("option", {
        key: `${iface.name}-${iface.address}`,
        value: iface.address
      }, `${iface.address} \xB7 ${iface.label || iface.name}${iface.isVirtual ? t("lan.virtualTag") : ""}`))
    )
  );
});
var CustomTunnelGuide = React.memo(function CustomTunnelGuide2() {
  useLocaleRevision();
  return React.createElement(
    "div",
    { style: s.block },
    React.createElement("a", {
      href: TUNNEL_DOCS_URL,
      target: "_blank",
      rel: "noreferrer",
      style: { ...s.btnGhost, fontSize: 12, height: 28, display: "inline-flex" }
    }, t("tunnel.guide"))
  );
});
var CustomTunnelConfigForm = React.memo(function CustomTunnelConfigForm2({ serverUrl: initUrl, accessToken: initToken, onSave }) {
  useLocaleRevision();
  const [serverUrl, setServerUrl] = React.useState(initUrl ?? "");
  const [accessToken, setAccessToken] = React.useState(initToken ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (!syncedRef.current && (initUrl || initToken)) {
      setServerUrl(initUrl ?? "");
      setAccessToken(initToken ?? "");
      syncedRef.current = true;
    }
  }, [initUrl, initToken]);
  const dirty = serverUrl !== (initUrl ?? "") || accessToken !== (initToken ?? "");
  const [saveErr, setSaveErr] = React.useState(null);
  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveErr(null);
    try {
      await onSave(serverUrl, accessToken);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSaveErr(e.message || t("btn.saveConfigFail"));
    } finally {
      setSaving(false);
    }
  }, [onSave, serverUrl, accessToken]);
  const handleUrlChange = React.useCallback((e) => {
    setServerUrl(e.target.value);
    setSaveSuccess(false);
    setSaveErr(null);
  }, []);
  const handleTokenChange = React.useCallback((e) => {
    setAccessToken(e.target.value);
    setSaveSuccess(false);
    setSaveErr(null);
  }, []);
  return React.createElement(
    "div",
    { style: s.block },
    React.createElement("div", { style: { ...s.muted, marginBottom: 8 } }, t("tunnel.serverConfig")),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      React.createElement("input", {
        style: s.input,
        placeholder: t("tunnel.wsPlaceholder"),
        value: serverUrl,
        onChange: handleUrlChange,
        onKeyDown: (e) => {
          if (e.key === "Enter" && dirty && !saving) handleSave();
        },
        disabled: saving
      }),
      React.createElement("input", {
        style: s.input,
        type: "password",
        placeholder: t("tunnel.tokenPlaceholder"),
        value: accessToken,
        onChange: handleTokenChange,
        onKeyDown: (e) => {
          if (e.key === "Enter" && dirty && !saving) handleSave();
        },
        disabled: saving
      }),
      saveErr && React.createElement("div", { style: s.err }, `\u274C ${saveErr}`),
      React.createElement(
        "div",
        { style: { ...s.muted, fontSize: 11 } },
        t("tunnel.tokenHint")
      ),
      React.createElement("button", {
        style: {
          ...s.btnPri,
          alignSelf: "flex-start",
          opacity: !dirty || saving ? saveSuccess ? 1 : 0.5 : 1,
          background: saveSuccess ? "var(--dsw-alias-state-success-primary,#059669)" : void 0
        },
        disabled: !dirty && !saveSuccess || saving,
        onClick: handleSave
      }, saving ? t("btn.saving") : saveSuccess ? t("btn.saved") : t("btn.save"))
    )
  );
});
var TunnelCard = React.memo(function TunnelCard2({
  title,
  desc,
  data,
  autoStart,
  onToggleAutoStart,
  onStart,
  onStop,
  onReset,
  auth,
  onNavigateSecurity,
  children
}) {
  useLocaleRevision();
  const { running, configured, url, qr, state } = data ?? {};
  const phase = state?.phase ?? "idle";
  return React.createElement(
    "div",
    { style: s.card },
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      React.createElement(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        React.createElement("div", { style: s.label }, title),
        React.createElement("div", { style: { ...s.muted, marginTop: 2 } }, desc)
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 } },
        React.createElement(StatusTag, { running }),
        onToggleAutoStart && React.createElement(
          "label",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--dsw-alias-label-secondary,#6b7280)",
              cursor: "pointer",
              userSelect: "none"
            },
            title: t("tunnel.autostartTitle")
          },
          React.createElement("input", {
            type: "checkbox",
            checked: Boolean(autoStart),
            onChange: (e) => onToggleAutoStart(e.target.checked)
          }),
          t("tunnel.autostart")
        )
      )
    ),
    children,
    phase !== "idle" && phase !== "ready" && React.createElement("div", {
      style: {
        ...s.block,
        fontSize: 12,
        color: phase === "error" ? "var(--dsw-alias-state-error-primary,#dc2626)" : "var(--dsw-alias-label-secondary,#6b7280)"
      }
    }, state?.detail ?? phase),
    url && React.createElement(QrBlock, { url, qr, onReset, auth, onNavigateSecurity }),
    (onStart || onStop) && React.createElement(
      "div",
      {
        style: { ...s.block, display: "flex", gap: 8, flexWrap: "wrap" }
      },
      !running && onStart && React.createElement("button", {
        style: { ...s.btnPri, opacity: configured === false ? 0.4 : 1 },
        onClick: onStart,
        disabled: configured === false || phase === "connecting" || phase === "downloading",
        title: configured === false ? t("tunnel.saveFirst") : ""
      }, phase === "connecting" ? t("status.connecting") : phase === "downloading" ? t("status.downloading") : t("btn.start")),
      running && onStop && React.createElement("button", { style: s.btnGhost, onClick: onStop }, t("btn.stop"))
    )
  );
});
var CloudflareConfigForm = React.memo(function CloudflareConfigForm2({ token, hostname, onSave }) {
  useLocaleRevision();
  const [open, setOpen] = React.useState(Boolean(token || hostname));
  const [tokenVal, setTokenVal] = React.useState(token || "");
  const [hostnameVal, setHostnameVal] = React.useState(hostname || "");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    setTokenVal(token || "");
    setHostnameVal(hostname || "");
  }, [token, hostname]);
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await onSave({ token: tokenVal, hostname: hostnameVal });
      setMsg({ ok: true, text: t("cf.saved") });
    } catch (err) {
      setMsg({ ok: false, text: err.message || t("btn.saveFail") });
    } finally {
      setSaving(false);
    }
  };
  return React.createElement(
    "div",
    {
      style: {
        ...s.block,
        borderTop: "1px solid var(--dsw-alias-border-secondary, #e5e7eb)",
        paddingTop: 10,
        marginTop: 10
      }
    },
    React.createElement(
      "div",
      {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" },
        onClick: () => setOpen((v) => !v)
      },
      React.createElement(
        "div",
        { style: { fontSize: 12, fontWeight: 500, color: "var(--dsw-alias-brand-primary, #3b82f6)" } },
        t("cf.advanced"),
        (token || hostname) && React.createElement("span", { style: { fontSize: 11, color: "var(--dsw-alias-state-success-primary, #059669)", fontWeight: 400 } }, t("cf.configured"))
      ),
      React.createElement("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #9ca3af)" } }, open ? t("btn.collapse") : t("btn.expand"))
    ),
    open && React.createElement(
      "form",
      { onSubmit: handleSave, style: { marginTop: 10 } },
      React.createElement(
        "div",
        { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #6b7280)", marginBottom: 8, lineHeight: 1.5 } },
        t("cf.help")
      ),
      React.createElement(
        "div",
        { style: { marginBottom: 8 } },
        React.createElement("input", {
          style: s.input,
          type: "text",
          placeholder: t("cf.hostnamePlaceholder"),
          value: hostnameVal,
          onChange: (e) => setHostnameVal(e.target.value)
        })
      ),
      React.createElement(
        "div",
        { style: { marginBottom: 8 } },
        React.createElement("input", {
          style: s.input,
          type: "password",
          placeholder: t("cf.tokenPlaceholder"),
          value: tokenVal,
          onChange: (e) => setTokenVal(e.target.value)
        })
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
        React.createElement("button", {
          type: "submit",
          style: { ...s.btnPri, height: 28, fontSize: 12, padding: "0 12px" },
          disabled: saving
        }, saving ? t("btn.saving") : t("btn.saveCf")),
        (tokenVal || hostnameVal) && React.createElement("button", {
          type: "button",
          style: { ...s.btnGhost, height: 28, fontSize: 12, padding: "0 10px" },
          onClick: () => {
            setTokenVal("");
            setHostnameVal("");
            onSave({ token: "", hostname: "" });
          }
        }, t("btn.clear")),
        msg && React.createElement("span", {
          style: { fontSize: 12, color: msg.ok ? "var(--dsw-alias-state-success-primary, #059669)" : "var(--dsw-alias-state-error-primary, #dc2626)" }
        }, msg.text)
      )
    )
  );
});
var GatewayCard = React.memo(function GatewayCard2({ gw, onStart, onStop, onSaveConfig, onToggleAutoStart }) {
  useLocaleRevision();
  const running = Boolean(gw?.running);
  const port = gw?.port ?? 7443;
  const [portVal, setPortVal] = React.useState(String(port));
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    setPortVal(String(gw?.port ?? 7443));
  }, [gw?.port]);
  const handleSave = async (e) => {
    e.preventDefault();
    const p = Number(portVal);
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      setMsg({ ok: false, text: t("gw.portInvalid") });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await onSaveConfig({ port: p, autoStart: Boolean(gw?.autoStart) });
      setMsg({ ok: true, text: t("gw.portSaved") });
    } catch (err) {
      setMsg({ ok: false, text: err.message || t("btn.saveFail") });
    } finally {
      setSaving(false);
    }
  };
  return React.createElement(
    "div",
    { style: s.card },
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      React.createElement(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        React.createElement("div", { style: s.label }, t("gw.title")),
        React.createElement(
          "div",
          { style: { ...s.muted, marginTop: 2 } },
          t("gw.desc")
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 } },
        React.createElement(StatusTag, { running }),
        onToggleAutoStart && React.createElement(
          "label",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--dsw-alias-label-secondary,#6b7280)",
              cursor: "pointer",
              userSelect: "none"
            },
            title: t("gw.autostartTitle")
          },
          React.createElement("input", {
            type: "checkbox",
            checked: Boolean(gw?.autoStart),
            onChange: (e) => onToggleAutoStart(e.target.checked)
          }),
          t("tunnel.autostart")
        )
      )
    ),
    React.createElement(
      "div",
      { style: s.block, fontSize: 12, lineHeight: 1.7, color: "var(--dsw-alias-label-secondary,#6b7280)" },
      React.createElement(
        "div",
        { style: { marginBottom: 6 } },
        t("gw.publicReady"),
        !running && React.createElement("span", null, t("gw.mapPort", { port })),
        running && React.createElement("span", null, t("gw.listening", { port, suffix: port === 443 ? "" : `:${port}` }))
      ),
      React.createElement(
        "div",
        { style: { marginBottom: 6 } },
        t("gw.gate"),
        gw?.havePassword ? t("gw.needPassword") : React.createElement("span", { style: { color: "var(--dsw-alias-state-warning-primary,#d97706)" } }, t("gw.noPassword"))
      ),
      React.createElement(
        "div",
        null,
        t("gw.tls")
      )
    ),
    React.createElement(
      "form",
      { onSubmit: handleSave, style: { ...s.block, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderTop: "1px solid var(--dsw-alias-border-secondary,#e5e7eb)", paddingTop: 10 } },
      React.createElement("div", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", flex: "0 0 auto" } }, t("gw.port")),
      React.createElement("input", {
        style: { ...s.input, width: 120, height: 30 },
        type: "number",
        min: 1,
        max: 65535,
        value: portVal,
        onChange: (e) => setPortVal(e.target.value)
      }),
      React.createElement("button", {
        type: "submit",
        style: { ...s.btnPri, height: 30, fontSize: 12, padding: "0 12px" },
        disabled: saving || running,
        title: running ? t("gw.closeFirst") : ""
      }, saving ? t("btn.saving") : t("btn.savePort")),
      msg && React.createElement("span", {
        style: { fontSize: 12, color: msg.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)" }
      }, msg.text)
    ),
    React.createElement(
      "div",
      { style: { ...s.block, display: "flex", gap: 8, flexWrap: "wrap" } },
      !running && onStart && React.createElement("button", { style: s.btnPri, onClick: onStart }, t("btn.startGw")),
      running && onStop && React.createElement("button", { style: s.btnGhost, onClick: onStop }, t("btn.stopGw"))
    )
  );
});
var AccessAuthCard = React.memo(function AccessAuthCard2({ auth, rpcCall, onUpdate }) {
  useLocaleRevision();
  const [enabled, setEnabled] = React.useState(auth?.enabled ?? false);
  const [mode, setMode] = React.useState(auth?.mode ?? "token_and_password");
  const [scope, setScope] = React.useState(auth?.scope ?? "all");
  const [adminPolicy, setAdminPolicy] = React.useState(auth?.adminPolicy ?? "password_unlock");
  const [cfEnabled, setCfEnabled] = React.useState(auth?.cfAccess?.enabled ?? false);
  const [cfDomain, setCfDomain] = React.useState(auth?.cfAccess?.teamDomain ?? "");
  const [cfAud, setCfAud] = React.useState(auth?.cfAccess?.aud ?? "");
  const [cfBusy, setCfBusy] = React.useState(false);
  const [msgCf, setMsgCf] = React.useState(null);
  const [accessPassword, setAccessPassword] = React.useState("");
  const [showAccessPassword, setShowAccessPassword] = React.useState(false);
  const [savingAccess, setSavingAccess] = React.useState(false);
  const [saveAccessSuccess, setSaveAccessSuccess] = React.useState(false);
  const [msgAccess, setMsgAccess] = React.useState(null);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [savingAdmin, setSavingAdmin] = React.useState(false);
  const [saveAdminSuccess, setSaveAdminSuccess] = React.useState(false);
  const [msgAdmin, setMsgAdmin] = React.useState(null);
  const [topMsg, setTopMsg] = React.useState(null);
  React.useEffect(() => {
    if (auth) {
      setEnabled(auth.enabled ?? false);
      setMode(auth.mode ?? "token_and_password");
      setScope(auth.scope ?? "all");
      setAdminPolicy(auth.adminPolicy ?? "password_unlock");
      setCfEnabled(auth.cfAccess?.enabled ?? false);
      setCfDomain(auth.cfAccess?.teamDomain ?? "");
      setCfAud(auth.cfAccess?.aud ?? "");
    }
  }, [auth]);
  const handleToggleEnabled = async () => {
    const prev = enabled;
    const next = !enabled;
    setEnabled(next);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { enabled: next });
      if (!res?.ok) throw new Error(res?.error?.message || t("auth.updateFail"));
      setTopMsg({ ok: true, text: next ? t("auth.enabled") : t("auth.disabled") });
      onUpdate?.();
    } catch (e) {
      setEnabled(prev);
      setTopMsg({ ok: false, text: e.message || t("auth.updateFail") });
    }
  };
  const handleChangeMode = async (m) => {
    const prev = mode;
    setMode(m);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { mode: m });
      if (!res?.ok) throw new Error(res?.error?.message || t("auth.updateFail"));
      setTopMsg({ ok: true, text: t("auth.modeSwitched") });
      onUpdate?.();
    } catch (e) {
      setMode(prev);
      setTopMsg({ ok: false, text: e.message || t("auth.updateFail") });
    }
  };
  const handleChangeScope = async (sc) => {
    const prev = scope;
    setScope(sc);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { scope: sc });
      if (!res?.ok) throw new Error(res?.error?.message || t("auth.updateFail"));
      setTopMsg({ ok: true, text: t("auth.scopeUpdated") });
      onUpdate?.();
    } catch (e) {
      setScope(prev);
      setTopMsg({ ok: false, text: e.message || t("auth.updateFail") });
    }
  };
  const handleChangeAdminPolicy = async (pol) => {
    const prev = adminPolicy;
    setAdminPolicy(pol);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPolicy: pol });
      if (!res?.ok) throw new Error(res?.error?.message || t("auth.updateFail"));
      setTopMsg({ ok: true, text: t("auth.adminPolicyUpdated") });
      onUpdate?.();
    } catch (e) {
      setAdminPolicy(prev);
      setTopMsg({ ok: false, text: e.message || t("auth.updateFail") });
    }
  };
  const handleSaveAccessPassword = async () => {
    setSavingAccess(true);
    setMsgAccess(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { password: accessPassword });
      if (res?.ok) {
        setSaveAccessSuccess(true);
        setMsgAccess({ ok: true, text: t("auth.accessSaved") });
        setAccessPassword("");
        setTimeout(() => setSaveAccessSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAccess({ ok: false, text: res?.error?.message || t("btn.saveFail") });
      }
    } catch (e) {
      setMsgAccess({ ok: false, text: e.message || t("btn.saveFail") });
    } finally {
      setSavingAccess(false);
    }
  };
  const handleSaveAdminPassword = async () => {
    setSavingAdmin(true);
    setMsgAdmin(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPassword });
      if (res?.ok) {
        setSaveAdminSuccess(true);
        setMsgAdmin({ ok: true, text: t("auth.adminSaved") });
        setAdminPassword("");
        setTimeout(() => setSaveAdminSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAdmin({ ok: false, text: res?.error?.message || t("btn.saveFail") });
      }
    } catch (e) {
      setMsgAdmin({ ok: false, text: e.message || t("btn.saveFail") });
    } finally {
      setSavingAdmin(false);
    }
  };
  const handleSaveCf = async (next = cfEnabled) => {
    setCfBusy(true);
    setMsgCf(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, {
        cfAccess: { enabled: next, teamDomain: cfDomain.trim(), aud: cfAud.trim() }
      });
      if (!res?.ok) throw new Error(res?.error?.message || t("auth.updateFail"));
      setMsgCf({ ok: true, text: t("auth.cfSaved") });
      onUpdate?.();
    } catch (e) {
      setMsgCf({ ok: false, text: e.message || t("auth.updateFail") });
    } finally {
      setCfBusy(false);
    }
  };
  const handleToggleCf = async () => {
    const next = !cfEnabled;
    setCfEnabled(next);
    setCfBusy(true);
    setMsgCf(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, {
        cfAccess: { enabled: next, teamDomain: cfDomain.trim(), aud: cfAud.trim() }
      });
      if (!res?.ok) throw new Error(res?.error?.message || t("auth.updateFail"));
      setMsgCf({ ok: true, text: next ? t("auth.cfOn") : t("auth.cfOff") });
      onUpdate?.();
    } catch (e) {
      setCfEnabled(!next);
      setMsgCf({ ok: false, text: e.message || t("auth.updateFail") });
    } finally {
      setCfBusy(false);
    }
  };
  const handleRegenerateToken = async () => {
    if (!confirm(t("auth.resetConfirm"))) return;
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authRegenerateToken, {});
      if (!res?.ok) throw new Error(res?.error?.message || t("auth.resetFail"));
      setTopMsg({ ok: true, text: t("auth.tokenReset") });
      onUpdate?.();
    } catch (e) {
      setTopMsg({ ok: false, text: e.message || t("auth.resetFail") });
    }
  };
  const scopeLabel = scope === "all" ? t("auth.scopeAll") : scope === "public_only" ? t("auth.scopePublic") : t("auth.scopeLan");
  const modeLabel = mode === "token_and_password" ? t("auth.modeTokenPassword") : mode === "password_only" ? t("auth.modePassword") : t("auth.modeToken");
  const adminLabel = adminPolicy === "password_unlock" ? t("auth.adminUnlock") : adminPolicy === "local_only" ? t("auth.adminLocal") : t("auth.adminOpen");
  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 14 } },
    // ---- 顶部总控与状态概览卡片 ----
    React.createElement(
      "div",
      { style: s.card },
      React.createElement(
        "div",
        {
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }
        },
        React.createElement(
          "div",
          { style: { flex: "1 1 260px" } },
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 15, display: "flex", alignItems: "center", gap: 8 } },
            t("auth.systemTitle")
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, marginTop: 4 } },
            t("auth.systemDesc")
          )
        ),
        React.createElement("button", {
          style: { ...enabled ? s.btnPri : s.btnGhost, whiteSpace: "nowrap", flexShrink: 0 },
          onClick: handleToggleEnabled
        }, enabled ? t("auth.protectionOn") : t("auth.protectionOff"))
      ),
      enabled && React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
          }
        },
        React.createElement("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, t("auth.scopeLabel"), React.createElement("strong", { style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, scopeLabel)),
        React.createElement("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, t("auth.modeLabel"), React.createElement("strong", { style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, modeLabel)),
        React.createElement("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, t("auth.adminLabel"), React.createElement("strong", { style: { color: "var(--dsw-alias-state-success-primary,#059669)" } }, adminLabel))
      ),
      topMsg && React.createElement("div", {
        style: {
          marginTop: 12,
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 12,
          background: topMsg.ok ? "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))" : "var(--dsw-alias-state-error-bg, var(--dsw-alias-bg-layer-2, #fef2f2))",
          color: topMsg.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
        }
      }, topMsg.text)
    ),
    enabled && React.createElement(
      React.Fragment,
      null,
      // =========================================================================
      // ---- 第一道防线：外部访问门禁（控制谁能进入 Web 界面使用 AI） ----
      // =========================================================================
      React.createElement(
        "div",
        { style: s.card },
        React.createElement(
          "div",
          { style: { marginBottom: 14 } },
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 14, display: "flex", alignItems: "center", gap: 6 } },
            t("auth.layer1Title")
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, marginTop: 3 } },
            t("auth.layer1Desc")
          )
        ),
        // 验证模式选择
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, t("auth.modeSelect")),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "token_and_password", title: t("auth.modeTokenPasswordTitle"), desc: t("auth.modeTokenPasswordDesc") },
              { id: "password_only", title: t("auth.modePasswordTitle"), desc: t("auth.modePasswordDesc") },
              { id: "token_only", title: t("auth.modeTokenTitle"), desc: t("auth.modeTokenDesc") }
            ].map((opt) => {
              const isSel = mode === opt.id;
              return React.createElement(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeMode(opt.id),
                  style: {
                    flex: "1 1 200px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg, var(--dsw-alias-bg-layer-2, #eff6ff))" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                React.createElement("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                React.createElement("div", { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc)
              );
            })
          )
        ),
        // 防护生效范围
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, t("auth.scopeSelect")),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "all", title: t("auth.scopeAllTitle"), desc: t("auth.scopeAllDesc") },
              { id: "public_only", title: t("auth.scopePublicTitle"), desc: t("auth.scopePublicDesc") },
              { id: "lan_only", title: t("auth.scopeLanTitle"), desc: t("auth.scopeLanDesc") }
            ].map((opt) => {
              const isSel = scope === opt.id;
              return React.createElement(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeScope(opt.id),
                  style: {
                    flex: "1 1 180px",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg, var(--dsw-alias-bg-layer-2, #eff6ff))" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                React.createElement("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                React.createElement("div", { style: { ...s.muted, fontSize: 11, marginTop: 3 } }, opt.desc)
              );
            })
          )
        ),
        // Cloudflare Zero Trust (Access) 連携
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 } },
            React.createElement("label", { style: { ...s.label, fontSize: 12 } }, t("auth.cfTitle")),
            React.createElement("button", {
              style: { ...cfEnabled ? s.btnPri : s.btnGhost, height: 28, fontSize: 12, whiteSpace: "nowrap" },
              onClick: handleToggleCf,
              disabled: cfBusy || cfEnabled === false && (!cfDomain.trim() || !cfAud.trim())
            }, cfEnabled ? t("auth.cfEnabled") : t("auth.cfDisabled"))
          ),
          React.createElement("div", { style: { ...s.muted, fontSize: 11, marginBottom: 8 } }, t("auth.cfDesc")),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            React.createElement("input", {
              type: "text",
              style: { ...s.input, flex: "1 1 220px" },
              placeholder: t("auth.cfTeamPlaceholder"),
              value: cfDomain,
              onChange: (e) => setCfDomain(e.target.value)
            }),
            React.createElement("input", {
              type: "text",
              style: { ...s.input, flex: "2 1 280px", fontFamily: "monospace" },
              placeholder: t("auth.cfAudPlaceholder"),
              value: cfAud,
              onChange: (e) => setCfAud(e.target.value)
            }),
            React.createElement("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap" },
              onClick: () => handleSaveCf(),
              disabled: cfBusy
            }, cfBusy ? t("btn.saving") : t("btn.save"))
          ),
          React.createElement("div", { style: { ...s.muted, fontSize: 11, marginTop: 6 } }, t("auth.cfHint")),
          msgCf && React.createElement("div", {
            style: {
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              background: msgCf.ok ? "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))" : "var(--dsw-alias-state-error-bg, var(--dsw-alias-bg-layer-2, #fef2f2))",
              color: msgCf.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
            }
          }, msgCf.text)
        ),
        // 访客访问密码输入框 (当非 token_only 时展示)
        mode !== "token_only" && React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement(
            "label",
            { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } },
            t("auth.accessPwLabel", { hint: auth?.hasPassword ? t("auth.accessPwSet") : t("auth.accessPwUnset") })
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            React.createElement("input", {
              type: showAccessPassword ? "text" : "password",
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasPassword ? t("auth.accessPwPlaceholderChange") : t("auth.accessPwPlaceholderSet"),
              value: accessPassword,
              onChange: (e) => setAccessPassword(e.target.value)
            }),
            React.createElement("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: () => setShowAccessPassword((v) => !v)
            }, showAccessPassword ? t("btn.hide") : t("btn.show")),
            React.createElement("button", {
              style: {
                ...s.btnPri,
                height: 32,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: saveAccessSuccess ? "#047857" : "var(--dsw-alias-brand-primary, #4f6ef7)",
                color: saveAccessSuccess ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #ffffff)",
                cursor: savingAccess ? "wait" : "pointer"
              },
              onClick: handleSaveAccessPassword,
              disabled: savingAccess
            }, savingAccess ? t("btn.saving") : saveAccessSuccess ? t("btn.savedOk") : t("btn.saveAccessPw"))
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            t("auth.accessPwHint")
          ),
          msgAccess && React.createElement("div", {
            style: {
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              background: msgAccess.ok ? "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))" : "var(--dsw-alias-state-error-bg, var(--dsw-alias-bg-layer-2, #fef2f2))",
              color: msgAccess.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
            }
          }, msgAccess.text)
        ),
        // 免密 Token 管理
        mode !== "password_only" && React.createElement(
          "div",
          { style: s.block },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } }, t("auth.tokenLabel")),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            React.createElement(
              "code",
              { style: { ...s.code, flex: 1, padding: "6px 10px", background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)" } },
              auth?.secretToken ? `${auth.secretToken.slice(0, 10)}****************` : t("auth.tokenNone")
            ),
            React.createElement("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: handleRegenerateToken,
              title: t("auth.resetTokenTitle")
            }, t("auth.resetToken"))
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            t("auth.tokenHint")
          )
        )
      ),
      // =========================================================================
      // ---- 第二道防线：后台管理防篡改（控制谁能修改本插件所有设置） ----
      // =========================================================================
      React.createElement(
        "div",
        { style: s.card },
        React.createElement(
          "div",
          { style: { marginBottom: 14 } },
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 14, display: "flex", alignItems: "center", gap: 6 } },
            t("auth.layer2Title")
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, marginTop: 3 } },
            t("auth.layer2Desc")
          )
        ),
        // 管理员密码设置
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement(
            "label",
            { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } },
            t("auth.adminPwLabel", { hint: auth?.hasAdminPassword ? t("auth.adminPwSet") : t("auth.adminPwUnset") })
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            React.createElement("input", {
              type: showAdminPassword ? "text" : "password",
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasAdminPassword ? t("auth.adminPwPlaceholderChange") : t("auth.adminPwPlaceholderSet"),
              value: adminPassword,
              onChange: (e) => setAdminPassword(e.target.value)
            }),
            React.createElement("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: () => setShowAdminPassword((v) => !v)
            }, showAdminPassword ? t("btn.hide") : t("btn.show")),
            React.createElement("button", {
              style: {
                ...s.btnPri,
                height: 32,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: saveAdminSuccess ? "#047857" : "var(--dsw-alias-brand-primary, #4f6ef7)",
                color: saveAdminSuccess ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #ffffff)",
                cursor: savingAdmin ? "wait" : "pointer"
              },
              onClick: handleSaveAdminPassword,
              disabled: savingAdmin
            }, savingAdmin ? t("btn.saving") : saveAdminSuccess ? t("btn.savedOk") : t("btn.saveAdminPw"))
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4, color: "var(--dsw-alias-brand-primary,#4f6ef7)" } },
            t("auth.adminPwHint")
          ),
          msgAdmin && React.createElement("div", {
            style: {
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              background: msgAdmin.ok ? "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))" : "var(--dsw-alias-state-error-bg, var(--dsw-alias-bg-layer-2, #fef2f2))",
              color: msgAdmin.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
            }
          }, msgAdmin.text)
        ),
        // 远程管理权限控制策略
        React.createElement(
          "div",
          { style: s.block },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, t("auth.adminPolicyLabel")),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "password_unlock", title: t("auth.policyUnlockTitle"), desc: t("auth.policyUnlockDesc") },
              { id: "local_only", title: t("auth.policyLocalTitle"), desc: t("auth.policyLocalDesc") },
              { id: "open", title: t("auth.policyOpenTitle"), desc: t("auth.policyOpenDesc") }
            ].map((opt) => {
              const isSel = adminPolicy === opt.id;
              return React.createElement(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeAdminPolicy(opt.id),
                  style: {
                    flex: "1 1 180px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg, var(--dsw-alias-bg-layer-2, #eff6ff))" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                React.createElement("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                React.createElement("div", { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc)
              );
            })
          )
        )
      )
    )
  );
});
function PlatformCard({ platformId, platformName, platformDesc, rpcCall, onStatusChange }) {
  useLocaleRevision();
  const [platform, setPlatform] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [cfgDraft, setCfgDraft] = React.useState(null);
  React.useEffect(() => {
    if (platform?.config && !cfgDraft) {
      setCfgDraft({
        digestIntervalSec: String(platform.config.digestIntervalSec ?? 300),
        approvalTimeoutSec: String(platform.config.approvalTimeoutSec ?? 600),
        maxMessageChars: String((platform.config.maxMessageChars >= 500 ? platform.config.maxMessageChars : null) ?? (platformId === "telegram" ? 4096 : 2e3)),
        sendChunkDelayMs: String(platform.config.sendChunkDelayMs ?? 1500),
        appId: platform.config.appId ?? "",
        // Secret 不由后端回传；空值表示沿用已保存密钥
        clientSecret: "",
        appSecret: "",
        domain: platform.config.domain ?? "feishu",
        botToken: "",
        proxy: platform.config.proxy ?? ""
      });
    }
  }, [platform?.config, platformId]);
  React.useEffect(() => {
    const connected2 = platform?.status === "connected" || platform?.status === "starting" || platform?.status === "reconnecting";
    onStatusChange?.(connected2);
  }, [platform?.status, onStatusChange]);
  const loadInFlightRef = React.useRef(false);
  const seqRef = React.useRef(0);
  const load = React.useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const currentSeq = ++seqRef.current;
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
      if (currentSeq !== seqRef.current) return;
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      const allPlatforms = r.value ?? {};
      setPlatform(allPlatforms[platformId] ?? null);
      if (!quiet) setErr(null);
    } catch (e) {
      if (currentSeq === seqRef.current && !quiet) setErr(e.message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [rpcCall, platformId]);
  React.useEffect(() => {
    load();
    const activeLogin = platform?.login && (platform.login.phase === "qr" || platform.login.phase === "scaned");
    const interval = activeLogin ? 1500 : 3e3;
    const t2 = setInterval(() => load(true), interval);
    return () => clearInterval(t2);
  }, [load, platform?.login?.phase]);
  const act = React.useCallback(async (endpoint, payload) => {
    setBusy(true);
    try {
      const r = await rpcCall(endpoint, { platformId, ...payload });
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setPlatform(r.value);
      setErr(null);
      await load(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [rpcCall, load, platformId]);
  const onLogin = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformLogin, {}), [act]);
  const onStop = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformStop, {}), [act]);
  const [newId, setNewId] = React.useState("");
  const addAllow = React.useCallback(async () => {
    const id = newId.trim();
    if (!id) return;
    const list = [...platform?.allowFrom ?? [], id];
    setBusy(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.platformSetAllowFrom, { platformId, allowFrom: list });
      if (!r?.ok) throw new Error(r?.error?.message ?? t("im.allowFail"));
      setPlatform(r.value);
      setNewId("");
      setErr(null);
      await load(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [rpcCall, platformId, newId, platform?.allowFrom, load]);
  const removeAllow = React.useCallback(async (id) => {
    const list = (platform?.allowFrom ?? []).filter((x) => x !== id);
    await act(BRIDGE_ENDPOINTS.platformSetAllowFrom, { allowFrom: list });
  }, [act, platform?.allowFrom]);
  const handleNewId = React.useCallback((e) => setNewId(e.target.value), []);
  const [showSecret, setShowSecret] = React.useState(false);
  const resetDefaults = React.useCallback(() => {
    setCfgDraft((d) => ({
      ...d,
      digestIntervalSec: "300",
      approvalTimeoutSec: "600",
      maxMessageChars: platformId === "telegram" ? "4096" : "2000",
      sendChunkDelayMs: "1500"
    }));
  }, [platformId]);
  const saveConfig = React.useCallback(async () => {
    if (!cfgDraft) return;
    const payload = {
      digestIntervalSec: Number(cfgDraft.digestIntervalSec),
      approvalTimeoutSec: Number(cfgDraft.approvalTimeoutSec),
      maxMessageChars: Number(cfgDraft.maxMessageChars),
      sendChunkDelayMs: Number(cfgDraft.sendChunkDelayMs)
    };
    if (platformId === "qq") {
      payload.appId = cfgDraft.appId.trim();
      payload.clientSecret = cfgDraft.clientSecret.trim();
    } else if (platformId === "feishu") {
      payload.appId = cfgDraft.appId.trim();
      payload.appSecret = cfgDraft.appSecret.trim();
      payload.domain = cfgDraft.domain || "feishu";
    } else if (platformId === "telegram") {
      payload.botToken = cfgDraft.botToken.trim();
      payload.proxy = cfgDraft.proxy.trim();
    }
    await act(BRIDGE_ENDPOINTS.platformSetConfig, payload);
  }, [act, cfgDraft, platformId]);
  const cfgDirty = cfgDraft && platform?.config && (Number(cfgDraft.digestIntervalSec) !== platform.config.digestIntervalSec || Number(cfgDraft.approvalTimeoutSec) !== platform.config.approvalTimeoutSec || Number(cfgDraft.maxMessageChars) !== platform.config.maxMessageChars || Number(cfgDraft.sendChunkDelayMs) !== platform.config.sendChunkDelayMs || platformId === "qq" && (cfgDraft.appId !== (platform.config.appId ?? "") || cfgDraft.clientSecret !== (platform.config.clientSecret ?? "")) || platformId === "feishu" && (cfgDraft.appId !== (platform.config.appId ?? "") || cfgDraft.appSecret !== (platform.config.appSecret ?? "")) || platformId === "telegram" && (cfgDraft.botToken !== "" || cfgDraft.proxy !== (platform.config.proxy ?? "")));
  if (!platform && !err) {
    return React.createElement(
      "div",
      { style: s.card },
      React.createElement("div", { style: s.label }, platformName),
      React.createElement("div", { style: { ...s.muted, marginTop: 6 } }, t("status.loading"))
    );
  }
  const connected = platform?.status === "connected" || platform?.status === "starting" || platform?.status === "reconnecting";
  const login = platform?.login ?? {};
  const showQr = login.phase === "qr" || login.phase === "scaned";
  const statusLabel = platform?.status === "connected" ? t("status.connected") : platform?.status === "starting" ? t("status.connecting") : platform?.status === "reconnecting" ? t("status.reconnecting") : platform?.status === "paused" ? t("status.pausedExpired") : platform?.status === "error" ? t("status.errorShort") : t("status.disconnected");
  return React.createElement(
    "div",
    { style: s.card },
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      React.createElement(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        React.createElement(
          "div",
          { style: { ...s.label, display: "flex", alignItems: "center", gap: 7 } },
          platformId === "wechat" && React.createElement(Icons.wechat, { style: { color: "#07C160", width: 20, height: 20 } }),
          platformId === "qq" && React.createElement(Icons.qq, { style: { color: "#12B7F5", width: 20, height: 20 } }),
          platformId === "feishu" && React.createElement(Icons.feishu, { style: { color: "#00D6B9", width: 20, height: 20 } }),
          platformId === "telegram" && React.createElement(Icons.telegram, { style: { color: "#24A1DE", width: 20, height: 20 } }),
          platformName
        ),
        React.createElement("div", { style: { ...s.muted, marginTop: 2 } }, platformDesc)
      ),
      React.createElement(StatusTag, { status: platform?.status, running: connected })
    ),
    // 快捷入口：使用说明 / 开放平台 / 命令速查
    React.createElement(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
      platformId === "wechat" && React.createElement("a", {
        href: "https://github.com/daraskme/dsh-bridge-gateway/blob/main/docs/wechat-usage.ja.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, t("im.docsWechat")),
      platformId === "qq" && React.createElement("a", {
        href: "https://github.com/daraskme/dsh-bridge-gateway/blob/main/docs/qq-usage.ja.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, t("im.docsQq")),
      platformId === "qq" && React.createElement("a", {
        href: "https://bot.q.qq.com/wiki/develop/api-v2/",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, t("im.openQq")),
      platformId === "feishu" && React.createElement("a", {
        href: "https://github.com/daraskme/dsh-bridge-gateway/blob/main/docs/feishu-usage.ja.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, t("im.docsFeishu")),
      platformId === "feishu" && React.createElement("a", {
        href: "https://open.feishu.cn/app",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, t("im.openFeishu")),
      platformId === "telegram" && React.createElement("a", {
        href: "https://github.com/daraskme/dsh-bridge-gateway/blob/main/docs/telegram-usage.ja.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, t("im.docsTelegram")),
      platformId === "telegram" && React.createElement("a", {
        href: "https://t.me/BotFather",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, t("im.openBotFather")),
      React.createElement("button", {
        style: s.btnGhost,
        onClick: () => setShowHelp((v) => !v)
      }, showHelp ? t("im.collapseCmds") : t("im.cmdList"))
    ),
    // 命令速查
    showHelp && React.createElement(
      "div",
      { style: { ...s.block, fontSize: 12, lineHeight: 1.8, fontFamily: "monospace" } },
      React.createElement("div", null, t("im.cmdNew")),
      React.createElement("div", null, t("im.cmdNewAt")),
      React.createElement("div", null, t("im.cmdSessions")),
      React.createElement("div", null, t("im.cmdUse")),
      React.createElement("div", null, t("im.cmdWorkspaces")),
      React.createElement("div", null, t("im.cmdEnd")),
      React.createElement("div", null, t("im.cmdStop")),
      React.createElement("div", null, t("im.cmdStatus")),
      React.createElement("div", null, t("im.cmdYesNo")),
      React.createElement("div", null, t("im.cmdHelp"))
    ),
    err && React.createElement("div", { style: { ...s.warn, marginTop: 10 } }, err),
    // 已配置：结构化状态看板 + 白名单
    platform?.configured && React.createElement(
      "div",
      { style: s.block },
      // 结构化状态卡片看板
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            marginBottom: 12
          }
        },
        React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          React.createElement("div", { style: { ...s.muted, fontSize: 11 } }, t("im.connStatus")),
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 13, marginTop: 2, display: "flex", alignItems: "center", gap: 6 } },
            React.createElement("span", {
              style: {
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "var(--dsw-alias-state-success-primary,#10b981)" : "var(--dsw-alias-label-tertiary,#9ca3af)"
              }
            }),
            statusLabel
          )
        ),
        platform.accountId && React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          React.createElement("div", { style: { ...s.muted, fontSize: 11 } }, t("im.loginAccount")),
          React.createElement("div", { style: { ...s.code, fontSize: 12, marginTop: 2, fontWeight: 500 } }, platform.accountId)
        ),
        platform.sessionId && React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          React.createElement("div", { style: { ...s.muted, fontSize: 11 } }, t("im.activeSession")),
          React.createElement("div", { style: { ...s.code, fontSize: 12, marginTop: 2 } }, platform.sessionId)
        )
      ),
      React.createElement(
        "div",
        { style: { ...s.muted, fontSize: 12, marginTop: 8, lineHeight: 1.6 } },
        t("im.allowList", { count: platform.allowFrom?.length || 0 })
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 } },
        platform.allowFrom?.length ? platform.allowFrom.map(
          (id) => React.createElement(
            "span",
            { key: id, style: { ...s.tag, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", color: "var(--dsw-alias-label-primary,currentColor)", gap: 6 } },
            React.createElement("span", { style: { fontSize: 12, wordBreak: "break-all" } }, id),
            React.createElement("button", {
              style: { cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-state-error-primary,#dc2626)", fontSize: 12, padding: 0 },
              onClick: () => removeAllow(id),
              title: t("im.removeAllow")
            }, "\xD7")
          )
        ) : React.createElement(
          "div",
          { style: { ...s.muted, fontSize: 12 } },
          platformId === "wechat" ? t("im.allowEmptyWechat") : t("im.allowEmpty")
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 8, alignItems: "center" } },
        React.createElement("input", {
          style: { ...s.input, flex: 1 },
          placeholder: platformId === "wechat" ? t("im.allowPlaceholderWechat") : t("im.allowPlaceholder"),
          value: newId,
          onChange: handleNewId,
          onKeyDown: (e) => {
            if (e.key === "Enter" && newId.trim() && !busy) addAllow();
          }
        }),
        React.createElement("button", {
          style: { ...s.btnGhost, whiteSpace: "nowrap", opacity: newId.trim() && !busy ? 1 : 0.5 },
          onClick: addAllow,
          disabled: busy || !newId.trim()
        }, t("btn.add"))
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
        platform.status !== "connected" && platform.status !== "starting" && React.createElement("button", { style: s.btnPri, onClick: onLogin, disabled: busy }, t("btn.reconnect")),
        (platform.status === "connected" || platform.status === "starting") && React.createElement("button", { style: s.btnGhost, onClick: onStop, disabled: busy }, t("btn.disconnect")),
        React.createElement("button", {
          style: { ...s.btnGhost, color: "var(--dsw-alias-state-error-primary,#dc2626)", borderColor: "var(--dsw-alias-state-error-primary,#dc2626)", opacity: busy ? 0.5 : 1 },
          disabled: busy,
          onClick: () => {
            if (window.confirm(t("im.unbindConfirm"))) act(BRIDGE_ENDPOINTS.platformUnbind, {});
          },
          title: t("im.unbindTitle")
        }, t("im.unbind"))
      ),
      // 飞书 / Telegram 扫码直达对话引导卡片
      (platformId === "feishu" || platformId === "telegram") && platform.botQr && React.createElement(
        "div",
        {
          style: {
            marginTop: 12,
            padding: 12,
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
            borderRadius: 8,
            display: "flex",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap"
          }
        },
        React.createElement("img", { src: platform.botQr, alt: `${platformName} Bot QR`, style: { width: 110, height: 110, borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", padding: 4, background: "#fff" } }),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 160 } },
          React.createElement("div", { style: { ...s.label, fontSize: 13, fontWeight: 600 } }, t("im.scanChatTitle", { name: platformName })),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 } },
            t("im.scanChatDesc", { name: platformName })
          ),
          platform.botLink && React.createElement(
            "div",
            { style: { display: "flex", gap: 8, marginTop: 8 } },
            React.createElement("a", {
              href: platform.botLink,
              target: "_blank",
              rel: "noopener noreferrer",
              style: { ...s.btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 12 }
            }, t("im.openClient", { name: platformName }))
          )
        )
      )
    ),
    // 未配置 / 登录中：表单（QQ / 飞书 / Telegram）或二维码（微信）
    (!platform?.configured || showQr) && React.createElement(
      "div",
      { style: s.block },
      showQr && login.qr ? React.createElement(
        "div",
        null,
        React.createElement("img", { src: login.qr, alt: "login QR", style: s.qr }),
        React.createElement(
          "div",
          { style: { ...s.muted, marginTop: 4 } },
          login.phase === "scaned" ? t("im.scanned") : platformId === "wechat" ? t("im.scanWechat") : t("im.scanGeneric")
        ),
        login.error && React.createElement("div", { style: { ...s.muted, marginTop: 4, color: "var(--dsw-alias-state-warn-primary,#92400e)" } }, login.error)
      ) : platformId === "qq" || platformId === "feishu" || platformId === "telegram" ? React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 4 } },
        platformId === "feishu" && React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#ffffff)",
              border: "1px dashed var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 12,
              lineHeight: 1.5
            }
          },
          React.createElement("span", { style: s.label }, t("im.scanCreateHint")),
          React.createElement("span", { style: s.muted }, t("im.runInTerminal")),
          React.createElement("code", { style: { ...s.code, fontSize: 11, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", padding: "2px 4px", borderRadius: 4 } }, "npx feishu-bot-bootstrap"),
          React.createElement("span", { style: s.muted }, t("im.scanCreateManual"))
        ),
        platformId === "telegram" ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            null,
            React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, t("im.tgTokenLabel")),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 6, alignItems: "center" } },
              React.createElement("input", {
                style: { ...s.input, flex: 1 },
                type: showSecret ? "text" : "password",
                placeholder: t("im.tgTokenPlaceholder"),
                value: cfgDraft?.botToken ?? "",
                onChange: (e) => setCfgDraft((d) => ({ ...d, botToken: e.target.value }))
              }),
              React.createElement("button", {
                style: { ...s.btnGhost, height: 32, padding: "0 10px", fontSize: 13, flexShrink: 0 },
                onClick: () => setShowSecret((v) => !v),
                type: "button",
                title: showSecret ? t("im.hideSecretTitle") : t("im.showSecretTitle")
              }, showSecret ? t("btn.hideSecret") : t("btn.showSecret"))
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, t("im.proxyLabel")),
            React.createElement("input", {
              style: { ...s.input, width: "100%" },
              placeholder: t("im.proxyPlaceholder"),
              value: cfgDraft?.proxy ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, proxy: e.target.value }))
            })
          )
        ) : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { ...s.muted, marginBottom: 4 } },
              platformId === "qq" ? t("im.qqAppIdLabel") : t("im.feishuAppIdLabel")
            ),
            React.createElement("input", {
              style: { ...s.input, width: "100%" },
              placeholder: platformId === "qq" ? t("im.qqAppIdPlaceholder") : t("im.feishuAppIdPlaceholder"),
              value: cfgDraft?.appId ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, appId: e.target.value }))
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { ...s.muted, marginBottom: 4 } },
              platformId === "qq" ? t("im.qqSecretLabel") : t("im.feishuSecretLabel")
            ),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 6, alignItems: "center" } },
              React.createElement("input", {
                style: { ...s.input, flex: 1 },
                type: showSecret ? "text" : "password",
                placeholder: platformId === "qq" ? t("im.qqSecretPlaceholder") : t("im.feishuSecretPlaceholder"),
                value: platformId === "qq" ? cfgDraft?.clientSecret ?? "" : cfgDraft?.appSecret ?? "",
                onChange: (e) => setCfgDraft((d) => platformId === "qq" ? { ...d, clientSecret: e.target.value } : { ...d, appSecret: e.target.value })
              }),
              React.createElement("button", {
                style: { ...s.btnGhost, height: 32, padding: "0 10px", fontSize: 13, flexShrink: 0 },
                onClick: () => setShowSecret((v) => !v),
                type: "button",
                title: showSecret ? t("im.hideSecretTitle") : t("im.showSecretTitle")
              }, showSecret ? t("btn.hideSecret") : t("btn.showSecret"))
            )
          )
        ),
        React.createElement(
          "div",
          null,
          React.createElement("a", {
            href: platformId === "qq" ? "https://bot.q.qq.com/wiki/develop/api-v2/" : platformId === "feishu" ? "https://open.feishu.cn/app" : "https://t.me/BotFather",
            target: "_blank",
            rel: "noopener noreferrer",
            style: s.btnLink
          }, platformId === "qq" ? t("im.qqApply") : t("im.feishuApply"))
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
          React.createElement("button", {
            style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
            onClick: saveConfig,
            disabled: busy || (platformId === "telegram" ? !cfgDraft?.botToken?.trim() : !cfgDraft?.appId?.trim() || (platformId === "qq" ? !cfgDraft?.clientSecret?.trim() : !cfgDraft?.appSecret?.trim()))
          }, busy ? t("btn.saving") : t("btn.saveConnect")),
          login.phase === "error" && React.createElement("div", { style: { ...s.muted, fontSize: 12 } }, login.error ?? t("im.connectFail"))
        )
      ) : React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" } },
        React.createElement("button", {
          style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
          onClick: onLogin,
          disabled: busy
        }, busy ? t("status.processing") : t("btn.scanLogin")),
        login.phase === "error" && React.createElement("div", { style: { ...s.muted, fontSize: 12 } }, login.error ?? t("im.loginFail"))
      )
    ),
    React.createElement(
      "div",
      { style: s.block },
      React.createElement(
        "div",
        { style: { ...s.tip, fontSize: 12 } },
        platformId === "wechat" ? t("im.noteWechat") : platformId === "qq" ? t("im.noteQq") : t("im.noteGeneric")
      )
    )
  );
}
function SystemMetricsWidget({ metrics }) {
  useLocaleRevision();
  if (!metrics) return null;
  const memUsedPercent = metrics.memory?.usedPercent ?? 0;
  const memUsedGb = (metrics.memory?.usedBytes / 1024 ** 3).toFixed(1);
  const memTotalGb = (metrics.memory?.totalBytes / 1024 ** 3).toFixed(1);
  const heapMb = Math.round((metrics.memory?.processHeapUsed || 0) / 1024 ** 2);
  const formatUptime = (sec = 0) => {
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor(sec % 86400 / 3600);
    const mins = Math.floor(sec % 3600 / 60);
    if (days > 0) return t("ops.uptimeDays", { days, hrs, mins });
    if (hrs > 0) return t("ops.uptimeHours", { hrs, mins });
    return t("ops.uptimeMins", { mins });
  };
  const progressColor = memUsedPercent > 85 ? "#dc2626" : memUsedPercent > 70 ? "#d97706" : "#059669";
  return React.createElement(
    "div",
    {
      style: {
        ...s.card,
        marginBottom: 16
      }
    },
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 6 } },
      React.createElement(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        t("ops.metricsTitle")
      ),
      React.createElement(
        "div",
        { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)" } },
        `Node ${metrics.os?.nodeVersion || ""} \xB7 ${metrics.os?.platform || ""} ${metrics.os?.arch || ""}`
      )
    ),
    React.createElement(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 12 } },
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary, #9ca3af)", fontSize: 11, marginBottom: 2 } }, t("ops.cpu")),
        React.createElement(
          "div",
          { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, currentColor)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, title: metrics.cpu?.model },
          t("ops.cpuCores", { n: metrics.cpu?.cores || 0, model: (metrics.cpu?.model || "").split("@")[0].trim() })
        )
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary, #9ca3af)", fontSize: 11, marginBottom: 2 } }, t("ops.uptime")),
        React.createElement(
          "div",
          { style: { fontWeight: 600, color: "var(--dsw-alias-state-success-primary, #059669)" } },
          formatUptime(metrics.uptime?.processSec)
        )
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary, #9ca3af)", fontSize: 11, marginBottom: 2 } }, t("ops.heap")),
        React.createElement(
          "div",
          { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, currentColor)" } },
          `${heapMb} MB`
        )
      )
    ),
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)", marginBottom: 4 } },
        React.createElement("span", null, t("ops.memUsage", { used: memUsedGb, total: memTotalGb })),
        React.createElement("span", { style: { fontWeight: 600, color: progressColor } }, `${memUsedPercent}%`)
      ),
      React.createElement(
        "div",
        {
          style: {
            width: "100%",
            height: 6,
            background: "var(--dsw-alias-border-l2, #e5e7eb)",
            borderRadius: 999,
            overflow: "hidden"
          }
        },
        React.createElement("div", {
          style: {
            width: `${memUsedPercent}%`,
            height: "100%",
            background: progressColor,
            borderRadius: 999,
            transition: "width .3s ease"
          }
        })
      )
    )
  );
}
function NetworkDiagnosticWidget({ rpcCall }) {
  useLocaleRevision();
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const runDiagnose = React.useCallback(async () => {
    setRunning(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.diagnoseNetwork, {});
      if (r?.ok) setResult(r.value);
    } catch (e) {
      setResult({ overall: "warning", results: [{ item: "err", name: t("ops.diagErr"), status: "fail", detail: e.message }] });
    } finally {
      setRunning(false);
    }
  }, [rpcCall]);
  return React.createElement(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    React.createElement(
      "div",
      { style: { marginBottom: 10 } },
      React.createElement(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        t("ops.diagTitle")
      ),
      React.createElement(
        "div",
        { style: { ...s.muted, marginTop: 3 } },
        t("ops.diagDesc")
      )
    ),
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: result ? 12 : 0 } },
      React.createElement(
        "button",
        {
          type: "button",
          style: { ...s.btnPri, height: 32, fontSize: 12, padding: "0 14px" },
          onClick: runDiagnose,
          disabled: running
        },
        running ? t("ops.diagRunning") : result ? t("ops.diagRetry") : t("ops.diagStart")
      ),
      result && React.createElement("span", {
        style: {
          fontSize: 12,
          color: result.overall === "healthy" ? "var(--dsw-alias-state-success-primary, #059669)" : "var(--dsw-alias-state-warn-primary, #d97706)",
          fontWeight: 600
        }
      }, result.overall === "healthy" ? t("ops.diagOk") : t("ops.diagWarn"))
    ),
    running && !result && React.createElement(
      "div",
      {
        style: {
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--dsw-alias-bg-layer-2, #f9fafb)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--dsw-alias-brand-primary, #4f6ef7)",
          fontSize: 12
        }
      },
      React.createElement("span", { style: { animation: "spin 1s linear infinite", display: "inline-flex" } }, React.createElement(Icons.refresh)),
      t("ops.diagProbing")
    ),
    result?.results && React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--dsw-alias-border-l2, #e5e7eb)"
        }
      },
      result.results.map((item, idx) => {
        const isPass = item.status === "pass";
        const isWarn = item.status === "warn";
        return React.createElement(
          "div",
          {
            key: idx,
            style: {
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.7))",
              border: `1px solid ${isPass ? "var(--dsw-alias-state-success-border, #a7f3d0)" : isWarn ? "var(--dsw-alias-state-warn-border, #fde68a)" : "var(--dsw-alias-state-error-border, #fecaca)"}`,
              boxSizing: "border-box"
            }
          },
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, currentColor)", marginBottom: 2 } },
              isPass ? "\u2713 " : isWarn ? "\u25B2 " : "\u2715 ",
              item.name
            ),
            React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)" } }, item.detail)
          ),
          item.latencyMs != null && React.createElement("span", {
            style: {
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
              color: item.latencyMs < 500 ? "var(--dsw-alias-state-success-primary, #059669)" : "var(--dsw-alias-state-warn-primary, #d97706)"
            }
          }, `${item.latencyMs}ms`)
        );
      })
    )
  );
}
function BackupRestoreWidget({ rpcCall, onUpdate }) {
  useLocaleRevision();
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const handleExport = async () => {
    setExporting(true);
    setMsg(null);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.exportBackup, {});
      if (r?.ok && r.value) {
        const jsonStr = JSON.stringify(r.value, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const now = /* @__PURE__ */ new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        a.href = url;
        a.download = `dsh-bridge-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMsg({ ok: true, text: t("ops.exportOk") });
      } else {
        setMsg({ ok: false, text: r?.error?.message || t("ops.exportFail") });
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message || t("ops.exportErr") });
    } finally {
      setExporting(false);
    }
  };
  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const r = await rpcCall(BRIDGE_ENDPOINTS.importBackup, { backup });
      if (r?.ok) {
        setMsg({ ok: true, text: t("ops.importOk") });
        onUpdate?.(r.value?.status);
      } else {
        setMsg({ ok: false, text: r?.error?.message || t("ops.importFail") });
      }
    } catch (err) {
      setMsg({ ok: false, text: t("ops.importParseFail", { message: err.message }) });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  return React.createElement(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    React.createElement(
      "div",
      { style: { marginBottom: 10 } },
      React.createElement(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        t("ops.backupTitle")
      ),
      React.createElement(
        "div",
        { style: { ...s.muted, marginTop: 3 } },
        t("ops.backupDesc")
      )
    ),
    React.createElement(
      "div",
      { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
      React.createElement("button", {
        type: "button",
        style: { ...s.btnPri, height: 32, fontSize: 12, padding: "0 14px" },
        onClick: handleExport,
        disabled: exporting || importing
      }, exporting ? t("ops.exporting") : t("ops.export")),
      React.createElement("button", {
        type: "button",
        style: { ...s.btnGhost, height: 32, fontSize: 12, padding: "0 14px" },
        onClick: () => fileInputRef.current?.click(),
        disabled: exporting || importing
      }, importing ? t("ops.importing") : t("ops.import")),
      React.createElement("input", {
        type: "file",
        ref: fileInputRef,
        accept: ".json",
        style: { display: "none" },
        onChange: handleFileChange
      })
    ),
    msg && React.createElement("div", {
      style: {
        marginTop: 10,
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 12,
        background: msg.ok ? "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))" : "var(--dsw-alias-state-error-bg, var(--dsw-alias-bg-layer-2, #fef2f2))",
        color: msg.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
      }
    }, msg.text)
  );
}
function RestartDshCard({ rpcCall }) {
  useLocaleRevision();
  const [restarting, setRestarting] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const handleRestart = async () => {
    setRestarting(true);
    setStatus({ phase: "restarting", text: t("ops.restartSending") });
    try {
      await rpcCall(BRIDGE_ENDPOINTS.restartDsh, {});
    } catch {
    }
    setStatus({ phase: "reconnecting", text: t("ops.restartReconnecting") });
    await new Promise((r) => setTimeout(r, 2e3));
    let attempts = 0;
    const maxAttempts = 30;
    const pollHealth = setInterval(async () => {
      attempts++;
      try {
        const r = await rpcCall(BRIDGE_ENDPOINTS.checkVersion, {});
        if (r?.ok) {
          clearInterval(pollHealth);
          setStatus({ phase: "success", text: t("ops.restartSuccess") });
          setTimeout(() => {
            window.location.reload();
          }, 1e3);
          return;
        }
      } catch {
      }
      if (attempts >= maxAttempts) {
        clearInterval(pollHealth);
        setStatus({ phase: "timeout", text: t("ops.restartTimeout") });
        setRestarting(false);
      }
    }, 1e3);
  };
  return React.createElement(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    React.createElement(
      "div",
      { style: { marginBottom: 10 } },
      React.createElement(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        t("ops.restartTitle")
      ),
      React.createElement(
        "div",
        { style: { ...s.muted, marginTop: 3 } },
        t("ops.restartDesc")
      )
    ),
    !restarting && !status && React.createElement("button", {
      type: "button",
      style: { ...s.btnGhost, height: 32, fontSize: 12, padding: "0 14px" },
      onClick: handleRestart
    }, t("ops.restartNow")),
    (restarting || status) && React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: status?.phase === "success" ? "var(--dsw-alias-state-success-primary, #059669)" : status?.phase === "timeout" ? "var(--dsw-alias-state-error-primary, #dc2626)" : "var(--dsw-alias-state-info-primary, #2563eb)",
          fontWeight: 500
        }
      },
      status?.phase !== "success" && status?.phase !== "timeout" && React.createElement("span", {
        style: { animation: "spin 1s linear infinite", display: "inline-flex" }
      }, React.createElement(Icons.refresh)),
      status?.text || t("ops.restartScheduling")
    )
  );
}
var TABS = [
  { id: "lan", labelKey: "tab.lan", icon: Icons.lan },
  { id: "tunnel", labelKey: "tab.tunnel", icon: Icons.tunnel },
  { id: "im", labelKey: "tab.im", icon: Icons.bot },
  { id: "security", labelKey: "tab.security", icon: Icons.security },
  { id: "ops", labelKey: "tab.ops", icon: Icons.ops }
];
function TabBar({ active, onChange, dots }) {
  useLocaleRevision();
  return React.createElement(
    "div",
    {
      className: "dsh-tabbar-container",
      style: {
        display: "flex",
        gap: 4,
        marginBottom: 20,
        borderBottom: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        maxWidth: "100%",
        flexWrap: "nowrap",
        scrollbarWidth: "none",
        msOverflowStyle: "none"
      }
    },
    TABS.map(({ id, labelKey, icon: TabIcon }) => {
      const isActive = active === id;
      const hasDot = dots?.[id];
      return React.createElement(
        "button",
        {
          key: id,
          onClick: () => onChange(id),
          style: {
            font: "inherit",
            cursor: "pointer",
            border: "none",
            background: "none",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-secondary,#6b7280)",
            borderBottom: isActive ? "2px solid var(--dsw-alias-brand-primary,#4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "color .15s, border-color .15s",
            whiteSpace: "nowrap",
            flexShrink: 0
          }
        },
        TabIcon && React.createElement(TabIcon, {
          style: {
            color: isActive ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-tertiary,#9ca3af)",
            width: 16,
            height: 16,
            flexShrink: 0
          }
        }),
        t(labelKey),
        hasDot && React.createElement("span", {
          style: {
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--dsw-alias-state-success-primary,#10b981)",
            flexShrink: 0
          }
        })
      );
    })
  );
}
function BridgePanel({ rpcCall }) {
  useLocaleRevision();
  const [status, setStatus] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("lan");
  const [platforms, setPlatforms] = React.useState(null);
  const [selectedPlatform, setSelectedPlatform] = React.useState("telegram");
  const isLocalhost = typeof window === "undefined" || (!window.location.hostname || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || window.location.hostname === "::1" || window.location.hostname === "" || window.location.protocol === "file:" || window.location.protocol === "vscode-webview:" || window.location.protocol === "app:" || window.location.hostname.endsWith(".local"));
  const [adminToken, setAdminToken] = React.useState("");
  const [adminUnlocked, setAdminUnlocked] = React.useState(false);
  const [unlockPassword, setUnlockPassword] = React.useState("");
  const [unlockErr, setUnlockErr] = React.useState(null);
  const [unlocking, setUnlocking] = React.useState(false);
  const [showForgotGuide, setShowForgotGuide] = React.useState(false);
  const [showUnlockModal, setShowUnlockModal] = React.useState(false);
  const fetchLoopbackToken = React.useCallback(async () => {
    if (!isLocalhost) return null;
    const currentPort = typeof window !== "undefined" ? window.location.port || (window.location.protocol === "https:" ? "443" : "80") : "3082";
    const proxyPort = status?.proxy?.port || 3082;
    const candidateUrls = [
      "/__dsh_bridge__/loopback-token",
      `http://127.0.0.1:${proxyPort}/__dsh_bridge__/loopback-token`,
      `http://localhost:${proxyPort}/__dsh_bridge__/loopback-token`,
      "http://127.0.0.1:3082/__dsh_bridge__/loopback-token"
    ];
    const uniqueUrls = [...new Set(candidateUrls)];
    for (const url of uniqueUrls) {
      try {
        const res = await fetch(url, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.adminToken) {
            setAdminToken(data.adminToken);
            setGlobalAdminToken(data.adminToken);
            setAdminUnlocked(true);
            return data.adminToken;
          }
        }
      } catch {
      }
    }
    return null;
  }, [isLocalhost, status?.proxy?.port]);
  React.useEffect(() => {
    if (isLocalhost && !adminUnlocked) {
      fetchLoopbackToken();
    }
  }, [isLocalhost, adminUnlocked, fetchLoopbackToken]);
  const authRpcCall = React.useCallback(async (endpoint, payload = {}, signal) => {
    let token = adminToken || getGlobalAdminToken();
    if (isLocalhost && !token) {
      token = await fetchLoopbackToken();
    }
    const enriched = {
      ...payload,
      ...token ? { adminToken: token } : {},
      ...isLocalhost ? { isLocalhost: true } : {}
    };
    const res = await rpcCall(endpoint, enriched, signal);
    if (res?.ok === false) {
      const msg = res?.error?.message || "";
      if (isAdminBlockedMessage(msg)) {
        setUnlockErr(msg);
        setShowUnlockModal(true);
      }
    }
    return res;
  }, [rpcCall, adminToken, isLocalhost, fetchLoopbackToken]);
  const handleUnlockAdmin = React.useCallback(async (e) => {
    e?.preventDefault?.();
    setUnlocking(true);
    setUnlockErr(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authAdminUnlock, { password: unlockPassword });
      if (res?.ok) {
        const token = res.value?.adminToken || "";
        setAdminToken(token);
        setGlobalAdminToken(token);
        setAdminUnlocked(true);
        setUnlockPassword("");
        setShowUnlockModal(false);
        setErr(null);
      } else {
        setUnlockErr(res?.error?.message || t("err.adminPassword"));
      }
    } catch (err2) {
      setUnlockErr(err2.message || t("err.unlockFail"));
    } finally {
      setUnlocking(false);
    }
  }, [rpcCall, unlockPassword]);
  const handleLockAdmin = React.useCallback(async () => {
    try {
      if (adminToken) {
        await rpcCall(BRIDGE_ENDPOINTS.authAdminLock, { adminToken });
      }
    } catch {
    }
    setAdminToken("");
    setGlobalAdminToken("");
    setAdminUnlocked(false);
  }, [rpcCall, adminToken]);
  const loadInFlightRef = React.useRef(false);
  const loadSeqRef = React.useRef(0);
  const LOAD_TIMEOUT_MS = 15e3;
  const load = React.useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const currentSeq = ++loadSeqRef.current;
    const timedOut = { done: false };
    try {
      const result = await Promise.race([
        authRpcCall(BRIDGE_ENDPOINTS.getStatus, {}),
        new Promise((resolve) => {
          setTimeout(() => {
            timedOut.done = true;
            resolve(null);
          }, LOAD_TIMEOUT_MS);
        })
      ]);
      if (timedOut.done) throw new Error(t("err.loadTimeout"));
      if (currentSeq !== loadSeqRef.current) return;
      if (!result?.ok) throw new Error(result?.error?.message ?? "RPC failed");
      setStatus(result.value);
      if (!quiet) setErr(null);
    } catch (e) {
      if (currentSeq === loadSeqRef.current) setErr(e.message || t("err.loadFail"));
    } finally {
      loadInFlightRef.current = false;
    }
  }, [authRpcCall]);
  const pollPlatformsSeqRef = React.useRef(0);
  React.useEffect(() => {
    let alive = true;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      const currentSeq = ++pollPlatformsSeqRef.current;
      try {
        const r = await authRpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
        if (alive && currentSeq === pollPlatformsSeqRef.current && r?.ok) {
          setPlatforms(r.value ?? {});
        }
      } catch {
      } finally {
        inFlight = false;
      }
    };
    poll();
    const t2 = setInterval(poll, 4e3);
    return () => {
      alive = false;
      clearInterval(t2);
    };
  }, [authRpcCall]);
  React.useEffect(() => {
    load();
    const t2 = setInterval(() => load(true), 3e3);
    return () => clearInterval(t2);
  }, [load]);
  const act = React.useCallback(async (endpoint, payload) => {
    try {
      const r = await authRpcCall(endpoint, payload ?? {});
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setStatus(r.value);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [authRpcCall]);
  const onStartCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCloudflared), [act]);
  const onStopCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCloudflared), [act]);
  const onResetCloudflared = React.useCallback(
    () => act(BRIDGE_ENDPOINTS.stopCloudflared).then(() => act(BRIDGE_ENDPOINTS.startCloudflared)),
    [act]
  );
  const onToggleCloudflaredAutoStart = React.useCallback(
    (autoStart) => act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: "cloudflared", autoStart }),
    [act]
  );
  const saveCloudflaredConfig = React.useCallback(
    ({ token, hostname }) => act(BRIDGE_ENDPOINTS.saveCloudflaredConfig, { token, hostname }),
    [act]
  );
  const onSelectLanIp = React.useCallback((ip) => act(BRIDGE_ENDPOINTS.setLanIp, { ip }), [act]);
  const onStartCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCustomTunnel), [act]);
  const onStopCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCustomTunnel), [act]);
  const onToggleCustomAutoStart = React.useCallback(
    (autoStart) => act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: "customTunnel", autoStart }),
    [act]
  );
  const saveConfig = React.useCallback(
    (serverUrl, accessToken) => act(BRIDGE_ENDPOINTS.saveCustomTunnelConfig, { serverUrl, accessToken }),
    [act]
  );
  const gw = status?.gateway;
  const onStartGateway = React.useCallback(() => act(BRIDGE_ENDPOINTS.gatewayStart), [act]);
  const onStopGateway = React.useCallback(() => act(BRIDGE_ENDPOINTS.gatewayStop), [act]);
  const saveGatewayConfig = React.useCallback(
    ({ port, autoStart }) => act(BRIDGE_ENDPOINTS.gatewaySaveConfig, { port, autoStart }),
    [act]
  );
  const onToggleGatewayAutoStart = React.useCallback(
    (autoStart) => act(BRIDGE_ENDPOINTS.gatewaySetAutoStart, { autoStart }),
    [act]
  );
  const navSecurity = React.useCallback(() => setActiveTab("security"), []);
  if (!status && !err) {
    return React.createElement("div", {
      style: { padding: 32, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontSize: 13 }
    }, t("status.loading"));
  }
  const ct = status?.customTunnel;
  const imConnected = platforms && Object.values(platforms).some(
    (p) => p.status === "connected" || p.status === "starting" || p.status === "reconnecting"
  );
  const dots = {
    lan: !!status?.proxy?.running,
    tunnel: !!status?.cloudflared?.running,
    im: !!imConnected,
    security: !!status?.auth?.enabled
  };
  let tabContent;
  if (activeTab === "lan") {
    tabContent = React.createElement(
      TunnelCard,
      {
        title: t("lan.title"),
        desc: t("lan.desc"),
        data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr },
        auth: status?.auth,
        onNavigateSecurity: navSecurity
      },
      React.createElement(LanNetworkSelector, {
        lan: status?.lan,
        onSelectIp: onSelectLanIp
      })
    );
  } else if (activeTab === "tunnel") {
    tabContent = React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "div",
        { style: { ...s.label, fontSize: 13, margin: "4px 0 10px" } },
        t("tunnel.methods")
      ),
      React.createElement(
        TunnelCard,
        {
          title: t("cf.title"),
          desc: status?.cloudflared?.tokenConfigured ? t("cf.namedMode") : t("cf.quickMode"),
          data: {
            running: status?.cloudflared?.running,
            url: status?.cloudflared?.url,
            qr: status?.cloudflared?.qr,
            state: status?.cloudflared?.state
          },
          autoStart: status?.cloudflared?.autoStart,
          onToggleAutoStart: onToggleCloudflaredAutoStart,
          auth: status?.auth,
          onNavigateSecurity: navSecurity,
          onStart: onStartCloudflared,
          onStop: onStopCloudflared,
          onReset: status?.cloudflared?.running ? onResetCloudflared : null
        },
        React.createElement(CloudflareConfigForm, {
          token: status?.cloudflared?.token ?? "",
          hostname: status?.cloudflared?.hostname ?? "",
          onSave: saveCloudflaredConfig
        })
      )
    );
  } else if (activeTab === "security") {
    tabContent = React.createElement(AccessAuthCard, {
      auth: status?.auth,
      rpcCall: authRpcCall,
      onUpdate: () => load(true)
    });
  } else if (activeTab === "ops") {
    tabContent = React.createElement(
      React.Fragment,
      null,
      React.createElement(SystemMetricsWidget, { metrics: status?.system }),
      React.createElement(NetworkDiagnosticWidget, { rpcCall: authRpcCall }),
      React.createElement(BackupRestoreWidget, {
        rpcCall: authRpcCall,
        onUpdate: () => load(true)
      }),
      React.createElement(RestartDshCard, { rpcCall: authRpcCall })
    );
  } else if (activeTab === "im") {
    const IM_PLATFORMS = [
      { id: "telegram", label: t("im.telegram"), icon: Icons.telegram, brandColor: "#24A1DE", desc: t("im.telegramDesc") }
    ];
    tabContent = React.createElement(
      "div",
      null,
      // 平台选择器（可点击切换）
      React.createElement(
        "div",
        {
          style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }
        },
        IM_PLATFORMS.map(({ id, label, icon: IconComponent, brandColor, desc }) => {
          const platformData = platforms?.[id];
          const available = !!platformData;
          const active = platformData?.status === "connected" || platformData?.status === "starting" || platformData?.status === "reconnecting";
          return React.createElement(
            "div",
            {
              key: id,
              style: {
                flex: "1 1 135px",
                border: `1px solid ${selectedPlatform === id ? "var(--dsw-alias-brand-primary,#4f6ef7)" : active ? "var(--dsw-alias-state-success-primary,#10b981)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                opacity: available ? 1 : 0.5,
                cursor: available ? "pointer" : "not-allowed",
                background: selectedPlatform === id ? "var(--dsw-alias-state-info-bg, var(--dsw-alias-bg-layer-2, #eff6ff))" : active ? "var(--dsw-alias-state-success-bg, var(--dsw-alias-bg-layer-2, #ecfdf5))" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                boxShadow: selectedPlatform === id ? "0 0 0 1px var(--dsw-alias-brand-primary,#4f6ef7)" : "none",
                transition: "all 0.15s ease"
              },
              onClick: available ? () => setSelectedPlatform(id) : void 0
            },
            React.createElement(
              "div",
              { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" } },
              React.createElement(
                "span",
                { style: { display: "flex", alignItems: "center", gap: 7 } },
                IconComponent && React.createElement(IconComponent, { style: { color: brandColor, width: 18, height: 18, flexShrink: 0 } }),
                label
              ),
              active && React.createElement("span", {
                style: { width: 6, height: 6, borderRadius: "50%", background: "var(--dsw-alias-state-success-primary,#10b981)", flexShrink: 0 }
              }),
              !active && available && React.createElement("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#6b7280)", fontWeight: 400 }
              }, t("status.disconnected")),
              !available && React.createElement("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontWeight: 400 }
              }, t("status.comingSoon"))
            ),
            React.createElement("div", { style: { ...s.muted, marginTop: 4, fontSize: 11 } }, desc)
          );
        })
      ),
      // 显示选中的平台卡片（带有 key 保证切换时重置表单状态）
      selectedPlatform && platforms?.[selectedPlatform] && React.createElement(PlatformCard, {
        key: selectedPlatform,
        platformId: selectedPlatform,
        platformName: IM_PLATFORMS.find((p) => p.id === selectedPlatform)?.label ?? selectedPlatform,
        platformDesc: IM_PLATFORMS.find((p) => p.id === selectedPlatform)?.desc ?? "",
        rpcCall: authRpcCall,
        onStatusChange: () => {
        }
        // 状态变化已由 listPlatforms 轮询处理，不需要回调
      })
    );
  }
  const auth = status?.auth;
  const policy = auth?.adminPolicy ?? "password_unlock";
  const isLocked = !isLocalhost && auth?.enabled && policy !== "open" && !adminUnlocked;
  if (isLocked) {
    return React.createElement(
      "div",
      { style: { maxWidth: 620 } },
      policy === "local_only" ? React.createElement(
        "div",
        {
          style: { ...s.card, textAlign: "center", padding: "36px 20px", marginTop: 10 }
        },
        React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\u{1F6E1}\uFE0F"),
        React.createElement("div", { style: { ...s.label, fontSize: 16, fontWeight: 600, marginBottom: 8 } }, t("lock.localOnlyTitle")),
        React.createElement(
          "div",
          { style: { ...s.muted, maxWidth: 420, margin: "0 auto", lineHeight: 1.6, fontSize: 13 } },
          t("lock.localOnlyBody")
        ),
        React.createElement(
          "div",
          { style: { marginTop: 20 } },
          React.createElement("button", {
            type: "button",
            style: { ...s.btnLink, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" },
            onClick: () => setShowForgotGuide((v) => !v)
          }, t("lock.howUnlock"))
        ),
        showForgotGuide && React.createElement(
          "div",
          {
            style: {
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              color: "var(--dsw-alias-label-secondary,#4b5563)",
              textAlign: "left",
              maxWidth: 420,
              margin: "14px auto 0"
            }
          },
          React.createElement("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", marginBottom: 4 } }, t("lock.guideTitle")),
          React.createElement("div", null, "1. ", React.createElement("strong", null, t("lock.step1Label")), t("lock.step1Body")),
          React.createElement("div", { style: { marginTop: 4 } }, "2. ", React.createElement("strong", null, t("lock.step2Label")), t("lock.step2Body"), React.createElement("code", { style: s.code }, "touch ~/.dsh/dsh-bridge/reset-auth"), t("lock.step2Tail"))
        )
      ) : React.createElement(
        "div",
        {
          style: { ...s.card, maxWidth: 440, margin: "20px auto", padding: "32px 24px" }
        },
        React.createElement(
          "div",
          { style: { textAlign: "center", marginBottom: 20 } },
          React.createElement("div", { style: { fontSize: 40, marginBottom: 10 } }, "\u{1F512}"),
          React.createElement("div", { style: { ...s.label, fontSize: 16, fontWeight: 600 } }, t("lock.title")),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 12, marginTop: 6, lineHeight: 1.5 } },
            t("lock.body")
          )
        ),
        React.createElement(
          "form",
          {
            onSubmit: handleUnlockAdmin,
            style: { display: "flex", flexDirection: "column", gap: 12 }
          },
          React.createElement("input", {
            type: "password",
            style: s.input,
            placeholder: t("lock.pwPlaceholder"),
            value: unlockPassword,
            onChange: (e) => setUnlockPassword(e.target.value),
            autoFocus: true
          }),
          unlockErr && React.createElement("div", {
            style: { fontSize: 12, color: "var(--dsw-alias-state-error-primary,#dc2626)" }
          }, unlockErr),
          React.createElement("button", {
            type: "submit",
            style: { ...s.btnPri, width: "100%", justifyContent: "center", height: 36, background: "#4f6ef7", color: "#ffffff" },
            disabled: unlocking
          }, unlocking ? t("status.verifying") : t("btn.unlock"))
        ),
        React.createElement(
          "div",
          { style: { marginTop: 16, textAlign: "center" } },
          React.createElement("button", {
            type: "button",
            style: { ...s.btnLink, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" },
            onClick: () => setShowForgotGuide((v) => !v)
          }, t("lock.forgot"))
        ),
        showForgotGuide && React.createElement(
          "div",
          {
            style: {
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              color: "var(--dsw-alias-label-secondary,#4b5563)",
              textAlign: "left"
            }
          },
          React.createElement("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", marginBottom: 4 } }, t("lock.resetGuideTitle")),
          React.createElement("div", null, "1. ", React.createElement("strong", null, t("lock.step1Label")), t("lock.step1BodyPw")),
          React.createElement("div", { style: { marginTop: 4 } }, "2. ", React.createElement("strong", null, t("lock.step2Label")), t("lock.step2BodyHost"), React.createElement("code", { style: s.code }, "touch ~/.dsh/dsh-bridge/reset-auth"), t("lock.step2Tail"))
        )
      )
    );
  }
  const isInterceptionErr = isAdminBlockedMessage(err);
  return React.createElement(
    "div",
    { style: { maxWidth: 620, position: "relative" } },
    // 错误横幅（如果是权限拦截，直接提供醒目的输入密码解锁按钮）
    err && React.createElement(
      "div",
      {
        style: {
          ...s.card,
          background: "var(--dsw-alias-state-error-bg, var(--dsw-alias-bg-layer-2, #fef2f2))",
          color: "var(--dsw-alias-state-error-primary,#dc2626)",
          fontSize: 13,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10
        }
      },
      React.createElement("span", { style: { flex: "1 1 auto" } }, err),
      !isInterceptionErr && React.createElement("button", {
        type: "button",
        style: { ...s.btnGhost, height: 26, fontSize: 12, padding: "0 10px", flexShrink: 0 },
        onClick: () => load()
      }, t("btn.retry")),
      isInterceptionErr && React.createElement("button", {
        type: "button",
        style: { ...s.btnPri, background: "#dc2626", color: "#ffffff", height: 26, fontSize: 12, padding: "0 10px", flexShrink: 0 },
        onClick: () => {
          setUnlockErr(err);
          setShowUnlockModal(true);
        }
      }, t("btn.unlockNow"))
    ),
    // 管理员解锁状态提示条
    !isLocalhost && adminUnlocked && React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--dsw-alias-state-info-bg, var(--dsw-alias-bg-layer-2, #eff6ff))",
          border: "1px solid var(--dsw-alias-brand-primary,#4f6ef7)",
          borderRadius: 8,
          marginBottom: 14,
          fontSize: 12,
          color: "var(--dsw-alias-brand-primary,#4f6ef7)"
        }
      },
      React.createElement("span", null, t("lock.unlocked")),
      React.createElement("button", {
        style: { ...s.btnGhost, height: 24, fontSize: 11, padding: "0 8px" },
        onClick: handleLockAdmin
      }, t("btn.relock"))
    ),
    // 未解锁时的顶部引导条
    !isLocalhost && !adminUnlocked && auth?.enabled && policy !== "open" && React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--dsw-alias-state-warn-bg, var(--dsw-alias-bg-layer-2, #fffbeb))",
          border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)",
          borderRadius: 8,
          marginBottom: 14,
          fontSize: 12,
          color: "var(--dsw-alias-state-warn-primary,#92400e)"
        }
      },
      React.createElement("span", null, t("lock.lockedHint")),
      React.createElement("button", {
        type: "button",
        style: { ...s.btnPri, height: 24, fontSize: 11, padding: "0 10px", background: "#d97706" },
        onClick: () => setShowUnlockModal(true)
      }, t("btn.unlockAdmin"))
    ),
    React.createElement(TabBar, { active: activeTab, onChange: setActiveTab, dots }),
    tabContent,
    // 全局交互式解锁弹窗 Modal
    showUnlockModal && React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16
        },
        onClick: (e) => {
          if (e.target === e.currentTarget) setShowUnlockModal(false);
        }
      },
      React.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            borderRadius: 14,
            padding: "24px 24px",
            maxWidth: 420,
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
          }
        },
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } },
          React.createElement(
            "div",
            { style: { fontSize: 16, fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", display: "flex", alignItems: "center", gap: 8 } },
            t("lock.modalTitle")
          ),
          React.createElement("button", {
            type: "button",
            style: { border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--dsw-alias-label-tertiary,#9ca3af)", padding: 0 },
            onClick: () => setShowUnlockModal(false)
          }, "\u2715")
        ),
        React.createElement(
          "div",
          { style: { fontSize: 13, color: "var(--dsw-alias-label-secondary,#4b5563)", marginBottom: 16, lineHeight: 1.5 } },
          t("lock.modalBody")
        ),
        React.createElement(
          "form",
          {
            onSubmit: handleUnlockAdmin,
            style: { display: "flex", flexDirection: "column", gap: 12 }
          },
          React.createElement("input", {
            type: "password",
            style: s.input,
            placeholder: t("lock.modalPlaceholder"),
            value: unlockPassword,
            onChange: (e) => setUnlockPassword(e.target.value),
            autoFocus: true
          }),
          unlockErr && React.createElement("div", {
            style: { fontSize: 12, color: "var(--dsw-alias-state-error-primary,#dc2626)" }
          }, unlockErr),
          React.createElement(
            "div",
            { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 } },
            React.createElement("button", {
              type: "button",
              style: s.btnGhost,
              onClick: () => setShowUnlockModal(false)
            }, t("btn.cancel")),
            React.createElement("button", {
              type: "submit",
              style: { ...s.btnPri, background: "#4f6ef7", color: "#fff" },
              disabled: unlocking || !unlockPassword
            }, unlocking ? t("status.verifying") : t("btn.unlockImmediate"))
          )
        ),
        React.createElement(
          "div",
          { style: { marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--dsw-alias-border-l2,#f3f4f6)", fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", textAlign: "center", lineHeight: 1.5 } },
          t("lock.modalHint")
        )
      )
    )
  );
}
function AdditionalConnections({ rpcCall }) {
  const [expanded, setExpanded] = React.useState(true);
  return React.createElement(
    "section",
    { style: { color: "var(--dsw-alias-label-primary)", lineHeight: 1.7 } },
    React.createElement("h2", null, "\u30EA\u30E2\u30FC\u30C8\u30A2\u30AF\u30BB\u30B9"),
    React.createElement("p", null, "PC \u9593\u63A5\u7D9A\u306F\u300C\u30A2\u30AB\u30A6\u30F3\u30C8 \u2192 PC\u30FBTailscale\u300D\u3001\u516C\u958B\u63A5\u7D9A\u306FCloudflare Tunnel\u3068Zero Trust Access\u3067\u8A2D\u5B9A\u3057\u307E\u3059\u3002"),
    React.createElement(
      "details",
      { open: expanded, onToggle: (event) => setExpanded(event.currentTarget.open) },
      React.createElement("summary", { style: { cursor: "pointer", padding: "14px 0" } }, "Cloudflare Tunnel\u30FBZero Trust Access\u30FBLAN\u30FB\u5916\u90E8\u30B5\u30FC\u30D3\u30B9"),
      expanded && React.createElement(BridgePanel, { rpcCall })
    )
  );
}
function apply(ctx) {
  ctx.effect(() => installLocale(ctx.locale), "dsh-bridge-gateway:locale");
  const rpcCall = (endpoint, payload, signal) => ctx.connection.rpc.call(BRIDGE_RPC_CHANNEL, endpoint, payload, signal);
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "dsh-bridge-advanced",
        order: 14,
        label: () => "\u30EA\u30E2\u30FC\u30C8\u30A2\u30AF\u30BB\u30B9",
        inject: () => ({ rpcCall })
      },
      AdditionalConnections
    )
  );
}
return module.exports; } });
