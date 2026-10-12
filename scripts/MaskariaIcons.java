import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayDeque;

/**
 * MaskariaIcons —— MASKARIA 主题图标处理与生成。
 *
 * 输入：图标/{蓝色,黄色,红色,粉色,自定义}.png（与 ThemeType blue/yellow/red/pink/custom 一一对应）
 * 输出：
 *   · Android：mipmap-{density}/ic_launcher_{color}.png / ic_launcher_round_{color}.png
 *              / ic_launcher_foreground_{color}.png（供 activity-alias 按主题切换）
 *   · Web：    public/theme-icons/{color}.png（应用内 logo + 动态 favicon 源）
 *              默认蓝主题另覆盖 public/{icon.png, apple-touch-icon.png, pwa-*.png, maskable-*.png}
 *   · 样张：   图标/_processed_{中文名}.png（供人眼目检）
 *
 * ⚠ 黑底处理为什么用「几何圆角矩形」而不是「泛洪去黑」：
 *   源素材卡片是圆角方形，外部黑底为纯黑 (0,0,0)。但部分图（红/黄/自定义）卡片**内部**
 *   的黑色设计元素（城市剪影、电视机、泼墨三角）紧贴卡片边缘、颜色与外部黑底完全相同，
 *   按「黑」做四连通泛洪会顺着接触点渗进卡片内部，把图内的黑一起清掉（实测红色在
 *   任何阈值下都无法与外部黑分离）。因此改为：
 *     ① 严格泛洪(阈值 2) 只取「连通到图像边界」的黑，得到前景 = 卡片内容；
 *     ② 由前景求稳健外接框（逐边裁掉前景占比 <8% 的噪声行/列）；
 *     ③ 在框内搜索最大圆角半径 rad，使「圆角矩形之外」无任何前景像素；
 *     ④ 按该圆角矩形掩码置透明（边缘 1px 抗锯齿）。
 *   这样卡片内部的黑完整保留，只清除卡片外部的黑。
 */
public class MaskariaIcons {
    /** 泛洪「纯黑背景」亮度上限——外部黑底实测 0~1，卡片内暗内容 14+，取 2 严格分离 */
    static final int BG_LUMA_MAX = 2;
    /** 稳健外接框：裁掉前景占比低于此比例的行/列（去边缘孤立噪点） */
    static final double TRIM_FG_RATIO = 0.08;

    record Density(String name, int launcherSize, int adaptiveSize) {}
    static final Density[] DENSITIES = {
            new Density("mdpi", 48, 108),
            new Density("hdpi", 72, 162),
            new Density("xhdpi", 96, 216),
            new Density("xxhdpi", 144, 324),
            new Density("xxxhdpi", 192, 432),
    };
    static final String[] COLORS = {"blue", "yellow", "red", "pink", "custom"};
    static final String[] CN = {"蓝色", "黄色", "红色", "粉色", "自定义"};

    static double luma(int argb) {
        int r = (argb >> 16) & 0xff, g = (argb >> 8) & 0xff, b = argb & 0xff;
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    /** 圆角矩形有向距离：>0 在矩形外，<0 在矩形内。 */
    static double sdf(double x, double y, int l, int t, int r, int b, double rad) {
        double cx = (l + r) / 2.0, cy = (t + b) / 2.0;
        double hw = (r - l) / 2.0, hh = (b - t) / 2.0;
        double qx = Math.abs(x - cx) - (hw - rad);
        double qy = Math.abs(y - cy) - (hh - rad);
        double ax = Math.max(qx, 0), ay = Math.max(qy, 0);
        return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - rad;
    }

    static BufferedImage stripBlackBackground(BufferedImage src) {
        int w = src.getWidth(), h = src.getHeight();
        int[] px = src.getRGB(0, 0, w, h, null, 0, w);

        // ① 严格泛洪：只吞并「连通到图像边界」的纯黑，得到背景掩码
        boolean[] bg = new boolean[w * h];
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int x = 0; x < w; x++) {
            seedBg(px, bg, queue, x);
            seedBg(px, bg, queue, (h - 1) * w + x);
        }
        for (int y = 0; y < h; y++) {
            seedBg(px, bg, queue, y * w);
            seedBg(px, bg, queue, y * w + (w - 1));
        }
        while (!queue.isEmpty()) {
            int i = queue.poll();
            int x = i % w, y = i / w;
            if (x > 0) seedBg(px, bg, queue, i - 1);
            if (x < w - 1) seedBg(px, bg, queue, i + 1);
            if (y > 0) seedBg(px, bg, queue, i - w);
            if (y < h - 1) seedBg(px, bg, queue, i + w);
        }

        // ② 稳健外接框（前景 = !bg）
        int[] rowFg = new int[h], colFg = new int[w];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                if (!bg[y * w + x]) { rowFg[y]++; colFg[x]++; }
        int[] yb = trim(rowFg, h);
        int[] xb = trim(colFg, w);
        int t = yb[0], b = yb[1], l = xb[0], r = xb[1];

        // ③ 搜索最大圆角半径：使「圆角矩形外」无前景像素
        double bestRad = 0;
        double maxRad = Math.min(w, h) * 0.30;
        search:
        for (double rad = 0; rad < maxRad; rad += 0.5) {
            for (int y = t; y <= b; y++) {
                for (int x = l; x <= r; x++) {
                    if (!bg[y * w + x] && sdf(x + 0.5, y + 0.5, l, t, r, b, rad) > 0.5) {
                        break search;
                    }
                }
            }
            bestRad = rad;
        }

        // ④ 按掩码置透明（边缘 1px 抗锯齿）
        int[] dst = new int[w * h];
        int cleared = 0;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int i = y * w + x;
                int argb = px[i];
                int a = (argb >>> 24) & 0xff;
                double d = sdf(x + 0.5, y + 0.5, l, t, r, b, bestRad);
                double alpha;
                if (d > 0.5) alpha = 0;
                else if (d < -0.5) alpha = a;
                else alpha = a * ((0.5 - d) / 1.0);
                int ai = (int) Math.round(Math.max(0, Math.min(255, alpha)));
                dst[i] = (ai << 24) | (argb & 0x00ffffff);
                if (ai == 0) cleared++;
            }
        }
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        out.setRGB(0, 0, w, h, dst, 0, w);
        System.out.printf("  rect[%d,%d,%d,%d] %dx%d  R=%.1f  cleared=%.1f%%%n",
                l, t, r, b, r - l + 1, b - t + 1, bestRad, 100.0 * cleared / (w * h));
        return out;
    }

    static void seedBg(int[] px, boolean[] bg, ArrayDeque<Integer> q, int i) {
        if (bg[i] || luma(px[i]) > BG_LUMA_MAX) return;
        bg[i] = true;
        q.add(i);
    }

    /** 返回 [first, last]：从两端裁掉前景占比 < 阈值 的行/列。 */
    static int[] trim(int[] fg, int len) {
        int thr = (int) (len * TRIM_FG_RATIO);
        int a = 0, z = len - 1;
        while (a < len && fg[a] < thr) a++;
        while (z >= 0 && fg[z] < thr) z--;
        if (a >= len || z < 0) return new int[]{0, len - 1};
        return new int[]{a, z};
    }

    static void writeIcon(BufferedImage src, int size, double ratio, File out) throws Exception {
        BufferedImage canvas = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = canvas.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            int draw = (int) Math.round(size * ratio);
            g.drawImage(src, (size - draw) / 2, (size - draw) / 2, draw, draw, null);
        } finally {
            g.dispose();
        }
        File parent = out.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs())
            throw new java.io.IOException("mkdir failed: " + parent);
        ImageIO.write(canvas, "png", out);
    }

    public static void main(String[] args) throws Exception {
        String root = args.length > 0 ? args[0] : ".";
        File iconDir = new File(root, "图标");
        File resRoot = new File(root, "android/app/src/main/res");
        File pub = new File(root, "public");
        File themeDir = new File(pub, "theme-icons");

        for (int i = 0; i < COLORS.length; i++) {
            String color = COLORS[i], cn = CN[i];
            File in = new File(iconDir, cn + ".png");
            if (!in.exists()) { System.out.println("MISSING " + in.getPath()); continue; }
            System.out.println("== " + color + " (" + cn + ")");
            BufferedImage clean = stripBlackBackground(ImageIO.read(in));
            ImageIO.write(clean, "png", new File(iconDir, "_processed_" + cn + ".png"));

            for (Density d : DENSITIES) {
                File mip = new File(resRoot, "mipmap-" + d.name());
                writeIcon(clean, d.launcherSize(), 0.82, new File(mip, "ic_launcher_" + color + ".png"));
                writeIcon(clean, d.launcherSize(), 0.82, new File(mip, "ic_launcher_round_" + color + ".png"));
                writeIcon(clean, d.adaptiveSize(), 0.72, new File(mip, "ic_launcher_foreground_" + color + ".png"));
            }
            writeIcon(clean, 128, 1.0, new File(themeDir, color + ".png"));

            if ("blue".equals(color)) {
                for (Density d : DENSITIES) {
                    File mip = new File(resRoot, "mipmap-" + d.name());
                    writeIcon(clean, d.launcherSize(), 0.82, new File(mip, "ic_launcher.png"));
                    writeIcon(clean, d.launcherSize(), 0.82, new File(mip, "ic_launcher_round.png"));
                    writeIcon(clean, d.adaptiveSize(), 0.72, new File(mip, "ic_launcher_foreground.png"));
                }
                writeIcon(clean, 128, 1.0, new File(pub, "icon.png"));
                writeIcon(clean, 180, 1.0, new File(pub, "apple-touch-icon.png"));
                writeIcon(clean, 192, 1.0, new File(pub, "pwa-192x192.png"));
                writeIcon(clean, 512, 1.0, new File(pub, "pwa-512x512.png"));
                writeIcon(clean, 192, 0.8, new File(pub, "maskable-192x192.png"));
                writeIcon(clean, 512, 0.8, new File(pub, "maskable-512x512.png"));
            }
        }
        System.out.println("DONE");
    }
}
