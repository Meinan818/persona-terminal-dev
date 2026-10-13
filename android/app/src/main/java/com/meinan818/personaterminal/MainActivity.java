package com.meinan818.personaterminal;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebSettings;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 小组件快照通道（PRD_V2.6 §8）。必须在 super.onCreate 之前注册，
        // 否则 Bridge 已经建好了插件表，registerPlugin 不会被采纳。
        registerPlugin(VelvetWidgetPlugin.class);
        // 一起进步 · 后台刷新（v2.7.0.6）：网页侧推登录凭据 / 开关过来，见 PactRefresh
        registerPlugin(PactRefreshPlugin.class);
        // 主题 → 桌面图标切换（MASKARIA 更名后新增）：见 IconSwitcherPlugin
        registerPlugin(IconSwitcherPlugin.class);
        super.onCreate(savedInstanceState);

        // 状态栏与底部导航栏都透明，让 Web 内容一直铺到屏幕边缘。
        // 网页侧本来就是 viewport-fit=cover + env(safe-area-inset-top) 留位（见 App.tsx 顶部 padding），
        // 底部同理（--app-bottom-safe-padding = env(safe-area-inset-bottom)），
        // 所以这里放开系统栏布局即可，内容不会被时间／信号／手势条盖住。
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10 起系统会给透明导航栏垫一层半透明黑；关掉它才是真的透出网页背景
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
        }

        // 临时诊断：用户报「切主题后点底部导航会回到桌面」，先让机器自己说出上次是怎么没的。
        // 只为定位问题，查清后可移除。
        reportLastExitReasonIfAbnormal();

        // 关掉 WebView 缩放（v2.7，用户上报「安卓设置页双指能把整页放大」）。
        // Capacitor 自己从不碰这几项，走的是 WebView 默认值；而网页层的
        // viewport `user-scalable=no` 在 Chromium 上会被**故意忽略**（无障碍口径），
        // 所以 APK 这一侧必须在原生把缩放关死。iOS 侧对应的是 WKWebView 认 meta。
        // super.onCreate 之后 bridge 才建好，取 WebView 必须在这之后。
        WebSettings settings = getBridge().getWebView().getSettings();
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
    }

    @Override
    public void onResume() {
        super.onResume();
        syncSystemBarIcons();
    }

    @Override
    public void onStop() {
        super.onStop();
        // 桌面图标在这里才真正切换（换主题时只记了待切换项，见 IconSwitcherPlugin.setIcon）：
        // 前台时动 alias 有可能把当前任务一起收掉。
        applyPendingIconSwitch();
    }

    private void applyPendingIconSwitch() {
        try {
            SharedPreferences prefs = getSharedPreferences(IconSwitcherPlugin.PREFS, MODE_PRIVATE);
            String pending = prefs.getString(IconSwitcherPlugin.KEY_PENDING, null);
            if (pending == null) return;
            prefs.edit().remove(IconSwitcherPlugin.KEY_PENDING).apply();
            IconSwitcherPlugin.applyIconSwitch(this, pending);
        } catch (Exception ignored) {
            // 后台切换失败不该影响任何事，下次换主题再说
        }
    }

    /**
     * 换主题后由 IconSwitcherPlugin 调用：网页此刻还在把 data-ui-channel / .dark 写到 &lt;html&gt; 上，
     * 稍等一拍再读，避免读到切换前的旧值。
     */
    public void scheduleSystemBarSync() {
        getWindow().getDecorView().postDelayed(this::syncSystemBarIcons, 350);
    }

    /**
     * 系统栏图标深浅跟着网页的实际主题走。判断信号取网页自己的频道标记：
     *   · p5（红频道）本身是深色设计（黑红舞台），即使没挂 .dark 也是深色界面；
     *   · p4（黄频道）是高饱和亮黄底，算浅色界面；
     *   · 其余（p3 / neutral）看 .dark class。
     * 深色界面用浅色图标，浅色界面用深色图标。读不到就按浅色界面处理。
     */
    private void syncSystemBarIcons() {
        try {
            getBridge().getWebView().evaluateJavascript(
                    "(function(){var el=document.documentElement;" +
                            "var c=el.getAttribute('data-ui-channel')||'neutral';" +
                            "var d=el.classList.contains('dark');" +
                            "var darkUi=(c==='p5')||(c!=='p4'&&d);" +
                            "return darkUi?'1':'0';})()",
                    value -> applySystemBarIcons(value != null && value.contains("1")));
        } catch (Exception ignored) {
            // WebView 还没就绪：不打断启动，等下一次 onResume
        }
    }

    /** darkUi = 页面是深色 → 系统栏图标用浅色 */
    private void applySystemBarIcons(boolean darkUi) {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(!darkUi);
        controller.setAppearanceLightNavigationBars(!darkUi);
    }

    private void reportLastExitReasonIfAbnormal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        try {
            showLastExitDialog();
        } catch (Exception ignored) {
            // 取不到退出历史就算了，不能因为诊断把 App 拖下水
        }
    }

    @RequiresApi(Build.VERSION_CODES.R)
    private void showLastExitDialog() {
        ActivityManager manager = getSystemService(ActivityManager.class);
        if (manager == null) return;
        List<ApplicationExitInfo> history = manager.getHistoricalProcessExitReasons(getPackageName(), 0, 1);
        if (history.isEmpty()) return;
        ApplicationExitInfo info = history.get(0);
        long minutesAgo = (System.currentTimeMillis() - info.getTimestamp()) / 60_000L;
        // 只报「刚发生」的那次，免得每次冷启动都弹一条几天前的旧记录
        if (minutesAgo > 15) return;
        String message = "原因码 reason=" + info.getReason() + "（" + describeExitReason(info.getReason()) + "）"
                + "\n说明 desc=" + info.getDescription()
                + "\n退出时内存 pss≈" + (info.getPss() / 1024) + " MB"
                + "\n发生在 " + minutesAgo + " 分钟前";
        new AlertDialog.Builder(this)
                .setTitle("上次退出诊断（临时）")
                .setMessage(message)
                .setPositiveButton("知道了", null)
                .show();
    }

    private static String describeExitReason(int reason) {
        switch (reason) {
            case ApplicationExitInfo.REASON_CRASH: return "程序崩溃(4)";
            case ApplicationExitInfo.REASON_CRASH_NATIVE: return "底层崩溃(5)";
            case ApplicationExitInfo.REASON_ANR: return "无响应(6)";
            case ApplicationExitInfo.REASON_LOW_MEMORY: return "内存不足被系统杀掉(13)";
            case ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE: return "占用资源过高被杀(14)";
            case ApplicationExitInfo.REASON_USER_REQUESTED: return "被移出任务列表(10)";
            case ApplicationExitInfo.REASON_OTHER: return "其它原因(1)";
            default: return "reason=" + reason;
        }
    }
}
