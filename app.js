/*
 * Mobile interaction hotfix loader.
 * Load the last full application build, then install a capture-phase handler
 * so iOS taps on the analysis button cannot be swallowed by an overlay.
 */
(function () {
    const base = document.createElement("script");
    base.src = "https://raw.githubusercontent.com/hahahahahahaha1234-sys/Eye-/3c6963c9e6a798dd2086a681bb797fed8f9b082f/app.js";
    base.async = false;

    base.onload = function () {
        const button = document.getElementById("capture-btn");
        if (!button) return;

        button.type = "button";
        button.style.pointerEvents = "auto";
        button.style.touchAction = "manipulation";

        let handling = false;

        const forceAnalyze = async function (event) {
            if (handling) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }

            if (button.disabled) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            handling = true;

            /* Immediate visible acknowledgement, before any image work starts. */
            let modal = document.getElementById("analysis-modal");
            if (modal) {
                modal.classList.add("open");
                const text = document.getElementById("analysis-modal-text");
                if (text) text.textContent = "特徵分析中，請稍等……";
            }

            try {
                if (typeof window.runAnalysis !== "function") {
                    throw new Error("分析功能尚未載入，請重新整理頁面後再試一次。");
                }
                await window.runAnalysis();
            } catch (error) {
                console.error("capture hotfix:", error);
                if (modal) modal.classList.remove("open");
                button.disabled = false;
                alert("分析無法啟動：" + (error && error.message ? error.message : error));
            } finally {
                handling = false;
            }
        };

        /* Capture phase wins over any accidental element layered above/below it. */
        button.addEventListener("click", forceAnalyze, true);
    };

    base.onerror = function () {
        const button = document.getElementById("capture-btn");
        if (button) {
            button.disabled = false;
            button.addEventListener("click", function () {
                alert("程式載入失敗，請重新整理頁面後再試一次。");
            });
        }
    };

    document.head.appendChild(base);
})();
