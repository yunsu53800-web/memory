document.addEventListener('DOMContentLoaded', () => {
    // 마크다운 설정
    marked.setOptions({
        breaks: true, // 줄바꿈 인식
        gfm: true     // GitHub Flavored Markdown
    });

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            alert('환영합니다! 프로젝트 설정을 시작하겠습니다.');
            startBtn.style.transform = 'scale(0.95)';
            setTimeout(() => { startBtn.style.transform = 'scale(1)'; }, 100);
        });
    }

    // 로컬 AI 모델(Ollama) 연동 및 UI 요소
    const sendBtn = document.getElementById('sendBtn');
    const promptInput = document.getElementById('promptInput');
    const chatHistory = document.getElementById('chatHistory');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const chips = document.querySelectorAll('.chip');

    const STORAGE_KEY = 'ai_mentor_chat_history';
    let messages = [];

    // 대화 기록 불러오기
    function loadHistory() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            messages = JSON.parse(saved);
            renderHistory();
        } else {
            // 초기 메시지
            addMessageToUI('ai', '안녕하세요! 무엇을 도와드릴까요?');
        }
    }

    // 대화 기록 저장하기
    function saveHistory() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }

    // 화면에 기록 렌더링
    function renderHistory() {
        chatHistory.innerHTML = '';
        messages.forEach(msg => addMessageToUI(msg.role, msg.content, false));
        scrollToBottom();
    }

    // 메시지를 UI에 추가
    function addMessageToUI(role, content, save = true) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        
        if (role === 'ai') {
            // 보안을 위해 DOMPurify를 사용하여 XSS 방지
            const rawHtml = marked.parse(content);
            const cleanHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
            msgDiv.innerHTML = cleanHtml;
        } else {
            msgDiv.textContent = content;
        }
        
        chatHistory.appendChild(msgDiv);
        
        if (save) {
            messages.push({ role, content });
            saveHistory();
        }
        scrollToBottom();
    }

    // 타이핑 인디케이터 추가
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message ai typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatHistory.appendChild(indicator);
        scrollToBottom();
    }

    // 타이핑 인디케이터 제거
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // 메시지 전송 로직
    async function sendMessage() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // 1. 사용자 메시지 추가
        addMessageToUI('user', prompt);
        promptInput.value = '';
        
        // 2. UI 상태 잠금 및 인디케이터 표시
        sendBtn.disabled = true;
        promptInput.disabled = true;
        showTypingIndicator();

        try {
            // 설정 파일에서 모델명 가져오기
            let modelName = 'gemma4:e4b'; 
            try {
                const configRes = await fetch('./antigravity.config.json');
                if (configRes.ok) {
                    const config = await configRes.json();
                    if (config.models?.local?.model) {
                        modelName = config.models.local.model;
                    }
                }
            } catch (e) {
                console.log('설정 파일을 찾을 수 없어 기본 모델을 사용합니다.');
            }

            if (modelName.startsWith('ollama/')) {
                modelName = modelName.replace('ollama/', '');
            }

            // Ollama API 호출
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            
            // 3. 응답 처리
            removeTypingIndicator();
            addMessageToUI('ai', data.response);

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            const errorMsg = '오류가 발생했습니다.\n\n해결 방법:\n1. Ollama가 실행 중인지 확인하세요.\n2. 지정된 모델이 설치되어 있는지 확인하세요.';
            addMessageToUI('ai', errorMsg);
        } finally {
            // 4. UI 상태 복구
            sendBtn.disabled = false;
            promptInput.disabled = false;
            promptInput.focus();
        }
    }

    // 이벤트 리스너 등록
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    
    if (promptInput) {
        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('대화 기록을 모두 지우시겠습니까?')) {
                localStorage.removeItem(STORAGE_KEY);
                messages = [];
                chatHistory.innerHTML = '';
                addMessageToUI('ai', '안녕하세요! 무엇을 도와드릴까요?');
            }
        });
    }

    // 칩 클릭 시 입력창에 반영
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            promptInput.value = chip.textContent;
            promptInput.focus();
        });
    });

    // 초기화
    loadHistory();
});
