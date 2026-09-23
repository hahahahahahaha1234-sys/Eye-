document.addEventListener('DOMContentLoaded', () => {
    // 取得所有 DOM 元素
    const introSection = document.getElementById('intro-section');
    const scanSection = document.getElementById('scan-section');
    const resultSection = document.getElementById('result-section');
    
    const backHomeBtn = document.getElementById('back-home-btn');
    const goToScanBtn = document.getElementById('go-to-scan-btn');
    const startScanBtn = document.getElementById('start-scan-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    const riskLevelText = document.getElementById('risk-level');
    const riskDescText = document.getElementById('risk-description');
    
    const videoElement = document.getElementById('camera-feed');
    const overlayCanvas = document.getElementById('tracking-overlay');
    const snapshotCanvas = document.getElementById('snapshot-canvas');
    const snapshotCtx = snapshotCanvas.getContext('2d');
    
    // 實體化我們在 analyzer.js 中建立的 AI 引擎
    const analyzer = new window.FaceAnalyzer(videoElement, overlayCanvas);

    // 啟動掃描 (進入相機頁面)
    goToScanBtn.addEventListener('click', () => {
        introSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        backHomeBtn.classList.remove('hidden');
        analyzer.start(); // 啟動相機與 AI 引擎
    });

    // 返回首頁
    backHomeBtn.addEventListener('click', () => {
        analyzer.stop();
        scanSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        introSection.classList.remove('hidden');
        backHomeBtn.classList.add('hidden');
    });

    // 點擊「擷取特徵並分析」
    startScanBtn.addEventListener('click', () => {
        // 1. 要求 AI 引擎計算 EAR 報告
        const report = analyzer.getAnalysisReport();
        
        if (report.error) {
            alert(report.message);
            return;
        }

        startScanBtn.innerText = "特徵點分析中...";

        // 2. 處理截圖 (將影片與特徵網格畫在同一個畫布上)
        snapshotCanvas.width = videoElement.videoWidth || 640;
        snapshotCanvas.height = videoElement.videoHeight || 480;
        
        // 鏡像處理，讓截出來的圖跟看到的一樣
        snapshotCtx.save();
        snapshotCtx.scale(-1, 1);
        snapshotCtx.translate(-snapshotCanvas.width, 0);
        snapshotCtx.drawImage(videoElement, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
        snapshotCtx.restore();
        // 疊加 MediaPipe 畫好的特徵點網格
        snapshotCtx.drawImage(overlayCanvas, 0, 0); 

        // 3. 延遲 1 秒模擬運算感，隨後顯示結果
        setTimeout(() => {
            analyzer.stop();
            scanSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            startScanBtn.innerText = "擷取特徵並分析";

            riskLevelText.innerText = report.level;
            riskDescText.innerText = report.desc;
            
            // 依風險程度改變標題顏色
            if(report.level.includes("高風險")) riskLevelText.style.color = "#ff4444";
            else if(report.level.includes("中風險")) riskLevelText.style.color = "#ffcc00";
            else riskLevelText.style.color = "#00ffcc";

        }, 1000);
    });

    // 重新掃描
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        analyzer.start();
    });
});
