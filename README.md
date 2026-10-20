# 企業老闆經營儀表板

以繁體中文呈現營業額、支出、獲利、營收趨勢、產品銷售占比與前五大客戶的展示網站

預設內容使用模擬數據。可在頁面匯入 Excel、舊版 Excel 或 CSV 檔，資料只在使用者瀏覽器處理，不會上傳至伺服器

## 使用方式

直接開啟 `index.html`，或將本專案部署於 GitHub Pages

可切換近 6 個月／近 12 個月趨勢、下載 Excel 範本、匯入營收資料，並匯出目前報表 CSV

第一張工作表必須包含「月份」和「營收」欄位。可選擇加入「支出」、「產品」和「客戶」欄位，更新對應的摘要、產品占比及客戶排名。支援 `YYYY-MM`、`YYYY/MM` 或 Excel 日期格式

Excel 檔案以 SheetJS Community Edition 讀取，載入方式參考 [官方瀏覽器安裝說明](https://docs.sheetjs.com/docs/getting-started/installation/standalone/)

GitHub Pages 會在 master 分支更新後重新部署

## 設計參考

資訊架構參考 [Start Bootstrap 的 SB Admin 2](https://github.com/StartBootstrap/startbootstrap-sb-admin-2)，該專案採 [MIT License](https://github.com/StartBootstrap/startbootstrap-sb-admin-2/blob/master/LICENSE)

本站的 HTML、CSS、JavaScript 為獨立製作，沒有複製範本原始碼
