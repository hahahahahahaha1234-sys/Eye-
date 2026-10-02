const video =
    document.getElementById("camera-video");

const overlayCanvas =
    document.getElementById("overlay-canvas");

const analyzer =
    new EyeAnalyzer(
        video,
        overlayCanvas
    );


/* =========================
   Page
========================= */

const sections = [
    "home-section",
    "check-section",
    "calibration-section",
    "scan-section",
    "loading-section",
    "result-section",
    "history-section"
];


function showSection(id) {

    sections.forEach(sectionId => {

        const section =
            document.getElementById(sectionId);

        if (!section) return;

        section.classList.toggle(
            "hidden",
            sectionId !== id
        );
    });
}


/* =========================
   常駐說明中心
========================= */

const diseaseInfo = {
    jaundice: {
        title: "黃疸",
        subtitle: "鞏膜可能呈現黃色",
        description:
            "黃疸是膽紅素累積造成的表現，可能與肝臟、膽道、血液疾病、感染或藥物等因素有關。眼白變黃本身不能用來判斷是哪一種原因。",
        solution:
            "沒有單一的「退黃」方法，處理方式取決於造成黃疸的原因。如果眼白或皮膚出現明顯黃色，應由醫療人員評估，必要時檢查膽紅素與肝功能等。"
    },
    conjunctivitis: {
        title: "急性結膜炎",
        subtitle: "結膜紅、癢、流淚等",
        description:
            "結膜炎可能由病毒、細菌、過敏或刺激造成，因此單靠眼睛紅不能判斷病因。",
        solution:
            "輕症可先避免揉眼、保持手部清潔，冷敷可減輕不適；人工淚液也可能幫助舒緩乾澀。若是感染性結膜炎，避免共用毛巾、枕套或眼妝。細菌性等特定情況可能需要醫師評估後使用藥物。"
    },
    arcus: {
        title: "角膜老年環",
        subtitle: "角膜周邊灰白色環狀特徵",
        description:
            "角膜老年環是角膜周邊脂質沉積形成的灰白、藍白色環，常見於年齡增加者，通常不會影響視力。",
        solution:
            "與老化相關的角膜老年環通常不需要直接治療，也不需要為了消除環狀外觀而手術。如果較年輕時出現、只有單眼出現或伴隨其他異常，可請醫師評估是否需要檢查血脂或其他原因。"
    },
    cataract: {
        title: "白內障",
        subtitle: "水晶體混濁造成視覺品質下降",
        description:
            "白內障是眼睛內的水晶體變得混濁，可能造成視力模糊、眩光、夜間視力下降或顏色看起來變淡。影像初篩不能確診白內障。",
        solution:
            "早期可依醫師建議調整眼鏡度數、增加照明或減少眩光。當白內障已明顯影響日常生活時，眼科醫師可能評估白內障手術；手術是目前移除白內障的有效治療方式。"
    },
        stye: {
            title: "針眼／麥粒腫",
            subtitle: "眼瞼邊緣紅腫、按壓疼痛、局部突起",
            description: "作品計畫書將針眼列為眼瞼邊緣的局部病徵，常見表現為紅腫、疼痛與局部突起。本系統僅依外觀影像提供初篩提示。",
            solution: "可用約 40°C 的乾淨溫毛巾熱敷 10–15 分鐘，每日 3–4 次，並保持手部清潔、避免揉眼或自行擠壓。若症狀惡化、影響視力或持續未改善，請就醫評估。"
        }
};


function initHelpCenter() {

    if (document.getElementById("help-center-btn")) {
        return;
    }


    const style =
        document.createElement("style");

    style.id = "help-center-style";

    style.textContent = `
        #help-center-btn {
            position: fixed;
            right: 22px;
            bottom: 22px;
            z-index: 9998;
            min-width: 72px;
            height: 46px;
            padding: 0 18px;
            border: 1px solid rgba(0, 234, 255, 0.7);
            border-radius: 24px;
            color: #001015;
            background: #00eaff;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 0 25px rgba(0, 234, 255, 0.22);
        }

        #help-center-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 35px rgba(0, 234, 255, 0.35);
        }

        #help-center-modal {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(0, 5, 10, 0.78);
            backdrop-filter: blur(8px);
        }

        #help-center-modal.open {
            display: flex;
        }

        .help-modal-panel {
            width: min(900px, 100%);
            max-height: min(820px, 90vh);
            overflow-y: auto;
            padding: 30px;
            background: rgba(7, 18, 28, 0.98);
            border: 1px solid rgba(0, 220, 255, 0.35);
            box-shadow: 0 20px 80px rgba(0, 0, 0, 0.6);
        }

        .help-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 22px;
        }

        .help-modal-header h2 {
            font-size: 30px;
            margin: 0 0 8px;
        }

        .help-modal-header p {
            color: #7f9aaa;
            line-height: 1.7;
        }

        #help-close-btn {
            width: 38px;
            height: 38px;
            border: 1px solid rgba(0, 220, 255, 0.25);
            background: transparent;
            color: #00eaff;
            font-size: 22px;
            cursor: pointer;
        }

        .help-disease-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .help-disease-card {
            padding: 18px;
            border: 1px solid rgba(0, 220, 255, 0.22);
            background: rgba(0, 220, 255, 0.025);
            color: #eafaff;
            text-align: left;
            cursor: pointer;
        }

        .help-disease-card:hover,
        .help-disease-card.active {
            border-color: rgba(0, 234, 255, 0.7);
            background: rgba(0, 220, 255, 0.07);
        }

        .help-disease-card strong {
            display: block;
            margin-bottom: 6px;
            font-size: 16px;
        }

        .help-disease-card span {
            color: #7f9aaa;
            font-size: 12px;
        }

        .help-detail {
            display: none;
            margin-top: 18px;
            padding: 22px;
            border-left: 3px solid #00eaff;
            background: rgba(0, 220, 255, 0.04);
        }

        .help-detail.open {
            display: block;
        }

        .help-detail h3 {
            margin-bottom: 8px;
            font-size: 22px;
        }

        .help-detail .help-subtitle {
            color: #00eaff;
            font-size: 12px;
            letter-spacing: 1px;
            margin-bottom: 16px;
        }

        .help-detail h4 {
            margin: 16px 0 7px;
            color: #eafaff;
        }

        .help-detail p {
            color: #b2c5cf;
            line-height: 1.8;
            font-size: 14px;
        }

        .help-disclaimer {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid rgba(0, 220, 255, 0.12);
            color: #637a88;
            font-size: 11px;
            line-height: 1.7;
        }

        @media (max-width: 650px) {
            #help-center-btn {
                right: 14px;
                bottom: 14px;
            }

            .help-modal-panel {
                padding: 22px;
            }

            .help-disease-grid {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(style);


    const button =
        document.createElement("button");

    button.id = "help-center-btn";
    button.type = "button";
    button.textContent = "說明";
    button.title = "開啟系統說明";


    const modal =
        document.createElement("div");

    modal.id = "help-center-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "系統說明");

    modal.innerHTML = `
        <div class="help-modal-panel">
            <div class="help-modal-header">
                <div>
                    <div class="section-label">EYE-AI / HELP CENTER</div>
                    <h2>系統說明</h2>
                    <p>
                        任何頁面都可以點右下角「說明」重新查看。
                        點選下面的項目，可以了解可能的影像特徵與一般處理方向。
                    </p>
                </div>
                <button id="help-close-btn" type="button" aria-label="關閉說明">×</button>
            </div>

            <div class="help-disease-grid">
                <button class="help-disease-card" data-disease="jaundice" type="button">
                    <strong>01　黃疸</strong>
                    <span>鞏膜黃色程度</span>
                </button>
                <button class="help-disease-card" data-disease="conjunctivitis" type="button">
                    <strong>02　急性結膜炎</strong>
                    <span>結膜紅色程度</span>
                </button>
                <button class="help-disease-card" data-disease="arcus" type="button">
                    <strong>03　角膜老年環</strong>
                    <span>角膜周邊灰白特徵</span>
                </button>
                <button class="help-disease-card" data-disease="cataract" type="button">
                    <strong>04　白內障</strong>
                    <span>瞳孔區亮度與混濁</span>
                </button>
                <button class="help-disease-card" data-disease="stye" type="button">
                    <strong>05　針眼</strong>
                    <span>眼瞼紅腫、疼痛與局部突起</span>
                </button>
            </div>

            <div id="help-detail" class="help-detail">
                <h3 id="help-detail-title"></h3>
                <div id="help-detail-subtitle" class="help-subtitle"></div>
                <h4>這是什麼？</h4>
                <p id="help-detail-description"></p>
                <h4>可以怎麼處理？</h4>
                <p id="help-detail-solution"></p>
            </div>

            <div class="help-disclaimer">
                本系統只能提供影像初篩與衛教資訊，不能依照片確診或取代眼科檢查。
                若有明顯疼痛、視力下降或持續異常，請接受專業醫療評估。
            </div>
        </div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(modal);


    const closeModal = () => {
        if (modal) modal.classList.remove("open");
    };


    const openDisease = key => {

        const info = diseaseInfo[key];

        if (!info) return;

        document
            .querySelectorAll(".help-disease-card")
            .forEach(card => {
                card.classList.toggle(
                    "active",
                    card.dataset.disease === key
                );
            });

        document.getElementById("help-detail-title")
            .textContent = info.title;

        document.getElementById("help-detail-subtitle")
            .textContent = info.subtitle;

        document.getElementById("help-detail-description")
            .textContent = info.description;

        document.getElementById("help-detail-solution")
            .textContent = info.solution;

        document.getElementById("help-detail")
            .classList.add("open");
    };


    button.addEventListener(
        "click",
        () => modal.classList.add("open")
    );

    document
        .getElementById("help-close-btn")
        .addEventListener("click", closeModal);

    modal.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                closeModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeModal();
            }
        }
    );

    modal
        .querySelectorAll(".help-disease-card")
        .forEach(card => {
            card.addEventListener(
                "click",
                () => openDisease(card.dataset.disease)
            );
        });


    /*
     * 首頁原本的五張病症卡也直接變成可點擊說明。
     */
    const homeDiseaseKeys = [
        "jaundice",
        "conjunctivitis",
        "arcus",
        "cataract",
        "stye"
    ];

    document
        .querySelectorAll("#home-section .disease-card")
        .forEach((card, index) => {

            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.title = "點擊查看處理說明";

            const open = () => {
                modal.classList.add("open");
                openDisease(homeDiseaseKeys[index]);
            };

            card.addEventListener("click", open);

            card.addEventListener(
                "keydown",
                event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        open();
                    }
                }
            );
        });
}


if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initHelpCenter
    );
} else {
    initHelpCenter();
}


/* =========================
   設定選單
========================= */

function initSettingsMenu() {

    if (document.getElementById("settings-menu-btn")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "settings-menu-style";
    style.textContent = `
        #settings-menu-btn {
            position: fixed;
            right: 16px;
            bottom: max(16px, env(safe-area-inset-bottom));
            z-index: 9997;
            width: 52px;
            height: 52px;
            border: 1px solid rgba(0, 234, 255, 0.7);
            border-radius: 50%;
            color: #00eaff;
            background: rgba(3, 14, 23, 0.94);
            font-size: 23px;
            cursor: pointer;
            box-shadow: 0 0 28px rgba(0, 234, 255, 0.18);
        }

        #settings-menu-btn:hover {
            transform: translateY(-2px);
            background: rgba(0, 234, 255, 0.10);
            box-shadow: 0 0 34px rgba(0, 234, 255, 0.30);
        }

        #settings-menu-modal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: none;
            align-items: flex-end;
            justify-content: flex-end;
            padding: 84px 18px 82px;
            background: rgba(0, 5, 10, 0.45);
        }

        #settings-menu-modal.open {
            display: flex;
        }

        .settings-menu-panel {
            width: min(330px, calc(100vw - 36px));
            padding: 18px;
            border: 1px solid rgba(0, 234, 255, 0.35);
            background:
                radial-gradient(circle at 80% 0%, rgba(0, 220, 255, 0.08), transparent 45%),
                rgba(4, 13, 22, 0.98);
            box-shadow: 0 22px 70px rgba(0, 0, 0, 0.55);
        }

        .settings-menu-title {
            margin: 0 0 14px;
            color: #eafaff;
            font-size: 18px;
        }

        .settings-menu-subtitle {
            margin: 0 0 14px;
            color: #7f9aaa;
            font-size: 11px;
            line-height: 1.6;
        }

        .settings-menu-item {
            width: 100%;
            min-height: 52px;
            margin-top: 9px;
            padding: 0 15px;
            display: flex;
            align-items: center;
            gap: 11px;
            border: 1px solid rgba(0, 220, 255, 0.20);
            background: rgba(0, 220, 255, 0.035);
            color: #eafaff;
            text-align: left;
            cursor: pointer;
        }

        .settings-menu-item:hover {
            border-color: rgba(0, 234, 255, 0.65);
            background: rgba(0, 220, 255, 0.08);
        }

        .settings-menu-icon {
            width: 28px;
            color: #00eaff;
            font-size: 18px;
            text-align: center;
        }

        .settings-menu-item strong {
            display: block;
            font-size: 14px;
        }

        .settings-menu-item span {
            display: block;
            margin-top: 2px;
            color: #7f9aaa;
            font-size: 10px;
        }

        @media (max-width: 600px) {
            #settings-menu-btn {
                right: 12px;
                bottom: max(12px, env(safe-area-inset-bottom));
            }

            #settings-menu-modal {
                padding-right: 12px;
                padding-bottom: 76px;
            }
        }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "settings-menu-btn";
    button.type = "button";
    button.setAttribute("aria-label", "設定");
    button.title = "設定";
    button.textContent = "⚙";

    const modal = document.createElement("div");
    modal.id = "settings-menu-modal";
    modal.innerHTML = `
        <div class="settings-menu-panel" role="dialog" aria-label="設定">
            <div class="section-label">SYSTEM SETTINGS</div>
            <h3 class="settings-menu-title">設定</h3>
            <p class="settings-menu-subtitle">快速開啟系統說明與歷史檢測紀錄。</p>

            <button class="settings-menu-item" id="settings-help-btn" type="button">
                <span class="settings-menu-icon">?</span>
                <span>
                    <strong>說明</strong>
                    <span>查看疾病衛教與系統使用方式</span>
                </span>
            </button>

            <button class="settings-menu-item" id="settings-history-btn" type="button">
                <span class="settings-menu-icon">◷</span>
                <span>
                    <strong>歷史紀錄</strong>
                    <span>查看過去的照片與完整初篩結果</span>
                </span>
            </button>
        </div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(modal);

    const close = () => modal.classList.remove("open");

    button.addEventListener("click", () => {
        modal.classList.toggle("open");
    });

    modal.addEventListener("click", event => {
        if (event.target === modal) close();
    });

    document.getElementById("settings-help-btn").addEventListener("click", () => {
        close();
        document.getElementById("help-center-btn")?.click();
    });

    document.getElementById("settings-history-btn").addEventListener("click", () => {
        close();
        showHistory();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsMenu);
} else {
    initSettingsMenu();
}


/* =========================
   首頁
========================= */

document
    .getElementById("start-btn")
    .addEventListener(
        "click",
        () => {

            showSection(
                "check-section"
            );

        }
    );


/* =========================
   預檢
========================= */

document
    .getElementById("continue-check-btn")
    .addEventListener(
        "click",
        () => {

            const injury =
                document
                    .getElementById(
                        "check-injury"
                    ).checked;

            const contact =
                document
                    .getElementById(
                        "check-contact"
                    ).checked;

            const drops =
                document
                    .getElementById(
                        "check-drops"
                    ).checked;

            const warning =
                document
                    .getElementById(
                        "check-warning"
                    );

            const warningText =
                document
                    .getElementById(
                        "check-warning-text"
                    );


            if (!injury) {

                warning.classList.remove(
                    "hidden"
                );

                warningText.textContent =
                    "系統建議近期有眼部受傷或手術者先停止自我檢測，改由醫療專業人員評估。";

                return;
            }


            if (!contact) {

                warning.classList.remove(
                    "hidden"
                );

                warningText.textContent =
                    "請先摘除隱形眼鏡，再進行影像檢測。";

                return;
            }


            if (!drops) {

                warning.classList.remove(
                    "hidden"
                );

                warningText.textContent =
                    "若 30 分鐘內使用過眼藥水，請等待後再進行檢測。";

                return;
            }


            warning.classList.add(
                "hidden"
            );

            showSection(
                "calibration-section"
            );
        }
    );


/* =========================
   相機
========================= */

let camera = null;

document
    .getElementById("start-camera-btn")
    .addEventListener(
        "click",
        startCamera
    );


async function startCamera() {

    showSection(
        "scan-section"
    );

    try {

        const stream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {
                        facingMode: "user",
                        width: {
                            ideal: 1280
                        },
                        height: {
                            ideal: 720
                        }
                    },

                    audio: false
                });


        video.srcObject =
            stream;


        await video.play();

        overlayCanvas.style.visibility = "visible";

        await analyzer.init();
        analyzer.releaseFrozenFrame();


        camera =
            new Camera(
                video,
                {

                    onFrame:
                        async () => {

                            await analyzer
                                .processFrame();

                            updateCameraStatus();
                        },

                    width: 1280,
                    height: 720

                }
            );


        camera.start();

    } catch (error) {

        console.error(error);

        alert(
            "無法開啟相機，請確認瀏覽器已允許相機權限。"
        );
    }
}


/* =========================
   相機狀態
========================= */

function updateCameraStatus() {

    const status =
        document.getElementById(
            "camera-status"
        );

    const faceState =
        document.getElementById(
            "face-state"
        );

    const eyeState =
        document.getElementById(
            "eye-state"
        );

    const captureButton =
        document.getElementById(
            "capture-btn"
        );


    const results =
        analyzer.latestResults;


    if (
        !results ||
        !results.multiFaceLandmarks ||
        !results.multiFaceLandmarks.length
    ) {

        status.textContent =
            "找不到臉部";

        faceState.textContent =
            "未偵測";

        eyeState.textContent =
            "等待";

        captureButton.disabled = false;

        return;
    }


    status.textContent =
        "定位完成";

    faceState.textContent =
        "OK";

    eyeState.textContent =
        "OK";

    captureButton.disabled = false;
}


/* =========================
   擷取分析
========================= */

const captureAnalysisButton =
    document.getElementById("capture-btn");

let analysisRunning = false;

captureAnalysisButton.disabled = false;

function startAnalysisFromUserGesture(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    runAnalysis(event);
}

/*
 * iPhone/iPad Safari: pointerup is a direct user gesture and is more reliable
 * than waiting for the synthesized click over a live camera/canvas stack.
 * Desktop/mouse keeps the normal click path.
 */
if (window.PointerEvent) {
    captureAnalysisButton.addEventListener("pointerup", startAnalysisFromUserGesture, { passive: false });
} else {
    captureAnalysisButton.addEventListener("touchend", startAnalysisFromUserGesture, { passive: false });
}
captureAnalysisButton.addEventListener("click", event => {
    if (event.pointerType === "touch" || ("ontouchstart" in window && window.PointerEvent)) return;
    startAnalysisFromUserGesture(event);
});


async function runAnalysis(event) {
    if (event) event.preventDefault();
    if (analysisRunning) return;

    const modal = document.getElementById("analysis-modal");
    const modalText = document.getElementById("analysis-modal-text");

    analysisRunning = true;
    captureAnalysisButton.disabled = true;

    try {
        if (!video.srcObject || video.readyState < 2) {
            throw new Error("相機影像尚未準備完成，請稍候再試");
        }

        const results = analyzer.latestResults;
        if (!results?.multiFaceLandmarks?.length) {
            throw new Error("目前沒有偵測到臉部與眼睛，請將雙眼完整放入掃描框");
        }

        /*
         * One authoritative snapshot:
         * 1) capture current pixels
         * 2) freeze video + stop MediaPipe camera loop
         * 3) analyze the frozen pixels
         * 4) send the same JPEG to AI
         */
        const fullFrameCanvas = analyzer.freezeFrame();
        const imageCanvas = analyzer.captureVisibleFrame(fullFrameCanvas);
        const eyeCloseupCanvas = analyzer.captureEyeCloseup(fullFrameCanvas);

        video.pause();
        if (camera && typeof camera.stop === "function") {
            camera.stop();
        }

        // Paint the captured still frame into the existing overlay canvas.
        overlayCanvas.style.visibility = "visible";
        overlayCanvas.width = imageCanvas.width;
        overlayCanvas.height = imageCanvas.height;
        const frozenCtx = overlayCanvas.getContext("2d");
        frozenCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        frozenCtx.drawImage(imageCanvas, 0, 0);

        if (modal) modal.classList.add("open");
        if (modalText) modalText.textContent = "特徵分析中，請稍等........";

        await new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
        );

        const features = analyzer.getAnalysisReport();
        const image = imageCanvas
            .toDataURL("image/jpeg", 0.86)
            .split(",")[1];

        const eyeCloseup = eyeCloseupCanvas
            ? eyeCloseupCanvas.toDataURL("image/jpeg", 0.9).split(",")[1]
            : null;

        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image, eyeCloseup, features })
        });

        const rawText = await response.text();
        let data;

        try {
            data = rawText.trim() ? JSON.parse(rawText) : {};
        } catch {
            throw new Error(`分析服務回傳格式錯誤（HTTP ${response.status}）`);
        }

        if (!response.ok) {
            throw new Error(data.error || `分析服務錯誤（HTTP ${response.status}）`);
        }

        if (!data || typeof data !== "object") {
            throw new Error("分析服務沒有回傳有效結果");
        }

        if (modal) modal.classList.remove("open");
        displayResult(data, features, imageCanvas, eyeCloseupCanvas);

    } catch (error) {
        console.error("Capture / analysis failed:", error);
        if (modal) modal.classList.remove("open");
        alert("無法完成分析：" + (error?.message || "未知錯誤"));

        analyzer.releaseFrozenFrame();
        overlayCanvas.style.visibility = "visible";

        try {
            await video.play();
            if (camera && typeof camera.start === "function") camera.start();
        } catch (resumeError) {
            console.warn("Camera resume failed:", resumeError);
        }
    } finally {
        analysisRunning = false;
        captureAnalysisButton.disabled = false;
    }
}


/* =========================
   Loading
========================= */

/* =========================
   結果
========================= */

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function displayResult(
    report,
    features,
    imageCanvas,
    capturedEyeCloseup = null
) {

    showSection(
        "result-section"
    );


    const risk =
        normalizeRisk(
            report.level
        );


    const indicator =
        document.getElementById(
            "risk-indicator"
        );


    indicator.className =
        `risk-indicator ${risk.className}`;


    document
        .getElementById(
            "risk-level"
        )
        .textContent =
            risk.text;


    document
        .getElementById(
            "result-finding"
        )
        .textContent =
            report.finding ||
            "目前沒有額外觀察結果。";


    document
        .getElementById(
            "result-description"
        )
        .textContent =
            report.desc ||
            "影像分析完成。";


    document
        .getElementById(
            "result-advice"
        )
        .textContent =
            report.advice ||
            "如有持續不適，建議進一步就醫。";


    const screeningBox = document.getElementById("screening-summary");
    if (screeningBox) {
        const labels = {
            jaundice: "黃疸／黃色鞏膜",
            conjunctivitis: "急性結膜炎",
            stye: "針眼／麥粒腫",
            cataract: "白內障樣混濁",
            arcus: "角膜老年環"
        };
        const statusText = {
            detected: "疑似特徵",
            not_detected: "未見明顯特徵",
            uncertain: "無法可靠判讀"
        };
        const rows = Object.entries(labels).map(([key,label]) => {
            const item = report.screening?.[key];
            const status = statusText[item?.status] || "無資料";
            const evidence = item?.evidence || "未取得判讀依據";
            return `<div style="margin:0 0 12px"><strong>${label}｜${status}</strong><br><span style="opacity:.78">${escapeHtml(evidence)}</span></div>`;
        });
        screeningBox.innerHTML = rows.join("");
    }


    /*
     * 顯示影像
     */

    const resultCanvas =
        document.getElementById(
            "result-canvas"
        );

    /*
     * Results page intentionally shows an eye-only close-up.
     * Do not display the full face here: the final report should
     * focus the viewer on the actual screening region.
     */
    /*
     * Final result keeps the exact aspect ratio of the captured
     * eye close-up. The image is enlarged by CSS without stretching.
     * The same eye-frame ratio used during capture is retained.
     */
    /*
     * Use the exact eye close-up captured at the moment the user
     * pressed the shutter. It already contains the same eye-socket
     * and iris/pupil HUD frames, so the analysis page does not
     * recalculate or stretch the image.
     */
    const sourceCanvas =
        capturedEyeCloseup || imageCanvas;

    resultCanvas.width =
        sourceCanvas.width;

    resultCanvas.height =
        sourceCanvas.height;

    resultCanvas
        .getContext("2d")
        .drawImage(
            sourceCanvas,
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height
        );


    /*
     * 顯示數值
     */

    document
        .getElementById(
            "feature-a"
        )
        .textContent =
            features.color?.aStar ??
            "--";


    document
        .getElementById(
            "feature-b"
        )
        .textContent =
            features.color?.bStar ??
            "--";


    document
        .getElementById(
            "feature-l"
        )
        .textContent =
            features.color?.lStar ??
            "--";


    document
        .getElementById(
            "feature-red"
        )
        .textContent =
            features.color?.redRatio !== undefined
                ? `${features.color.redRatio}%`
                : "--";


    saveReport(
        report,
        features,
        sourceCanvas
    );
}


/* =========================
   Risk
========================= */

function normalizeRisk(level) {

    const text =
        String(level || "")
            .toLowerCase();


    if (
        text.includes("高") ||
        text.includes("high")
    ) {

        return {
            className: "high",
            text: "高風險"
        };
    }


    if (
        text.includes("中") ||
        text.includes("medium")
    ) {

        return {
            className: "medium",
            text: "中風險"
        };
    }


    return {
        className: "low",
        text: "低風險"
    };
}


/* =========================
   History
========================= */

function saveReport(
    report,
    features,
    imageCanvas = null
) {

    const history =
        JSON.parse(
            localStorage.getItem(
                "eyeHistory"
            ) || "[]"
        );

    /*
     * Store the actual result image together with the analysis data.
     * JPEG keeps localStorage usage manageable while preserving the
     * eye HUD frame shown on the result page.
     */
    let image = null;

    if (imageCanvas) {
        try {
            image = imageCanvas.toDataURL("image/jpeg", 0.78);
        } catch (error) {
            console.warn("Unable to save history image:", error);
        }
    }

    history.unshift({

        id:
            Date.now(),

        time:
            new Date()
                .toLocaleString(
                    "zh-TW"
                ),

        level:
            report.level ||
            "低風險",

        finding:
            report.finding ||
            "",

        desc:
            report.desc ||
            "",

        advice:
            report.advice ||
            "",

        screening:
            report.screening ||
            {},

        aStar:
            features.color?.aStar,

        bStar:
            features.color?.bStar,

        lStar:
            features.color?.lStar,

        redRatio:
            features.color?.redRatio,

        image
    });

    /*
     * Keep the newest five complete records so photos and full reports
     * do not consume excessive browser storage.
     */
    localStorage.setItem(
        "eyeHistory",
        JSON.stringify(
            history.slice(0, 5)
        )
    );
}


/* =========================
   History Page
========================= */

document
    .getElementById(
        "history-btn"
    )
    .addEventListener(
        "click",
        showHistory
    );


document
    .getElementById(
        "back-result-btn"
    )
    .addEventListener(
        "click",
        () => {

            showSection(
                "result-section"
            );

        }
    );


function showHistory() {

    showSection(
        "history-section"
    );

    const container =
        document.getElementById(
            "history-list"
        );

    const history =
        JSON.parse(
            localStorage.getItem(
                "eyeHistory"
            ) || "[]"
        );

    if (!history.length) {

        container.innerHTML = `
            <div class="empty-history">
                尚無檢測紀錄
            </div>
        `;

        return;
    }

    const labels = {
        jaundice: "黃疸／黃色鞏膜",
        conjunctivitis: "急性結膜炎",
        stye: "針眼／麥粒腫",
        cataract: "白內障樣混濁",
        arcus: "角膜老年環"
    };

    const statusText = {
        detected: "疑似特徵",
        not_detected: "未見明顯特徵",
        uncertain: "無法可靠判讀"
    };

    container.innerHTML =
        history.map(item => {

            const screeningRows =
                Object.entries(labels)
                    .map(([key, label]) => {

                        const result =
                            item.screening?.[key];

                        const status =
                            statusText[result?.status] ||
                            "無資料";

                        const evidence =
                            result?.evidence ||
                            "未取得判讀依據";

                        return `
                            <div class="history-screening-row">
                                <strong>${escapeHTML(label)}｜${escapeHTML(status)}</strong>
                                <span>${escapeHTML(evidence)}</span>
                            </div>
                        `;
                    })
                    .join("");

            return `
                <article class="history-card history-card-full">

                    <div class="history-card-header">
                        <div>
                            <div class="history-card-time">
                                ${escapeHTML(item.time)}
                            </div>
                            <strong class="history-card-level">
                                ${escapeHTML(item.level)}
                            </strong>
                        </div>
                    </div>

                    ${item.image
                        ? `
                            <div class="history-image-wrap">
                                <img
                                    src="${item.image}"
                                    alt="歷史眼部檢測影像"
                                    class="history-image"
                                >
                            </div>
                        `
                        : `
                            <div class="history-image-missing">
                                此筆紀錄沒有儲存影像
                            </div>
                        `
                    }

                    <div class="history-result-section">
                        <div class="history-result-block">
                            <h4>主要觀察</h4>
                            <p>${escapeHTML(item.finding || "尚無資料")}</p>
                        </div>

                        <div class="history-result-block">
                            <h4>系統說明</h4>
                            <p>${escapeHTML(item.desc || "尚無資料")}</p>
                        </div>

                        <div class="history-result-block">
                            <h4>建議</h4>
                            <p>${escapeHTML(item.advice || "尚無資料")}</p>
                        </div>

                        <div class="history-result-block">
                            <h4>五項初篩</h4>
                            <div class="history-screening">
                                ${screeningRows}
                            </div>
                        </div>

                        <div class="history-feature-row">
                            <span>a* ${escapeHTML(item.aStar ?? "--")}</span>
                            <span>b* ${escapeHTML(item.bStar ?? "--")}</span>
                            <span>L* ${escapeHTML(item.lStar ?? "--")}</span>
                            <span>RED ${escapeHTML(item.redRatio ?? "--")}</span>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
}


/* =========================
   Restart
========================= */

document
    .getElementById(
        "restart-btn"
    )
    .addEventListener(
        "click",
        () => {

            showSection(
                "check-section"
            );

        }
    );


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
