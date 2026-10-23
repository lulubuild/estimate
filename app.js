/* 웹 견적요청 페이지 동작 — index.html이 이 파일을 읽는다(D단계 F-14, 2026-10-14).
   페이지 안에 글로 넣은 스크립트를 이 파일로 옮겨, 보안 설정(CSP)에서 'unsafe-inline'을 뺐다 — 주입된 글이 스크립트로 돌지 않게.
   ⚠️ 이 파일 안에 HTML 문자열로 <script>를 만들지 않는다. 고칠 때 index.html의 app.js?v= 값을 바꿔 옛 판이 캐시에서 섞이지 않게 한다. */
/* ════════════════════════════════════════════════════════════════════
   설정 — 이 블록만 고치면 됩니다
   ════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  // 앱의 '웹 문의 연동 설정 → Web App 주소'와 같은 주소 (…/exec).
  // 비워 두면 미리보기 모드로 동작합니다(전송하지 않음).
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzRtjXk_fWwx6yxK_Vonj8sMRMild_j9hOrgCNXh34qBLupLQZqUnyu0VkwpAPULXn0/exec",
  COMPANY_NAME: "룰루타일",
  COMPANY_PHONE: "010-9896-8980",
  PRIVACY_URL: "https://lulubuild.github.io/estimate/privacy.html", // 개인정보처리방침 페이지 주소 (있으면 링크 표시)
  RETENTION: "문의일로부터 1년 (계약 시 관련 법령에 따른 기간)",
  // 동의 기록에 남기는 처리방침 판(시행일) — privacy.html 머리의 시행일과 같게 바꾼다.
  POLICY_VERSION: "2026-10-14",
  // 공지 중인 다음 처리방침(시행 7일 전 공지 — 처리방침 10항). 시행 시각부터 판이 바뀌고 이메일 칸(선택)이 보인다(2026-10-15).
  NEXT_POLICY: { version: "2026-10-22", from: "2026-10-22T00:00:00+09:00" },
  // 그다음 처리방침 — [선택] 문의 사례 · 견적서 공개 동의(SNS 홍보, 2026-10-20 사장님 결정). 시행 시각부터 동의 카드가 보이고 판이 바뀐다.
  // ⚠️ 시행일을 바꾸면 privacy.html(머리 · '4의2') · Apps Script SNS게시.gs SNS.POLICY_VERSION도 같은 날로(7일 전 공지 — 처리방침 10항).
  SNS_POLICY: { version: "2026-10-28", from: "2026-10-28T00:00:00+09:00" },
  // 기기 구분 번호를 만들어 보내기 시작한 때 — 2026-10-14 처리방침부터(이미 시행 중).
  DEVICE_FROM: "2026-10-14T00:00:00+09:00",
  MAX_PHOTOS: 5,
  // 전체 평형을 그대로 쓰는 공간 — 공간 평형 칸을 두지 않는다(앱 EstimateDraft.wholeHouseRoomName).
  WHOLE_HOUSE_ROOM: "공용(전체)",
};

/* 공간 · 공종 · 상품 — 앱 '평면도 관리'의 **웹 견적 페이지에 반영**(4008)이 Apps Script에 올린 설정을
   페이지가 열릴 때 읽어 쓴다. 아래 DEFAULT_WEB은 그 설정을 아직 못 읽었을 때(처음 · 연결 실패)의 기본값이다.
   · rooms — 앱 기본 공간 카드(EstimateDraft.defaultRoomNames)
   · trades · products — 앱 '단가표 관리'의 공종 · 항목명과 **글자까지 같아야** 앱이 그 항목만 담는다.
     상품을 고르지 않은 공종은 앱이 그 공종의 항목을 전부 담는다. 가격은 싣지 않는다.
   · categories — 앱 공간 분류와 그 분류에서 안 쓰는 공종(4107). 공간 카드 → 분류 찾기는 앱 RoomTradeScope와 같은 규칙.
     안 쓰는 공종은 그 공간 카드에 보이지 않고 전송에서도 빠진다(사용자 결정 2026-09-29 — 완전히 숨김).
   2026-09-29 기본값: 단가표(시공 항목 + 자재 DB Rev1 135건) · 도배 · 마루는 공용(전체)에서만. */
const DEFAULT_WEB = {
  v: 1,
  rooms: ["거실", "공용(전체)", "발코니1", "안방", "방1", "방2", "화장실1", "화장실2", "주방", "현관"],
  trades: ["도배", "도장", "마루", "목공", "문·문틀", "욕실", "전기·조명", "제작가구", "창호", "철거·청소", "타일", "필름"],
  products: {
    "도배": [["디아망 실크벽지", "LX Z:IN · 106cm*1560cm"], ["베스띠 실크벽지", "LX Z:IN · 106cm*1560cm"], ["베이스(테라피) 실크벽지", "LX Z:IN · 106cm*1560cm"], ["휘앙세 장폭합지", "LX Z:IN · 93cm*1775cm"], ["프리모 실크벽지", "개나리벽지 · 106cm*1560cm"], ["로하스 실크벽지", "개나리벽지 · 106cm*1560cm"], ["아트북 실크벽지", "개나리벽지 · 106cm*1560cm"], ["파사드 실크벽지", "신한벽지 · 106cm*1560cm"], ["스케치 실크벽지", "신한벽지 · 106cm*1560cm"], ["아이리스 장폭합지", "신한벽지 · 93cm*1775cm"]],
    "도장": [["숲으로 웰빙 수성 내부용", "KCC · 18L, 수성, 무광, 백색, 실내 벽 · 천장(벽지 · 석고보드), 고급형"], ["숲으로 에이스 수성 내부용", "KCC · 18L, 수성, 무광, 백색, 실내 벽 · 천장, 표준형"], ["숲으로 에코플러스 수성 내부용", "KCC · 18L, 수성, 무광, 백색(K), 실내 벽 · 천장, 보급형"], ["순앤수 원터치 수성 내부용", "노루페인트 · 16L, 수성, 무광, 백색, 실내 벽 · 천장, 1회 도장 고급형(18L 없음)"], ["순앤수 수성 내부용 KS 2급", "노루페인트 · 18L, 수성, 무광, 백색, 실내 벽 · 천장, 표준형(KS M 6010 2종 2급)"], ["순앤수 100 수성 내부용", "노루페인트 · 18L, 수성, 무광, 백색, 실내 벽 · 천장, 보급형"], ["아이럭스 멀티플랫 수성", "삼화페인트 · 4L, 수성, 무광, 백색, 실내 벽 · 벽지, 고급형(18L 없음)"], ["아이생각 수성 내부 프로", "삼화페인트 · 18L, 수성, 무광, 백색, 실내 벽 · 천장, 보급형"], ["숲으로 홈앤 멀티멜 수용성 에나멜", "KCC · 3.78L, 수용성 에나멜, 반광, 백색, 문 · 몰딩 · 가구 · 목재 · 철재"], ["숲으로 올인원 다용도 수성", "KCC · 3.78L, 수성 다용도(젯소 없이), 반광, 백색, 문 · 창틀 · 몰딩 · 목재 · 철재"], ["순앤수 올커버 다용도 수성", "노루페인트 · 4L, 수성 다용도, 반광, 백색, 방문 · 몰딩 · 가구 · 목재 · 철재 · 시트지"], ["멀티플러스 다용도 수성", "노루페인트 · 3.8L, 수성 다용도, 반광, 백색, 가구 · 방문 · 목재 · 철재"], ["아이럭스 올코팅 수성 에나멜", "삼화페인트 · 4L, 수성 에나멜, 백색, 몰딩 · 가구 · 방문 · 목재 · 철재(광도 선택)"], ["홈스타 파스텔OK 플러스 멀티 수성", "삼화페인트 · 4L, 수성 멀티, 반광, 백색, 방문 · 가구 · 벽지"]],
    "마루": [["에디톤 스톤 5T (450×900)", "LX Z:IN · 450*900*5T, 4장/박스(1.62㎡·약 0.5평)"], ["에디톤 스톤 스퀘어 5T (600×600)", "LX Z:IN · 600*600*5T, 4장/박스(1.44㎡)"], ["에디톤 마루 5T (우드 180×1220)", "LX Z:IN · 180*1220*5T, 7장/박스(1.54㎡)"], ["나투스강 7.5T 강마루", "동화자연마루 · 95*800*7.5T, 42장/박스(3.19㎡)"], ["나투스진 그란데 7T 강마루", "동화자연마루 · 325*810*7T, 12장/박스(3.16㎡)"], ["나투스진 테라 7.5T 강마루", "동화자연마루 · 161*1215*7.5T, 16장/박스(3.13㎡)"], ["구정강 7.5T 강마루", "구정마루 · 94*800*7.5T, 1박스 3.23㎡(약 1평)"], ["그랜드텍스쳐 165 강마루", "구정마루 · 165*1200*7.5T, 16장/박스(3.17㎡)"], ["마뷸러스 젠 대리석 강마루", "구정마루 · 597*597*8.7T, 9장/박스(3.2㎡)"]],
    "목공": [["몰딩/걸레받이 교체", "거실 기준"], ["붙박이장 제작", "침실 기준"], ["천장 돔 시공", "욕실 기준"], ["신발장 제작/교체", "현관 기준"], ["중문 설치", "현관 기준"], ["방문 교체(문틀 포함)", "공용(전체) 기준"]],
    "문·문틀": [["중문 - 3연동", "3연동 슬라이딩"], ["중문 - 스윙·슬림도어", "여닫이·원슬라이딩"], ["방문 교체 - ABS 도어", "문틀 포함"], ["에넥스 피아블 안전 비대칭 3연동 중문", "에넥스 · 3연동 슬라이딩 오픈형, 폭 1000~1500 · 높이 ~2300, 알루미늄, 아쿠아 · 모루 · 브론즈 유리, 설치 포함(전국 무료시공), 철거 별도"], ["에넥스 에반 원슬라이딩 중문", "에넥스 · 원슬라이딩 디바이딩, 폭 800~1300, 알루미늄, 망입 · 아쿠아 · 브론즈 · 샤틴 유리, 설치 포함(전국 무료시공), 철거 별도"], ["에넥스 비바 우드랩핑 원슬라이딩 중문", "에넥스 · 원슬라이딩 오픈형, 폭 1000~1200, 알루미늄+우드랩핑, 설치 포함(서울 · 경기 무료시공, 그 밖은 별도 가능), 철거 별도"], ["에넥스 클라세 리얼아치 양개 스윙 중문", "에넥스 · 양개 스윙(비대칭 아치), 폭 1000~1600 · 높이 ~2300, 알루미늄, 아쿠아 · 모루 · 브론즈 유리, 설치 포함(전국 무료시공), 철거 별도"], ["한샘 라이트 3연동 중문 오픈 · 고시형", "한샘 · 3연동 슬라이딩 오픈형 · 고시형, 폭 1251~1500, 알루미늄 슬림프레임, 기본유리 5T, 설치 포함(전국 무료시공, 보양 · 폐기처리 포함) · 조사 판매처 2곳"], ["한샘 라이트 3연동 중문 디바이딩형", "한샘 · 3연동 슬라이딩 디바이딩(유리 분할), 폭 1251~1500, 알루미늄 슬림프레임, 기본유리, 설치 포함(전국 무료시공) · 조사 판매처 2곳"], ["한샘 유닛슬라이딩 기본형 중문", "한샘 · 원슬라이딩 기본형, 중형 폭 901~1300, 일반유리, 설치 포함(무료 1일 시공) · 조사 판매처 2곳"], ["영림 초슬림 3연동 중문 오픈형", "영림 · 3연동 슬라이딩 오픈형, 기본색(화이트 · 우드), 유리 5종, 설치 포함(영림 본사직영 맞춤시공), 기본 크기 확인 못 함 · 조사 판매처 2곳"], ["영림 초슬림 3연동 중문 유리고시형", "영림 · 3연동 슬라이딩 유리고시형, 기본색(화이트 · 우드), 유리 5종, 설치 포함(영림 본사직영 맞춤시공), 기본 크기 확인 못 함 · 조사 판매처 2곳"], ["영림 슬림슬라이딩 중문 오픈형", "영림 · 원슬라이딩 오픈형, 화이트 · 우드, 유리 6종, 설치 포함(영림 본사직영 맞춤시공), 기본 크기 확인 못 함 · 조사 판매처 2곳"], ["영림 슬림슬라이딩 중문 유리고시형", "영림 · 원슬라이딩 유리고시형, 화이트 · 우드, 유리 6종, 설치 포함(영림 본사직영 맞춤시공), 기본 크기 확인 못 함 · 조사 판매처 2곳"], ["예림 EZ 이지도어 민자 + 발포문틀 세트", "예림 · ABS 여닫이 문짝(EZ-001 민자)+PVC 발포문틀 110바, 기본 1000*2100 이하, 자재만, 경첩 · 손잡이 별도 · 조사 판매처 2곳"], ["예림 EZ 이지도어 민자 + 발포슬림문틀 세트", "예림 · ABS 여닫이 문짝(EZ 민자)+발포슬림문틀 110mm(슬림문선), 기본 1000*2100 이하, 자재만, 경첩 · 손잡이 별도 · 조사 판매처 2곳"], ["영림 ABS 민자 YA-07 + 발포문틀 세트", "영림 · ABS 여닫이 문짝(YA-07 민자)+영림 PVC 발포문틀 110바, 자재만, 경첩 · 손잡이 별도 · 조사 판매처 1곳"], ["영림 더도어 민자 TA-04 + 발포문틀 세트", "영림 · ABS 보급형 문짝(더도어 TA-04 민자)+영림 PVC 발포문틀 110바, 자재만, 경첩 · 손잡이 별도 · 조사 판매처 1곳"], ["우딘 내추럴 민자 + 발포문틀 세트", "우딘 · ABS 여닫이 문짝(내추럴 민자)+우딘 PVC 발포문틀 110바, 기본 1000*2100 이하, 자재만, 경첩 · 손잡이 별도 · 조사 판매처 1곳"], ["우딘 민자 + 목재슬림문틀 세트", "우딘 · ABS 여닫이 문짝(민자)+목재슬림문틀 110mm · 슬림문선 10mm, 기본 1000*2100 이하, 자재만, 경첩 · 손잡이 별도 · 조사 판매처 1곳"]],
    "욕실": [["욕실 전체 리모델링 패키지", "3~5㎡ 1개소, 철거·타일·도기·수전"], ["양변기 교체", "자재+설치"], ["세면대 교체", "자재+설치"], ["CC-735 림리스 투피스 치마형 양변기", "대림바스 · 400*690*740mm, 투피스 치마형 림리스, 평균 5L, 바닥배수 305mm, 시트·양부속 포함"], ["CC-766 투피스 양변기", "대림바스 · 400*740*700mm, 투피스 수로노출형, 평균 6L, 바닥배수 305mm, 시트·양부속 포함"], ["CC-214 원피스 치마형 양변기", "대림바스 · 400*690*550mm, 원피스 치마형, 5L, 바닥배수 305mm, 시트·양부속 포함"], ["웨이브S 초절수 투피스 양변기 C319000A", "아메리칸스탠다드 · 380*680*700mm, 투피스 치마형 파워림, 바닥배수 305mm, 슬로우시트·양부속 포함"], ["휴스턴 투피스 양변기 C338900A", "아메리칸스탠다드 · 380*700*720mm, 투피스 치마형, 6L 이하, 바닥배수 305mm, 시트·부속 포함"], ["보스톤 원피스 양변기 C209300C", "아메리칸스탠다드 · 390*700*510mm, 원피스 치마형, 6L 이하, 바닥배수 305mm, 시트·부속 포함"], ["아르노 라운드 반다리 세면기 CL-384", "대림바스 · 505*445*380mm, 반다리 일체형, 1홀, 도기만(수전·폽업·트랩 별도)"], ["사각 반다리 세면기 CL-370", "대림바스 · 505*445*760mm, 반다리 일체형, 1홀, 도기만(수전·폽업·트랩 별도)"], ["슬림 탑볼 세면기 CL-826", "대림바스 · 480*370*135mm, 탑볼형, 도기만(수전·폽업 별도)"], ["플랫 반다리 세면기 CCASF516", "아메리칸스탠다드 · 545*455*410mm, 반다리 일체형, 1홀, 도기만(수전·폽업·트랩 별도)"], ["웨이브R 반다리 세면기 C151500L", "아메리칸스탠다드 · 540*460*410mm, 반다리 일체형, 1홀, 도기만(수전·폽업·트랩 별도)"], ["시그니처 탑볼 세면기 CCAS0628", "아메리칸스탠다드 · 551*399*100mm, 탑볼형, 도기만(수전·폽업 별도)"], ["컨셉큐브 언더카운터 세면기 CCAS0451", "아메리칸스탠다드 · 560*470*200mm, 언더카운터형, 수전 구멍 없음(상판 설치), 도기만"], ["원홀 세면수전 DL-YL6A10", "대림바스 · 원홀 대붙이, 냉온수 혼합, 크롬, 폽업 별도"], ["세면·샤워 겸용 수전 DL-YB6A15", "대림바스 · 4인치(102mm) 2홀 대붙이, 3홀 세면기 겸용, 냉온수 혼합"], ["샤워욕조 수전 DL-YB6A13", "대림바스 · 벽붙이, 샤워헤드·호스 1.5m·행거 포함"], ["바트라 수납형 레인샤워 BFB-720", "대림바스 · 벽붙이 선반형, 해바라기 헤드+핸드샤워 2WAY"], ["큐브P 원홀 세면수전 FA1611", "아메리칸스탠다드 · 원홀 대붙이, 크롬, 폽업 별도"], ["리비어 원홀 세면수전 FA1614", "아메리칸스탠다드 · 원홀 대붙이, 크롬 유광, 황동"], ["큐브P 샤워욕조 수전 FB2811", "아메리칸스탠다드 · 벽붙이 샤워욕조, 크롬, 냉온수 혼합"], ["모닝 샤워수전 HY-119", "한양수전 · 벽붙이 샤워욕조, 냉온수 혼합, 호스 포함"], ["모닝 4인치 세면수전 HY-319", "한양수전 · 4인치(102mm) 2홀 대붙이, 냉온수 혼합"]],
    "전기·조명": [["LED 등기구 교체", "자재+설치"], ["콘센트·스위치 증설·교체", "1개소 기준"], ["오스람 LED 원형 프레임 방등 60W", "오스람(레드밴스) · LED 60W, 원형 프레임 Ø500mm, 주광색 6500K, 방등"], ["레드밴스 스마트 와이파이 원형 방등 60W", "오스람(레드밴스) · LED 60W, 500*500*75mm, 2700~6500K 색변환 · 밝기조절, WiFi+리모컨, 방등"], ["레드밴스 스마트 와이파이 직사각 방등 70W", "오스람(레드밴스) · LED 70W, 705*500*65mm, 2700~6500K 색변환 · 밝기조절, WiFi+리모컨, 방등 · 작은 거실등"], ["번개표 LED 원형 방등 50W", "번개표(금호전기) · LED 50W, 450*450*95mm, 주광색 6500K, 원형 아크릴, 방등(Q5065-R45YO)"], ["번개표 LED 기쁨 사각 방등 50W", "번개표(금호전기) · LED 50W, 520*520*65mm, 주광색 6500K, 아크릴 사각, 방등(MX3013-C5065)"], ["번개표 LED 행복 시스템 거실등 100W", "번개표(금호전기) · LED 100W, 720*700*80mm, 주광색 6500K, 직사각 시스템 거실등(Q10065-L72TO)"], ["장수램프 LED 퓨어스마트 사각 방등 60W", "장수램프 · LED 60W, 520*520*65mm, 2700~6500K 색변환 · 밝기조절 · 타이머, 리모컨, 방등"], ["장수램프 LED 퓨어스마트 거실등 180W", "장수램프 · LED 180W, 1235*705*70mm, 2700~6500K 색변환 · 밝기조절 · 타이머, 리모컨, 거실등"], ["장수램프 LED 다운라이트 3인치 5W", "장수램프 · LED 5W, 3인치 타공 75mm, 주광 · 주백 · 전구 선택, 확산형 매입등"], ["장수램프 LED 다운라이트 6인치 15W 국산형", "장수램프 · LED 15W, 6인치, 주광 · 전구 선택, 확산형 매입등, 국산"], ["더쎈 LED 3인치 다운라이트 5W 직회전 COB", "더쎈(동성조명) · LED 5W, 3인치 타공 75mm, 주광 · 주백 · 전구 선택, 직회전 COB 집중형"], ["더쎈 LED 에코 라늄 6인치 다운라이트 15W", "더쎈(동성조명) · LED 15W, 6인치 타공 150mm, 3000 · 3500 · 4000 · 6500K 선택, 플리커프리 매입등"], ["번개표 LED 3인치 회전 매입등 5W", "번개표(금호전기) · LED 5W, 3인치 타공 75mm, 주광 · 전구 선택, 회전형 일체형(MR16 할로겐 대체)"], ["번개표 LED 방습 6인치 다운라이트 15W", "번개표(금호전기) · LED 15W, 6인치 타공 150mm, 주광, 방습 · 욕실 겸용"], ["르그랑 아펠라 1구 스위치", "르그랑 · 1구 1로(단로), 16A 250V, 화이트, 플레이트 포함"], ["르그랑 아펠라 2구 스위치", "르그랑 · 2구 1로(단로), 16A 250V, 화이트, 플레이트 포함"], ["르그랑 아펠라 3구 스위치", "르그랑 · 3구 1로(단로), 16A 250V, 화이트, 플레이트 포함"], ["르그랑 아펠라 2구 콘센트", "르그랑 · 2구 접지 매입 콘센트(세로), 16A 250V, 화이트, 플레이트 포함"], ["나노 오딧세이 1구 스위치", "나노전기 · 1구 1로, 무램프, 16A 250V, 화이트, 플레이트 포함"], ["나노 오딧세이 2구 스위치", "나노전기 · 2구 1로, 무램프, 16A 250V, 화이트, 플레이트 포함"], ["나노 오딧세이 2구 콘센트", "나노전기 · 2구 접지 매입 콘센트(세로), 16A 250V, 화이트, 플레이트 포함"], ["제일 디아트 1구 스위치", "제일전기 · 1구 1로(단로), 16A 250V, 화이트, 76*123mm 플레이트 포함"], ["제일 디아트 2구 스위치", "제일전기 · 2구 1로(단로), 16A 250V, 화이트, 76*123mm 플레이트 포함"], ["제일 디아트 2구 콘센트", "제일전기 · 2구 접지 매입 콘센트(세로), 16A 250V, 화이트, 플레이트 포함"]],
    "제작가구": [["주방가구 일체 (상·하부장+상판)", "실측 길이 1m 기준"], ["붙박이장·시스템장", "높이 2.4m 기준, 1자=0.303m"]],
    "창호": [["샤시 교체(이중창)", "침실 기준"], ["발코니 샤시 교체", "발코니/베란다 기준"], ["아파트 전체 창호 교체 (30평대)", "PVC 이중창, 전체 교체"], ["방충망 교체", "창 1짝 기준"]],
    "철거·청소": [["실내 전체 철거 (폐기물 포함)", "마감재 전체 철거"], ["입주청소", "준공·입주청소"]],
    "타일": [["주방 벽타일 시공", "주방 기준"], ["욕실 벽/바닥 타일 시공", "욕실 기준"], ["타일 시공비 - 벽 (자재 별도)", "압착·떠발이 공임"], ["타일 시공비 - 바닥 (자재 별도)", "압착 공임"], ["포세린 타일 자재 600×600", "600각 포세린(자재만)"], ["줄눈(에폭시) 시공", "욕실 1개소 기준"], ["ARE 36001 크림 벽타일 (300×600)", "벳센타일 · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["ARE 36002 아몬드 벽타일 (300×600)", "벳센타일 · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["ARE 36003 비앙코 벽타일 (300×600)", "벳센타일 · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["ARE 36004 그리지오 벽타일 (300×600)", "벳센타일 · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["WT3606 백색 마블 벽타일 (300×600)", "베리굿타일앤스톤 · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["WT36M06 아이보리 벽타일 (300×600)", "베리굿타일앤스톤 · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["WT3604 라이트베이지 벽타일 (300×600)", "베리굿타일앤스톤 · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["CW 7001 화이트 유광 서브웨이 벽타일 (300×600)", "CW·WM(수입) · 300*600, 8장/박스(1.44㎡), 도기질 유광"], ["CW 7003 진그레이 유광 서브웨이 벽타일 (300×600)", "CW·WM(수입) · 300*600, 8장/박스(1.44㎡), 도기질 유광"], ["WM 38000M 백색 무광 벽타일 (300×600)", "CW·WM(수입) · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["WM 37109M 우드스틱 라이트그레이 벽타일 (300×600)", "CW·WM(수입) · 300*600, 8장/박스(1.44㎡), 도기질 무광"], ["비바 베이지 포세린 (600×600)", "화신세라믹 · 600*600, 4장/박스(1.44㎡), 포세린 무광"], ["비바 블랑코 포세린 (600×600)", "화신세라믹 · 600*600, 4장/박스(1.44㎡), 포세린 무광"], ["66508 화이트 테라조 포세린 (600×600)", "화신세라믹 · 600*600, 4장/박스(1.44㎡), 포세린 무광"], ["테라조 컬러스 포세린 (600×600)", "화신세라믹 · 600*600, 4장/박스(1.44㎡), 포세린 무광"], ["PER6008 블랙 테라조 포세린 (600×600)", "베리굿타일앤스톤 · 600*600, 4장/박스(1.44㎡), 포세린 무광"], ["PER6003 그레이 테라조 포세린 (600×600)", "베리굿타일앤스톤 · 600*600, 4장/박스(1.44㎡), 포세린 무광"], ["LECCE 01 라이트그레이 포세린 (600×600)", "베리굿타일앤스톤 · 600*600, 4장/박스(1.44㎡), 포세린 무광"], ["VG3309 욕실 바닥 자기질 (300×300)", "베리굿타일앤스톤 · 300*300, 16장/박스(1.44㎡), 자기질 무광"], ["GGK9394 욕실 바닥 논슬립 (300×300)", "이누스(아이에스동서) · 300*300, 16장/박스(1.44㎡), 국산 자기질 무광 논슬립"], ["GGK8394 욕실 바닥 논슬립 (300×300)", "이누스(아이에스동서) · 300*300, 16장/박스(1.44㎡), 국산 자기질 무광 논슬립"], ["비바 그레이 포세린 (600×1200)", "화신세라믹 · 600*1200, 2장/박스(1.44㎡), 포세린 무광 9.5T"], ["NOVA 포세린 (600×1200)", "베리굿타일앤스톤 · 600*1200, 2장/박스(1.44㎡), 포세린 무광"], ["LC 스톤챗 화이트 포세린 (600×1200)", "화신세라믹 라우체 · 600*1200, 2장/박스(1.44㎡), 포세린 무광 컬러바디"]],
    "필름": [["방문+문틀 필름 시공", "문짝+문틀 1틀"], ["현관문 필름 시공", "실내측 1짝"], ["베니프 우드 EW 시리즈", "LX Z:IN · 1220mm*50m 롤, 비방염(방염판 CW), 예: EW609 월넛"], ["베니프 우드 EGM 시리즈", "LX Z:IN · 1220mm*50m 롤, 비방염(방염판 RGM), 페인티드 우드, 예: EGM05"], ["베니프 프리미엄우드 NE 시리즈", "LX Z:IN · 1220mm*50m 롤, 비방염(방염판 NW), 예: NE041 화이트오크"], ["베니프 솔리드 ES 시리즈", "LX Z:IN · 1220mm*50m 롤, 비방염(방염판 RS), 예: ES130 화이트"], ["베니프 미스티 저광 솔리드 SM 시리즈", "LX Z:IN · 1220mm*50m 롤, 비방염, 저광 솔리드, 예: SM016"], ["베니프 솔리드 방염 RS 시리즈", "LX Z:IN · 1220mm*50m 롤, 방염, 예: RS130 화이트"], ["보닥 스탠다드우드 W 시리즈", "현대L&C · 1220mm*50m 롤, 비방염, 예: W933"], ["보닥 오리진우드 SPW 시리즈", "현대L&C · 1220mm*50m 롤, 비방염, 프리미엄 우드, 예: SPW45"], ["보닥 솔리드 S 시리즈", "현대L&C · 1220mm*50m 롤, 비방염, 예: S244 코튼화이트"], ["보닥 솔리드 방염 S 시리즈", "현대L&C · 1220mm*50m 롤, 방염, 예: S244"], ["보닥 슈퍼매트 SMT 시리즈", "현대L&C · 1220mm*50m 롤, 비방염, 프리미엄 무광, 예: SMT16"], ["영림 우드 PW 시리즈", "영림 · 1220mm*25m 롤, 비방염, 예: PW957"], ["영림 우드 방염 FPW 시리즈", "영림 · 1220mm*25m 롤, 방염, 예: FPW835"], ["영림 솔리드 PS 시리즈", "영림 · 1220mm*25m 롤, 비방염, 예: PS010 중백색"], ["영림 소프트매트 PSM 시리즈", "영림 · 1220mm*25m 롤, 비방염, 프리미엄 무광, 예: PSM190 포슬린"]],
  },
  // 단일 선택 공종(앱 '공종 설정' 5301, 2026-10-09) — 한 공간에 상품 1개만. 나머지는 중복 선택(여러 개).
  single: ["도배", "마루"],
  // 지금 규칙: 도배 · 마루는 공용(전체)에서만 — 앱 4107에서 정해 반영하면 그 값으로 바뀐다.
  categories: [
    { name: "거실", excluded: ["도배", "마루"] },
    { name: "주방", excluded: ["도배", "마루"] },
    { name: "침실", excluded: ["도배", "마루"] },
    { name: "욕실", excluded: ["도배", "마루"] },
    { name: "현관", excluded: ["도배", "마루"] },
    { name: "발코니/베란다", excluded: ["도배", "마루"] },
    { name: "공용(전체)", excluded: [] },
  ],
};
/* ════════════════════════════════════════════════════════════════════ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const DRAFT_KEY = "estimate-request-draft-v1";
/* 요청사항 초안 — 탭을 닫으면 사라지는 저장소(F-20). 평형 · 희망일 · 고른 공간은 7일 초안(DRAFT_KEY)에 그대로. */
const NOTE_KEY = "estimate-request-note-v1";

/* 다른 사이트 틀(iframe) 안에서는 보내지 않는다(F-14) — 속인 화면 위에 이 페이지를 투명하게 얹어 누르게 하는 수법(클릭재킹) 막기.
   GitHub Pages는 frame-ancestors 머리를 달 수 없어 페이지가 스스로 본다. 같은 사이트 틀은 그대로. */
const framedByOther = (() => {
  try { return window.top !== window.self && window.top.location.origin !== location.origin; }
  catch { return true; }   // 다른 사이트 틀이면 top.location을 읽지 못한다
})();

/* 기기 구분 번호 — 이 브라우저에 한 번 만든 무작위 값(이름 · 연락처와 무관). 같은 기기에서 오는 반복 · 허위 접수를
   Apps Script가 세고, 업체가 앱에서 차단할 때 쓴다(2026-10-07). 처리방침 시행(DEVICE_FROM) 전에는 만들지도 보내지도 않는다.
   ⚠️ 초안 지우기(clearDraft) · 새 요청 작성에서 지우지 않는다 — 같은 기기를 알아보는 값이다. */
const DEVICE_KEY = "estimate-device-v1";
let memoryDeviceId = "";
const policyNextActive = () => Date.now() >= Date.parse(CONFIG.NEXT_POLICY.from);
const snsPolicyActive = () => Date.now() >= Date.parse(CONFIG.SNS_POLICY.from);
const policyVersion = () => snsPolicyActive() ? CONFIG.SNS_POLICY.version : policyNextActive() ? CONFIG.NEXT_POLICY.version : CONFIG.POLICY_VERSION;
/* 공개용 지역(2026-10-20) — 주소 검색(카카오)이 준 시 · 도 · 시 · 군 · 구만. 직접 고쳐 적으면 비운다(Apps Script가 주소 글에서 다시 찾는다).
   브라우저에 저장하지 않는다. */
let addrRegion = { sido: "", sigungu: "" };
const deviceActive = () => Date.now() >= Date.parse(CONFIG.DEVICE_FROM);
/* 이메일(선택, 2026-10-15) — 처리방침(2026-10-22) 시행부터 칸이 보이고 보낸다. 담당자가 확인한 견적서 PDF를 받는 곳.
   형식은 Apps Script(emailOf_) · 앱(CustomerSend.isValidEmail)과 같은 규칙. 초안(브라우저)에는 저장하지 않는다(개인정보). */
const emailActive = () => policyNextActive();
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
function emailValue() { return emailActive() ? $("#email").value.replace(/\s+/g, "") : ""; }
function emailOk(v) { return !v || (v.length <= 120 && EMAIL_RE.test(v) && !v.includes("..") && !v.startsWith(".") && !/\.@/.test(v)); }
function syncEmailNote() { $("#emailEmptyNote").hidden = !!$("#email").value.trim(); }
function newDeviceId() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function deviceId() {
  if (!deviceActive()) return "";
  try {
    let v = localStorage.getItem(DEVICE_KEY) || "";
    if (!/^[A-Za-z0-9_-]{22}$/.test(v)) { v = newDeviceId(); localStorage.setItem(DEVICE_KEY, v); }
    return v;
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등) — 이 페이지를 연 동안만 같은 값
    return memoryDeviceId || (memoryDeviceId = newDeviceId());
  }
}
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const openedAt = Date.now();
/** Apps Script가 설정과 함께 준 서명된 발급 시각(P3) — 접수 때 그대로 돌려보낸다. 브라우저에 저장하지 않는다. */
let issuedStamp = "";
/** 발급 표를 받은 이 브라우저 시각 — 서버는 받은 뒤 3초 ~ 24시간 사이의 표만 인정한다(웹문의.gs ISSUE_MIN_MS · ISSUE_MAX_MS). */
let issuedAt = 0;

const state = {
  scope: "전체",
  rooms: new Map(),   // room -> { trades:Set, pyeong:"", items:Map(trade -> Set(상품명)), size:"작음|보통|큼", len:Map(trade -> "3.2") }
  photos: [],         // { name, dataUrl }
};

// ── 공간 · 공종 설정 (앱 4008 → Apps Script → 여기) ─────────────────────
const WEB_CACHE_KEY = "estimate-web-config-v1";
// 설정을 못 주는 스크립트(옛 버전)에 매번 묻지 않도록 쉬는 시각 — 옛 스크립트는 이 요청을 틀린 키로 세어 앱 동기화를 막는다.
const WEB_PAUSE_KEY = "estimate-web-config-pause-until-v2";   // v2(2026-09-30): 새 스크립트는 발급 표를 주므로 옛 멈춤 기록은 무시
const WEB_PAUSE_MS = 6 * 60 * 60 * 1000;
// 길이 · 개수 상한 — Apps Script(웹문의.gs WEBCFG)와 같게. 접수 때 서버가 공간 20자 · 공종 20자 · 상품명 60자로 자른다.
const WEB_LIMITS = { rooms: 30, room: 20, trades: 60, trade: 20, perTrade: 300, name: 60, sub: 200, categories: 60, category: 40 };

// 공간 크기(2026-10-10 사용자 결정) — 작음 · 보통 · 큼. 크기 그룹(앱 물량 산출 탭 '공간 크기' 8031)이 설정의 sizeGroups로 온다:
// 그룹마다 공간 분류(cats) · 바닥+벽 여부(wall) · 안내 치수(sizes — [가로, 세로(, 높이)] m).
// 처음 치수는 없다(F-18 — 앱 2026-10-13 결정 '모두 사용자가 넣는다'와 같게): 설정에 그룹이 없으면 크기를 묻지 않고,
// 세 크기 중 하나라도 틀린 그룹은 통째로 뺀다(앱도 세 크기를 다 넣은 그룹만 싣는다).
const SIZE_TITLES = ["작음", "보통", "큼"];
/** 크기 그룹 — 칸마다 검사(가로 · 세로 0.3~20m, 바닥+벽은 높이 1.5~5m), 한 분류는 앞 그룹만, 최대 8개. 순서는 설정 그대로(roomSizeGroups 번호). */
function normalizeSizeGroups(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(), out = [];
  raw.slice(0, 8).forEach(g => {
    if (!g || typeof g !== "object") { out.push(null); return; }
    const cats = (Array.isArray(g.cats) ? g.cats : []).filter(c => typeof c === "string" && c.trim() && c.length <= 40 && !seen.has(c.trim()))
      .map(c => c.trim());
    const wall = g.wall !== false;
    const sizes = [0, 1, 2].map(i => {
      const v = Array.isArray(g.sizes) && Array.isArray(g.sizes[i]) ? g.sizes[i].map(Number) : [];
      const ok = v.length >= 2 && v.slice(0, 2).every(n => n >= 0.3 && n <= 20) && (!wall || (v[2] >= 1.5 && v[2] <= 5));
      return ok ? v.slice(0, wall ? 3 : 2) : null;
    });
    // 못 쓰는 그룹도 자리는 남긴다(null) — 앱이 정한 공간 → 그룹 번호(roomSizeGroups)가 어긋나지 않게.
    if (!cats.length || sizes.some(v => !v)) { out.push(null); return; }
    cats.forEach(c => seen.add(c));
    out.push({ cats, wall, sizes });
  });
  return out;
}

/** 받은 설정을 검사해 쓰기 좋은 모양으로 — 모양이 틀렸거나 공간 · 공종이 비면 null(= 지금 설정 그대로). */
function normalizeWebConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const rooms = [...new Set((Array.isArray(raw.rooms) ? raw.rooms : []).map(r => str(r, WEB_LIMITS.room)).filter(Boolean))]
    .slice(0, WEB_LIMITS.rooms);
  const source = raw.products && typeof raw.products === "object" ? raw.products : {};
  const trades = [], products = Object.create(null);   // 공종 이름이 "toString" 같은 기본 속성명이어도 안전하게
  (Array.isArray(raw.trades) ? raw.trades : []).forEach(t => {
    const trade = str(t, WEB_LIMITS.trade);
    if (!trade || trade in products || trades.length >= WEB_LIMITS.trades) return;
    const list = [], seen = new Set();
    const given = Object.prototype.hasOwnProperty.call(source, t) && Array.isArray(source[t]) ? source[t] : [];
    given.forEach(p => {
      if (!Array.isArray(p) || list.length >= WEB_LIMITS.perTrade) return;
      const name = str(p[0], WEB_LIMITS.name), sub = str(p[1], WEB_LIMITS.sub);
      if (!name || seen.has(name)) return;
      seen.add(name); list.push([name, sub]);
    });
    trades.push(trade); products[trade] = list;
  });
  const categories = [], seenCat = new Set();
  (Array.isArray(raw.categories) ? raw.categories : []).forEach(c => {
    if (!c || typeof c !== "object" || categories.length >= WEB_LIMITS.categories) return;
    const name = str(c.name, WEB_LIMITS.category);
    if (!name || seenCat.has(name)) return;
    seenCat.add(name);
    categories.push({ name, excluded: new Set((Array.isArray(c.excluded) ? c.excluded : []).map(x => str(x, 100)).filter(Boolean)) });
  });
  if (!rooms.length || !trades.length) return null;
  // 단일 선택 공종 — 싣는 공종 안의 것만. 키가 없으면(옛 설정 · 옛 스크립트) 모두 중복 선택(예전 동작 그대로).
  const single = new Set((Array.isArray(raw.single) ? raw.single : [])
    .map(t => str(t, WEB_LIMITS.trade)).filter(t => t && t in products));
  // 공간 크기를 묻는 공종(앱 물량 산출 규칙이 있는 공종, 2026-10-10) — 키가 없거나 빈 목록이면 묻지 않음(F-18 — '타일' 가정 없음).
  const sized = new Set((Array.isArray(raw.sized) ? raw.sized : [])
    .map(t => str(t, WEB_LIMITS.trade)).filter(t => t && t in products));
  const sizeGroups = normalizeSizeGroups(raw.sizeGroups);
  // 공간 카드 → 공간 분류 · 크기 그룹(S13, 2026-10-14) — 앱이 정한 표. 있으면 이 표만 본다(없는 공간 = 분류 없음 · 크기 안 물음).
  // 없으면(옛 앱이 올린 설정 · 이 페이지 기본값) 아래 matchCategory 규칙으로.
  const catNames = new Set(categories.map(c => c.name));
  const plainMap = v => v && typeof v === "object" && !Array.isArray(v) ? v : null;
  const rawCats = plainMap(raw.roomCategories), rawSizes = plainMap(raw.roomSizeGroups);
  const roomCategories = rawCats ? new Map(rooms.filter(r => Object.prototype.hasOwnProperty.call(rawCats, r))
    .map(r => [r, str(rawCats[r], WEB_LIMITS.category)]).filter(([, c]) => catNames.has(c))) : null;
  const roomSizeGroups = rawSizes ? new Map(rooms.filter(r => Object.prototype.hasOwnProperty.call(rawSizes, r))
    .map(r => [r, Number(rawSizes[r])]).filter(([, n]) => Number.isInteger(n) && sizeGroups[n])) : null;
  return { rooms, trades, products, categories, single, sized, sizeGroups, roomCategories, roomSizeGroups };
}
/** 이 공종은 단일 선택인가(한 공간에 상품 1개) — 아니면 중복 선택(여러 개). */
const isSingle = trade => !!(WEB.single && WEB.single.has(trade));
/** 단일 선택 공종에 여러 개가 담겨 있으면(옛 초안 · 설정이 바뀐 뒤) 먼저 고른 1개만 남긴다. 줄였으면 true. */
function keepFirstIfSingle(trade, set) {
  if (!isSingle(trade) || set.size <= 1) return false;
  const first = set.values().next().value;
  set.clear(); set.add(first);
  return true;
}

let WEB = normalizeWebConfig(DEFAULT_WEB);
let webSource = "";   // 지금 쓰는 설정의 원문(JSON) — 같은 설정을 다시 받으면 다시 그리지 않는다

// 공간 카드 → 공간 분류: 앱 EstimateCore RoomTradeScope.category와 같은 규칙(바꾸면 함께).
// 2026-10-14(S13)부터 앱이 표(roomCategories · roomSizeGroups)를 올리므로 이 규칙은 표가 없는 옛 설정 · 기본값에만 쓴다.
// ① 같은 이름 ② 뒤 번호 · 띄어쓰기를 뗀 이름, "발코니/베란다"처럼 / 로 나눈 한쪽 ③ 흔한 다른 이름.
const ROOM_SYNONYMS = {
  "침실": ["안방", "방", "작은방", "큰방", "아이방", "자녀방", "부부침실", "서재", "드레스룸", "옷방", "알파룸"],
  "욕실": ["화장실", "공용욕실", "안방욕실", "부부욕실", "공용화장실", "안방화장실"],
  "발코니": ["베란다", "앞베란다", "뒷베란다", "다용도실", "세탁실"],
  "주방": ["부엌", "키친"],
  "거실": ["리빙룸"],
  "공용(전체)": ["전체", "공용", "집전체"],
};
const squeeze = s => String(s).replace(/\s+/g, "");
function baseName(s) {
  let t = String(s).trim();
  while (t && /[\p{N}\s\-_#]/u.test(t.slice(-1))) t = t.slice(0, -1);
  return t;
}
function nameParts(category) {
  const whole = squeeze(category);
  return [whole, baseName(whole), ...whole.split(/[\/·,]/).map(baseName).filter(Boolean)];
}
function matchCategory(raw, names) {
  const text = String(raw).trim();
  if (!text) return null;
  const exact = names.find(n => n.trim() === text);
  if (exact) return exact;
  const base = squeeze(baseName(text));
  if (!base) return null;
  return names.find(n => nameParts(n).includes(base))
    || names.find(n => nameParts(n).some(p => Object.prototype.hasOwnProperty.call(ROOM_SYNONYMS, p) && ROOM_SYNONYMS[p].includes(base)))
    || null;
}
/** 이 공간에서 안 쓰는 공종 — 분류를 못 찾으면 빈 집합(= 모든 공종). */
function roomExcluded(room) {
  const name = WEB.roomCategories ? (WEB.roomCategories.get(room) || null) : matchCategory(room, WEB.categories.map(c => c.name));
  const category = name && WEB.categories.find(c => c.name === name);
  return category ? category.excluded : new Set();
}
function roomTrades(room) {
  const excluded = roomExcluded(room);
  return WEB.trades.filter(t => !excluded.has(t));
}
function tradeAllowed(room, trade) {
  return WEB.trades.includes(trade) && !roomExcluded(room).has(trade);
}

/** 공사할 곳 안내 — 도형은 모양만(수량은 평형 · 공간 크기) · 공용(전체)에서만 고르는 공종이 있으면 그 이름. */
function renderRoomsDesc() {
  let text = "도형은 대략의 모양만 — 수량은 적어 주신 평형과 공간 크기로 계산해요.";
  const only = planWholeOnly();
  if (only.length) {
    const particle = hasBatchim(only[only.length - 1]) ? "은" : "는";
    text += ` ${only.join("·")}${particle} 집 전체 기준이라 도면 아래 '공용(전체)' 띠에서 골라 주세요.`;
  }
  $("#planDesc").textContent = text;
}
function hasBatchim(word) {
  const code = word.charCodeAt(word.length - 1) - 0xAC00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 새 설정으로 바꾼다 — 이제 안 보이는 공간 · 공종 · 상품은 고른 것에서 뺀다(숨긴 공종이 전송에 섞이지 않게).
    공간 평형 칸에 입력하는 중이면 끝난 뒤에 바꾼다(다시 그리면 입력 중인 칸이 사라진다). */
let pendingWebConfig = null, waitingFocusOut = false;
function applyWebConfig(next, source) {
  const area = $("#planStep"), active = document.activeElement;
  const typing = !!active && active.tagName === "INPUT" && area.contains(active);
  if (typing) {
    pendingWebConfig = [next, source];   // 공간 평형 · 가구 길이 칸에 입력하는 중이면 칸을 떠날 때 반영
    if (!waitingFocusOut) {
      waitingFocusOut = true;
      area.addEventListener("focusout", () => { waitingFocusOut = false; flushWebConfig(); }, { once: true });
    }
    return;
  }
  pendingWebConfig = null;
  WEB = next; webSource = source;
  let changed = false;
  [...state.rooms.keys()].forEach(room => {
    if (!WEB.rooms.includes(room)) { state.rooms.delete(room); changed = true; return; }
    const data = state.rooms.get(room);
    [...data.trades].forEach(t => {
      if (!tradeAllowed(room, t)) { data.trades.delete(t); data.items.delete(t); changed = true; }
    });
    [...data.items].forEach(([t, set]) => {
      [...set].forEach(n => { if (!(WEB.products[t] || []).some(([pn]) => pn === n)) { set.delete(n); changed = true; } });
      if (keepFirstIfSingle(t, set)) changed = true;   // 중복 → 단일 선택으로 바뀐 공종
      if (!set.size) data.items.delete(t);
    });
  });
  planSyncRooms();   // 없어진 공간의 도형은 그림만 남는다
  renderStep();      // 평면도는 다시 그린 뒤 같은 칸으로 키보드 위치를 돌려놓는다(planRender)
  if (changed) { saveDraft(); toast("공사 항목 목록이 바뀌어 고르신 것 중 일부를 정리했어요."); }
}

function flushWebConfig() {
  setTimeout(() => { if (pendingWebConfig) applyWebConfig(...pendingWebConfig); }, 0);
}

function readCachedWebConfig() {
  try {
    const source = localStorage.getItem(WEB_CACHE_KEY) || "";
    const next = source ? normalizeWebConfig(JSON.parse(source)) : null;
    if (next) { WEB = next; webSource = source; }
  } catch {}
}

/** Apps Script에 설정을 묻는다(발급 표도 함께 온다). 실패하면 null. 발급 표는 여기서 받아 둔다. */
async function requestWebConfig(timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "webConfig" }), signal: ctrl.signal, redirect: "follow",
    });
    const json = await res.json().catch(() => null);
    if (json && typeof json.issued === "string" && json.issued) { issuedStamp = json.issued.slice(0, 200); issuedAt = Date.now(); }
    return json;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

/** Apps Script에서 앱이 반영한 설정을 읽는다. 못 읽거나 아직 반영한 적이 없으면 지금 설정(기본값 · 지난번 것) 그대로.
    못 읽으면(서버가 늦거나 잠깐 실패) 15초 · 1분 뒤 두 번 더 묻는다 — 발급 표 없이 접수되지 않게(2026-10-09). */
let webConfigTries = 0;
async function fetchWebConfig() {
  if (!CONFIG.SCRIPT_URL) return;
  try { if (Date.now() < Number(localStorage.getItem(WEB_PAUSE_KEY) || 0)) return; } catch {}
  webConfigTries++;
  const json = await requestWebConfig(10000);
  if (!json && webConfigTries < 3) { setTimeout(fetchWebConfig, webConfigTries === 1 ? 15000 : 60000); return; }
  if (json && json.error) {   // 설정 기능이 없는 옛 스크립트 — 한동안 묻지 않는다
    try { localStorage.setItem(WEB_PAUSE_KEY, String(Date.now() + WEB_PAUSE_MS)); } catch {}
    return;
  }
  if (!json || !json.ok || !json.config) return;
  try {
    const source = JSON.stringify(json.config);
    if (source === webSource) return;
    const next = normalizeWebConfig(json.config);
    if (!next) return;
    try { localStorage.setItem(WEB_CACHE_KEY, source); } catch {}
    applyWebConfig(next, source);
  } catch {}
}

/** 보내기 직전 — 발급 표가 없거나(설정을 못 읽음) 오래됐으면(창을 하루 가까이 열어 둠) 표만 새로 받는다.
    설정은 바꾸지 않는다(고객이 고른 내용이 보내는 도중 바뀌지 않게). 받은 지 3초가 안 됐으면 채울 때까지 기다린다.
    끝내 못 받아도 보낸다 — 서버가 '확인 필요'로 받는다(접수 자체를 잃지 않게). */
async function ensureIssued() {
  if (!CONFIG.SCRIPT_URL) return;
  const fresh = issuedStamp && Date.now() - issuedAt < 23 * 3600 * 1000;
  if (!fresh) {
    for (let i = 0; i < 2 && !(issuedStamp && Date.now() - issuedAt < 60000); i++) await requestWebConfig(12000);
  }
  const wait = issuedStamp ? 3500 - (Date.now() - issuedAt) : 0;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}
// 오래 열어 둔 창으로 돌아오면 표를 미리 새로 받는다(보낼 때 기다리지 않게).
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && CONFIG.SCRIPT_URL && (!issuedStamp || Date.now() - issuedAt > 20 * 3600 * 1000)) requestWebConfig(10000);
});

// ── 머리·꼬리 채우기 ─────────────────────────────────────────────
$("#companyName").textContent = CONFIG.COMPANY_NAME;
document.title = `온라인 견적 요청 · ${CONFIG.COMPANY_NAME}`;
// 전화번호는 접수 완료 화면에서만(머리 · 바닥글에는 상호만). 보내기 실패 안내에는 남긴다 — 요청을 보내려다 막힌 고객의 연락 길.
$("#footerText").textContent = CONFIG.COMPANY_NAME;
if (CONFIG.PRIVACY_URL) { $("#footerPrivacy").href = CONFIG.PRIVACY_URL; $("#footerPrivacy").hidden = false; $("#footerSep").hidden = false; }
$("#donePhone").href = "tel:" + CONFIG.COMPANY_PHONE.replace(/[^\d+]/g, "");
$("#donePhoneText").textContent = `전화하기 ${CONFIG.COMPANY_PHONE}`;
$("#donePhone").setAttribute("aria-label", `전화하기 ${CONFIG.COMPANY_PHONE}`);
$("#maxPhotosLabel").textContent = CONFIG.MAX_PHOTOS;
$("#retentionText").textContent = CONFIG.RETENTION;
if (CONFIG.PRIVACY_URL) { $("#privacyLink").href = CONFIG.PRIVACY_URL; $("#privacyLinkWrap").hidden = false; }

// ── 토스트 ───────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  // 긴 안내(접수 실패 · 연결 끊김)는 읽을 만큼 오래 — 글자 수에 맞춰 2.6~7초(2026-10-09).
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), Math.min(7000, Math.max(2600, msg.length * 90)));
}

// ── 연락처 자동 하이픈 ─────────────────────────────────────────────
function formatPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0,2)}-${d.slice(2,5)}-${d.slice(5)}`;
    return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6,10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}
$("#phone").addEventListener("input", e => { e.target.value = formatPhone(e.target.value); });
$("#zip").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 5); });
$("#pyeong").addEventListener("input", e => {
  let v = e.target.value.replace(/[^\d.]/g, "");
  const i = v.indexOf("."); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 1);
  e.target.value = v;
  const n = parseFloat(v);
  $("#pyeongHint").textContent = n > 0 ? `약 ${(n * 3.305785).toFixed(1)}㎡ · 공급면적 기준` : "공급면적 기준으로 적어 주세요.";
  updateBar();
});

// ── 공사 희망 기간 — 빈 칸은 흐린 글자, 완공일 달력은 시작일부터 ─────────────────
function syncDates() {
  const s = $("#startDate"), e = $("#endDate");
  s.classList.toggle("has-value", !!s.value); e.classList.toggle("has-value", !!e.value);
  e.min = s.value || "";
}
["startDate", "endDate"].forEach(id => ["input", "change"].forEach(t => $("#" + id).addEventListener(t, syncDates)));

// ── 시공 범위 (전체 / 부분) ─────────────────────────────────────────
$$("[data-scope]").forEach(b => b.addEventListener("click", () => setScope(b.dataset.scope)));
function setScope(scope) {
  const changed = state.scope !== scope;
  state.scope = scope;
  $$("[data-scope]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.scope === scope)));
  $("#scopeHint").textContent = scope === "전체"
    ? "집 전체를 공사합니다."
    : "공간마다 대략의 평형은 다음 화면의 공간 판에서 적어 주세요. 모르면 비워 두셔도 됩니다.";
  if (changed && current === "plan") planRender();
  updateBar();
  saveDraft();
}

// ── 공간 · 공종 · 상품 ─────────────────────────────────────────────────
// 요약 · 검사는 가나다순(방1 < 방2 < 방10). 전송 순서는 앱 공간 순서(WEB.rooms) 그대로.
const koSort = (a, b) => a.localeCompare(b, "ko", { numeric: true });
const newRoom = () => ({ trades: new Set(), pyeong: "", items: new Map(), size: "", len: new Map() });
const productNames = trade => (WEB.products[trade] || []).map(([n]) => n);
const pickedNames = (data, trade) => { const set = data.items.get(trade); return set ? productNames(trade).filter(n => set.has(n)) : []; };

/** 고른 것이 바뀐 뒤 — 오류 표시 지우기 · 평면도 · 초안 · 아래 바. */
function afterChange() {
  clearInvalid("plan");
  // 크기를 묻는 상품을 모두 빼면 고른 크기도 지운다 — 다시 고르면 크기는 미선택부터(사용자 결정 2026-10-10).
  state.rooms.forEach((v, r) => { if (v.size && !needsSize(r)) v.size = ""; });
  if (current === "plan") planRender();
  saveDraft(); updateBar();
}

// ── 단계 화면 (사용자 결정 2026-10-09 → 2026-10-24 지시서 1024-웹1) ─────────────────
// 단계: "info"(기본 정보 · 평형 · 일정) → "plan"(공사할 곳 — 집 구조 평면도 · 공간마다 공종 · 상품) → "finish"(사진 · 요청사항 · 동의).
// 기기의 '뒤로'는 앞 단계로(history).
let current = "info";
const wideScreen = () => matchMedia("(min-width: 1024px)").matches;
/** 공사를 고른 공간 — 공용(전체)를 먼저, 나머지는 가나다순(요약 · 검사 순서). */
function roomOrder() {
  const whole = CONFIG.WHOLE_HOUSE_ROOM;
  return [...state.rooms.keys()].filter(roomHasWork).sort((a, b) => (b === whole) - (a === whole) || koSort(a, b));
}
const steps = () => ["info", "plan", "finish"];

let navIdx = 0, rewinding = false, stepAt = 0;
function goTo(id, opts = {}) {
  const list = steps();
  if (!list.includes(id)) id = "info";   // 예전 단계 기록(rooms · room:…)은 처음 화면으로
  const changed = id !== current;
  if (changed) { current = id; stepAt = performance.now(); }
  renderStep();
  if (opts.push === false) { try { history.replaceState({ step: id, idx: navIdx }, ""); } catch {} }   // 없어진 공간으로 돌아온 경우 기록도 바로잡기
  else if (changed) { navIdx++; try { history.pushState({ step: id, idx: navIdx }, ""); } catch {} }
  if (changed && pendingWebConfig) flushWebConfig();   // 입력 중이라 미뤄 둔 새 설정 — 화면을 옮겼으면 반영
  if (changed) {
    window.scrollTo({ top: 0 });
    const h = $(`[data-step="${id}"] .step-title`);
    if (h && opts.focus !== false) h.focus({ preventScroll: true });
  }
}
function renderStep() {
  $$("[data-step]").forEach(s => { s.hidden = s.dataset.step !== current; });
  $("#hero").hidden = current !== "info";
  // 공사할 곳(넓은 화면) — 왼쪽 평면도 · 오른쪽 공간 판 + 이전 · 다음. 그 밖 단계는 한 열 + 아래 바.
  $(".layout").classList.toggle("plan-on", current === "plan");
  planPlacePanel();
  if (current === "plan") { renderRoomsDesc(); planRender(); }
  if (current === "finish") { renderPhotos(); renderSummary(); }   // 사진 상한은 집 구조 그림이 있으면 1장 적다
  updateBar();
}
/** 이 페이지에서 쌓은 단계 기록을 첫 자리로 되감는다 — 접수 뒤 · 새로 고침 뒤 '뒤로'가 헛돌거나 거꾸로 가지 않게. */
function rewindHistory() {
  const n = (history.state && history.state.idx) || 0;
  navIdx = 0;
  if (n > 0) { rewinding = true; try { history.go(-n); } catch { rewinding = false; } }
}
addEventListener("popstate", e => {
  const s = e.state || {};
  navIdx = s.idx || 0;
  if (rewinding) { rewinding = false; try { history.replaceState({ step: current, idx: 0 }, ""); } catch {} return; }
  if (s.step && !$("#form").hidden && !sending) goTo(s.step, { push: false });
});

/** 아래 바 — 이전 · 다음(다음 화면 이름) · 마지막은 보내기. 위 진행 막대. 공사할 곳에서는 위에 '고른 공간 · 공사' 한 줄. */
function updateNav() {
  const list = steps(), i = Math.max(0, list.indexOf(current));
  $("#progressBar").style.width = `${Math.round((i + 1) / list.length * 100)}%`;
  $("#prevBtn").hidden = i === 0;
  const last = current === "finish";
  $("#nextBtn").hidden = last; $("#submitBtn").hidden = !last;
  $("#nextBtn span").textContent = current === "info" ? "다음 · 공사할 곳" : "다음 · 마무리";
  planRenderBarNote();
  syncSideHeight();
}
const navBusy = () => sending || performance.now() - stepAt < 350;   // 두 번 눌러 한 화면을 건너뛰지 않게
$("#nextBtn").addEventListener("click", () => {
  if (navBusy() || !stepReady(current)) return;
  const list = steps(); goTo(list[list.indexOf(current) + 1]);
});
$("#prevBtn").addEventListener("click", () => {
  if (navBusy()) return;
  const list = steps(), i = list.indexOf(current);
  if (i > 0) goTo(list[i - 1]);
});

/** 다음으로 가기 전 검사 — 문제가 있으면 그 자리에 빨간 안내를 띄우고 false. */
function stepReady(id) {
  if (id === "info") {
    const bad = infoBad();
    if (bad.length) { showBad(bad); return false; }
    ["name", "phone", "address", "zip", "pyeong", "endDate"].forEach(clearInvalid);   // 지난번 빨간 표시가 남지 않게
  } else if (id === "plan") {
    if (!planReady()) return false;
  }
  return true;
}
/** 그 칸이 위 바와 아래 도면(폰) 사이 가운데 오게 화면을 옮긴다 — scrollIntoView는 아래 고정 묶음을 모른다. */
function reveal(el) {
  if (!el) return;
  const top = 64, bottom = wideScreen() && current === "plan" ? 0 : $("#side").getBoundingClientRect().height;
  const r = el.getBoundingClientRect(), room = innerHeight - top - bottom;
  const y = scrollY + r.top - top - Math.max(0, (room - r.height) / 2);
  window.scrollTo({ top: Math.max(0, y), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

// ── 공간 크기 · 가구 길이 (사용자 결정 2026-10-10) ─────────────────────
// 크기 그룹에 든 공간은 크기(작음 · 보통 · 큼)만, 주방가구 · 빌트인장은 길이(m)만 받는다 — 앱이 공간 치수 · 줄 수량으로 바꾼다.
const LEN_RANGE = [0.3, 20];
const FURN_LEN = /싱크대|주방\s*가구|상부장|하부장|빌트인|붙박이|옷장|드레스장|시스템장|신발장/;
/** 이 공간의 크기 그룹 — 공간 카드 → 공간 분류는 안 쓰는 공종과 같은 규칙(matchCategory), 후보는 그룹에 든 분류만(앱 RoomSizeTable과 같게). */
function sizeGroupOf(room) {
  const groups = WEB.sizeGroups || [];
  // 앱이 정한 표(S13)가 있으면 그것만 — 앱이 문의를 견적으로 바꿀 때 쓰는 그룹과 같다.
  if (WEB.roomSizeGroups) { const n = WEB.roomSizeGroups.get(room); return n === undefined ? null : groups[n] || null; }
  const live = groups.filter(Boolean);
  const name = matchCategory(room, live.flatMap(g => g.cats));
  return name ? live.find(g => g.cats.includes(name)) || null : null;
}
/** 이 공간에서 크기를 묻는가 — 크기 그룹 공간에서 크기를 묻는 공종(타일 등)의 상품을 골랐을 때. */
function needsSize(room) {
  const data = state.rooms.get(room);
  if (!data || !sizeGroupOf(room)) return false;
  return roomTrades(room).some(t => data.trades.has(t) && WEB.sized.has(t) && pickedNames(data, t).length > 0);
}
/** 이 공종에서 길이를 받는가 — 주방가구 · 빌트인장 상품을 골랐을 때. */
const needsLen = (data, trade) => pickedNames(data, trade).some(n => FURN_LEN.test(n));
/** 적은 길이 — 0.3~20m면 숫자(소수 둘째 자리), 비었으면 null, 틀리면 NaN. */
function lenValue(text) {
  if (!text) return null;
  const v = parseFloat(text);
  return v >= LEN_RANGE[0] && v <= LEN_RANGE[1] ? Math.round(v * 100) / 100 : NaN;
}
/** "가로 1.6 × 세로 2.2 × 높이 2.3m" — 어느 쪽이 가로 · 세로인지 보이게(사용자 결정). */
const sizeText = (group, i) => {
  const v = group.sizes[i] || [];
  return `가로 ${v[0]} × 세로 ${v[1]}` + (group.wall && v[2] ? ` × 높이 ${v[2]}` : "") + "m";
};
/** 공간 검사(공사를 고른 공간) — 상품 없이 담긴 공사 · 공간 크기 · 가구 길이. 문제가 없으면 null. */
function roomIssue(room) {
  const data = state.rooms.get(room);
  if (!data) return null;
  const need = roomTrades(room).filter(t => data.trades.has(t) && productNames(t).length && !pickedNames(data, t).length);
  if (need.length) return { room, text: `${need.join(" · ")} 상품을 골라 주세요. 고르지 않으면 견적 요청을 보낼 수 없어요.`, trade: need[0] };
  // 공간 크기(필수) · 가구 길이(선택 — 적었으면 0.3~20m), 2026-10-10.
  if (needsSize(room) && !SIZE_TITLES.includes(data.size)) return { room, text: `${room} 크기를 골라 주세요. 수량 계산에 써요.`, size: true };
  const badLen = roomTrades(room).find(t => data.trades.has(t) && needsLen(data, t) && Number.isNaN(lenValue(data.len.get(t))));
  if (badLen) return { room, text: `${badLen} 가구 길이는 0.3 ~ 20m로 적어 주세요. 모르면 비워 두세요.`, trade: badLen };
  if (!roomHasWork(room)) return { room, text: `${room}에 고른 상품이 없어요. 상품을 고르거나 이 공간을 빼 주세요.`, empty: true };
  return null;
}
// ── 마무리 — 요청 내용 확인(고치기 = 그 화면으로) ───────────────────────
// 공간 · 공종 · 상품 이름은 설정에서 오므로 글자로만 넣는다(innerHTML 금지).
function renderSummary() {
  const box = $("#summary");
  box.textContent = "";
  const row = (title, lines, go, bad) => {
    const d = document.createElement("div"); d.className = "sum-row";
    const left = document.createElement("div");
    const k = document.createElement("div"); k.className = "k"; k.textContent = title;
    left.appendChild(k);
    lines.forEach(t => { const v = document.createElement("div"); v.className = "v" + (bad ? " bad" : ""); v.textContent = t; left.appendChild(v); });
    const b = document.createElement("button"); b.type = "button"; b.className = "link-btn"; b.textContent = "고치기";
    b.setAttribute("aria-label", `${title} 고치기`);
    b.addEventListener("click", () => (typeof go === "function" ? go() : goTo(go)));
    d.append(left, b); box.appendChild(d);
  };
  // 이름 · 연락처 · 주소도 보이게 — 보내기 전에 오타를 볼 수 있게(2026-10-09). 글자로만 넣는다.
  const who = [$("#name").value.trim() || "이름 미입력", $("#phone").value.trim() || "연락처 미입력"].join(" · ");
  const addr = [$("#address").value.trim(), $("#addressDetail").value.trim()].filter(Boolean).join(" ") || "주소 미입력";
  row("이름 · 연락처 · 주소", [who, addr], "info", infoBad().some(k => ["name", "phone", "address"].includes(k)));
  const py = parseFloat($("#pyeong").value);
  const s = $("#startDate").value, e = $("#endDate").value;
  const basics = [`${py > 0 ? py + "평" : "평형 미입력"} · ${state.scope === "부분" ? "부분 시공" : "전체 시공"}`];
  if (s || e) basics.push(`희망 기간 ${s || "?"} ~ ${e || "?"}`);
  row("평형 · 일정", basics, "info");
  const struct = planStructureText();
  row("집 구조", [struct ? struct.replace(/^\[[^\]]*\]\s*/, "") + " · 그림 1장 함께 보냄" : "그림 없음"], () => planGoRoom(""));
  const order = roomOrder();
  if (!order.length) { row("공사할 곳", ["아직 고른 공사가 없어요."], () => planGoRoom(""), true); return; }
  order.forEach(room => {
    const data = state.rooms.get(room);
    const lines = roomTrades(room).filter(t => data.trades.has(t)).map(t => {
      const picked = pickedNames(data, t);
      const len = needsLen(data, t) ? lenValue(data.len.get(t)) : null;
      return picked.length ? `${t}: ${picked.join(", ")}${len > 0 ? ` · 가구 길이 ${len}m` : ""}` : `${t}: 상품을 골라 주세요`;
    });
    if (needsSize(room)) lines.unshift(`공간 크기: ${SIZE_TITLES.includes(data.size) ? data.size : "골라 주세요"}`);
    const issue = roomIssue(room);
    const py2 = state.scope === "부분" && room !== CONFIG.WHOLE_HOUSE_ROOM && parseFloat(data.pyeong) > 0 ? ` · ${data.pyeong}평` : "";
    row(planRoomLabel(room) + py2, lines.length ? lines : ["아직 고른 상품이 없어요."], () => planGoRoom(room), !!issue);
  });
}

/** 아래 고정 묶음의 높이 → 본문 아래 여백(--side-h). 넓은 화면의 공사할 곳은 오른쪽이라 0. */
function syncSideHeight() {
  const h = wideScreen() && current === "plan" ? 0 : Math.ceil($("#side").getBoundingClientRect().height);
  document.documentElement.style.setProperty("--side-h", `${h}px`);
}
if (window.ResizeObserver) new ResizeObserver(syncSideHeight).observe($("#side"));
addEventListener("resize", () => { updateNav(); });

// ── 사진 (브라우저에서 줄여서 보낸다: 긴 변 1600px, JPEG) ────────────────
$("#phAdd").addEventListener("click", () => $("#photoInput").click());
$("#photoInput").addEventListener("change", async e => {
  const files = [...e.target.files];
  e.target.value = "";
  for (const f of files) {
    if (state.photos.length >= photoMax()) { toast(`사진은 최대 ${photoMax()}장까지 올릴 수 있어요.${planHasDrawing() ? " 집 구조 그림 1장이 함께 가요." : ""}`); break; }
    if (!f.type.startsWith("image/")) continue;
    try {
      const dataUrl = await shrinkImage(f, 1600, 0.82);
      state.photos.push({ name: f.name.replace(/\.[^.]+$/, "") + ".jpg", dataUrl });
    } catch (err) {
      toast("이 사진은 열 수 없어요. JPG나 PNG로 올려 주세요.");
    }
  }
  renderPhotos();
});
function shrinkImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}
/** 고객 사진 상한 — 집 구조 그림이 있으면 그림 1장 자리를 뺀다(서버 상한 5장, 웹문의.gs MAX_PHOTOS). */
const photoMax = () => CONFIG.MAX_PHOTOS - (planHasDrawing() ? 1 : 0);
function renderPhotos() {
  const wrap = $("#photos");
  $("#maxPhotosLabel").textContent = photoMax();
  $("#planPhotoNote").hidden = !planHasDrawing();
  $$(".ph", wrap).forEach(n => n.remove());
  state.photos.forEach((p, i) => {
    const d = document.createElement("div"); d.className = "ph";
    const img = document.createElement("img"); img.src = p.dataUrl; img.alt = `현장 사진 ${i + 1}`;
    const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", `사진 ${i + 1} 빼기`);
    x.addEventListener("click", () => { state.photos.splice(i, 1); renderPhotos(); });
    d.append(img, x);
    wrap.insertBefore(d, $("#phAdd"));
  });
  $("#phAdd").hidden = state.photos.length >= photoMax();
  updateBar();
}

// ── 주소 검색 (카카오 우편번호 서비스, 무료·키 불필요) ────────────────────
let postcodeLoading;
function loadPostcode() {
  if (window.daum && window.daum.Postcode) return Promise.resolve();
  if (!postcodeLoading) postcodeLoading = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.onload = res; s.onerror = () => { postcodeLoading = null; rej(); };
    document.head.appendChild(s);
  });
  return postcodeLoading;
}
async function openAddressSearch() {
  try { await loadPostcode(); }
  catch {
    // 검색을 못 불러오면 직접 입력으로 전환 — 우편번호 · 상세 주소 칸도 보인다
    const a = $("#address"); a.readOnly = false; a.focus();
    $("#detailWrap").hidden = false; $("#zipWrap").hidden = false;
    toast("주소 검색을 불러오지 못했어요. 직접 입력해 주세요."); return;
  }
  const layer = $("#addrLayer"), wrap = $("#postcodeWrap");
  wrap.innerHTML = "";
  new daum.Postcode({
    width: "100%", height: "100%",
    oncomplete(data) {
      const base = data.roadAddress || data.jibunAddress || data.address;
      const extra = data.buildingName && data.apartment === "Y" ? ` (${data.buildingName})` : "";
      $("#address").value = base + extra;
      $("#zip").value = data.zonecode || "";
      addrRegion = { sido: String(data.sido || ""), sigungu: String(data.sigungu || "") };   // SNS 공개는 시 · 구까지만(동 · 단지 없음)
      clearInvalid("address"); clearInvalid("zip");
      layer.classList.remove("on");
      $("#detailWrap").hidden = false;
      $("#addressDetail").focus();
      saveDraft();
    },
  }).embed(wrap);
  layer.classList.add("on");
}
$("#addrBtn").addEventListener("click", openAddressSearch);
// 주소 칸을 눌러도 검색 — 직접 입력으로 바뀐 뒤(readOnly 아님)에는 보통 입력칸
$("#address").addEventListener("click", () => { if ($("#address").readOnly) openAddressSearch(); });
$("#address").addEventListener("keydown", e => { if ($("#address").readOnly && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openAddressSearch(); } });
$("#addrClose").addEventListener("click", () => $("#addrLayer").classList.remove("on"));
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#addrLayer").classList.remove("on"); });
$("#addrLayer").addEventListener("click", e => { if (e.target.id === "addrLayer") e.currentTarget.classList.remove("on"); });

// ── 아래 바 · 마무리 요약 다시 그리기 ────────────────────────────────────
function updateBar() {
  updateNav();
  if (current === "finish") renderSummary();
}

// ── 초안 저장 (이 브라우저에만, 사진 · 개인정보 제외) ──────────────────────────
// 이름 · 연락처 · 주소는 브라우저에 남기지 않는다(P7 — 처리방침과 같게). 평형 · 희망일 · 고른 공간은 7일 초안,
// 요청사항은 이 탭에만(F-20 — 자유 글에 개인 사정 · 연락처가 들어갈 수 있어 탭을 닫으면 사라지게).
const draftFields = ["pyeong", "startDate", "endDate"];
function saveDraft() {
  try {
    const d = { scope: state.scope, rooms: [...state.rooms].map(([k, v]) => [k, [...v.trades], v.pyeong, [...v.items].map(([t, s]) => [t, [...s]]), v.size, [...v.len]]) };
    draftFields.forEach(f => d[f] = $("#" + f).value);
    d.plan = planDraftOut();   // 집 구조 도형(앱 평면 저장 글과 같은 모양) — 개인정보 없음
    d.savedAt = Date.now();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
  try {
    const note = $("#note").value;
    if (note) sessionStorage.setItem(NOTE_KEY, note); else sessionStorage.removeItem(NOTE_KEY);
  } catch {}
}
function loadDraft() {
  try { const note = sessionStorage.getItem(NOTE_KEY); if (note) $("#note").value = note; } catch {}
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch {}
  if (!d) return;
  // 이름 · 연락처 · 주소가 든 초안을 이 브라우저에 오래 두지 않는다 — 7일이 지났으면(또는 시각이
  // 없는 예전 초안이면) 지운다.
  if (!(Date.now() - Number(d.savedAt) < DRAFT_MAX_AGE_MS)) { clearDraft(); return; }
  draftFields.forEach(f => { if (typeof d[f] === "string") $("#" + f).value = d[f]; });
  if (!Array.isArray(d.rooms)) d.rooms = [];
  d.rooms.forEach(entry => {
    if (!Array.isArray(entry)) return;
    const [k, t, p, it, sz, ln] = entry;
    if (!WEB.rooms.includes(k)) return;
    // 지금 설정에서 이 공간에 안 보이는 공종(예전 초안 · 설정이 바뀐 뒤)은 버린다.
    const trades = new Set((Array.isArray(t) ? t : []).filter(x => tradeAllowed(k, x)));
    const items = new Map();
    (Array.isArray(it) ? it : []).forEach(([tr, names]) => {
      if (!trades.has(tr) || !Array.isArray(names)) return;
      const valid = new Set(names.filter(n => (WEB.products[tr] || []).some(([pn]) => pn === n)));
      keepFirstIfSingle(tr, valid);   // 예전 초안에 단일 선택 공종이 여러 개 담겼으면 먼저 고른 1개만
      if (valid.size) items.set(tr, valid);
    });
    const len = new Map((Array.isArray(ln) ? ln : []).filter(x => Array.isArray(x) && trades.has(x[0]) && typeof x[1] === "string")
      .map(([tr, v]) => [tr, v.slice(0, 5)]));
    state.rooms.set(k, { trades, pyeong: typeof p === "string" ? p : "", items, size: SIZE_TITLES.includes(sz) ? sz : "", len });
  });
  if (d.scope === "부분") state.scope = "부분";
  planDraftIn(d.plan);
  $("#pyeong").dispatchEvent(new Event("input"));
  // 예전 초안에 남은 이름 · 연락처 · 주소 · 요청사항(F-20 전 판)은 바로 지운다 — 다시 저장한 초안에는 없다.
  // 요청사항은 이 탭에서만 이어 쓴다(옛 초안의 글은 되살리지 않는다).
  if (["name", "phone", "address", "addressDetail", "zip", "note"].some(k => k in d)) saveDraft();
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
  try { sessionStorage.removeItem(NOTE_KEY); } catch {}
}
$("#form").addEventListener("input", e => { if (e.target.closest("[data-field]")) clearInvalid(e.target.closest("[data-field]").dataset.field); saveDraft(); });

// ── 검사 ─────────────────────────────────────────────────────────────
function setInvalid(field) { const el = $(`[data-field="${field}"]`); if (el) el.classList.add("invalid"); return el; }
function clearInvalid(field) { const el = $(`[data-field="${field}"]`); if (el) el.classList.remove("invalid"); }
$("#consent").addEventListener("change", () => clearInvalid("consent"));
$("#infoConfirm").addEventListener("change", () => clearInvalid("truth"));

/** 이 공간에 담긴 공사가 있는가(이 공간에서 고를 수 있는 공종만 — 전송과 같은 기준). */
function roomHasWork(room) {
  const data = state.rooms.get(room);
  return !!data && WEB.trades.some(t => data.trades.has(t) && tradeAllowed(room, t));
}
/** 기본 정보 · 평형 · 일정 검사 — 틀린 칸 이름 목록. */
function infoBad() {
  const bad = [];
  if (!$("#name").value.trim()) bad.push("name");
  const phoneDigits = $("#phone").value.replace(/\D/g, "");
  // 010 휴대폰은 11자리만(10자리 010 번호는 없다, 2026-10-09). 그 밖(지역 번호 · 070)은 9~11자리.
  if (phoneDigits.length < 9 || phoneDigits.length > 11 || !phoneDigits.startsWith("0")
      || (phoneDigits.startsWith("010") && phoneDigits.length !== 11)) bad.push("phone");
  if (!$("#address").value.trim()) bad.push("address");
  const zip = $("#zip").value.trim();
  if (zip && !/^\d{5}$/.test(zip)) bad.push("zip");
  const py = parseFloat($("#pyeong").value);
  if (!(py >= 1 && py <= 500)) bad.push("pyeong");
  const s = $("#startDate").value, e = $("#endDate").value;
  if (s && e && e < s) bad.push("endDate");
  if (!emailOk(emailValue())) bad.push("email");
  return bad;
}
/** 틀린 칸을 빨갛게 · 첫 칸으로 화면을 옮기고 알림. */
function showBad(bad) {
  bad.forEach(setInvalid);
  const first = $(`[data-field="${bad[0]}"]`);
  reveal(first);
  const focusable = $("input, textarea", first);
  if (focusable && !focusable.readOnly && focusable.type !== "checkbox") setTimeout(() => focusable.focus({ preventScroll: true }), 300);
  toast("빠진 항목을 확인해 주세요.");
}
/** 보내기 전 전체 검사 — 문제가 있는 첫 화면으로 옮겨 그 자리를 알려 준다. */
function validate() {
  const bad = infoBad();
  if (bad.length) { goTo("info"); showBad(bad); return false; }
  if (!planReady()) return false;   // 공사할 곳 — 고른 곳이 없거나 빠진 것이 있으면 그 공간 판을 연다
  const fin = [];
  if (!$("#infoConfirm").checked) fin.push("truth");
  if (!$("#consent").checked) fin.push("consent");
  if (fin.length) { goTo("finish"); showBad(fin); return false; }
  return true;
}

// ── 제출 ─────────────────────────────────────────────────────────────
/** 보낼 내용 — 형식은 예전 그대로. 집 구조는 요청 내용 맨 앞 한 줄 + 사진 칸 그림 1장(shot) + 도형 자료 한 칸(plan — 2026-10-24 지시서 1024-05). */
function buildPayload(shot) {
  const rooms = WEB.rooms.filter(r => roomHasWork(r)).map(r => {
    const v = state.rooms.get(r);
    const trades = WEB.trades.filter(t => v.trades.has(t) && tradeAllowed(r, t));
    // 고른 상품만 — 공종별 { 공종: [상품명…] }. 안 고른 공종은 빠진다(앱이 공종 전체를 담는다).
    const items = Object.create(null);
    trades.forEach(t => { const set = v.items.get(t); if (set && set.size) items[t] = (WEB.products[t] || []).map(([n]) => n).filter(n => set.has(n)); });
    // 공간 크기(물을 때만) · 가구 길이(0.3~20m로 적은 것만) — 2026-10-10. 앱이 공간 치수 · 줄 수량으로 바꾼다.
    const size = needsSize(r) && SIZE_TITLES.includes(v.size) ? v.size : "";
    const len = {};
    trades.forEach(t => { if (needsLen(v, t)) { const m = lenValue(v.len.get(t)); if (m > 0) len[t] = m; } });
    return { room: r, trades, items, pyeong: state.scope === "부분" ? v.pyeong : "", size, len };
  });
  return {
    action: "webInquiry",
    name: $("#name").value.trim(),
    phone: $("#phone").value.trim(),
    email: emailValue(),                       // 선택 — 비면 ""(처리방침 시행 전에도 "")
    address: $("#address").value.trim(),
    addressDetail: $("#addressDetail").value.trim(),
    zip: $("#zip").value.trim(),
    pyeong: $("#pyeong").value.trim(),
    scope: state.scope,
    startDate: $("#startDate").value,
    endDate: $("#endDate").value,
    rooms,
    note: [planStructureText(), $("#note").value.trim()].filter(Boolean).join("\n"),
    photos: (shot ? [shot] : []).concat(state.photos).slice(0, CONFIG.MAX_PHOTOS).map(p => ({ name: p.name, data: p.dataUrl.split(",")[1] })),
    plan: planSendLayout(),                     // 집 구조 도형 — 앱 평면도 형식 글(서버 '평면' 열 → 앱 견적 작성 평면도에서 옮기기 · 크기 수정). 옛 서버는 건너뛴다
    // 동의 기록 — 동의 여부와 그때의 처리방침 판(Apps Script가 접수 시각과 함께 '개인정보 동의' 열에 남긴다).
    consent: $("#consent").checked,
    consentVersion: policyVersion(),
    infoConfirmed: $("#infoConfirm").checked,   // '입력한 정보가 사실임을 확인합니다' — '개인정보 동의' 열에 함께 남는다
    device: deviceId(),                         // 기기 구분 번호 — 처리방침 시행 전에는 ""(Apps Script가 비면 건너뛴다)
    sido: addrRegion.sido,                      // 주소 검색의 시 · 도 · 시 · 군 · 구(2026-10-20) — 직접 입력이면 ""
    sigungu: addrRegion.sigungu,
    publicConsent: snsPolicyActive() && $("#publicConsent").checked,   // [선택] 문의 사례 · 견적서 공개 — 카드가 안 보이는 동안은 false
    website: $("#website").value,          // 스팸 방지용 숨은 칸 — 사람은 비워 둔다
    elapsed: Date.now() - openedAt,
    issued: issuedStamp,                  // 서명된 발급 시각 — 없으면 접수는 되지만 '확인 필요'로 적힌다
  };
}

let sending = false;
$("#submitBtn").addEventListener("click", submit);
$("#form").addEventListener("submit", e => { e.preventDefault(); submit(); });

async function submit() {
  if (sending) return;
  if (framedByOther) { toast("다른 사이트 안에서는 보낼 수 없어요 — 위 '새 창에서 열기'로 열어 주세요."); return; }
  if (!validate()) return;   // 안내 글은 validate가 띄운다
  const btn = $("#submitBtn");
  sending = true; btn.disabled = true; $("#prevBtn").disabled = true; btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>보내는 중`;
  try {
    await ensureIssued();      // 발급 표 확인(없거나 오래되면 새로) — 그 뒤에 보낼 내용을 만든다
    if (current !== "finish" || !validate()) return;   // 기다리는 사이 내용이 바뀌었으면 보내지 않는다
    const payload = buildPayload(state.photos.length < CONFIG.MAX_PHOTOS ? planPhoto() : null);
    let receipt, photoNote = "";
    if (!CONFIG.SCRIPT_URL) {
      console.log("[미리보기] 전송할 내용", { ...payload, photos: payload.photos.map(p => `${p.name} (${Math.round(p.data.length * 0.75 / 1024)}KB)`) });
      await new Promise(r => setTimeout(r, 600));
      const d = new Date();
      receipt = "W" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-DEMO";
      $("#demoNote").hidden = false;
    } else {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      // text/plain = 사전 요청(preflight) 없이 Apps Script로 바로 보낼 수 있는 형식
      const res = await fetch(CONFIG.SCRIPT_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload), signal: ctrl.signal, redirect: "follow",
      });
      clearTimeout(timer);
      const json = await res.json().catch(() => null);
      if (!json || !json.ok) throw new Error((json && json.error) || "전송에 실패했어요.");
      receipt = json.receipt || "";
      $("#demoNote").hidden = true;
      // 사진을 다 저장하지 못했으면 알린다(F-15) — 옛 스크립트는 이 칸이 없다(안내 없음).
      const sent = Number(json.photosSent), saved = Number(json.photosSaved);
      if (Number.isFinite(sent) && Number.isFinite(saved) && sent > saved) {
        photoNote = saved > 0
          ? `사진 ${sent}장 중 ${sent - saved}장은 저장되지 않았어요. 상담 때 문자로 보내 주세요.`
          : `사진은 저장되지 않았어요. 상담 때 문자로 보내 주세요.`;
      }
    }
    $("#photoNote").textContent = photoNote;
    $("#photoNote").hidden = !photoNote;
    clearDraft();
    $("#receipt").textContent = receipt ? `접수번호 ${receipt}` : "접수 완료";
    $("#doneText").textContent = payload.email
      ? "담당자가 내용을 확인한 뒤 견적서를 문자와 이메일로 보내 드립니다."
      : "담당자가 내용을 확인한 뒤 견적서를 문자로 보내 드립니다.";
    $("#form").hidden = true; $("#bar").hidden = true; $("#side").hidden = true; $("#donePanel").hidden = false;
    $(".layout").classList.add("is-done");
    document.body.style.paddingBottom = "0";
    window.scrollTo({ top: 0, behavior: "smooth" });
    rewindHistory();           // 접수 뒤 '뒤로' 한 번이면 이 페이지를 떠나게
  } catch (err) {
    // 연결이 끊기거나(Safari "Load failed" · Chrome "Failed to fetch" — TypeError) 응답이 늦으면 서버에는 접수됐을 수 있다.
    // 영어 원문을 보이지 않고, 같은 연락처를 곧바로 다시 보내지 않게 안내한다(2026-10-09).
    const network = err.name === "AbortError" || err.name === "TypeError";
    const msg = network
      ? `${err.name === "AbortError" ? "응답이 늦어요." : "연결이 끊겼어요."} 접수됐을 수 있어요 — 10분 뒤 다시 보내거나`
      : `${err.message || "전송에 실패했어요."} 계속 안 되면`;
    toast(`${msg} ${CONFIG.COMPANY_PHONE}로 연락 주세요.`);
  } finally {
    sending = false; btn.disabled = false; $("#prevBtn").disabled = false; btn.textContent = "견적 요청 보내기";
  }
}

$("#againBtn").addEventListener("click", () => {
  $("#form").reset(); state.rooms.clear(); state.photos = []; planReset(); setScope("전체"); syncEmailNote();
  const a = $("#address"); a.readOnly = true;
  $("#detailWrap").hidden = true; $("#zipWrap").hidden = true;
  $("#pyeong").dispatchEvent(new Event("input")); syncDates();
  renderPhotos(); saveDraft();
  $("#form").hidden = false; $("#bar").hidden = false; $("#side").hidden = false; $("#donePanel").hidden = true;
  $(".layout").classList.remove("is-done");
  document.body.style.paddingBottom = "";
  current = "info";
  if ((history.state && history.state.idx) > 0) rewindHistory();
  else { navIdx = 0; try { history.replaceState({ step: current, idx: 0 }, ""); } catch {} }
  renderStep();
  window.scrollTo({ top: 0 });
});

// ── 시작 ─────────────────────────────────────────────────────────────
if (framedByOther) {   // 다른 사이트 틀 안(F-14) — 보내기는 submit이 막고, 새 창으로 여는 길을 보인다
  $("#frameNote").hidden = false;
  $("#frameOpen").href = location.href;
}
$("#deviceItem").hidden = !deviceActive();
// 이메일 칸 · 동의 표 줄 — 처리방침(2026-10-22) 시행부터.
$("#emailWrap").hidden = !emailActive();
$("#emailItem").hidden = !emailActive();
$("#emailPurpose").hidden = !emailActive();
$("#email").addEventListener("input", syncEmailNote);
// [선택] 문의 사례 · 견적서 공개 동의(SNS 홍보, 2026-10-20) — 처리방침(CONFIG.SNS_POLICY) 시행부터. 체크하지 않아도 보내기에는 영향 없음.
$("#publicConsentCard").hidden = !snsPolicyActive();
if (CONFIG.PRIVACY_URL) $("#publicPolicyLink").href = CONFIG.PRIVACY_URL + "#public";
else $("#publicPolicyWrap").hidden = true;
// 주소를 직접 고쳐 적으면 검색이 준 시 · 구를 버린다(다른 주소의 지역이 남지 않게). 새 요청 작성 때도.
$("#address").addEventListener("input", () => { addrRegion = { sido: "", sigungu: "" }; });
$("#againBtn").addEventListener("click", () => { addrRegion = { sido: "", sigungu: "" }; });
$("#email").addEventListener("blur", () => { const v = emailValue(); if (v) $("#email").value = v; if (!emailOk(v)) setInvalid("email"); });
syncEmailNote();
readCachedWebConfig();   // 지난번에 받은 설정이 있으면 먼저 — 새 설정은 아래 fetchWebConfig가 받아 바꾼다
renderRoomsDesc();
loadDraft();
planInit();
setScope(state.scope);
syncDates();
renderPhotos();
if ((history.state && history.state.idx) > 0) rewindHistory();   // 단계 중간에 새로 고침 — 처음 화면부터(이름 · 연락처는 저장하지 않으므로)
else { try { history.replaceState({ step: current, idx: 0 }, ""); } catch {} }
renderStep();
fetchWebConfig();
