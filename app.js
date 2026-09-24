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


        await analyzer.init();


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

        captureButton.disabled =
            true;

        return;
    }


    status.textContent =
        "定位完成";

    faceState.textContent =
        "OK";

    eyeState.textContent =
        "OK";

    captureButton.disabled =
        false;
}


/* =========================
   擷取分析
========================= */

document
    .getElementById("capture-btn")
    .addEventListener(
        "click",
        runAnalysis
    );


async function runAnalysis() {

    if (
        !analyzer.latestResults ||
        !analyzer.latestResults.multiFaceLandmarks
    ) {

        alert(
            "尚未偵測到眼部，請重新調整位置。"
        );

        return;
    }


    showSection(
        "loading-section"
    );


    updateLoading(
        "正在分析影像",
        "正在取得眼部 ROI……",
        20
    );


    await delay(300);


    const features =
        analyzer.getAnalysisReport();


    updateLoading(
        "色彩分析",
        "正在計算 RGB / HSV / CIE L*a*b*……",
        45
    );


    await delay(300);


    const imageCanvas =
        analyzer.captureImage();


    const image =
        imageCanvas
            .toDataURL(
                "image/jpeg",
                0.78
            )
            .split(",")[1];


    updateLoading(
        "AI 分析",
        "正在建立初篩報告……",
        70
    );


    try {

        const response =
            await fetch(
                "/api/analyze",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        image,

                        features

                    })
                }
            );


        /*
         * 先讀取文字，再解析 JSON。
         * 避免伺服器回傳空內容時直接觸發
         * "Unexpected end of JSON input"。
         */
        const rawText =
            await response.text();

        let data = {};

        if (rawText.trim()) {

            try {

                data =
                    JSON.parse(rawText);

            } catch (parseError) {

                console.error(
                    "伺服器回傳不是有效 JSON：",
                    rawText
                );

                throw new Error(
                    `伺服器回傳格式錯誤（HTTP ${response.status}）`
                );
            }
        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                `分析服務發生錯誤（HTTP ${response.status}）`
            );
        }


        if (!data || typeof data !== "object") {

            throw new Error(
                "分析服務沒有回傳有效結果"
            );
        }


        updateLoading(
            "完成",
            "正在建立結果頁面……",
            100
        );


        await delay(500);


        displayResult(
            data,
            features,
            imageCanvas
        );


    } catch (error) {

        console.error(error);

        showSection(
            "scan-section"
        );

        alert(
            "分析失敗：" +
            error.message
        );
    }
}


/* =========================
   Loading
========================= */

function updateLoading(
    title,
    text,
    progress
) {

    document
        .getElementById(
            "loading-title"
        )
        .textContent = title;

    document
        .getElementById(
            "loading-text"
        )
        .textContent = text;

    document
        .getElementById(
            "progress-fill"
        )
        .style.width =
            `${progress}%`;
}


function delay(ms) {

    return new Promise(
        resolve => setTimeout(
            resolve,
            ms
        )
    );
}


/* =========================
   結果
========================= */

function displayResult(
    report,
    features,
    imageCanvas
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


    /*
     * 顯示影像
     */

    const resultCanvas =
        document.getElementById(
            "result-canvas"
        );

    resultCanvas.width =
        imageCanvas.width;

    resultCanvas.height =
        imageCanvas.height;

    resultCanvas
        .getContext("2d")
        .drawImage(
            imageCanvas,
            0,
            0
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
        features
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
    features
) {

    const history =
        JSON.parse(
            localStorage.getItem(
                "eyeHistory"
            ) || "[]"
        );


    history.unshift({

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

        aStar:
            features.color?.aStar,

        bStar:
            features.color?.bStar,

        lStar:
            features.color?.lStar
    });


    localStorage.setItem(
        "eyeHistory",
        JSON.stringify(
            history.slice(0, 10)
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


    container.innerHTML =
        history.map(
            item => `

                <div class="history-card">

                    <div>
                        <strong>
                            ${escapeHTML(
                                item.level
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.time
                            )}
                        </span>
                    </div>

                    <p>
                        ${escapeHTML(
                            item.finding
                        )}
                    </p>

                </div>

            `
        ).join("");
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
