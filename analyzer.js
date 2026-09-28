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


    analyzeScleraRegion(landmarks, eye, contourIds, irisIds) {

        const box = this.getNormalizedEyeBox(landmarks, eye);
        const sourceWidth = this.frozenFrame?.width || this.video.videoWidth;
        const sourceHeight = this.frozenFrame?.height || this.video.videoHeight;

        const canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 240;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        ctx.drawImage(
            this.getSourceImage(),
            box.x * sourceWidth,
            box.y * sourceHeight,
            box.width * sourceWidth,
            box.height * sourceHeight,
            0, 0, canvas.width, canvas.height
        );

        // Eye aperture mask from the full MediaPipe eyelid contour.
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });

        maskCtx.fillStyle = "#fff";
        maskCtx.beginPath();
        contourIds.forEach((id, index) => {
            const p = landmarks[id];
            const x = ((p.x - box.x) / box.width) * canvas.width;
            const y = ((p.y - box.y) / box.height) * canvas.height;
            if (index === 0) maskCtx.moveTo(x, y);
            else maskCtx.lineTo(x, y);
        });
        maskCtx.closePath();
        maskCtx.fill();

        // Exclude iris/pupil using refined iris landmarks. Radius is derived from
        // the actual iris points instead of a fixed guessed radius.
        const irisPoints = irisIds
            .map(id => landmarks[id])
            .filter(Boolean)
            .map(p => ({
                x: ((p.x - box.x) / box.width) * canvas.width,
                y: ((p.y - box.y) / box.height) * canvas.height
            }));

        if (irisPoints.length) {
            const cx = irisPoints.reduce((v,p)=>v+p.x,0) / irisPoints.length;
            const cy = irisPoints.reduce((v,p)=>v+p.y,0) / irisPoints.length;
            let radius = 0;
            irisPoints.forEach(p => {
                radius = Math.max(radius, Math.hypot(p.x-cx, p.y-cy));
            });
            radius = Math.max(10, radius * 1.28);

            maskCtx.globalCompositeOperation = "destination-out";
            maskCtx.beginPath();
            maskCtx.arc(cx, cy, radius, 0, Math.PI * 2);
            maskCtx.fill();
            maskCtx.globalCompositeOperation = "source-over";
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

        const samples = [];
        let yellowPixels = 0;
        let redPixels = 0;

        // Reject mask edges (eyelashes/eyelids) by requiring neighbouring pixels
        // to remain inside the eye aperture.
        const inside = (x,y) => {
            if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return false;
            return maskData.data[(y * canvas.width + x) * 4 + 3] > 200;
        };

        for (let y = 3; y < canvas.height - 3; y++) {
            for (let x = 3; x < canvas.width - 3; x++) {
                if (!inside(x,y) || !inside(x-3,y) || !inside(x+3,y) ||
                    !inside(x,y-3) || !inside(x,y+3)) continue;

                const i = (y * canvas.width + x) * 4;
                const r = imageData.data[i];
                const g = imageData.data[i+1];
                const bl = imageData.data[i+2];
                const hsv = this.rgbToHsv(r,g,bl);

                // Sclera is relatively bright and not extremely saturated.
                // This removes most skin, shadow, eyelashes and screen-black pixels.
                if (hsv.v < 42 || hsv.s > 68) continue;

                const lab = this.rgbToLab(r,g,bl);
                if (lab.L < 38) continue;

                samples.push(lab);
                if (lab.b > 12 && lab.a > -12 && lab.a < 32) yellowPixels++;
                if (lab.a > 42) redPixels++;
            }
        }

        if (samples.length < 80) {
            return {
                validPixels: samples.length,
                reliable: false,
                lStar: null, aStar: null, bStar: null,
                yellowRatio: 0, redRatio: 0
            };
        }

        const median = values => {
            const sorted = [...values].sort((x,y)=>x-y);
            const m = Math.floor(sorted.length/2);
            return sorted.length % 2 ? sorted[m] : (sorted[m-1]+sorted[m])/2;
        };

        // Median is much less sensitive than whole-eye averaging to skin/iris contamination.
        const lStar = median(samples.map(v=>v.L));
        const aStar = median(samples.map(v=>v.a));
        const bStar = median(samples.map(v=>v.b));

        return {
            validPixels: samples.length,
            reliable: true,
            lStar: Number(lStar.toFixed(2)),
            aStar: Number(aStar.toFixed(2)),
            bStar: Number(bStar.toFixed(2)),
            yellowRatio: Number((yellowPixels / samples.length * 100).toFixed(2)),
            redRatio: Number((redPixels / samples.length * 100).toFixed(2))
        };
    }


    analyzeIrisOptics(landmarks, irisIds) {
        const source = this.getSourceImage();
        const sourceWidth = this.frozenFrame?.width || this.video.videoWidth;
        const sourceHeight = this.frozenFrame?.height || this.video.videoHeight;
        const points = irisIds.map(id => landmarks[id]).filter(Boolean);
        if (points.length < 4 || !sourceWidth || !sourceHeight) {
            return { reliable:false, centerLStar:null, peripheralLStar:null, ringGradient:null };
        }

        const cx = points.reduce((v,p)=>v+p.x,0) / points.length;
        const cy = points.reduce((v,p)=>v+p.y,0) / points.length;
        let radiusN = 0;
        points.forEach(p => { radiusN = Math.max(radiusN, Math.hypot(p.x-cx, p.y-cy)); });
        if (!radiusN) return { reliable:false, centerLStar:null, peripheralLStar:null, ringGradient:null };

        const cropRadiusX = radiusN * sourceWidth * 1.75;
        const cropRadiusY = radiusN * sourceHeight * 1.75;
        const sx = Math.max(0, cx*sourceWidth-cropRadiusX);
        const sy = Math.max(0, cy*sourceHeight-cropRadiusY);
        const sw = Math.min(sourceWidth-sx, cropRadiusX*2);
        const sh = Math.min(sourceHeight-sy, cropRadiusY*2);
        if (sw < 8 || sh < 8) return { reliable:false, centerLStar:null, peripheralLStar:null, ringGradient:null };

        const canvas=document.createElement("canvas");
        canvas.width=180; canvas.height=180;
        const ctx=canvas.getContext("2d",{willReadFrequently:true});
        ctx.drawImage(source,sx,sy,sw,sh,0,0,180,180);
        const data=ctx.getImageData(0,0,180,180).data;

        const center=[], inner=[], outer=[];
        for(let y=0;y<180;y++){
            for(let x=0;x<180;x++){
                const dx=(x-90)/90, dy=(y-90)/90;
                const d=Math.hypot(dx,dy);
                const i=(y*180+x)*4;
                const lab=this.rgbToLab(data[i],data[i+1],data[i+2]);
                if(d<=0.24) center.push(lab.L);
                else if(d>=0.42 && d<=0.66) inner.push(lab.L);
                else if(d>=0.72 && d<=0.94) outer.push(lab.L);
            }
        }
        const median=values=>{
            if(!values.length) return null;
            const v=[...values].sort((a,b)=>a-b), m=Math.floor(v.length/2);
            return v.length%2?v[m]:(v[m-1]+v[m])/2;
        };
        const c=median(center), i=median(inner), o=median(outer);
        return {
            reliable: c!==null && i!==null && o!==null,
            centerLStar: c===null?null:Number(c.toFixed(2)),
            peripheralLStar: o===null?null:Number(o.toFixed(2)),
            ringGradient: (i===null||o===null)?null:Number((o-i).toFixed(2))
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
            this.irisIndices.left
        );

        const rightSclera = this.analyzeScleraRegion(
            landmarks,
            this.eyeIndices.right,
            this.scleraContours.right,
            this.irisIndices.right
        );

        const leftOptics = this.analyzeIrisOptics(landmarks, this.irisIndices.left);
        const rightOptics = this.analyzeIrisOptics(landmarks, this.irisIndices.right);

        const opticsSamples = [leftOptics, rightOptics].filter(item => item.reliable);
        const opticsMean = key => opticsSamples.length
            ? Number((opticsSamples.reduce((sum,item)=>sum+item[key],0)/opticsSamples.length).toFixed(2))
            : null;

        const optics = {
            reliable: opticsSamples.length > 0,
            pupilCenterLStar: opticsMean("centerLStar"),
            cornealPeripheralLStar: opticsMean("peripheralLStar"),
            cornealRingGradient: opticsMean("ringGradient"),
            left: leftOptics,
            right: rightOptics
        };

        const scleraSamples = [leftSclera, rightSclera].filter(
            item => item.reliable && item.validPixels >= 80
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
                right: rightSclera,
                reliable: true
            };
        } else {
            sclera = {
                lStar: Number(lab.L.toFixed(2)),
                aStar: Number(lab.a.toFixed(2)),
                bStar: Number(lab.b.toFixed(2)),
                yellowRatio: 0,
                redRatio: 0,
                left: leftSclera,
                right: rightSclera,
                reliable: false
            };
        }

        const yellowFlag = sclera.reliable &&
            (sclera.bStar > 12.0 || sclera.yellowRatio >= 12);
        const redFlag = sclera.reliable &&
            (sclera.aStar > 42.0 || sclera.redRatio >= 12);

        const findings = [];

        findings.push(
            !sclera.reliable
                ? "眼白有效像素不足，無法可靠判讀黃色特徵"
                : yellowFlag
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
                sclera,
                optics
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

    captureVisibleFrame(sourceCanvas = null) {
        const source = sourceCanvas || this.frozenFrame || this.freezeFrame();
        const wrapper = this.video.closest(".camera-wrapper");
        const displayW = wrapper?.clientWidth || this.video.clientWidth || source.width;
        const displayH = wrapper?.clientHeight || this.video.clientHeight || source.height;

        // CSS uses object-fit: cover. Reproduce exactly the portion the user saw.
        const sourceRatio = source.width / source.height;
        const displayRatio = displayW / displayH;
        let sx = 0, sy = 0, sw = source.width, sh = source.height;

        if (sourceRatio > displayRatio) {
            sw = source.height * displayRatio;
            sx = (source.width - sw) / 2;
        } else if (sourceRatio < displayRatio) {
            sh = source.width / displayRatio;
            sy = (source.height - sh) / 2;
        }

        const out = document.createElement("canvas");
        out.width = Math.max(1, Math.round(sw));
        out.height = Math.max(1, Math.round(sh));
        out.getContext("2d").drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
        return out;
    }

    captureEyeCloseup(sourceCanvas = null) {
        const source = sourceCanvas || this.frozenFrame || this.freezeFrame();
        const landmarks = this.smoothedLandmarks || this.latestResults?.multiFaceLandmarks?.[0];
        if (!landmarks) return null;

        const ids = [
            ...this.eyeIndices.left.contour,
            ...this.eyeIndices.right.contour,
            ...this.irisIndices.left,
            ...this.irisIndices.right
        ];
        const pts = ids.map(id => landmarks[id]).filter(Boolean);
        if (!pts.length) return null;

        let minX = Math.min(...pts.map(p => p.x));
        let maxX = Math.max(...pts.map(p => p.x));
        let minY = Math.min(...pts.map(p => p.y));
        let maxY = Math.max(...pts.map(p => p.y));

        const eyeSpan = maxX - minX;
        const eyeHeight = maxY - minY;
        // Include eyelids above/below so stye morphology is not cropped away.
        minX = Math.max(0, minX - eyeSpan * 0.16);
        maxX = Math.min(1, maxX + eyeSpan * 0.16);
        minY = Math.max(0, minY - Math.max(eyeHeight * 1.35, eyeSpan * 0.10));
        maxY = Math.min(1, maxY + Math.max(eyeHeight * 1.35, eyeSpan * 0.10));

        const sx = minX * source.width;
        const sy = minY * source.height;
        const sw = (maxX - minX) * source.width;
        const sh = (maxY - minY) * source.height;

        const out = document.createElement("canvas");
        out.width = Math.max(1, Math.round(sw));
        out.height = Math.max(1, Math.round(sh));
        out.getContext("2d").drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
        return out;
    }

    releaseFrozenFrame() {
        this.frozenFrame = null;
    }

}
