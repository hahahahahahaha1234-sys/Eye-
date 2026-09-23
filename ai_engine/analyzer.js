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

        this.faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults(this.onResults.bind(this));

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.faceMesh.send({image: this.videoElement});
            },
            width: 640,
            height: 480,
            facingMode: 'environment'
        });
    }

    // 啟動與關閉相機
    start() {
        this.init();
        if (this.camera) this.camera.start();
    }

    stop() {
        if (this.camera) this.camera.stop();
    }

    // 處理即時畫面與特徵點繪製
    onResults(results) {
        this.overlayCanvas.width = this.videoElement.videoWidth;
        this.overlayCanvas.height = this.videoElement.videoHeight;
        this.overlayCtx.save();
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.lastLandmarks = results.multiFaceLandmarks[0];

            // 繪製科技網格視覺效果
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_RIGHT_EYE, {color: '#00ffcc', lineWidth: 2});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_LEFT_EYE, {color: '#00ffcc', lineWidth: 2});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_RIGHT_IRIS, {color: '#0088ff', lineWidth: 2});
            drawConnectors(this.overlayCtx, this.lastLandmarks, FACEMESH_LEFT_IRIS, {color: '#0088ff', lineWidth: 2});

            // 繪製眼下 ROI 定位框
            const leftEyeBottom = this.lastLandmarks[111]; 
            const rightEyeBottom = this.lastLandmarks[340];
            
            if(leftEyeBottom && rightEyeBottom) {
                this.overlayCtx.fillStyle = 'rgba(255, 255, 0, 0.4)';
                this.overlayCtx.strokeStyle = '#ffff00';
                this.overlayCtx.lineWidth = 1;
                const w = 30, h = 30;
                this.overlayCtx.strokeRect(leftEyeBottom.x * this.overlayCanvas.width - w/2, leftEyeBottom.y * this.overlayCanvas.height + 10, w, h);
                this.overlayCtx.strokeRect(rightEyeBottom.x * this.overlayCanvas.width - w/2, rightEyeBottom.y * this.overlayCanvas.height + 10, w, h);
            }
        } else {
            this.lastLandmarks = null;
        }
        this.overlayCtx.restore();
    }

    // 執行分析邏輯並回傳報告
    getAnalysisReport() {
        if (!this.lastLandmarks) {
            return { error: true, message: "未偵測到臉部特徵，請確認您的臉部位於畫面中且光源充足。" };
        }

        const leftTop = this.lastLandmarks[159], leftBottom = this.lastLandmarks[145];
        const leftInner = this.lastLandmarks[133], leftOuter = this.lastLandmarks[33];
        const leftEAR = this.getDistance(leftTop, leftBottom) / this.getDistance(leftInner, leftOuter);

        const rightTop = this.lastLandmarks[386], rightBottom = this.lastLandmarks[374];
        const rightInner = this.lastLandmarks[362], rightOuter = this.lastLandmarks[263];
        const rightEAR = this.getDistance(rightTop, rightBottom) / this.getDistance(rightInner, rightOuter);

        const earDiff = Math.abs(leftEAR - rightEAR);
        const avgEAR = (leftEAR + rightEAR) / 2;

        if (earDiff > 0.06) {
            return {
                level: "高風險 (HIGH RISK)",
                desc: `特徵點數據異常：偵測到左右眼輪廓高度極度不對稱 (落差達 ${(earDiff*100).toFixed(1)}%)，疑似單側急性發炎或紅腫，請尋求醫療協助。`
            };
        } else if (avgEAR < 0.20) {
            return {
                level: "中風險 (MEDIUM RISK)",
                desc: `特徵點數據警告：眼裂開合度低於正常值 (EAR: ${avgEAR.toFixed(2)})，呈現瞇眼或眼瞼浮腫狀態，建議適度休息或預約診所檢查。`
            };
        } else {
            return {
                level: "低風險 (LOW RISK)",
                desc: `特徵點數據正常：雙眼輪廓對稱且開合度健康 (EAR: ${avgEAR.toFixed(2)})。請維持良好用眼習慣與日常保養。`
            };
        }
    }
}

// 導出供全域使用
window.FaceAnalyzer = FaceAnalyzer;
