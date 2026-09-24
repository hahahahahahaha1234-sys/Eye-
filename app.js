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
             
        // 設定首選模型與備用模型
        const primaryModel = "gemini-3.8-flash";
        const fallbackModel = "gemini-3.5-flash"; // 較舊但通常伺服器較空閒的版本

        const promptText = `
            你現在是一套專業的醫療眼部預檢系統 AI。請分析這張照片，並針對以下「特徵點與細節」進行嚴格判定：
            1. 幾何特徵點 (對稱性)：觀察左右眼裂高度是否一致，有無單側下垂或腫脹。
            2. 色彩特徵點 (鞏膜)：分析眼白區域是否異常泛黃（黃疸）或充血發紅（結膜炎）。
            3. 色彩特徵點 (角膜與瞳孔)：角膜邊緣是否有灰白環，或瞳孔是否有異常混濁。
            請強制使用以下 JSON 格式回傳：
            {
                "level": "高風險 (HIGH RISK) / 中風險 (MEDIUM RISK) / 低風險 (LOW RISK)",
                "desc": "您的綜合分析與建議說明（約 50 到 80 字）"
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
                temperature: 0.1,
                response_mime_type: "application/json"
            }
        };

        // 建立一個能自動重試與切換模型的 fetch 函式
        async function fetchWithRetry(modelName, retries = 2, delay = 2000) {
            const API_url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
            
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody)
                    });

                    if (response.ok) return await response.json();
                    
                    const errData = await response.json();
                    const errMsg = errData.error?.message || "未知錯誤";
                    
                    // 如果是高負載 (503) 錯誤，準備重試
                    if (errMsg.includes("high demand") || response.status === 503) {
                        console.warn(`[嘗試 ${i+1}/${retries}] 模型 ${modelName} 伺服器滿載，${delay/1000} 秒後重試...`);
                        await new Promise(res => setTimeout(res, delay));
                        delay *= 2; // 指數退避：下次等更久 (2秒 -> 4秒)
                        continue;
                    }
                    // 若是其他嚴重錯誤(如金鑰無效)，直接拋出
                    throw new Error(errMsg);
                    
                } catch (err) {
                    if (i === retries - 1) throw err; // 最後一次重試也失敗，拋出錯誤
                }
            }
        }

        try {
            let data;
            try {
                // 1. 先嘗試呼叫主要模型
                data = await fetchWithRetry(primaryModel);
            } catch (primaryErr) {
                console.warn("主要模型嚴重塞車，自動切換至備用模型...", primaryErr);
                // 2. 若主要模型一直塞車，降級呼叫備用模型
                data = await fetchWithRetry(fallbackModel, 1, 1000); 
            }

            const aiResult = JSON.parse(data.candidates[0].content.parts[0].text);

            // 顯示結果
            analyzer.stop();
            scanSection.classList.add('hidden');
            resultSection.classList.remove('hidden');

            riskLevelText.innerText = aiResult.level;
            riskDescText.innerText = aiResult.desc;
            
            if(aiResult.level.includes("高風險")) riskLevelText.style.color = "#ff4444";
            else if(aiResult.level.includes("中風險")) riskLevelText.style.color = "#ffcc00";
            else riskLevelText.style.color = "#00ffcc";

        } catch (error) {
            alert("雲端伺服器目前極度壅塞，請稍後再試。\n錯誤細節：" + error.message);
            console.error(error);
        } finally {
            startScanBtn.innerText = "擷取特徵並分析";
            startScanBtn.disabled = false;
        });
    // 重新掃描
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        analyzer.start();
    });
});
