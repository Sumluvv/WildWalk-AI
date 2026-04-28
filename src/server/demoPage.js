export function renderDemoPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WildWalk AI Demo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; line-height: 1.5; }
    button { padding: 10px 14px; border-radius: 8px; border: 1px solid #ccc; cursor: pointer; }
    pre { background: #111; color: #f4f4f4; padding: 12px; border-radius: 8px; overflow: auto; }
    .row { margin-bottom: 12px; }
  </style>
</head>
<body>
  <h1>WildWalk AI 一键试玩页</h1>
  <div class="row">
    <label>Scenario: </label>
    <select id="scenarioId">
      <option value="kyoto-daimonji">京都大文字山</option>
      <option value="yakushima-traverse">屋久岛纵走</option>
      <option value="everest-base-camp">珠峰大本营</option>
    </select>
  </div>
  <div class="row">
    <button id="runBtn">运行一局 Demo</button>
  </div>
  <pre id="output">点击按钮后显示结果...</pre>
  <script>
    const runBtn = document.getElementById("runBtn");
    const output = document.getElementById("output");
    const scenarioId = document.getElementById("scenarioId");

    runBtn.addEventListener("click", async () => {
      output.textContent = "运行中...";
      try {
        const res = await fetch("/v1/demo/run-once", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId: scenarioId.value, finishReason: "summit_success" })
        });
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        output.textContent = String(e);
      }
    });
  </script>
</body>
</html>`;
}
