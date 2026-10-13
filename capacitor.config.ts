import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meinan818.personaterminal',
  appName: 'MASKARIA',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    /**
     * WebView 里的页面 origin 是 https://localhost，而自建后端目前是 http://<公网IP>，
     * WebView 默认会把这种请求当成「混合内容」拦掉——打开就是这个开关放开。
     * （系统层面的明文限制由 AndroidManifest 的 android:usesCleartextTraffic 放开。）
     * 等后端挂上 HTTPS 域名后可以关掉。
     */
    allowMixedContent: true,
  },
  ios: {
    /**
     * iPad 上 WKWebView 默认按「桌面版网站」渲染（UA 报成 Mac、viewport 的缩放锁可能不生效、能双指缩放），
     * 强制移动版：和 iPhone 同一套行为，宽屏布局 / 手机布局铺满都靠 viewport 才算得准（第 20 批）。
     */
    preferredContentMode: 'mobile',
  },
  plugins: {
    LocalNotifications: {
      /**
       * 通知栏小图标。不配这个，Capacitor 会退回彩色的 launcher mipmap，
       * 而 Android 只取小图标的 alpha 通道——彩色图进去出来就是一坨白方块，
       * 表现为「推送没有软件图标」。
       * 资源见 android/app/src/main/res/drawable/ic_stat_velvet.xml（纯白剪影 + 透明底）。
       *
       * ⚠️ 改完要跑一次 `npx cap sync android`：这份配置是构建时拷进
       * android/app/src/main/assets/capacitor.config.json 的，不同步等于没改。
       */
      smallIcon: 'ic_stat_velvet',
      /** 状态栏图标 / 展开后标题的着色 */
      iconColor: '#8B5CF6',
    },
  },
};

export default config;
