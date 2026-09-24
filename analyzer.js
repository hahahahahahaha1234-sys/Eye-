class FaceAnalyzer {
    constructor(videoElement, overlayCanvas) {
        this.videoElement = videoElement;
        this.overlayCanvas = overlayCanvas;
        this.overlayCtx = overlayCanvas.getContext('2d');
        this.camera = null;
        this.faceMesh = null;
        this.lastLandmarks = null;
    }

    // 計算兩點之間的幾何距離
    getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    // 初始化 MediaPipe
    init() {
        if (this.faceMesh) return;

        // 載入 MediaPipe 模組
        this.faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true, // 啟動虹膜追蹤
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults(this.onResults.bind(this));

        // 設定相機
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.faceMesh.send({image: this.videoElement});
            },
            width: 640,
            height: 480,
            facingMode: 'user' // 使用前置鏡頭測試較方便
        });
    }

    start() {
        this.init();
        if (this.camera) this.camera.start();
    }

    stop() {
        if (this.camera) this.camera.stop();
    }

    // 當 MediaPipe 傳回一幀結果時觸發
    // 當 MediaPipe 傳回一幀結果時觸發
    onResults(results) {
        this.overlayCanvas.width = this.videoElement.videoWidth;
        this.overlayCanvas.height = this.videoElement.videoHeight;
        this.overlayCtx.save();
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.lastLandmarks = results.multiFaceLandmarks[0];

            // 僅繪製眼睛與虹膜的科技網格 (移除了黃色貼紙框)
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_RIGHT_EYE, {color: '#00ffcc', lineWidth: 2});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_LEFT_EYE, {color: '#00ffcc', lineWidth: 2});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_RIGHT_IRIS, {color: '#0088ff', lineWidth: 2});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_LEFT_IRIS, {color: '#0088ff', lineWidth: 2});
            
        } else {
            this.lastLandmarks = null;
        }
        this.overlayCtx.restore();
    }

    // 計算 EAR 並回傳分析報告
    getAnalysisReport() {
        if (!this.lastLandmarks) {
            return { error: true, message: "未偵測到臉部特徵，請確認您的臉部位於畫面中且光源充足。" };
        }

        // 左眼特徵點：上(159), 下(145), 內(133), 外(33)
        const leftTop = this.lastLandmarks[159], leftBottom = this.lastLandmarks[145];
        const leftInner = this.lastLandmarks[133], leftOuter = this.lastLandmarks[33];
        const leftEAR = this.getDistance(leftTop, leftBottom) / this.getDistance(leftInner, leftOuter);

        // 右眼特徵點：上(386), 下(374), 內(362), 外(263)
        const rightTop = this.lastLandmarks[386], rightBottom = this.lastLandmarks[374];
        const rightInner = this.lastLandmarks[362], rightOuter = this.lastLandmarks[263];
        const rightEAR = this.getDistance(rightTop, rightBottom) / this.getDistance(rightInner, rightOuter);

        const earDiff = Math.abs(leftEAR - rightEAR);
        const avgEAR = (leftEAR + rightEAR) / 2;

        if (earDiff > 0.06) {
            return {
                level: "高風險 (HIGH RISK)",
                desc: `【單側異常警告】偵測到左右眼輪廓高度極度不對稱 (落差達 ${(earDiff*100).toFixed(1)}%)。疑似單側眼瞼急性發炎、麥粒腫(針眼)或神經壓迫下垂，請盡速尋求醫療協助。`
            };
        } else if (avgEAR < 0.20) {
            return {
                level: "中風險 (MEDIUM RISK)",
                desc: `【浮腫疲勞警告】眼裂開合度低於正常值 (目前 EAR: ${avgEAR.toFixed(2)})。呈現瞇眼或眼瞼明顯浮腫狀態，建議適度休息、熱敷，或預約診所檢查。`
            };
        } else {
            return {
                level: "低風險 (LOW RISK)",
                desc: `【特徵點正常】雙眼輪廓對稱且開合度健康 (目前 EAR: ${avgEAR.toFixed(2)})。無偵測到明顯結構異常，請維持良好用眼習慣。`
            };
        }
    }
}

// 註冊為全域物件供 app.js 使用
window.FaceAnalyzer = FaceAnalyzer;
