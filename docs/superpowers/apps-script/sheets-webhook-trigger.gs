// ============================================================
// Google Sheets → erxes 양방향 동기화 Apps Script
// ============================================================
// 설정 방법:
// 1. 이 파일 전체를 복사해서 스프레드시트 > 확장 프로그램 > Apps Script에 붙여넣기
// 2. WEBHOOK_URL과 WEBHOOK_SECRET을 실제 값으로 변경
// 3. 저장 (Ctrl+S)
// 4. 트리거 등록 (단순 트리거는 UrlFetchApp 사용 불가 → 설치형 트리거 필수):
//    - 왼쪽 시계 아이콘(트리거) 클릭
//    - 트리거 추가
//    - 실행할 함수: onSheetEdit
//    - 이벤트 소스: 스프레드시트에서
//    - 이벤트 유형: 편집 시
// 5. 저장 → 구글 계정 권한 승인
//
// 주의사항:
// - 다중 셀 붙여넣기 시 트리거가 한 번만 발생할 수 있음 (단일 셀 편집 기준으로 설계됨)
// - WEBHOOK_URL은 반드시 HTTPS여야 함
// ============================================================

var WEBHOOK_URL = 'https://api.okrbiz.com/sales/sheets-webhook'; // 실제 서버 URL로 변경
var WEBHOOK_SECRET = 'YOUR_SECRET_HERE'; // 환경변수 SHEETS_WEBHOOK_SECRET 값으로 변경

var DEAL_ID_COL_HEADER = 'deal_id';
var READONLY_COLUMNS = ['첨부파일1', '첨부파일2', '첨부파일3', 'deal_id', 'erxes_updated_at'];

function onSheetEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();

    // 헤더 행(1행) 편집 무시
    if (row === 1) return;

    // 헤더 읽기
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return;
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var columnName = String(headers[col - 1] || '');

    // 빈 컬럼명 또는 읽기 전용 컬럼 무시
    if (!columnName || READONLY_COLUMNS.indexOf(columnName) !== -1) return;

    // deal_id 컬럼 위치 찾기
    var dealIdColIndex = headers.indexOf(DEAL_ID_COL_HEADER);
    if (dealIdColIndex < 0) return;

    // 현재 행의 deal_id 읽기
    var dealId = String(sheet.getRange(row, dealIdColIndex + 1).getValue() || '');
    if (!dealId) return;

    var payload = {
      dealId: dealId,
      columnName: columnName,
      newValue: String(e.value !== undefined ? e.value : ''),
      sheetEditedAt: new Date().toISOString()
    };

    var response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Sheets-Secret': WEBHOOK_SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    // 실패 시 Apps Script 실행 로그에 기록 (Apps Script 편집기 > 실행 로그에서 확인)
    var code = response.getResponseCode();
    if (code !== 200) {
      console.log('[sheets-webhook] 실패: HTTP ' + code + ' / ' + response.getContentText());
    }
  } catch (err) {
    console.log('[sheets-webhook] 오류: ' + String(err));
  }
}
