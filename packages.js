/* 패키지 목록 v1 — 웹 견적요청 1단계(지시서 1104-03 개정 b · 통합 개정 a, 2026-11-04).
   ⚠️ 보안 설정(CSP connect-src)에 이 사이트가 없어 JSON 파일을 읽을 수 없다 — 그래서 스크립트로 싣는다.
   · 아래 { … } 부분은 그대로 JSON이다(앱 2단계가 packages.json으로 그대로 가져간다 — 빈칸 method · qty · labor는 2단계가 채움).
   · 상품 이름 = 앱 자재 DB · 웹 설정(webConfig.products)의 글자 그대로. 대조 키 = (공종, 항목명).
     공종 이름이 다르면(예: 마루 → 바닥재) 그 이름을 가진 공종이 하나뿐일 때만 그 공종으로 본다.
   · 이름이 하나라도 안 맞거나 덧방 컨셉에 대형 타일(긴 변 600mm 넘음)이 있으면 그 컨셉은 웹에서 숨는다(pkg.js).
   · 가격 없음(웹 가격 없음 · 표시광고법). 사진 없음(색 칩만).
   · 고칠 때 index.html의 packages.js?v= 값을 바꾼다.
   · 2026-11-05(사장님 결정 추천 A): 화장실 4컨셉 '천장 돔 시공' 뺌(천장은 견적 때) · 주방 '기본 싱크대' = 실서버 '싱크대 기본 구성 (1mm 당)' 하나(벽타일은 견적 때). */
const PACKAGES_V1 = {
  "v": 1,
  "rev": "2026-11-05",
  "tiers": [
    {
      "id": "basic",
      "name": "일반 패키지",
      "short": "일반",
      "sub": "표준 자재 · 기본 마감",
      "categories": [
        { "id": "wall", "name": "도배", "target": "whole", "method": null, "concepts": [
          { "id": "basic-wall-plain", "name": "깔끔 합지", "star": true, "desc": "장폭 합지 벽지",
            "swatch": ["#F4F1EA", "#E6E1D6", "#CFC8BA"],
            "items": [{ "trade": "도배", "name": "휘앙세 장폭합지", "qty": null }], "labor": null }
        ]},
        { "id": "floor", "name": "바닥재", "target": "whole", "method": null, "concepts": [
          { "id": "basic-floor-std", "name": "표준 강마루", "star": true, "desc": "7.5T 강마루 · 95mm 폭",
            "swatch": ["#C8A27A", "#A97F57", "#7E5A3A"],
            "items": [{ "trade": "마루", "name": "나투스강 7.5T 강마루", "qty": null }], "labor": null }
        ]},
        { "id": "kitchen", "name": "주방가구", "target": "주방", "method": null, "concepts": [
          { "id": "common-kitchen-basic", "name": "기본 싱크대", "star": true, "desc": "상 · 하부장 + 대리석 상판 · 후드 · 수전",
            "swatch": ["#F2F2F0", "#CFCFCB", "#8E8E8A"],
            "items": [{ "trade": "제작가구", "name": "싱크대 기본 구성 (1mm 당)", "qty": null }], "labor": null }
        ]},
        { "id": "bath", "name": "화장실", "target": "욕실", "method": "덧방", "concepts": [
          { "id": "basic-bath-white", "name": "화이트 클린", "star": true, "desc": "화이트 유광 벽 · 300×600",
            "swatch": ["#F2F2F0", "#D8D8D6", "#B9BDC2"],
            "items": [{ "trade": "타일", "name": "CW 7001 화이트 유광 서브웨이 벽타일 (300×600)", "qty": null },
                      { "trade": "타일", "name": "VG3309 욕실 바닥 자기질 (300×300)", "qty": null },
                      { "trade": "욕실", "name": "사각 반다리 세면기 CL-370", "qty": null },
                      { "trade": "욕실", "name": "모닝 4인치 세면수전 HY-319", "qty": null },
                      { "trade": "욕실", "name": "모닝 샤워수전 HY-119", "qty": null },
                      { "trade": "욕실", "name": "CC-766 투피스 양변기", "qty": null }], "labor": null },
          { "id": "basic-bath-gray", "name": "웜 그레이", "star": false, "desc": "진그레이 유광 벽 · 논슬립 바닥",
            "swatch": ["#8A8784", "#6B6966", "#3F3E3C"],
            "items": [{ "trade": "타일", "name": "CW 7003 진그레이 유광 서브웨이 벽타일 (300×600)", "qty": null },
                      { "trade": "타일", "name": "GGK9394 욕실 바닥 논슬립 (300×300)", "qty": null },
                      { "trade": "욕실", "name": "아르노 라운드 반다리 세면기 CL-384", "qty": null },
                      { "trade": "욕실", "name": "세면·샤워 겸용 수전 DL-YB6A15", "qty": null },
                      { "trade": "욕실", "name": "CC-766 투피스 양변기", "qty": null }], "labor": null }
        ]}
      ]
    },
    {
      "id": "premium",
      "name": "고급 패키지",
      "short": "고급",
      "sub": "상위 자재 · 마감 강화",
      "categories": [
        { "id": "wall", "name": "도배", "target": "whole", "method": null, "concepts": [
          { "id": "premium-wall-silk", "name": "실크", "star": true, "desc": "실크 벽지 · 106cm 폭",
            "swatch": ["#F7F5F0", "#E9E4DA", "#D6CFC1"],
            "items": [{ "trade": "도배", "name": "디아망 실크벽지", "qty": null }], "labor": null }
        ]},
        { "id": "floor", "name": "바닥재", "target": "whole", "method": null, "concepts": [
          { "id": "premium-floor-wide", "name": "광폭 마루", "star": true, "desc": "7T 강마루 · 325mm 광폭",
            "swatch": ["#D2B48C", "#B08D63", "#8A6A45"],
            "items": [{ "trade": "마루", "name": "나투스진 그란데 7T 강마루", "qty": null }], "labor": null },
          { "id": "premium-floor-stone", "name": "스톤 룩", "star": false, "desc": "돌 무늬 · 450×900",
            "swatch": ["#E3E1DC", "#BDBAB3", "#8F8C86"],
            "items": [{ "trade": "마루", "name": "에디톤 스톤 5T (450×900)", "qty": null }], "labor": null }
        ]},
        { "id": "kitchen", "name": "주방가구", "target": "주방", "method": null, "concepts": [
          { "id": "common-kitchen-basic", "name": "기본 싱크대", "star": true, "desc": "상 · 하부장 + 대리석 상판 · 후드 · 수전",
            "swatch": ["#F2F2F0", "#CFCFCB", "#8E8E8A"],
            "items": [{ "trade": "제작가구", "name": "싱크대 기본 구성 (1mm 당)", "qty": null }], "labor": null }
        ]},
        { "id": "bath", "name": "화장실", "target": "욕실", "method": "철거", "concepts": [
          { "id": "premium-bath-stone", "name": "스톤 샤워", "star": true, "desc": "포세린 600×1200 · 탑볼 세면기",
            "swatch": ["#E9E7E2", "#BFC1C3", "#8D9094"],
            "items": [{ "trade": "타일", "name": "LC 스톤챗 화이트 포세린 (600×1200)", "qty": null },
                      { "trade": "타일", "name": "LECCE 01 라이트그레이 포세린 (600×600)", "qty": null },
                      { "trade": "욕실", "name": "시그니처 탑볼 세면기 CCAS0628", "qty": null },
                      { "trade": "욕실", "name": "리비어 원홀 세면수전 FA1614", "qty": null },
                      { "trade": "욕실", "name": "보스톤 원피스 양변기 C209300C", "qty": null }], "labor": null },
          { "id": "premium-bath-beige", "name": "웜 베이지", "star": false, "desc": "베이지 포세린 600×600 · 슬림 탑볼",
            "swatch": ["#E8DCCB", "#CDB89C", "#9C8468"],
            "items": [{ "trade": "타일", "name": "비바 베이지 포세린 (600×600)", "qty": null },
                      { "trade": "타일", "name": "GGK8394 욕실 바닥 논슬립 (300×300)", "qty": null },
                      { "trade": "욕실", "name": "슬림 탑볼 세면기 CL-826", "qty": null },
                      { "trade": "욕실", "name": "세면·샤워 겸용 수전 DL-YB6A15", "qty": null },
                      { "trade": "욕실", "name": "CC-214 원피스 치마형 양변기", "qty": null }], "labor": null }
        ]}
      ]
    }
  ]
};
