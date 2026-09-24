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

你的任務不是診斷疾病。

你只能根據系統提供的影像特徵，
整理成一般使用者可以理解的「眼部初篩結果」。

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

重要限制：

- 不得宣稱使用者已經確診。
- 不得把單一色彩特徵直接等同疾病。
- 必須稱為「初篩」、「疑似特徵」或「影像特徵」。
- 若資料不足，應說明無法可靠判讀。
- 建議以進一步專業醫療評估為主。
- 不得自行創造不存在的檢測數值。

請只回傳 JSON：

{
    "level": "低風險",
    "finding": "主要觀察到的影像特徵",
    "desc": "以一般人能理解的方式說明",
    "advice": "下一步建議"
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
                "application/json"
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


    const data =
        await response.json();


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


    if (!text) {

        throw new Error(
            "Gemini 沒有回傳有效結果"
        );
    }


    try {

        return JSON.parse(text);

    } catch {

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


                    const payload =
                        JSON.parse(body);


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


                    const result =
                        await analyzeWithGemini(
                            payload.image,
                            payload.features || {}
                        );


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
