class EyeAnalyzer {

    constructor(video, overlayCanvas) {

        this.video = video;
        this.canvas = overlayCanvas;
        this.ctx = this.canvas.getContext("2d");

        this.faceMesh = null;

        this.latestResults = null;

        this.ready = false;

        this.eyeIndices = {
            left: {
                outer: 33,
                inner: 133,
                top: 159,
                bottom: 145,
                contour: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
            },
            right: {
                outer: 263,
                inner: 362,
                top: 386,
                bottom: 374,
                contour: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]
            }
        };

        this.smoothedLandmarks = null;
        this.processing = false;
        this.frozenFrame = null;

        this.irisIndices = {
            left: [468, 469, 470, 471, 472],
            right: [473, 474, 475, 476, 477]
        };
        this.scleraContours = {
            left: [
                33, 7, 163, 144, 145, 153, 154, 155,
                133, 173, 157, 158, 159, 160, 161, 246
            ],
            right: [
                263, 249, 390, 373, 374, 380, 381, 382,
                362, 398, 384, 385, 386, 387, 388, 466
            ]
        };
    }


    async init() {

        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults(
            (results) => this.handleResults(results)
        );

        this.ready = true;
    }


    async processFrame() {
        if (!this.ready || this.processing || this.video.paused || this.video.ended) {
            return;
        }

        this.processing = true;
        try {
            await this.faceMesh.send({ image: this.video });
        } finally {
            this.processing = false;
        }
    }


    handleResults(results) {

        this.latestResults = results;

        this.resizeCanvas();

        this.ctx.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        if (
            !results.multiFaceLandmarks ||
            results.multiFaceLandmarks.length === 0
        ) {

            return;
        }

        const rawLandmarks = results.multiFaceLandmarks[0];

        if (!this.smoothedLandmarks || this.smoothedLandmarks.length !== rawLandmarks.length) {
            this.smoothedLandmarks = rawLandmarks.map(point => ({ ...point }));
        } else {
            const alpha = 0.38;
            this.smoothedLandmarks = rawLandmarks.map((point, index) => {
                const previous = this.smoothedLandmarks[index] || point;
                return {
                    x: previous.x + (point.x - previous.x) * alpha,
                    y: previous.y + (point.y - previous.y) * alpha,
                    z: previous.z + (point.z - previous.z) * alpha
                };
            });
        }

        const landmarks = this.smoothedLandmarks;
        this.drawEyeRegions(landmarks);
    }


    resizeCanvas() {

        if (
            this.canvas.width !== this.video.videoWidth ||
            this.canvas.height !== this.video.videoHeight
        ) {

            this.canvas.width =
                this.video.videoWidth;

            this.canvas.height =
                this.video.videoHeight;
        }
    }


    drawFace(landmarks) {

        if (
            typeof drawConnectors !== "undefined" &&
            typeof FACEMESH_TESSELATION !== "undefined"
        ) {

            drawConnectors(
                this.ctx,
                landmarks,
                FACEMESH_TESSELATION,
                {
                    color: "rgba(0, 220, 255, 0.12)",
                    lineWidth: 0.5
                }
            );
        }
    }


    drawEyeRegions(landmarks) {
        [this.eyeIndices.left, this.eyeIndices.right].forEach(eye => {
            const contour = eye.contour.map(id => landmarks[id]).filter(Boolean);
            if (!contour.length) return;

            this.ctx.beginPath();
            contour.forEach((point, index) => {
                const x = point.x * this.canvas.width;
                const y = point.y * this.canvas.height;
                if (index === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
            this.ctx.closePath();
            this.ctx.strokeStyle = "#00eaff";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            const box = this.getEyeBoundingBox(landmarks, eye);
            this.ctx.strokeStyle = "rgba(0,234,255,.78)";
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(box.x, box.y, box.width, box.height);
        });
    }


    getEyeBoundingBox(landmarks, eye) {
        const points = eye.contour.map(id => landmarks[id]).filter(Boolean);
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const eyeWidth = maxX - minX;
        const eyeHeight = maxY - minY;
        const paddingX = eyeWidth * 0.10;
        const paddingY = Math.max(eyeHeight * 0.18, eyeWidth * 0.035);

        return {
            x: Math.max(0, minX - paddingX) * this.canvas.width,
            y: Math.max(0, minY - paddingY) * this.canvas.height,
            width: Math.min(1, eyeWidth + paddingX * 2) * this.canvas.width,
            height: Math.min(1, eyeHeight + paddingY * 2) * this.canvas.height
        };
    }


    getNormalizedEyeBox(landmarks, eye) {
        const points = eye.contour.map(id => landmarks[id]).filter(Boolean);
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);

        const rawMinX = Math.min(...xs);
        const rawMaxX = Math.max(...xs);
        const rawMinY = Math.min(...ys);
        const rawMaxY = Math.max(...ys);
        const width = rawMaxX - rawMinX;
        const height = rawMaxY - rawMinY;

        const padX = width * 0.12;
        const padY = Math.max(height * 0.22, width * 0.04);

        const minX = Math.max(0, rawMinX - padX);
        const maxX = Math.min(1, rawMaxX + padX);
        const minY = Math.max(0, rawMinY - padY);
        const maxY = Math.min(1, rawMaxY + padY);

        return { x:minX, y:minY, width:maxX-minX, height:maxY-minY };
    }


    getAverageRGB(imageData) {

        let r = 0;
        let g = 0;
        let b = 0;

        let count = 0;

        for (
            let i = 0;
            i < imageData.data.length;
            i += 4
        ) {

            r += imageData.data[i];
            g += imageData.data[i + 1];
            b += imageData.data[i + 2];

            count++;
        }

        if (count === 0) {
            return {
                r: 0,
                g: 0,
                b: 0
            };
        }

        return {
            r: r / count,
            g: g / count,
            b: b / count
        };
    }


    rgbToHsv(r, g, b) {

        r /= 255;
        g /= 255;
        b /= 255;

        const max =
            Math.max(r, g, b);

        const min =
            Math.min(r, g, b);

        const delta = max - min;

        let h = 0;

        if (delta !== 0) {

            if (max === r) {

                h =
                    60 *
                    (((g - b) / delta) % 6);

            } else if (max === g) {

                h =
                    60 *
                    (((b - r) / delta) + 2);

            } else {

                h =
                    60 *
                    (((r - g) / delta) + 4);
            }
        }

        if (h < 0) {
            h += 360;
        }

        const s =
            max === 0
                ? 0
                : delta / max;

        return {
            h,
            s: s * 100,
            v: max * 100
        };
    }


    rgbToLab(r, g, b) {

        r /= 255;
        g /= 255;
        b /= 255;

        r = r > 0.04045
            ? Math.pow(
                (r + 0.055) / 1.055,
                2.4
            )
            : r / 12.92;

        g = g > 0.04045
            ? Math.pow(
                (g + 0.055) / 1.055,
                2.4
            )
            : g / 12.92;

        b = b > 0.04045
            ? Math.pow(
                (b + 0.055) / 1.055,
                2.4
            )
            : b / 12.92;

        r *= 100;
        g *= 100;
        b *= 100;

        const x =
            (r * 0.4124 +
                g * 0.3576 +
                b * 0.1805) / 95.047;

        const y =
            (r * 0.2126 +
                g * 0.7152 +
                b * 0.0722) / 100;

        const z =
            (r * 0.0193 +
                g * 0.1192 +
                b * 0.9505) / 108.883;

        const f = (value) => {

            return value > 0.008856
                ? Math.pow(value, 1 / 3)
                : 7.787 * value + 16 / 116;
        };

        const fx = f(x);
        const fy = f(y);
        const fz = f(z);

        return {
            L: 116 * fy - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz)
        };
    }


    analyzeRegion(box) {

        const canvas =
            document.createElement("canvas");

        canvas.width = 200;
        canvas.height = 150;

        const ctx =
            canvas.getContext("2d");

        ctx.drawImage(
            this.getSourceImage(),
            box.x * (this.frozenFrame?.width || this.video.videoWidth),
            box.y * (this.frozenFrame?.height || this.video.videoHeight),
            box.width * (this.frozenFrame?.width || this.video.videoWidth),
            box.height * (this.frozenFrame?.height || this.video.videoHeight),
            0,
            0,
            canvas.width,
            canvas.height
        );

        const imageData =
            ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

        const rgb =
            this.getAverageRGB(imageData);

        const hsv =
            this.rgbToHsv(
                rgb.r,
                rgb.g,
                rgb.b
            );

        const lab =
            this.rgbToLab(
                rgb.r,
                rgb.g,
                rgb.b
            );

        return {
            rgb,
            hsv,
            lab
        };
    }


    calculateRedRatio(box) {

        const canvas =
            document.createElement("canvas");

        canvas.width = 120;
        canvas.height = 80;

        const ctx =
            canvas.getContext("2d");

        ctx.drawImage(
            this.getSourceImage(),
            box.x * (this.frozenFrame?.width || this.video.videoWidth),
            box.y * (this.frozenFrame?.height || this.video.videoHeight),
            box.width * (this.frozenFrame?.width || this.video.videoWidth),
            box.height * (this.frozenFrame?.height || this.video.videoHeight),
            0,
            0,
            canvas.width,
            canvas.height
        );

        const imageData =
            ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

        let redPixels = 0;
        let totalPixels = 0;

        for (
            let i = 0;
            i < imageData.data.length;
            i += 4
        ) {

            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];

            const hsv =
                this.rgbToHsv(r, g, b);

            if (
                (hsv.h < 25 || hsv.h > 340) &&
                hsv.s > 30 &&
                hsv.v > 25
            ) {

                redPixels++;
            }

            totalPixels++;
        }

        return totalPixels === 0
            ? 0
            : (redPixels / totalPixels) * 100;
    }


    analyzeScleraRegion(landmarks, eye, contourIds, irisCenterId) {

        const box = this.getNormalizedEyeBox(landmarks, eye);

        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 220;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            this.getSourceImage(),
            box.x * (this.frozenFrame?.width || this.video.videoWidth),
            box.y * (this.frozenFrame?.height || this.video.videoHeight),
            box.width * (this.frozenFrame?.width || this.video.videoWidth),
            box.height * (this.frozenFrame?.height || this.video.videoHeight),
            0,
            0,
            canvas.width,
            canvas.height
        );

        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;

        const maskCtx = maskCanvas.getContext("2d");
        maskCtx.fillStyle = "#ffffff";
        maskCtx.beginPath();

        contourIds.forEach((id, index) => {
            const point = landmarks[id];
            const x = ((point.x - box.x) / box.width) * canvas.width;
            const y = ((point.y - box.y) / box.height) * canvas.height;

            if (index === 0) {
                maskCtx.moveTo(x, y);
            } else {
                maskCtx.lineTo(x, y);
            }
        });

        maskCtx.closePath();
        maskCtx.fill();

        const iris = landmarks[irisCenterId];
        const irisX = ((iris.x - box.x) / box.width) * canvas.width;
        const irisY = ((iris.y - box.y) / box.height) * canvas.height;
        const irisRadius = Math.max(
            14,
            Math.min(canvas.width * 0.22, canvas.height * 0.30)
        );

        maskCtx.globalCompositeOperation = "destination-out";
        maskCtx.beginPath();
        maskCtx.ellipse(
            irisX,
            irisY,
            irisRadius,
            irisRadius * 0.85,
            0,
            0,
            Math.PI * 2
        );
        maskCtx.fill();

        const imageData = ctx.getImageData(
            0, 0, canvas.width, canvas.height
        );
        const maskData = maskCtx.getImageData(
            0, 0, canvas.width, canvas.height
        );

        let sumL = 0;
        let suma = 0;
        let sumb = 0;
        let validPixels = 0;
        let yellowPixels = 0;
        let redPixels = 0;

        for (let i = 0; i < imageData.data.length; i += 4) {
            if (maskData.data[i + 3] === 0) continue;

            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const hsv = this.rgbToHsv(r, g, b);

            if (hsv.v < 35 || hsv.s > 78) continue;

            const lab = this.rgbToLab(r, g, b);
            sumL += lab.L;
            suma += lab.a;
            sumb += lab.b;
            validPixels++;

            if (lab.L > 35 && lab.b > 12.0 && lab.a > -15 && lab.a < 35) {
                yellowPixels++;
            }

            if (lab.L > 35 && lab.a > 42.0) {
                redPixels++;
            }
        }

        if (validPixels === 0) {
            return {
                validPixels: 0,
                lStar: null,
                aStar: null,
                bStar: null,
                yellowRatio: 0,
                redRatio: 0
            };
        }

        return {
            validPixels,
            lStar: Number((sumL / validPixels).toFixed(2)),
            aStar: Number((suma / validPixels).toFixed(2)),
            bStar: Number((sumb / validPixels).toFixed(2)),
            yellowRatio: Number(((yellowPixels / validPixels) * 100).toFixed(2)),
            redRatio: Number(((redPixels / validPixels) * 100).toFixed(2))
        };
    }


    freezeFrame() {
        const width = this.video.videoWidth;
        const height = this.video.videoHeight;
        if (!width || !height) throw new Error("相機影像尚未準備完成");

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(this.video, 0, 0, width, height);
        this.frozenFrame = canvas;
        return canvas;
    }

    getSourceImage() {
        return this.frozenFrame || this.video;
    }

    getAnalysisReport() {

        if (!this.latestResults || !this.latestResults.multiFaceLandmarks || !this.latestResults.multiFaceLandmarks.length) {
            return {
                quality: {
                    faceDetected: false,
                    eyeDetected: false
                }
            };
        }

        const landmarks = this.smoothedLandmarks || this.latestResults.multiFaceLandmarks[0];

        const leftBox = this.getNormalizedEyeBox(
            landmarks,
            this.eyeIndices.left
        );
        const rightBox = this.getNormalizedEyeBox(
            landmarks,
            this.eyeIndices.right
        );

        const left = this.analyzeRegion(leftBox);
        const right = this.analyzeRegion(rightBox);

        const leftRed = this.calculateRedRatio(leftBox);
        const rightRed = this.calculateRedRatio(rightBox);

        const lab = {
            L: (left.lab.L + right.lab.L) / 2,
            a: (left.lab.a + right.lab.a) / 2,
            b: (left.lab.b + right.lab.b) / 2
        };

        const redRatio = (leftRed + rightRed) / 2;

        const leftSclera = this.analyzeScleraRegion(
            landmarks,
            this.eyeIndices.left,
            this.scleraContours.left,
            this.irisIndices.left[0]
        );

        const rightSclera = this.analyzeScleraRegion(
            landmarks,
            this.eyeIndices.right,
            this.scleraContours.right,
            this.irisIndices.right[0]
        );

        const scleraSamples = [leftSclera, rightSclera].filter(
            item => item.validPixels > 0
        );

        let sclera;

        if (scleraSamples.length) {
            const mean = key => scleraSamples.reduce(
                (sum, item) => sum + item[key], 0
            ) / scleraSamples.length;

            sclera = {
                lStar: Number(mean("lStar").toFixed(2)),
                aStar: Number(mean("aStar").toFixed(2)),
                bStar: Number(mean("bStar").toFixed(2)),
                yellowRatio: Number(mean("yellowRatio").toFixed(2)),
                redRatio: Number(mean("redRatio").toFixed(2)),
                left: leftSclera,
                right: rightSclera
            };
        } else {
            sclera = {
                lStar: Number(lab.L.toFixed(2)),
                aStar: Number(lab.a.toFixed(2)),
                bStar: Number(lab.b.toFixed(2)),
                yellowRatio: 0,
                redRatio: 0,
                left: leftSclera,
                right: rightSclera
            };
        }

        const yellowFlag = sclera.bStar > 12.0 || sclera.yellowRatio >= 10;
        const redFlag = sclera.aStar > 42.0 || sclera.redRatio >= 10;

        const findings = [];

        findings.push(
            yellowFlag
                ? "鞏膜區域出現較明顯的黃色色彩特徵"
                : "鞏膜區域未達計畫書設定的黃色提示條件"
        );

        findings.push(
            redFlag
                ? "眼部區域出現較明顯的紅色色彩特徵"
                : "未達計畫書設定的紅色色彩提示條件"
        );

        return {
            quality: {
                faceDetected: true,
                eyeDetected: true
            },
            color: {
                rgb: { left, right },
                hsv: { left: left.hsv, right: right.hsv },
                lStar: sclera.lStar,
                aStar: sclera.aStar,
                bStar: sclera.bStar,
                redRatio: sclera.redRatio,
                sclera
            },
            geometry: {
                leftEyeWidth: Number(leftBox.width.toFixed(4)),
                rightEyeWidth: Number(rightBox.width.toFixed(4))
            },
            flags: {
                yellow: yellowFlag,
                red: redFlag
            },
            findings
        };
    }

    captureImage() {
        const source = this.frozenFrame || this.freezeFrame();
        const canvas = document.createElement("canvas");
        canvas.width = source.width || this.video.videoWidth;
        canvas.height = source.height || this.video.videoHeight;
        canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    releaseFrozenFrame() {
        this.frozenFrame = null;
    }

}
