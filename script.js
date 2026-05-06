document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            alert('환영합니다! 프로젝트 설정을 시작하겠습니다.');
            
            // 약간의 애니메이션 효과 추가
            startBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                startBtn.style.transform = 'scale(1)';
            }, 100);
        });
    }

    // 로컬 AI 모델(Ollama) 연동 로직
    const sendBtn = document.getElementById('sendBtn');
    const promptInput = document.getElementById('promptInput');
    const chatResponse = document.getElementById('chatResponse');

    if (sendBtn && promptInput && chatResponse) {
        sendBtn.addEventListener('click', async () => {
            const prompt = promptInput.value.trim();
            if (!prompt) return;

            // UI 상태 업데이트
            chatResponse.textContent = 'AI가 생각 중입니다...';
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.7';

            try {
                // antigravity.config.json에서 모델명 가져오기 시도
                let modelName = 'gemma4:e4b'; // 기본값 (설정 파일에 있는 모델명)
                try {
                    const configRes = await fetch('./antigravity.config.json');
                    if (configRes.ok) {
                        const config = await configRes.json();
                        if (config.models && config.models.local && config.models.local.model) {
                            modelName = config.models.local.model;
                        }
                    }
                } catch (e) {
                    console.log('설정 파일을 불러올 수 없어 기본 모델을 사용합니다.');
                }

                // Ollama에 요청할 때 ollama/ 접두사가 있으면 제거
                if (modelName.startsWith('ollama/')) {
                    modelName = modelName.replace('ollama/', '');
                }

                // Ollama API 호출
                const response = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: modelName,
                        prompt: prompt,
                        stream: false
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                chatResponse.textContent = data.response;
            } catch (error) {
                console.error('Error:', error);
                chatResponse.textContent = '오류가 발생했습니다.\n\n해결 방법:\n1. Ollama 프로그램이 실행 중인지 확인하세요.\n2. 터미널에서 "ollama run ' + promptInput.value.trim() + '" 명령어가 아닌, 모델이 설치되어 있는지 확인하세요.\n3. CORS 문제가 발생할 경우 시스템 환경변수에 OLLAMA_ORIGINS="*" 를 추가하고 Ollama를 재시작해주세요.';
            } finally {
                sendBtn.disabled = false;
                sendBtn.style.opacity = '1';
            }
        });

        // 엔터 키 입력 시 전송
        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendBtn.click();
            }
        });
    }
});
