import './style.css';
import pako from 'pako';
import { jsPDF } from 'jspdf';

// 12 Diagram Templates
const TEMPLATES = {
  sequence: {
    title: 'Sequence Diagram',
    description: '객체 간의 상호작용과 시간적 흐름을 시각화합니다. 서비스 간의 API 호출 흐름이나 프로세스 흐름을 정의할 때 주로 사용됩니다.',
    code: `@startuml
title 사용자 인증 및 JWT 발급 흐름

actor "사용자 (Browser)" as user
participant "API 게이트웨이" as gateway
participant "인증 서비스" as auth
database "세션 캐시 (Redis)" as cache

user -> gateway : POST /api/auth/login\\n(아이디 & 비밀번호)
activate gateway

gateway -> auth : 인증 요청
activate auth

auth -> auth : 비밀번호 해시 검증
alt 인증 성공
  auth -> cache : 세션 토큰 저장\\n(만료시간: 1시간)
  activate cache
  cache --> auth : 저장 완료
  deactivate cache
  
  auth --> gateway : 인증 승인 (JWT 발급)
  deactivate auth
  
  gateway --> user : 200 OK (JWT 헤더 전달)
else 인증 실패
  auth --> gateway : 401 Unauthorized
  gateway --> user : 로그인 정보 불일치 에러
end
deactivate gateway

@enduml`
  },
  class: {
    title: 'Class Diagram',
    description: '시스템의 정적 구조를 설계하고 클래스, 속성, 메서드 및 클래스 간의 관계를 보여줍니다.',
    code: `@startuml
title E-Commerce 주문 도메인 구조

interface PaymentStrategy {
  + pay(amount: double): boolean
}

class CreditCardPayment {
  - cardNumber: String
  - cardHolder: String
  - expiryDate: String
  + pay(amount: double): boolean
}

class PayPalPayment {
  - email: String
  + pay(amount: double): boolean
}

class Customer {
  - id: Long
  - name: String
  - email: String
  + getOrders(): List<Order>
}

class Order {
  - orderId: String
  - totalAmount: double
  - status: OrderStatus
  - items: List<OrderItem>
  + calculateTotal(): double
  + processPayment(strategy: PaymentStrategy): boolean
}

class OrderItem {
  - productId: String
  - quantity: int
  - unitPrice: double
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  CANCELLED
}

PaymentStrategy <|.. CreditCardPayment
PaymentStrategy <|.. PayPalPayment
Customer "1" *-- "many" Order : 주문 내역
Order "1" *-- "many" OrderItem : 포함
Order o-- PaymentStrategy : 결제 방식 선택
Order --> OrderStatus

@enduml`
  },
  usecase: {
    title: 'Use Case Diagram',
    description: '사용자의 관점에서 시스템이 제공해야 하는 기능적 요구사항을 정의합니다.',
    code: `@startuml
title 레스토랑 예약 시스템 유스케이스

left to right direction

actor "고객" as customer
actor "직원" as staff
actor "시스템 관리자" as admin

rectangle "레스토랑 예약 서비스" {
  usecase "테이블 조회" as UC1
  usecase "예약 신청" as UC2
  usecase "예약 변경/취소" as UC3
  usecase "알림 수신 (SMS)" as UC4
  usecase "예약 확인 및 승인" as UC5
  usecase "매장 레이아웃 변경" as UC6
}

customer --> UC1
customer --> UC2
customer --> UC3
UC2 ..> UC4 : <<include>>

staff --> UC5
admin --> UC6

@enduml`
  },
  activity: {
    title: 'Activity Diagram',
    description: '시스템의 실행 및 비즈니스 프로세스의 워크플로우를 절차적으로 나타냅니다.',
    code: `@startuml
title 상품 결제 프로세스

start
:결제 페이지 진입;
:결제 수단 선택;

if (결제 수단이 신용카드인가?) then (yes)
  :카드 번호 및 CVC 입력;
  :PG사 인증 요청;
else (no)
  :간편결제 앱 호출;
  :생체인증 진행;
endif

:결제 요청 처리;

if (결제 성공?) then (yes)
  :주문 완료 데이터 생성;
  :재고 수량 차감;
  :결제 완료 페이지 표시;
  stop
else (no)
  :에러 메시지 출력;
  if (재시도 회수 초과?) then (yes)
    :결제 취소 처리;
    stop
  else (no)
    :결제 수단 선택 화면으로 이동;
    detach
  fi
endif

@enduml`
  },
  state: {
    title: 'State Diagram',
    description: '객체의 수명 주기 동안 발생하는 상태 변화와 이벤트를 표현합니다.',
    code: `@startuml
title 주문 배송 수명 주기 상태도

[*] --> Pending : 주문 생성

Pending --> Paid : 결제 완료
Pending --> Cancelled : 결제 타임아웃

Paid --> Preparing : 출고 대기
Paid --> Cancelled : 고객 환불 요청

Preparing --> Shipped : 택배사 인계

Shipped --> Delivered : 배송 완료
Shipped --> Preparing : 배송 사고 (재발송)

Delivered --> Returned : 교환/반품 신청
Delivered --> Completed : 7일 경과 (구매 확정)

Returned --> Preparing : 교환 처리
Returned --> Refunded : 반품 완료

Refunded --> [*]
Completed --> [*]
Cancelled --> [*]

@enduml`
  },
  component: {
    title: 'Component Diagram',
    description: '물리적인 컴포넌트의 구성과 이들 간의 인터페이스/의존 관계를 설명합니다.',
    code: `@startuml
title 온라인 쇼핑몰 서비스 아키텍처

package "웹/모바일 클라이언트" {
  [React Web Application] as web
  [Flutter Mobile App] as mobile
}

package "API 게이트웨이 영역" {
  [Kong API Gateway] as gateway
}

package "마이크로서비스 영역" {
  [Auth Service] as auth
  [Product Service] as product
  [Order Service] as order
}

database "데이터 스토어" {
  [User DB (MySQL)] as db_user
  [Catalog DB (MongoDB)] as db_product
  [Order DB (PostgreSQL)] as db_order
}

web --> gateway : REST API / JSON
mobile --> gateway : REST API / JSON

gateway --> auth : gRPC
gateway --> product : gRPC
gateway --> order : gRPC

auth --> db_user
product --> db_product
order --> db_order

@enduml`
  },
  deployment: {
    title: 'Deployment Diagram',
    description: '하드웨어 구조와 그 위에 배치되는 소프트웨어 컴포넌트 간의 매핑을 설계합니다.',
    code: `@startuml
title 클라우드 인프라 배포 설계도

node "Client Browser" {
  [Single Page App] as SPA
}

node "AWS Cloud Route 53" {
  [DNS Service] as Route53
}

node "Virtual Private Cloud (VPC)" {
  node "Public Subnet" {
    [Application Load Balancer] as ALB
  }
  
  node "Private Subnet (App Node)" {
    node "EC2 Instance 1" {
      [Docker (Node.js API)] as app1
    }
    node "EC2 Instance 2" {
      [Docker (Node.js API)] as app2
    }
  }

  node "Private Subnet (DB Node)" {
    database "Amazon RDS (Multi-AZ)" {
      [PostgreSQL Primary] as db_main
    }
  }
}

SPA --> Route53 : 도메인 조회
SPA --> ALB : HTTPS (Port 443)
ALB --> app1 : HTTP (Port 8080)
ALB --> app2 : HTTP (Port 8080)
app1 --> db_main : SQL Connection
app2 --> db_main : SQL Connection

@enduml`
  },
  timing: {
    title: 'Timing Diagram',
    description: '시간 경과에 따른 객체의 상태 변화 및 시간 제약 조건들을 정밀하게 정의합니다.',
    code: `@startuml
title IoT 디바이스와 통신 서버 타이밍

robust "스마트 조명 (Device)" as light
concise "통신 서버 (Server)" as server

@0
light is Off
server is Idle

@100
light is Connecting
server is Awaiting

@200
light is Connected
server is Active

@400
light is StatusReporting
server is Processing

@500
light is Connected
server is Active

@700
light is Off
server is Idle
@enduml`
  },
  gantt: {
    title: 'Gantt Chart',
    description: '프로젝트 일정 계획 및 작업의 시작/종료 시점, 리소스 할당을 보여줍니다.',
    code: `@startgantt
title 모바일 뱅킹 프로젝트 개발 일정

[요구사항 정의] lasts 7 days
[시스템 구조 설계] lasts 10 days
[시스템 구조 설계] starts at [요구사항 정의]'s end

-- 개발 단계 --
[데이터베이스 설계] lasts 5 days
[데이터베이스 설계] starts at [시스템 구조 설계]'s end
[API 백엔드 개발] lasts 15 days
[API 백엔드 개발] starts at [데이터베이스 설계]'s end
[UI 프론트엔드 개발] lasts 12 days
[UI 프론트엔드 개발] starts at [데이터베이스 설계]'s end

-- 검증 및 출시 --
[통합 테스트 & QA] lasts 8 days
[통합 테스트 & QA] starts at [API 백엔드 개발]'s end
[App Store 심사 요청] lasts 4 days
[App Store 심사 요청] starts at [통합 테스트 & QA]'s end

@endgantt`
  },
  mindmap: {
    title: 'MindMap',
    description: '브레인스토밍 및 생각을 트리 구조로 정리하여 핵심 개념들을 도식화합니다.',
    code: `@startmindmap
title 서비스 고도화 아이디어 맵

* 2026 로드맵
** 인공지능 통합
*** 다이어그램 자동화
*** 에디터 코파일럿
** 저장소 및 보관
*** 클라우드 동기화
*** 깃허브(GitHub) 연동
** 사용자 경험 개선
*** 실시간 동시 편집
*** UI 컴포넌트 라이브러리
** 마케팅
*** OntoCraft 커뮤니티
*** 템플릿 마켓플레이스

@endmindmap`
  },
  wbs: {
    title: 'WBS Diagram',
    description: '작업 분할 구조(Work Breakdown Structure)를 계층형 차트로 나타냅니다.',
    code: `@startwbs
title 웹 서비스 구축 WBS

* 프로젝트 착수
** 1. 기획 단계
*** 1.1 요구사항 정의서 작성
*** 1.2 화면 설계(Storyboards) 진행
** 2. 디자인 단계
*** 2.1 UI/UX 스타일 가이드라인 확정
*** 2.2 메인/서브 페이지 프로토타이핑
** 3. 개발 단계
*** 3.1 인프라 환경 구축 (CI/CD)
*** 3.2 핵심 데이터베이스 구조 설계
*** 3.3 백엔드 및 클라이언트 API 개발
** 4. 운영 준비 단계
*** 4.1 서비스 오픈 베타 테스트
*** 4.2 매뉴얼 배포 및 교육 진행

@endwbs`
  },
  json: {
    title: 'JSON/YAML Diagram',
    description: 'JSON 또는 YAML 구조 데이터를 직관적인 그래프 구조로 변환하여 보여줍니다.',
    code: `@startjson
title 프로젝트 설정 데이터 예시

{
  "project": "OntoCraft Studio",
  "version": "2.4.0-Beta",
  "features": {
    "syntaxHighlighting": true,
    "realtimeRendering": true,
    "exportFormats": ["PNG", "SVG", "PDF"]
  },
  "contributors": [
    {
      "name": "Daan",
      "role": "Lead Architect"
    },
    {
      "name": "OntoCraft Team",
      "role": "Reviewer"
    }
  ],
  "activeWorkspace": {
    "directory": "/scratch/plantuml-editor",
    "files": 4,
    "status": "Production-Ready"
  }
}
@endjson`
  }
};

// Monaco Editor Instance
let editor = null;
let currentTemplate = 'sequence';

// Zoom and Pan States
let zoomScale = 1.0;
const ZOOM_STEP = 0.1;
const ZOOM_MAX = 3.0;
const ZOOM_MIN = 0.2;
let isPanning = false;
let startScrollLeft = 0;
let startScrollTop = 0;
let startClientX = 0;
let startClientY = 0;

// Setup Monaco Editor via AMD Loader (with fallback to textarea)
function initEditor() {
  // If Monaco CDN is blocked or unavailable
  if (typeof window.require === 'undefined') {
    console.warn("Monaco loader is not defined, falling back to basic editor.");
    useFallbackEditor();
    return;
  }

  try {
    window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
    
    window.require(['vs/editor/editor.main'], function() {
      const container = document.getElementById('monaco-container');
      editor = window.monaco.editor.create(container, {
        value: getInitialCode(),
        language: 'plaintext',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: 'Fira Code, monospace',
        minimap: { enabled: false },
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8
        },
        wordWrap: 'on',
        padding: { top: 12 }
      });

      // Editor content change listener (debounced auto-render)
      let renderTimeout;
      editor.onDidChangeModelContent(() => {
        saveDraft();
        const autoRender = document.getElementById('auto-render-toggle').checked;
        if (autoRender) {
          clearTimeout(renderTimeout);
          renderTimeout = setTimeout(renderDiagram, 800); // 800ms debounce
        }
      });

      // Add Ctrl+Enter shortcut for manual rendering
      editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, () => {
        renderDiagram();
      });

      // Render initial diagram
      renderDiagram();
    }, function(error) {
      console.error("Failed to load Monaco module, falling back.", error);
      useFallbackEditor();
    });
  } catch (e) {
    console.error("Monaco configuration exception, falling back.", e);
    useFallbackEditor();
  }
}

// Fallback editor in case CDN or script is blocked
function useFallbackEditor() {
  const container = document.getElementById('monaco-container');
  container.innerHTML = `<textarea id="fallback-textarea" class="fallback-textarea" placeholder="이곳에 PlantUML 스크립트를 입력해 주세요..."></textarea>`;
  const textarea = document.getElementById('fallback-textarea');
  textarea.value = getInitialCode();

  let renderTimeout;
  textarea.addEventListener('input', () => {
    saveDraft();
    const autoRender = document.getElementById('auto-render-toggle').checked;
    if (autoRender) {
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(renderDiagram, 800);
    }
  });

  // Mock the Monaco editor instance
  editor = {
    getValue: () => textarea.value,
    setValue: (val) => { textarea.value = val; }
  };

  renderDiagram();
}

// Copyright Injector Logic
// Inserts "right footer OntoCraft.com" for footer-compatible diagrams
function injectCopyright(script) {
  if (!script) return '';
  
  // Don't inject if copyright already exists
  if (script.includes('OntoCraft.com')) {
    return script;
  }

  // Categories supporting footer/right footer
  const footerCompatibleTags = ['uml', 'gantt', 'wbs', 'mindmap', 'state', 'activity', 'sequence', 'usecase', 'class', 'component', 'deployment', 'object'];

  // Check matching @start... tag
  const startMatch = script.match(/@start(\w+)/i);
  if (startMatch) {
    const tag = startMatch[1].toLowerCase();
    if (footerCompatibleTags.includes(tag)) {
      const endRegex = new RegExp(`@end${tag}`, 'i');
      if (endRegex.test(script)) {
        return script.replace(endRegex, `\nright footer OntoCraft.com\n@end${tag}`);
      }
    }
    // For unsupported types (like json or yaml) or tags without proper closed end block
    return script;
  }

  // If no start tag exists, PlantUML defaults to @startuml ... @enduml
  // So we append the copyright footer safely
  return script.trim() + '\nright footer OntoCraft.com';
}

// PlantUML Encoder
// raw deflate + mapping to standard PlantUML Base64
function encodePlantUML(text) {
  // UTF-8 encode
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Deflate Raw
  const compressed = pako.deflateRaw(data);
  
  // Custom Base64 mapping
  return encode64(compressed);
}

function encode64(data) {
  let r = '';
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 < data.length) {
      r += append3bytes(data[i], data[i + 1], data[i + 2]);
    } else if (i + 1 < data.length) {
      r += append3bytes(data[i], data[i + 1], 0);
    } else {
      r += append3bytes(data[i], 0, 0);
    }
  }
  return r;
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  let r = '';
  r += encode6bit(c1 & 0x3F);
  r += encode6bit(c2 & 0x3F);
  r += encode6bit(c3 & 0x3F);
  r += encode6bit(c4 & 0x3F);
  return r;
}

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b); // '0'-'9'
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b); // 'A'-'Z'
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b); // 'a'-'z'
  b -= 26;
  if (b === 0) return '-';
  if (b === 1) return '_';
  return '?';
}

// Generate image urls
function getRenderUrls(rawScript) {
  const finalScript = injectCopyright(rawScript);
  const encoded = encodePlantUML(finalScript);
  return {
    png: `https://www.plantuml.com/plantuml/png/${encoded}`,
    svg: `https://www.plantuml.com/plantuml/svg/${encoded}`
  };
}

// Render Core
function renderDiagram() {
  if (!editor) return;

  const script = editor.getValue().trim();
  const loadingEl = document.getElementById('diagram-loading');
  const emptyEl = document.getElementById('diagram-empty');
  const errorEl = document.getElementById('diagram-error');
  const containerEl = document.getElementById('diagram-container');
  const imgEl = document.getElementById('diagram-img');

  if (!script) {
    emptyEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    containerEl.classList.add('hidden');
    loadingEl.classList.add('hidden');
    return;
  }

  // Show Loading Spinner
  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  const urls = getRenderUrls(script);

  // Set PNG to image source
  imgEl.src = urls.png;

  imgEl.onload = () => {
    loadingEl.classList.add('hidden');
    containerEl.classList.remove('hidden');
    resetZoom();
  };

  imgEl.onerror = () => {
    loadingEl.classList.add('hidden');
    containerEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    document.getElementById('error-message').textContent = '문법 구문 오류가 있거나 PlantUML 서버 응답에 문제가 있습니다.';
  };
}

// Zoom & Pan Mechanics
const viewport = document.getElementById('diagram-viewport');
const container = document.getElementById('diagram-container');

function updateTransform() {
  const imgEl = document.getElementById('diagram-img');
  if (imgEl.naturalWidth) {
    imgEl.style.width = `${imgEl.naturalWidth * zoomScale}px`;
    imgEl.style.height = `${imgEl.naturalHeight * zoomScale}px`;
  }
  document.getElementById('zoom-level').textContent = `${Math.round(zoomScale * 100)}%`;
}

function resetZoom() {
  zoomScale = 1.0;
  updateTransform();
  // Center the diagram in viewport scroll view
  setTimeout(() => {
    viewport.scrollLeft = (container.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (container.scrollHeight - viewport.clientHeight) / 2;
  }, 50);
}

// Zoom Handlers
document.getElementById('zoom-in-btn').addEventListener('click', () => {
  zoomScale = Math.min(zoomScale + ZOOM_STEP, ZOOM_MAX);
  updateTransform();
});

document.getElementById('zoom-out-btn').addEventListener('click', () => {
  zoomScale = Math.max(zoomScale - ZOOM_STEP, ZOOM_MIN);
  updateTransform();
});

document.getElementById('zoom-reset-btn').addEventListener('click', () => {
  resetZoom();
});

// Viewport Zoom via Wheel
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  zoomScale = Math.min(Math.max(zoomScale + delta, ZOOM_MIN), ZOOM_MAX);
  updateTransform();
}, { passive: false });

// Pan Event Handlers (using Scroll adjustments)
viewport.addEventListener('mousedown', (e) => {
  // Only pan if we are clicking on viewport, container, or image
  if (e.target.id === 'diagram-viewport' || e.target.id === 'diagram-container' || e.target.id === 'diagram-img') {
    isPanning = true;
    startScrollLeft = viewport.scrollLeft;
    startScrollTop = viewport.scrollTop;
    startClientX = e.clientX;
    startClientY = e.clientY;
    viewport.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  const dx = e.clientX - startClientX;
  const dy = e.clientY - startClientY;
  viewport.scrollLeft = startScrollLeft - dx;
  viewport.scrollTop = startScrollTop - dy;
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    viewport.style.cursor = 'default';
  }
});

// Dropdown Export Menu Toggle
const exportBtn = document.getElementById('export-dropdown-btn');
const exportMenu = document.getElementById('export-menu');

exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle('show');
});

document.addEventListener('click', () => {
  exportMenu.classList.remove('show');
});

// Exporters (PNG, SVG, PDF)
async function downloadFile(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error');
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    alert('파일을 다운로드하는 과정에서 오류가 발생했습니다: ' + error.message);
  }
}

// PDF Exporter using jsPDF
async function exportToPDF(pngUrl, filename) {
  try {
    const response = await fetch(pngUrl);
    if (!response.ok) throw new Error('Network error');
    const blob = await response.blob();
    
    // Read blob as DataURL
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result;
      
      // Load image to determine its dimensions
      const img = new Image();
      img.src = base64data;
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        // Setup jsPDF corresponding to image dimension (1px = 1 unit)
        const pdf = new jsPDF({
          orientation: width > height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [width, height]
        });
        
        pdf.addImage(base64data, 'PNG', 0, 0, width, height);
        pdf.save(filename);
      };
    };
  } catch (error) {
    alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
  }
}

// Add click listeners to export menu options
exportMenu.addEventListener('click', (e) => {
  const item = e.target.closest('.export-item');
  if (!item || !editor) return;
  
  const format = item.getAttribute('data-format');
  const script = editor.getValue().trim();
  if (!script) {
    alert('내보낼 다이어그램 스크립트가 없습니다.');
    return;
  }
  
  const urls = getRenderUrls(script);
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `ontocraft_diagram_${timestamp}`;

  if (format === 'png') {
    downloadFile(urls.png, `${filename}.png`);
  } else if (format === 'svg') {
    downloadFile(urls.svg, `${filename}.svg`);
  } else if (format === 'pdf') {
    exportToPDF(urls.png, `${filename}.pdf`);
  } else if (format === 'puml') {
    savePumlFile(script, `${filename}.puml`);
  } else if (format === 'print') {
    window.print();
  }
});

// Sidebar & Template Panel Logic
const templatePanel = document.getElementById('template-panel');
const templateTitle = document.getElementById('template-title');
const templateDesc = document.getElementById('template-description');
const applyTemplateBtn = document.getElementById('apply-template-btn');
const closePanelBtn = document.getElementById('close-panel-btn');
const thumbnailEl = document.getElementById('template-thumbnail');

// Close sidebar panel drawer
closePanelBtn.addEventListener('click', () => {
  templatePanel.classList.remove('open');
});

// Nav items click handler
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active style from other items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Add active styling
    btn.classList.add('active');
    
    const key = btn.getAttribute('data-diagram');
    currentTemplate = key;

    // Set text details in Drawer
    templateTitle.textContent = TEMPLATES[key].title;
    templateDesc.textContent = TEMPLATES[key].description;
    
    // Customize preview inside thumbnail based on selection
    thumbnailEl.innerHTML = btn.querySelector('svg').outerHTML;

    // Open Drawer
    templatePanel.classList.add('open');
  });
});

// Apply chosen template to Monaco Editor
applyTemplateBtn.addEventListener('click', () => {
  if (editor && TEMPLATES[currentTemplate]) {
    editor.setValue(TEMPLATES[currentTemplate].code);
    renderDiagram();
    templatePanel.classList.remove('open');
  }
});

// Manual rendering button click
document.getElementById('render-btn').addEventListener('click', () => {
  renderDiagram();
});

// Editor clear button click
document.getElementById('clear-editor-btn').addEventListener('click', () => {
  if (editor && confirm('정말 에디터를 비우시겠습니까?')) {
    editor.setValue('');
    renderDiagram();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
});

// ── 공유 · 파일 · 자동 저장 ──────────────────────────────────────────
// 셋 다 브라우저 안에서 끝난다. 서버도 저장소도 쓰지 않는다.
// 링크 공유는 코드를 압축해 주소 뒤에 붙이는 방식이라, 우리 서버가 멈춰도 링크는 살아 있다.

const DRAFT_KEY = 'plantuml-studio:draft';
const LONG_URL_WARN = 2000;

// PlantUML 인코딩의 역. encodePlantUML 이 쓰는 알파벳을 그대로 되짚는다.
function decode6bit(c) {
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;       // '0'-'9'
  if (code >= 65 && code <= 90) return code - 65 + 10;  // 'A'-'Z'
  if (code >= 97 && code <= 122) return code - 97 + 36; // 'a'-'z'
  if (c === '-') return 62;
  if (c === '_') return 63;
  return -1;
}

function decode64(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i += 4) {
    const c1 = decode6bit(s[i]);
    const c2 = decode6bit(s[i + 1] || '0');
    const c3 = decode6bit(s[i + 2] || '0');
    const c4 = decode6bit(s[i + 3] || '0');
    if (c1 < 0 || c2 < 0) break;
    bytes.push(((c1 << 2) | (c2 >> 4)) & 0xFF);
    if (i + 2 < s.length) bytes.push(((c2 << 4) | (c3 >> 2)) & 0xFF);
    if (i + 3 < s.length) bytes.push(((c3 << 6) | c4) & 0xFF);
  }
  return new Uint8Array(bytes);
}

function decodePlantUML(encoded) {
  return new TextDecoder().decode(pako.inflateRaw(decode64(encoded)));
}

// 열 때 무엇을 보여 줄지: 링크에 담긴 코드 > 저장해 둔 작업 > 기본 템플릿.
// 링크가 이기는 까닭은, 누가 보내 준 링크를 열었는데 내 옛 작업이 뜨면 안 되기 때문이다.
function getInitialCode() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    try {
      const code = decodePlantUML(hash);
      if (code.includes('@start')) return code;
    } catch (err) {
      console.warn('[share] 링크의 코드를 읽지 못했습니다', err);
    }
  }
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved && saved.trim()) return saved;
  } catch (err) {
    // 사생활 보호 모드 등에서 막힌다. 기본 템플릿으로 간다.
  }
  return TEMPLATES.sequence.code;
}

let draftTimer;
function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      if (editor) localStorage.setItem(DRAFT_KEY, editor.getValue());
    } catch (err) {
      // 저장 공간이 없거나 막혀 있으면 그냥 넘어간다. 편집을 막지 않는다.
    }
  }, 500);
}

function showToast(message) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2400);
}

async function copyShareLink() {
  if (!editor) return;
  const script = editor.getValue().trim();
  if (!script) {
    alert('공유할 코드가 없습니다.');
    return;
  }

  const encoded = encodePlantUML(script);
  const url = `${location.origin}${location.pathname}#${encoded}`;

  if (url.length > LONG_URL_WARN) {
    const ok = confirm(
      `다이어그램이 길어 링크가 ${url.length}자입니다.\n` +
      '메신저에 따라 잘릴 수 있습니다. 그런 경우에는 .puml 파일로 저장해 보내세요.\n\n' +
      '그래도 링크를 복사할까요?'
    );
    if (!ok) return;
  }

  // 주소창도 같이 바꿔 둔다. 새로고침해도 같은 다이어그램이 열린다.
  history.replaceState(null, '', `#${encoded}`);

  try {
    await navigator.clipboard.writeText(url);
    showToast('링크를 복사했습니다');
  } catch (err) {
    window.prompt('아래 링크를 복사하세요', url);
  }
}

function savePumlFile(script, filename) {
  const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`${filename} 으로 저장했습니다`);
}

async function loadFile(file) {
  if (!file || !editor) return;
  const text = await file.text();
  if (!text.trim()) {
    alert('파일이 비어 있습니다.');
    return;
  }
  if (editor.getValue().trim() && !confirm('지금 코드를 파일 내용으로 바꿉니다. 계속할까요?')) {
    return;
  }
  editor.setValue(text);
  renderDiagram();
  showToast(`${file.name} 을 열었습니다`);
}

const shareBtn = document.getElementById('share-btn');
const openFileBtn = document.getElementById('open-file-btn');
const fileInput = document.getElementById('file-input');

if (shareBtn) shareBtn.addEventListener('click', copyShareLink);

if (openFileBtn && fileInput) {
  openFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    await loadFile(fileInput.files && fileInput.files[0]);
    fileInput.value = ''; // 같은 파일을 다시 골라도 열리게
  });
}

// 끌어다 놓아도 열린다. 파일을 고르는 것보다 이쪽이 빠른 사람이 있다.
const editorWrapper = document.querySelector('.editor-wrapper');
if (editorWrapper) {
  editorWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    editorWrapper.classList.add('is-dropping');
  });
  editorWrapper.addEventListener('dragleave', () => {
    editorWrapper.classList.remove('is-dropping');
  });
  editorWrapper.addEventListener('drop', async (e) => {
    e.preventDefault();
    editorWrapper.classList.remove('is-dropping');
    await loadFile(e.dataTransfer && e.dataTransfer.files[0]);
  });
}
