document.addEventListener('DOMContentLoaded', () => {
    // 頁面區塊
    const introSection = document.getElementById('intro-section');
    const scanSection = document.getElementById('scan-section');
    const resultSection = document.getElementById('result-section');
    
    // 按鈕
    const backHomeBtn = document.getElementById('back-home-btn');
    const goToScanBtn = document.getElementById('go-to-scan-btn');
    const startScanBtn = document.getElementById('start-scan-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    // 元件
    const riskLevelText = document.getElementById('risk-level');
    const riskDescText = document.getElementById('risk-description');
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('snapshot-canvas');
    const ctx = canvas.getContext('2d');
    
    let stream = null;

    // 模擬計畫書中的三種風險分級[cite: 1]
    const mockResults = [
        { level: "高風險 (🔴 HIGH RISK)", desc: "辨識到急性發炎或傳染性結膜炎特徵，請尋求醫療協助。[cite: 1]" },
        { level: "中風險 (🟡 MEDIUM RISK)", desc: "分析顯示有異常關注點（如角膜老年環），建議一週內預約診所。[cite: 1]" },
        { level: "低風險 (🟢 LOW RISK)", desc: "判定眼部結構健康。僅提示用眼過度與日常保養策略。[cite: 1]" }
    ];

    // 開啟相機
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("相機啟動失敗:", err);
            alert("無法存取相機，請確認設備已授權使用相機。");
        }
    }

    // 關閉相機
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    // 事件 1：點擊開始拍攝
    goToScanBtn.addEventListener('click', () => {
        introSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        backHomeBtn.classList.remove('hidden');
        startCamera();
        window.scrollTo(0, 0);
    });

    // 事件 2：隨時回到首頁說明
    backHomeBtn.addEventListener('click', () => {
        stopCamera();
        scanSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        introSection.classList.remove('hidden');
        backHomeBtn.classList.add('hidden');
        window.scrollTo(0, 0);
    });

    // 事件 3：拍照並分析
    startScanBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        startScanBtn.innerText = "影像處理中...";
        
        setTimeout(() => {
            stopCamera();
            scanSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            startScanBtn.innerText = "擷取影像並分析";

            const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
            riskLevelText.innerText = randomResult.level;
            riskDescText.innerText = randomResult.desc;
        }, 1500);
    });

    // 事件 4：重新掃描
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        startCamera();
    });
});
