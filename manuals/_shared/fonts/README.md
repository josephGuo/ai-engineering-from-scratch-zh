# 离线打印字体

仅打印 HTML 内嵌这些字体；网页版字体与 PDF 下载入口不变。不依赖宿主的商业中文字体，也不访问远程字体服务。

官方来源：<https://github.com/notofonts/noto-cjk>，固定 `Sans2.004` 对应提交 `523d033d6cb47f4a80c58a35753646f5c3608a78`。
许可证：同提交根目录 `LICENSE`，SIL Open Font License 1.1，见随附 `OFL.txt`（SHA-256 `6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2`）。原字体 OS/2 `fsType=0`，允许嵌入。

| 文件 | 官方原始路径 | 原始 OTF SHA-256 | 仓库 WOFF2 SHA-256 |
|---|---|---|---|
| NotoSansSC-Regular.woff2 | Sans/SubsetOTF/SC/NotoSansSC-Regular.otf | faa6c9df652116dde789d351359f3d7e5d2285a2b2a1f04a2d7244df706d5ea9 | 4b70c8053e3fda563e01a55f823e61cd06387ee7f254c913cb42b8263f4c2e8a |
| NotoSansMonoCJKsc-Regular.woff2 | Sans/Mono/NotoSansMonoCJKsc-Regular.otf | ec04cc376b34887cedbdf84074e2e226ed2761eeabdcb9173fc1dd7bfd153ef7 | 51c103d5aab23a909317245278aeca1c58f611bd5fdfd4e56e4288fe00e4ebfd |

符号字体同样来自官方 OFL 源，避免原文 `✅`、`✗`、`❌` 回退到 AppleColorEmoji / ZapfDingbats。它们不替换原文字面量：

- Noto Sans Symbols 2：<https://github.com/notofonts/noto-fonts>，提交 `ffebf8c1ee449e544955a7e813c54f9b73848eac`，`hinted/ttf/NotoSansSymbols2/NotoSansSymbols2-Regular.ttf`。
  - TTF SHA-256 `630846d528dbe4c4981370a4d0a9475a1fd1491a129bb411f8e157cdb5de13c6`；WOFF2 `22920aa09a73757d59d58f1a84cc82af7124db6d2e9b8646a4bbc47bc27e0ecf`。
  - 同提交根 `LICENSE` 保存为 `OFL-Symbols.txt`，SHA-256 `0dab92d0544f7b233403f14b84a663bdbfa746982eda629e7f4f9ffe1b036feb`。
- Noto Emoji（单色可变字体）：<https://github.com/google/fonts>，提交 `bd8f81ddb5c74d5c8897b36ad88b440266245103`，`ofl/notoemoji/NotoEmoji[wght].ttf`。
  - TTF SHA-256 `de6c18832938afc99caf132b39d6a30a19bac7f2e812e28db2535b4608d27551`；WOFF2 `772bf6ae3d10f136065c234151b03695669481298b1221ad038300a92ee29e62`。
  - 同目录 `OFL.txt` 保存为 `OFL-Emoji.txt`，SHA-256 `500bb1ccf43df7bbb522112f9133a52b16e1c35e809632f5d8609b179152de5b`。

WOFF2 只压缩原字体容器，保留原名称、完整字形和 cmap，不按站点 OG atlas 或当前手册文本裁剪。正文为 Noto Sans SC，代码与图表为 Noto Sans Mono CJK SC；粗体由浏览器合成。

## 复现字体压缩

在独立临时目录下载上述固定提交中的OTF/TTF 和对应许可证，先验证原始 hash，再用隔离 Python 环境执行：

```bash
python3 -m venv /tmp/manual-pdf-font-tools
/tmp/manual-pdf-font-tools/bin/pip install 'fonttools[woff]==4.60.1'
/tmp/manual-pdf-font-tools/bin/python -m fontTools.ttLib.woff2 compress NotoSansSC-Regular.otf
/tmp/manual-pdf-font-tools/bin/python -m fontTools.ttLib.woff2 compress NotoSansMonoCJKsc-Regular.otf
/tmp/manual-pdf-font-tools/bin/python -m fontTools.ttLib.woff2 compress NotoSansSymbols2-Regular.ttf
/tmp/manual-pdf-font-tools/bin/python -m fontTools.ttLib.woff2 compress NotoEmoji.ttf
```

## 生成 PDF

构建器输出自包含打印 HTML（无脚本、无远程字体）。使用隔离安装、固定 MIT `pagedjs-cli@0.4.3` 和系统 Chrome，禁止远程请求；每次采用新的 `/tmp` 浏览器 profile。不提交生成的 HTML/PDF，不发布 release。

```bash
node site/build-manuals.js --print /tmp/manual-print-candidate
PROFILE=$(mktemp -d /tmp/manual-pdf-chrome.XXXXXX)
PUPPETEER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  /tmp/manual-platform-pdf.XrYIKX/node_modules/.bin/pagedjs-cli \
  /tmp/manual-print-candidate/a2a-101/print.html --blockRemote \
  --browserArgs="--user-data-dir=$PROFILE" \
  --additional-script "$PWD/manuals/_shared/print-ready.js" \
  -o /tmp/manual-print-candidate/aiefs-manual-a2a-101.pdf
```

该 helper 等待字库加载；在 Paged.js 完成分页后，停用 Chromium 的原生多栏/分页规则，防止已经分好的段落、代码和表格再次碎片化而丢失页末文字。不能省略该参数。每行代码仅添加打印用行盒，保留原始文字及换行，不改录制文件。

另一手册将 `a2a-101` 替换为 `docker-sandboxes-101`。发布前须检查 PDF 嵌入字体、文字完整性和每一页的实际渲染图像；页数或成功生成不能替代人工视觉验收。发布附件应同时保留本许可证及来源说明。
