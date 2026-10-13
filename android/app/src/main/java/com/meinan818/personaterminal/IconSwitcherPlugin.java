package com.meinan818.personaterminal;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * IconSwitcher —— 换主题时同步更换 Android 桌面图标。
 *
 * 原理：Android 官方支持用多个 {@code <activity-alias>}（见 AndroidManifest.xml，
 * 每个 alias 指向 MainActivity 但各挂一套 launcher 图标），再用
 * {@link PackageManager#setComponentEnabledSetting} 在同一时刻只启用其中**一个**。
 * 启动器据此显示当前启用的那个 alias 的图标。
 *
 * 关键约束（踩坑记录）：
 *  1. 同一时刻必须**恰好一个** alias 处于 ENABLED（其余 DISABLED），否则桌面会出现多个入口。
 *  2. 用 {@link PackageManager#DONT_KILL_APP}——否则每次换主题都会把应用进程杀掉重启。
 *  3. MainActivity 自身**不带** LAUNCHER intent-filter（见 AndroidManifest.xml），
 *     只在首次安装时由默认 alias（blue）承接启动入口。
 *  4. 用户在系统「应用信息」里看到的图标是 application 级 android:icon（保留为默认），
 *     不受 alias 切换影响——这是预期行为。
 *
 * 名称约定：alias 的类名 = 包名 + ".MaskariaIcon_" + {blue|yellow|red|pink|custom}。
 */
@CapacitorPlugin(name = "IconSwitcher")
public class IconSwitcherPlugin extends Plugin {

    /** 与 ThemeType / public/theme-icons/ 一一对应。 */
    private static final String[] NAMES = {"blue", "yellow", "red", "pink", "custom"};
    private static final String ALIAS_PREFIX = "MaskariaIcon_";
    /** 待切换的图标名暂存在这里，等 App 退到后台再真正生效（见 MainActivity.onStop） */
    static final String PREFS = "velvet_icon";
    static final String KEY_PENDING = "pending_icon";

    @PluginMethod
    public void setIcon(PluginCall call) {
        String name = call.getString("name", "blue");
        boolean valid = false;
        for (String n : NAMES) {
            if (n.equals(name)) { valid = true; break; }
        }
        if (!valid) {
            call.reject("unknown icon name: " + name);
            return;
        }

        // ⚠️ 这里**故意不立刻**改 alias。
        // 用户报「切完主题点一下底部导航就回到桌面」：当前显示的这个任务，root activity
        // 是由旧 alias 拉起来的；在它还在前台时把旧 alias 禁掉，系统可能顺手把这个任务收掉。
        // 所以只记下目标图标，等 App 退到后台（onStop）再切——那时没人看着，切换是安全的。
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_PENDING, name).apply();

        JSObject ret = new JSObject();
        ret.put("name", name);
        call.resolve(ret);

        // 换主题连带系统栏一起变：状态栏/导航栏的图标深浅得跟着新频道的明暗走，
        // 否则会出现在深色皮肤上用深色图标、什么都看不清。
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).scheduleSystemBarSync();
        }
    }

    /** 真正把桌面图标切到 {@code name}：同一时刻只留一个 alias 启用。供 MainActivity 在后台调用。 */
    static void applyIconSwitch(Context context, String name) {
        PackageManager pm = context.getPackageManager();
        String pkg = context.getPackageName();
        for (String n : NAMES) {
            ComponentName cn = new ComponentName(pkg, pkg + "." + ALIAS_PREFIX + n);
            int state = n.equals(name)
                    ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
            try {
                pm.setComponentEnabledSetting(cn, state, PackageManager.DONT_KILL_APP);
            } catch (IllegalArgumentException e) {
                // alias 未在 manifest 声明（旧壳）：跳过，不让整次调用失败
            }
        }
    }
}
