const http = require("http");
const fs = require("fs");
const path = require("path");


const PORT =
    process.env.PORT || 10000;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;


const MIME_TYPES = {

    ".html":
        "text/html; charset=utf-8",

    ".css":
        "text/css; charset=utf-8",

    ".js":
        "application/javascript; charset=utf-8",

    ".json":
        "application/json; charset=utf-8",

    ".png":
        "image/png",

    ".jpg":
        "image/jpeg",

    ".jpeg":
        "image/jpeg",

    ".svg":
        "image/svg+xml",

    ".ico":
        "image/x-icon"
};


function sendJson(
    res,
    status,
    data
) {

    res.writeHead(
        status,
        {
            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store"
        }
    );

    res.end(
        JSON.stringify(data)
    );
}


/* =========================
   Static Files
========================= */

function serveStatic(
    req,
    res
) {

    let requestPath =
        req.url.split("?")[0];


    if (requestPath === "/") {

        requestPath =
            "/index.html";
    }


    const filePath =
        path.join(
            __dirname,
            requestPath
        );

    const normalized =
        path.normalize(filePath);


    if (
        !normalized.startsWith(
            path.normalize(__dirname)
        )
    ) {

        res.writeHead(403);

        res.end("Forbidden");

        return;
    }


    fs.readFile(
        normalized,
        (error, data) => {

            if (error) {

                if (
                    error.code ===
                    "ENOENT"
                ) {

                    res.writeHead(404);

                    res.end(
                        "Not Found"
                    );

                } else {

                    res.writeHead(500);

                    res.end(
                        "Server Error"
                    );
                }

                return;
            }


            const ext =
                path.extname(
                    normalized
                );


            res.writeHead(
                200,
                {
                    "Content-Type":
                        MIME_TYPES[ext] ||
                        "application/octet-stream"
                }
            );


            res.end(data);
        }
    );
}


/* =========================
   Request Body
========================= */

function readBody(req) {

    return new Promise(
        (resolve, reject) => {

            let body = "";

            req.on(
                "data",
                chunk => {

                    body += chunk;

                    if (
                        body.length >
                        15 * 1024 * 1024
                    ) {

                        reject(
                            new Error(
                                "Request too large"
                            )
                        );

                        req.destroy();
                    }
                }
            );


            req.on(
                "end",
                () => resolve(body)
            );


            req.on(
                "error",
                reject
            );
        }
    );
}


/* =========================
   Gemini
========================= */

async function analyzeWithGemini(
    image,
    features
) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "Render 尚未設定 GEMINI_API_KEY"
        );
    }


    const prompt = `

你是 ColorSafe EYE-AI 的「醫療影像初篩報告整理模組」。

你的任務不是診斷疾病，而是做「可見眼部異常的影像初篩」。

你必須同時使用：
A. 原始眼部/臉部照片的視覺觀察；
B. 系統提供的 MediaPipe 與色彩特徵。

色彩數值主要支援黃/紅色特徵；但針眼、眼瞼腫塊、局部紅腫、白內障樣混濁、角膜老年環等形態特徵，不能只靠 b* / a* 判斷，必須直接檢視照片中眼睛與眼瞼的外觀。

系統分析特徵：

${JSON.stringify(
    features,
    null,
    2
)}

計畫書中的研究提示條件：

1. 黃色特徵：
   CIE L*a*b* 的 b* > 12.0
   可作為黃色程度的提示條件。

2. 紅色特徵：
   CIE L*a*b* 的 a* > 42.0
   可作為結膜紅色程度的提示條件。

你要主動檢查下列「疑似外觀特徵」：
1. 疑似針眼/麥粒腫外觀：上或下眼瞼邊緣是否有局部、偏單側的紅腫、隆起、小腫塊或膿點樣外觀。
2. 疑似結膜炎相關外觀：眼白/結膜是否呈較廣泛紅色。
3. 疑似黃色鞏膜特徵：以系統 sclera 數值為優先，不可只因皮膚或整張照片偏黃判定。
4. 疑似白內障樣外觀：瞳孔區是否有明顯灰白/混濁外觀；僅照片可見時才描述。
5. 疑似角膜老年環外觀：角膜周邊是否可見灰白環狀特徵。

重要限制：

- 不得宣稱使用者已經確診。
- 不得把單一色彩特徵直接等同疾病。
- 必須稱為「初篩」、「疑似特徵」或「影像特徵」。
- 若資料不足，應說明無法可靠判讀。
- 建議以進一步專業醫療評估為主。
- 不得自行創造不存在的檢測數值。
- 系統提供的 flags 與 color.sclera 是優先的影像分析結果。
- color.sclera 現在只分析 MediaPipe 眼瞼輪廓內、排除虹膜/瞳孔後的有效眼白像素，不可用整張臉或皮膚顏色代替。
- 若 color.sclera.reliable === false，必須明確說「眼白有效像素不足，無法可靠判讀」，不得因照片整體偏黃就推論黃色鞏膜。
- 若 color.sclera.reliable === true 且（color.sclera.bStar > 12.0 或 flags.yellow === true），不得回傳「低風險」，finding 必須提到「疑似黃色鞏膜影像特徵」。
- 若 color.sclera.aStar > 42.0 或 flags.red === true，不得忽略紅色色彩特徵。
- 即使 flags.yellow 與 flags.red 都是 false，也不能因此寫「目前沒有額外觀察結果」；仍必須檢視照片是否有局部眼瞼紅腫/隆起等形態異常。
- 若照片中某一眼的上/下眼瞼有清楚的局部紅腫或隆起，finding 應明確寫「疑似針眼／麥粒腫相關外觀特徵」，但不得稱為確診。
- 若照片不是直接拍攝真人，而是拍攝另一個螢幕/印刷照片，必須在 desc 提醒影像來源會降低色彩與細節可靠度。
- 風險分級只是本作品的初篩提示，不代表醫療診斷。

你必須逐項完成五個檢查，不能省略任何一項。每一項 status 只能是：
"detected"（照片有可見疑似特徵）
"not_detected"（照片可判讀但未見該特徵）
"uncertain"（角度、解析度、遮擋、螢幕翻拍等原因不足以可靠判讀）

每一項 evidence 必須簡短寫出你在照片中實際看到或未看到什麼；不能只寫「無」。
白內障與角膜老年環尤其必須獨立檢查，不得因黃/紅色 flags 為 false 就略過。

請只回傳 JSON：

{
    "level": "低風險",
    "finding": "整合五項檢查後最重要的主要觀察",
    "desc": "以一般人能理解的方式說明",
    "advice": "下一步建議",
    "screening": {
        "jaundice": {"status":"not_detected","evidence":"黃色鞏膜相關影像證據"},
        "conjunctivitis": {"status":"not_detected","evidence":"廣泛結膜紅相關影像證據"},
        "stye": {"status":"not_detected","evidence":"眼瞼局部紅腫、隆起或膿點相關影像證據"},
        "cataract": {"status":"not_detected","evidence":"瞳孔/晶狀體區灰白或混濁相關影像證據"},
        "arcus": {"status":"not_detected","evidence":"角膜周邊灰白或藍白環狀特徵相關影像證據"}
    }
}

level 只能是：

低風險
中風險
高風險

`;


    const requestBody = {

        contents: [

            {

                parts: [

                    {
                        text: prompt
                    },

                    {
                        inline_data: {

                            mime_type:
                                "image/jpeg",

                            data:
                                image
                        }
                    }

                ]

            }

        ],

        generationConfig: {

            temperature: 0.1,

            response_mime_type:
                "application/json",

            response_schema: {

                type: "OBJECT",

                properties: {

                    level: {
                        type: "STRING",
                        enum: [
                            "低風險",
                            "中風險",
                            "高風險"
                        ]
                    },

                    finding: {
                        type: "STRING"
                    },

                    desc: {
                        type: "STRING"
                    },

                    advice: {
                        type: "STRING"
                    },

                    screening: {
                        type: "OBJECT",
                        properties: {
                            jaundice: {
                                type: "OBJECT",
                                properties: {
                                    status: { type: "STRING", enum: ["detected", "not_detected", "uncertain"] },
                                    evidence: { type: "STRING" }
                                },
                                required: ["status", "evidence"]
                            },
                            conjunctivitis: {
                                type: "OBJECT",
                                properties: {
                                    status: { type: "STRING", enum: ["detected", "not_detected", "uncertain"] },
                                    evidence: { type: "STRING" }
                                },
                                required: ["status", "evidence"]
                            },
                            stye: {
                                type: "OBJECT",
                                properties: {
                                    status: { type: "STRING", enum: ["detected", "not_detected", "uncertain"] },
                                    evidence: { type: "STRING" }
                                },
                                required: ["status", "evidence"]
                            },
                            cataract: {
                                type: "OBJECT",
                                properties: {
                                    status: { type: "STRING", enum: ["detected", "not_detected", "uncertain"] },
                                    evidence: { type: "STRING" }
                                },
                                required: ["status", "evidence"]
                            },
                            arcus: {
                                type: "OBJECT",
                                properties: {
                                    status: { type: "STRING", enum: ["detected", "not_detected", "uncertain"] },
                                    evidence: { type: "STRING" }
                                },
                                required: ["status", "evidence"]
                            }
                        },
                        required: ["jaundice", "conjunctivitis", "stye", "cataract", "arcus"]
                    }
                },

                required: [
                    "level",
                    "finding",
                    "desc",
                    "advice",
                    "screening"
                ]
            }
        }
    };


    const response =
        await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
            encodeURIComponent(
                GEMINI_API_KEY
            ),
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        requestBody
                    )
            }
        );


    /*
     * 不直接使用 response.json()。
     * 若 Gemini 回傳空內容或非 JSON，
     * 先保留原始文字，避免出現
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
                "Gemini 回應不是有效 JSON：",
                rawText
            );

            throw new Error(
                `Gemini 回應格式錯誤（HTTP ${response.status}）`
            );
        }
    }


    if (!response.ok) {

        throw new Error(
            data.error?.message ||
            `Gemini API Error ${response.status}`
        );
    }


    const text =
        data
            .candidates?.[0]
            ?.content
            ?.parts
            ?.find(
                part => part.text
            )
            ?.text;


    if (!text || !text.trim()) {

        console.error(
            "Gemini 沒有回傳文字內容：",
            JSON.stringify(data)
        );

        throw new Error(
            "Gemini 沒有回傳有效結果"
        );
    }


    try {

        return JSON.parse(text);

    } catch (parseError) {

        console.error(
            "Gemini 文字內容不是有效 JSON：",
            text
        );

        throw new Error(
            "Gemini 回傳格式不是有效 JSON"
        );
    }
}


/* =========================
   Server
========================= */

const server =
    http.createServer(
        async (req, res) => {

            /*
             * Health Check
             */

            if (
                req.method === "GET" &&
                req.url === "/api/health"
            ) {

                return sendJson(
                    res,
                    200,
                    {
                        ok: true,
                        service:
                            "ColorSafe EYE-AI"
                    }
                );
            }


            /*
             * Gemini Analysis
             */

            if (
                req.method === "POST" &&
                req.url === "/api/analyze"
            ) {

                try {

                    const body =
                        await readBody(req);

                    if (!body.trim()) {

                        return sendJson(
                            res,
                            400,
                            {
                                error:
                                    "請求內容為空"
                            }
                        );
                    }

                    let payload;

                    try {

                        payload =
                            JSON.parse(body);

                    } catch (parseError) {

                        return sendJson(
                            res,
                            400,
                            {
                                error:
                                    "請求 JSON 格式錯誤"
                            }
                        );
                    }


                    if (!payload.image) {

                        return sendJson(
                            res,
                            400,
                            {
                                error:
                                    "缺少影像資料"
                            }
                        );
                    }


                    const features = payload.features || {};

                    const result =
                        await analyzeWithGemini(
                            payload.image,
                            features
                        );

                    const sclera = features.color?.sclera || {};
                    const scleraReliable = sclera.reliable === true;
                    const yellowFlag =
                        scleraReliable && (
                            features.flags?.yellow === true ||
                            Number(sclera.bStar) > 12.0 ||
                            Number(sclera.yellowRatio) >= 12
                        );
                    const redFlag =
                        scleraReliable && (
                            features.flags?.red === true ||
                            Number(sclera.aStar) > 42.0 ||
                            Number(sclera.redRatio) >= 12
                        );

                    if (!scleraReliable) {
                        result.screening = result.screening || {};
                        result.screening.jaundice = {
                            status: "uncertain",
                            evidence: "眼白有效像素不足，無法以鞏膜色彩數值可靠判讀黃色特徵。"
                        };

                        // Sclera color failure must not erase visual findings such as
                        // stye, cataract-like opacity, or corneal arcus.
                        const visualDetected = ["stye", "cataract", "arcus", "conjunctivitis"]
                            .some(key => result.screening?.[key]?.status === "detected");

                        if (!visualDetected && result.level === "低風險") {
                            result.level = "中風險";
                        }

                        if (!visualDetected) {
                            result.desc =
                                (result.desc ? result.desc + " " : "") +
                                "另外，眼白有效像素不足，因此黃色鞏膜部分無法可靠判讀。";
                        }
                    }

                    result.screening = result.screening || {};

                    if (yellowFlag) {
                        result.screening.jaundice = {
                            status: "detected",
                            evidence: `鞏膜色彩分析達黃色提示條件（b*=${sclera.bStar ?? "N/A"}，黃色像素比例=${sclera.yellowRatio ?? "N/A"}%）。`
                        };
                    }

                    if (redFlag) {
                        result.screening.conjunctivitis = {
                            status: "detected",
                            evidence: `眼白/結膜色彩分析達紅色提示條件（a*=${sclera.aStar ?? "N/A"}，紅色像素比例=${sclera.redRatio ?? "N/A"}%）。`
                        };
                    }

                    if (yellowFlag) {

                        if (result.level === "低風險") {
                            result.level = redFlag ? "高風險" : "中風險";
                        }

                        if (!result.finding || !result.finding.includes("黃色")) {
                            result.finding =
                                "鞏膜區域出現較明顯的黃色色彩特徵。" +
                                (result.finding ? result.finding : "");
                        }

                        if (!result.desc || result.desc === "影像分析完成。") {
                            result.desc =
                                "系統在鞏膜區域觀察到計畫書設定的黃色影像提示條件；此結果僅代表影像特徵，不能單獨用來確診黃疸。";
                        }
                    }

                    if (redFlag && (!result.finding || !result.finding.includes("紅色"))) {
                        result.finding =
                            "眼部區域出現較明顯的紅色色彩特徵。" +
                            (result.finding ? result.finding : "");
                    }

                    return sendJson(
                        res,
                        200,
                        result
                    );

                } catch (error) {

                    console.error(
                        "Analysis error:",
                        error
                    );


                    return sendJson(
                        res,
                        500,
                        {
                            error:
                                error.message ||
                                "分析失敗"
                        }
                    );
                }
            }


            /*
             * Static
             */

            if (
                req.method === "GET"
            ) {

                return serveStatic(
                    req,
                    res
                );
            }


            res.writeHead(405);

            res.end(
                "Method Not Allowed"
            );
        }
    );


server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `ColorSafe EYE-AI running on port ${PORT}`
        );

    }
);
