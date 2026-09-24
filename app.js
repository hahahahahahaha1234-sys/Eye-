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
    
    // 實體化 AI 引擎
    const analyzer = new window.FaceAnalyzer(videoElement, overlayCanvas);

    // 啟動掃描 (進入相機頁面)
    goToScanBtn.addEventListener('click', () => {
        introSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        backHomeBtn.classList.remove('hidden');
        analyzer.start();
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
    startScanBtn.addEventListener('click', async () => {
        startScanBtn.innerText = "AI 雲端分析中...";
        startScanBtn.disabled = true;

        // 1. 處理截圖 (僅擷取純淨照片)
        snapshotCanvas.width = videoElement.videoWidth || 640;
        snapshotCanvas.height = videoElement.videoHeight || 480;
        snapshotCtx.drawImage(videoElement, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

        // 2. 將 Canvas 轉換為 Base64 圖片字串 (移除前綴)
        const base64Image = snapshotCanvas.toDataURL('image/jpeg').split(',')[1];

        // 3. 填入您的 Gemini API Key 與模型端點
        const API_KEY = "AQ.Ab8RN6L1Y40nR2-hYbqDMKsJ8fzQ-lyi_Bjwenh74dUcjv0ylg"; 
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${API_KEY}`;

        // 4. 設定給 Gemini 的精準診斷 Prompt (明確要求判斷細節與特徵點)
        const promptText = `
            你現在是一套專業的醫療眼部預檢系統 AI。請分析這張照片，並針對以下「特徵點與細節」進行嚴格判定：
            
            1. 幾何特徵點 (對稱性)：觀察左右眼裂高度（EAR比例）是否一致，有無單側眼瞼下垂、極度不對稱或明顯腫脹（疑似麥粒腫/針眼）。
            2. 色彩特徵點 (鞏膜)：分析眼白區域的色彩，是否異常泛黃（黃疸徵兆）或微血管異常充血發紅（結膜炎徵兆）。
            3. 色彩特徵點 (角膜與瞳孔)：觀察角膜邊緣是否有灰白環（老年環），或瞳孔中央是否有異常混濁（白內障徵兆）。
            
            請綜合以上特徵點的觀察結果，以嚴謹、專業的醫療助理語氣回覆。
            請務必強制使用以下 JSON 格式回傳，不要包含任何其他 Markdown 標記或文字：
            {
                "level": "高風險 (HIGH RISK) / 中風險 (MEDIUM RISK) / 低風險 (LOW RISK)",
                "desc": "您的綜合分析與建議說明（約 50 到 80 字，請點出具體觀察到的異常特徵）"
            }
        `;

        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }],
            generationConfig: {
                temperature: 0.1, // 降低隨機性，讓醫療判斷更嚴謹穩定
                response_mime_type: "application/json" // 強制回傳 JSON 格式
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "API 請求失敗");
            }

            const data = await response.json();
            const aiResult = JSON.parse(data.candidates[0].content.parts[0].text);

            // 5. 顯示結果
            analyzer.stop();
            scanSection.classList.add('hidden');
            resultSection.classList.remove('hidden');

            riskLevelText.innerText = aiResult.level;
            riskDescText.innerText = aiResult.desc;
            
            // 依風險程度改變標題顏色
            if(aiResult.level.includes("高風險")) {
                riskLevelText.style.color = "#ff4444";
            } else if(aiResult.level.includes("中風險")) {
                riskLevelText.style.color = "#ffcc00";
            } else {
                riskLevelText.style.color = "#00ffcc";
            }

        } catch (error) {
            alert("雲端分析發生錯誤，請檢查您的 API Key 或網路連線。\n錯誤細節：" + error.message);
            console.error(error);
        } finally {
            startScanBtn.innerText = "擷取特徵並分析";
            startScanBtn.disabled = false;
        }
    });
    // 重新掃描
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        analyzer.start();
    });
});
