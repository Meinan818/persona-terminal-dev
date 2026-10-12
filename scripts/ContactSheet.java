import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;

/** 把处理后的 5 张主题图标平铺成一张对比图，供人眼目检黑底处理效果。 */
public class ContactSheet {
    public static void main(String[] args) throws Exception {
        String[] cn = {"蓝色", "黄色", "红色", "粉色", "自定义"};
        int cell = 240, pad = 16, topLabel = 30;
        int cols = 5;
        BufferedImage sheet = new BufferedImage(cols * (cell + pad) + pad, cell + pad * 2 + topLabel + 40,
                BufferedImage.TYPE_INT_RGB);
        Graphics2D g = sheet.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        // 棋盘格底：让「透明」肉眼可见（透明处会露出棋盘）
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, sheet.getWidth(), sheet.getHeight());
        for (int y = 0; y < sheet.getHeight(); y += 20)
            for (int x = 0; x < sheet.getWidth(); x += 20)
                if (((x / 20) + (y / 20)) % 2 == 0) {
                    g.setColor(new Color(0xE8E8E8));
                    g.fillRect(x, y, 20, 20);
                }
        g.setColor(Color.BLACK);
        g.setFont(new Font("SansSerif", Font.BOLD, 16));
        g.drawString("MASKARIA 主题图标 — 黑底处理对比（棋盘=透明区）", pad, 22);

        String base = args.length > 0 ? args[0] : ".";
        for (int i = 0; i < cn.length; i++) {
            File f = new File(base + "/图标/_processed_" + cn[i] + ".png");
            if (!f.exists()) f = new File(base + "/public/theme-icons/" + new String[]{"blue", "yellow", "red", "pink", "custom"}[i] + ".png");
            if (!f.exists()) { System.out.println("missing " + f.getPath()); continue; }
            BufferedImage img = ImageIO.read(f);
            int x = pad + i * (cell + pad), y = topLabel + pad;
            g.drawImage(img, x, y, cell, cell, null);
            g.setColor(Color.BLACK);
            g.drawString(cn[i], x + 4, y + cell + 20);
        }
        g.dispose();
        File out = new File(base + "/.rivet/scratch/icons-contact.png");
        out.getParentFile().mkdirs();
        ImageIO.write(sheet, "png", out);
        System.out.println("saved " + out.getPath() + "  " + sheet.getWidth() + "x" + sheet.getHeight());
    }
}
