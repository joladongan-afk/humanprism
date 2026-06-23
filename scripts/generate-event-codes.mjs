#!/usr/bin/env node

/**
 * 이벤트 상담 플랜 시크릿 코드 생성 스크립트
 * 
 * 사용법:
 *   node scripts/generate-event-codes.mjs
 * 
 * 출력:
 *   100개의 무작위 코드 (HUMAN + 1~1000)
 *   예: HUMAN847,HUMAN312,HUMAN591,...
 */

function generateEventCodes(count = 100) {
  const codes = [];
  const used = new Set();
  
  while (codes.length < count) {
    // 1~1000 사이의 무작위 숫자 생성
    const num = Math.floor(Math.random() * 1000) + 1;
    const code = `HUMAN${String(num).padStart(3, '0')}`;
    
    // 중복 방지
    if (!used.has(code)) {
      codes.push(code);
      used.add(code);
    }
  }
  
  return codes;
}

// 코드 생성
const codes = generateEventCodes(100);

// 결과 출력
console.log('='.repeat(80));
console.log('이벤트 상담 플랜 시크릿 코드 100개 생성');
console.log('='.repeat(80));
console.log('');
console.log('📋 생성된 코드 목록:');
console.log('');
console.log(codes.join(','));
console.log('');
console.log('='.repeat(80));
console.log('');
console.log('✅ 사용 방법:');
console.log('');
console.log('1. 위의 코드를 복사합니다.');
console.log('');
console.log('2. webdev_request_secrets를 통해 EVENT_CODES 환경변수로 설정합니다:');
console.log('   - 키: EVENT_CODES');
console.log('   - 값: 위의 쉼표로 구분된 코드 목록');
console.log('');
console.log('3. 서버가 재시작되면 자동으로 DB에 저장됩니다.');
console.log('');
console.log('📊 통계:');
console.log(`   - 총 코드 수: ${codes.length}`);
console.log(`   - 형식: HUMAN + 001~999 (3자리 숫자)`);
console.log(`   - 각 코드는 1회만 사용 가능`);
console.log('');
console.log('⚠️  주의:');
console.log('   - 이 코드들은 운영자만 알고 있어야 합니다.');
console.log('   - 사용자에게는 필요한 코드만 개별 전달하세요.');
console.log('   - 코드가 소진되면 이 스크립트를 다시 실행하여 새 코드를 생성하세요.');
console.log('');
console.log('='.repeat(80));
