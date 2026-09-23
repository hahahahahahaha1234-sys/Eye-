document.addEventListener('DOMContentLoaded', () => {
    const scanSection = document.getElementById('scan-section');
    const resultSection = document.getElementById('result-section');
    const startScanBtn = document.getElementById('start-scan-btn');
    const resetBtn = document.getElementById('reset-btn');
    const riskLevelText = document.getElementById('risk-level');
    const riskDescText = document.getElementById('risk-description');
    
    // 相機相關元件
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('snapshot-canvas');
    const ctx = canvas.getContext('2d');
    let stream = null;

    // 模擬計畫書中的三種風險分級[cite: 1]
    const mockResults = [
        { level: "高風險 (HIGH RISK)", desc: "辨識到疑似發炎特徵。請尋求醫療協助。" },
        { level: "中風險 (MEDIUM RISK)", desc: "分析顯示有異常關注點。建議預約診所。" },
        { level: "低風險 (LOW RISK)", desc: "判定眼部結構健康。請維持日常保養。" }
    ];

    // 啟動相機函數
    async function startCamera() {
        try {
            // 請求相機權限，優先使用手機的後置鏡頭 (environment)
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("相機啟動失敗:", err);
            alert("無法存取相機，請確認設備是否支援或已給予瀏覽器相機權限。");
        }
    }

    // 關閉相機函數 (節省設備資源)
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }

    // 網頁載入時自動啟動相機
    startCamera();

    // 點擊開始掃描 (拍照並分析)
    startScanBtn.addEventListener('click', () => {
        // 1. 將當下的 video 畫面畫到 canvas 上 (截圖)
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. 改變按鈕狀態
        startScanBtn.innerText = "影像處理中...";
        
        // 3. 模擬等待 AI 運算時間 (2秒)
        setTimeout(() => {
            stopCamera(); // 進入結果頁前關閉相機
            scanSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            startScanBtn.innerText = "START EYE SCAN (拍攝與分析)";

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
        startCamera(); // 重新啟動相機
    });
});
