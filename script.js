/* 全局設定 */
body {
    background-color: #000000;
    color: #ffffff;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    margin: 0;
    padding: 0;
    text-align: center;
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 30px;
    border-bottom: 1px solid #333333;
}

header h1 {
    font-size: 24px;
    margin: 0;
    letter-spacing: 2px;
}

/* 相機與掃描區 */
.camera-container {
    margin: 40px auto;
    width: 85%;
    max-width: 400px;
    height: 450px;
    border: 2px dashed #ffffff;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden; /* 確保相機畫面不會超出圓角邊框 */
}

/* 即時相機畫面 */
#camera-feed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1; /* 墊在底層 */
}

/* 將輔助線和文字拉到相機畫面上層 */
.focus-guide {
    display: flex;
    gap: 20px;
    z-index: 2;
}

.eye-box {
    width: 100px;
    height: 60px;
    border: 1px solid #ffffff; /* 改為純白更清楚 */
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0,0,0,0.5); /* 增加陰影以防背景太白看不見 */
}

.instruction {
    position: absolute;
    bottom: 20px;
    font-size: 14px;
    color: #ffffff;
    background-color: rgba(0, 0, 0, 0.6); /* 加上半透明黑底讓文字清晰 */
    padding: 8px 12px;
    border-radius: 8px;
    width: 80%;
    z-index: 2;
}

/* 按鈕設計 */
.action-area {
    margin-top: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
}

.primary-btn {
    background-color: #ffffff;
    color: #000000;
    border: none;
    padding: 15px 30px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 30px;
    cursor: pointer;
    width: 80%;
    max-width: 300px;
    transition: 0.3s;
}

.primary-btn:hover { background-color: #cccccc; }

.secondary-btn {
    background-color: #333333;
    color: #ffffff;
    border: none;
    padding: 15px 30px;
    font-size: 14px;
    border-radius: 10px;
    cursor: pointer;
    width: 80%;
    max-width: 300px;
}

.outline-btn {
    background-color: transparent;
    color: #ffffff;
    border: 1px solid #ffffff;
    padding: 10px 30px;
    font-size: 14px;
    border-radius: 10px;
    cursor: pointer;
}

.sub-text { font-size: 12px; color: #888888; }

/* 結果卡片區 */
.hidden { display: none !important; }

.result-card {
    margin: 40px auto;
    width: 85%;
    max-width: 400px;
    border: 1px solid #555555;
    border-radius: 20px;
    padding: 30px 20px;
    background-color: #0a0a0a;
}

/* 定格畫面畫布 */
.scanned-image-placeholder {
    width: 100%;
    height: 180px;
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 10px;
    margin: 20px 0;
    overflow: hidden;
}

#snapshot-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover; /* 讓拍下的畫面填滿框框 */
}
