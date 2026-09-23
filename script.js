document.addEventListener('DOMContentLoaded', () => {
    const scanSection = document.getElementById('scan-section');
    const resultSection = document.getElementById('result-section');
    const startScanBtn = document.getElementById('start-scan-btn');
    const resetBtn = document.getElementById('reset-btn');
    const riskLevelText = document.getElementById('risk-level');
    const riskDescText = document.getElementById('risk-description');

    // 模擬計畫書中的三種風險分級
    const mockResults = [
        { level: "高風險 (HIGH RISK)", desc: "辨識到急性發炎或傳染性結膜炎特徵，請尋求醫療協助。" },
        { level: "中風險 (MEDIUM RISK)", desc: "分析顯示有異常關注點（如角膜老年環），建議一週內預約診所。" },
        { level: "低風險 (LOW RISK)", desc: "判定眼部結構健康。請維持良好用眼習慣與日常保養。" }
    ];

    // 點擊開始掃描
    startScanBtn.addEventListener('click', () => {
        startScanBtn.innerText = "掃描與校正中...";
        
        // 模擬等待 AI 運算時間 (2秒)
        setTimeout(() => {
            scanSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            startScanBtn.innerText = "START EYE SCAN (開始掃描)";

            // 隨機抽選一種風險結果做展示
            const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
            riskLevelText.innerText = `結果分析: ${randomResult.level}`;
            riskDescText.innerText = randomResult.desc;
        }, 2000);
    });

    // 點擊重新掃描
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
    });
});
