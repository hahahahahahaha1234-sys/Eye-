document.addEventListener('DOMContentLoaded', () => {
    // 取得 DOM 元素
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
    
    // 初始化 AI 引擎 (來自 ai_engine/analyzer.js)
    const analyzer = new FaceAnalyzer(videoElement, overlayCanvas);

    // 1. 進入相機掃描頁面
    goToScanBtn.addEventListener('click', () => {
        introSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        backHomeBtn.classList.remove('hidden');
        analyzer.start(); // 呼叫 AI 引擎啟動
        window.scrollTo(0, 0);
    });

    // 2. 退回首頁
    backHomeBtn.addEventListener('click', () => {
        analyzer.stop(); // 呼叫 AI 引擎停止
        scanSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        introSection.classList.remove('hidden');
        backHomeBtn.classList.add('hidden');
        window.scrollTo(0, 0);
    });

    // 3. 點擊擷取並要求 AI 分析
    startScanBtn.addEventListener('click', () => {
        // 先取得 AI 引擎的分析報告
        const report = analyzer.getAnalysisReport();
        
        if (report.error) {
            alert(report.message);
            return;
        }

        // 進行相機截圖處理
        snapshotCanvas.width = videoElement.videoWidth || 640;
        snapshotCanvas.height = videoElement.videoHeight || 480;
        snapshotCtx.save();
        snapshotCtx.scale(-1, 1);
        snapshotCtx.translate(-snapshotCanvas.width, 0);
        snapshotCtx.drawImage(videoElement, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
        snapshotCtx.restore();
        snapshotCtx.drawImage(overlayCanvas, 0, 0); // 疊加網格特徵點

        startScanBtn.innerText = "特徵點分析中...";
        
        // 畫面過渡與呈現結果
        setTimeout(() => {
            analyzer.stop();
            scanSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            startScanBtn.innerText = "擷取特徵並分析";

            // 將 AI 報告顯示到畫面上
            riskLevelText.innerText = report.level;
            riskDescText.innerText = report.desc;
        }, 1200);
    });

    // 4. 重新掃描
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        analyzer.start();
    });
});
