// RGB 轉 HSV 工具函式
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    
    if (max === min) {
        h = 0; 
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, v * 100];
}

class FaceAnalyzer {
    constructor(videoElement, overlayCanvas) {
        this.videoElement = videoElement;
        this.overlayCanvas = overlayCanvas;
        this.overlayCtx = overlayCanvas.getContext('2d');
        this.lastLandmarks = null;
        
        // 建立背景分析用的隱藏畫布
        this.analysisCanvas = document.createElement('canvas');
        this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });

        this.faceMesh = new FaceMesh({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }});
        
        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true, // 開啟以取得精準的眼睛與虹膜網格
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });
        
        this.faceMesh.onResults(this.onResults.bind(this));
        
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.faceMesh.send({image: this.videoElement});
            },
            width: 640,
            height: 480
        });
    }

    start() {
        this.camera.start();
    }

    stop() {
        this.camera.stop();
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    onResults(results) {
        this.overlayCanvas.width = this.videoElement.videoWidth;
        this.overlayCanvas.height = this.videoElement.videoHeight;
        this.overlayCtx.save();
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.lastLandmarks = results.multiFaceLandmarks[0];
            
            // 繪製乾淨的高科技眼部網格
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_RIGHT_EYE, {color: '#00ffcc', lineWidth: 1.5});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_LEFT_EYE, {color: '#00ffcc', lineWidth: 1.5});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_RIGHT_IRIS, {color: '#0088ff', lineWidth: 1.5});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_LEFT_IRIS, {color: '#0088ff', lineWidth: 1.5});
        } else {
            this.lastLandmarks = null;
        }
        this.overlayCtx.restore();
    }

    // 分析眼部色彩並產生報告
    getAnalysisReport() {
        if (!this.lastLandmarks) {
            return { error: true, message: "未偵測到清晰的臉部特徵，請確保光線充足並平視鏡頭。" };
        }

        const width = this.videoElement.videoWidth;
        const height = this.videoElement.videoHeight;
        this.analysisCanvas.width = width;
        this.analysisCanvas.height = height;
        
        // 將當前影像畫上隱藏畫布
        this.analysisCtx.drawImage(this.videoElement, 0, 0, width, height);

        // 取左眼與右眼的邊界框 (簡化版：取右眼點位 33 到 133 之間的區域)
        const rightEyeLeft = this.lastLandmarks[133].x * width;
        const rightEyeRight = this.lastLandmarks[33].x * width;
        const rightEyeTop = this.lastLandmarks[159].y * height;
        const rightEyeBottom = this.lastLandmarks[145].y * height;

        const eyeWidth = Math.abs(rightEyeRight - rightEyeLeft);
        const eyeHeight = Math.abs(rightEyeBottom - rightEyeTop);
        const startX = Math.min(rightEyeLeft, rightEyeRight);
        
        // 擷取右眼的像素數據
        const eyeImageData = this.analysisCtx.getImageData(startX, rightEyeTop, eyeWidth, eyeHeight);
        const pixels = eyeImageData.data;
        
        let redPixelCount = 0;
        let yellowPixelCount = 0;
        let validScleraCount = 0;

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i+1];
            const b = pixels[i+2];

            const [h, s, v] = rgbToHsv(r, g, b);

            // 過濾掉黑色瞳孔、虹膜與反光點 (僅保留明度適中、飽和度不過低的眼白區域)
            if (v > 30 && v < 95 && s > 5) {
                validScleraCount++;
                
                // 偵測血絲 (紅色區間：色相接近 0 或 360，具備一定飽和度)
                if ((h < 15 || h > 345) && s > 35) {
                    redPixelCount++;
                }
                
                // 偵測黃疸 (黃色區間：色相介於 30 到 60 之間)
                if (h > 35 && h < 55 && s > 25) {
                    yellowPixelCount++;
                }
            }
        }

        // 計算異常像素比例
        const redRatio = validScleraCount > 0 ? (redPixelCount / validScleraCount) * 100 : 0;
        const yellowRatio = validScleraCount > 0 ? (yellowPixelCount / validScleraCount) * 100 : 0;

        // 根據比例輸出臨床初篩結果
        if (yellowRatio > 15) {
            return {
                error: false,
                level: "中高風險：鞏膜泛黃",
                desc: `系統偵測到眼白區塊黃色像素達 ${yellowRatio.toFixed(1)}%。這可能是肝膽系統過勞、黃疸或膽紅素偏高的初期徵兆。建議確保充足睡眠並減少飲酒，若持續未改善請預約消化內科抽血檢查。`
            };
        } else if (redRatio > 20) {
            return {
                error: false,
                level: "中風險：結膜充血",
                desc: `系統偵測到眼白微血管紅色擴張比例達 ${redRatio.toFixed(1)}%。可能為急性結膜炎、過敏或眼部極度疲勞。請暫時停戴隱形眼鏡，若伴隨刺痛感請盡速就醫。`
            };
        } else {
            return {
                error: false,
                level: "低風險：狀態良好",
                desc: `目前未偵測到明顯的色彩異常 (紅/黃像素比例皆在安全範圍內)。特徵點追蹤顯示您的眼部外觀健康，請繼續保持良好的用眼習慣。`
            };
        }
    }
}

window.FaceAnalyzer = FaceAnalyzer;
