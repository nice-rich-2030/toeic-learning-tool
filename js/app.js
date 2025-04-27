// グローバル変数
let audioFiles = []; // 音声ファイルとテキストのデータ
let currentAudio = null; // 現在再生中の音声
let currentAudioId = null; // 現在再生中の音声ID
let evaluationData = {}; // 評価データを保持するオブジェクト
let unitSize = 10; // 評価単位数M（デフォルト10）
let playbackRate = 1.0; // 再生速度（デフォルト1.0）
let activeAudioItem = null; // 現在アクティブな音声アイテム要素

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', async () => {
    // localStorage からデータを読み込む
    loadDataFromLocalStorage();

    // 評価単位サイズのイベントリスナーを設定
    document.getElementById('unitSizeInput').addEventListener('change', (e) => {
        const newValue = parseInt(e.target.value);
        if (newValue >= 5 && newValue <= 20) {
            unitSize = newValue;
            updateUI();
            saveDataToLocalStorage(); // 変更を保存
        } else {
            e.target.value = unitSize; // 無効な値を元に戻す
        }
    });

    // 再生速度のイベントリスナーを設定
    document.querySelectorAll('input[name="speed"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            playbackRate = parseFloat(e.target.value);
            if (currentAudio) {
                currentAudio.playbackRate = playbackRate;
            }
            saveDataToLocalStorage(); // 変更を保存
        });
    });

    // 評価データリセットボタンのイベントリスナー
    document.getElementById('evalResetBtn').addEventListener('click', () => {
        if (confirm('評価データのみをリセットしますか？この操作は元に戻せません。設定や音声ファイルのデータは保持されます。')) {
            resetData();
        }
    });
    
    // 全データ消去ボタンのイベントリスナー
    document.getElementById('clearStorageBtn').addEventListener('click', () => {
        if (confirm('ローカルストレージのすべてのデータを消去しますか？評価データ、設定、音声ファイルデータなどすべて削除されます。この操作は元に戻せません。')) {
            clearLocalStorage();
        }
    });

    // ウィンドウを閉じる前にデータが保存されていることを通知
    window.addEventListener('beforeunload', (e) => {
        const message = 'ページを離れます。データは自動的に保存されています。';
        e.returnValue = message;
        return message;
    });

    // メインコンテンツのスクロールイベント
    document.getElementById('mainContent').addEventListener('scroll', () => {
        saveScrollPosition();
    });

    // データを読み込む（実際のファイルまたはモックデータ）
    try {
        // audioFilesのデータがなければCSVから読み込む
        if (audioFiles.length === 0) {
            await loadDataFromCSV();
            // CSVから読み込んだデータをローカルストレージに保存
            saveDataToLocalStorage();
        }
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        // デモ用のモックデータを使用
        if (audioFiles.length === 0) {
            loadMockData();
            saveDataToLocalStorage();
        }
    }

    // UIを更新
    updateUI();
    
    // スクロール位置を復元
    restoreScrollPosition();
});

// モックデータの読み込み（デモ用）
function loadMockData() {
    audioFiles = [];
    for (let i = 1; i <= 100; i++) {
        audioFiles.push({
            id: `audio_${i}`,
            fileName: `sample_${i}.mp3`,
            text: `This is sample transcript for audio file ${i}. It contains English text that corresponds to the audio.`
        });
    }
}

// CSVからデータを読み込む
async function loadDataFromCSV() {
    try {
        // データファイルをフェッチする
        const response = await fetch('/data/transcripts.csv');
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.text();
        
        // CSVをパースする
        const rows = data.split('\n');
        audioFiles = [];
        
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].trim() === '') continue;
            
            const columns = rows[i].split(',');
            if (columns.length >= 2) {
                const audioPath = columns[0].trim();
                const text = columns[1].trim();
                const fileName = audioPath.split('/').pop();
                
                audioFiles.push({
                    id: `audio_${i}`,
                    fileName: fileName,
                    filePath: audioPath,
                    text: text
                });
            }
        }
    } catch (error) {
        console.error('CSVの読み込みに失敗しました:', error);
        alert('トランスクリプトデータの読み込みに失敗しました。サーバーが起動していることを確認してください。');
        throw error;
    }
}

// UIを更新する
function updateUI() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '';
    
    // 評価単位数Mに基づいてセクションを作成
    const sectionCount = Math.ceil(audioFiles.length / unitSize);
    
    for (let i = 0; i < sectionCount; i++) {
        const sectionStart = i * unitSize;
        const sectionEnd = Math.min((i + 1) * unitSize, audioFiles.length);
        const sectionFiles = audioFiles.slice(sectionStart, sectionEnd);
        
        // セクションのスコアを計算
        const sectionScore = calculateSectionScore(sectionFiles);
        
        // セクション要素を作成
        const section = document.createElement('div');
        section.className = 'section';
        
        // セクションヘッダー
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = `セクション ${i + 1} (ファイル ${sectionStart + 1}-${sectionEnd})`;
        
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'score';
        scoreDisplay.textContent = sectionScore.label;
        
        sectionHeader.appendChild(sectionTitle);
        sectionHeader.appendChild(scoreDisplay);
        section.appendChild(sectionHeader);
        
        // 音声ファイルのリスト
        const audioList = document.createElement('div');
        audioList.className = 'audio-files';
        
        sectionFiles.forEach(file => {
            const audioItem = createAudioItem(file);
            audioList.appendChild(audioItem);
        });
        
        section.appendChild(audioList);
        mainContent.appendChild(section);
    }
    
    // 進捗状況を更新
    updateProgress();
}

// 音声アイテムを作成
function createAudioItem(file) {
    const audioItem = document.createElement('div');
    audioItem.className = 'audio-item';
    audioItem.dataset.id = file.id;
    
    // 音声コントロール
    const audioControls = document.createElement('div');
    audioControls.className = 'audio-controls';
    
    const playBtn = document.createElement('button');
    playBtn.className = 'btn-play';
    playBtn.textContent = '再生';
    playBtn.addEventListener('click', () => playAudio(file));
    
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'btn-pause';
    pauseBtn.textContent = '一時停止';
    pauseBtn.addEventListener('click', pauseAudio);
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn-stop';
    stopBtn.textContent = '停止';
    stopBtn.addEventListener('click', stopAudio);
    
    const textBtn = document.createElement('button');
    textBtn.className = 'btn-text';
    textBtn.textContent = '英文';
    textBtn.addEventListener('click', () => toggleText(file.id));
    
    audioControls.appendChild(playBtn);
    audioControls.appendChild(pauseBtn);
    audioControls.appendChild(stopBtn);
    audioControls.appendChild(textBtn);
    
    // 評価コントロール
    const evaluation = document.createElement('div');
    evaluation.className = 'evaluation';
    
    const evalTitle = document.createElement('div');
    evalTitle.className = 'evaluation-title';
    evalTitle.textContent = '理解度評価:';
    
    const evalOptions = document.createElement('div');
    evalOptions.className = 'evaluation-options';
    
    const options = [
        { value: 1, label: '1回で理解' },
        { value: 2, label: '3回で理解' },
        { value: 3, label: '5回で理解' },
        { value: 4, label: '7回で理解' },
        { value: 5, label: '理解できない' }
    ];
    
    options.forEach(option => {
        const optionLabel = document.createElement('label');
        optionLabel.className = 'evaluation-option';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `eval_${file.id}`;
        radio.value = option.value;
        radio.checked = evaluationData[file.id]?.rating === option.value;
        radio.addEventListener('change', () => {
            saveEvaluation(file.id, option.value);
        });
        
        optionLabel.appendChild(radio);
        optionLabel.appendChild(document.createTextNode(option.label));
        evalOptions.appendChild(optionLabel);
    });
    
    evaluation.appendChild(evalTitle);
    evaluation.appendChild(evalOptions);
    
    // ファイル情報
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.fileName;
    
    const evalDate = document.createElement('div');
    evalDate.className = 'evaluation-date';
    if (evaluationData[file.id]?.date) {
        evalDate.textContent = `評価日時: ${formatDate(new Date(evaluationData[file.id].date))}`;
    }
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(evalDate);
    
    // テキスト表示エリア
    const textContent = document.createElement('div');
    textContent.className = 'text-content';
    textContent.textContent = file.text;
    textContent.style.display = 'none';
    
    audioItem.appendChild(audioControls);
    audioItem.appendChild(evaluation);
    audioItem.appendChild(fileInfo);
    audioItem.appendChild(textContent);
    
    return audioItem;
}

// 音声を再生
function playAudio(file) {
    // 現在再生中の音声があれば停止
    if (currentAudio && currentAudioId !== file.id) {
        stopAudio();
    }
    
    // 音声要素が存在しない場合は作成
    if (!currentAudio || currentAudioId !== file.id) {
        currentAudio = new Audio();
        currentAudioId = file.id;
        
        // 実際のアプリケーションでは、これを実際のファイルパスに置き換えます
        try {
            currentAudio.src = file.filePath || `/audio/${file.fileName}`;
        } catch (error) {
            // デモ用のダミーオーディオ（実際は機能しません）
            console.warn('デモモード: 音声ファイルは実際には再生されません');
            currentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        }
        
        currentAudio.playbackRate = playbackRate;
        
        // 再生終了時のイベント
        currentAudio.addEventListener('ended', () => {
            if (activeAudioItem) {
                activeAudioItem.classList.remove('active');
            }
            activeAudioItem = null;
            currentAudio = null;
            currentAudioId = null;
        });
    }
    
    // アクティブな音声アイテムを設定
    if (activeAudioItem) {
        activeAudioItem.classList.remove('active');
    }
    activeAudioItem = document.querySelector(`.audio-item[data-id="${file.id}"]`);
    if (activeAudioItem) {
        activeAudioItem.classList.add('active');
    }
    
    // 音声を再生
    currentAudio.play().catch(error => {
        console.error('音声の再生に失敗しました:', error);
        alert('音声ファイルの再生に失敗しました。ファイルが存在するか確認してください。');
    });
}

// 音声を一時停止
function pauseAudio() {
    if (currentAudio) {
        currentAudio.pause();
    }
}

// 音声を停止
function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        currentAudioId = null;
        
        if (activeAudioItem) {
            activeAudioItem.classList.remove('active');
        }
        activeAudioItem = null;
    }
}

// 英文表示を切り替える
function toggleText(fileId) {
    const audioItem = document.querySelector(`.audio-item[data-id="${fileId}"]`);
    if (audioItem) {
        const textContent = audioItem.querySelector('.text-content');
        if (textContent) {
            textContent.style.display = textContent.style.display === 'none' ? 'block' : 'none';
        }
    }
}

// 評価を保存
function saveEvaluation(fileId, rating) {
    evaluationData[fileId] = {
        rating: parseInt(rating),
        date: new Date().toISOString()
    };
    
    // UIを更新
    updateUI();
    
    // ローカルストレージに保存
    saveDataToLocalStorage();
}

// セクションのスコアを計算
function calculateSectionScore(sectionFiles) {
    let totalScore = 0;
    let evaluatedCount = 0;
    
    sectionFiles.forEach(file => {
        if (evaluationData[file.id]) {
            evaluatedCount++;
            const rating = evaluationData[file.id].rating;
            
            switch (rating) {
                case 1: totalScore += 100 / unitSize; break;
                case 2: totalScore += 100 / 2 / unitSize; break;
                case 3: totalScore += 100 / 3 / unitSize; break;
                case 4: totalScore += 100 / 4 / unitSize; break;
                case 5: totalScore += 0; break;
            }
        }
    });
    
    // すべてのファイルが評価されているか確認
    if (evaluatedCount === sectionFiles.length) {
        return {
            value: totalScore,
            label: `スコア: ${totalScore.toFixed(1)}`
        };
    } else {
        return {
            value: 0,
            label: '未評価'
        };
    }
}

// 全体の進捗状況を更新
function updateProgress() {
    const totalFiles = audioFiles.length;
    const evaluatedFiles = Object.keys(evaluationData).length;
    const progressPercent = totalFiles > 0 ? (evaluatedFiles / totalFiles) * 100 : 0;
    
    // 進捗バーを更新
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    document.getElementById('progressText').textContent = `評価済み: ${evaluatedFiles}/${totalFiles} (${progressPercent.toFixed(1)}%)`;
    
    // 総合得点を計算
    let totalScore = 0;
    let sectionsCompleted = 0;
    const sectionCount = Math.ceil(audioFiles.length / unitSize);
    
    for (let i = 0; i < sectionCount; i++) {
        const sectionStart = i * unitSize;
        const sectionEnd = Math.min((i + 1) * unitSize, audioFiles.length);
        const sectionFiles = audioFiles.slice(sectionStart, sectionEnd);
        
        const sectionScore = calculateSectionScore(sectionFiles);
        if (sectionScore.label !== '未評価') {
            totalScore += sectionScore.value;
            sectionsCompleted++;
        }
    }
    
    document.getElementById('totalScore').textContent = `総合得点: ${totalScore.toFixed(1)}`;
}

// ローカルストレージからデータを読み込む
function loadDataFromLocalStorage() {
    const savedData = localStorage.getItem('toeicLearningData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            
            evaluationData = parsedData.evaluationData || {};
            unitSize = parsedData.unitSize || 10;
            playbackRate = parsedData.playbackRate || 1.0;
            
            // audioFilesデータがあれば復元
            if (parsedData.audioFiles && parsedData.audioFiles.length > 0) {
                audioFiles = parsedData.audioFiles;
            }
            
            // UIの値を更新
            document.getElementById('unitSizeInput').value = unitSize;
            document.querySelector(`input[name="speed"][value="${playbackRate.toFixed(1)}"]`).checked = true;
        } catch (error) {
            console.error('保存データの解析に失敗しました:', error);
        }
    }
}

// データをローカルストレージに保存
function saveDataToLocalStorage() {
    const dataToSave = {
        evaluationData: evaluationData,
        unitSize: unitSize,
        playbackRate: playbackRate,
        scrollPosition: document.getElementById('mainContent').scrollTop,
        audioFiles: audioFiles // 音声ファイルデータも保存
    };
    
    localStorage.setItem('toeicLearningData', JSON.stringify(dataToSave));
}

// スクロール位置を保存
function saveScrollPosition() {
    const mainContent = document.getElementById('mainContent');
    localStorage.setItem('scrollPosition', mainContent.scrollTop);
}

// スクロール位置を復元
function restoreScrollPosition() {
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition) {
        const mainContent = document.getElementById('mainContent');
        mainContent.scrollTop = parseInt(savedPosition);
    }
}

// データをリセット
function resetData() {
    evaluationData = {};
    saveDataToLocalStorage();
    updateUI();
}

// ローカルストレージを完全に消去
function clearLocalStorage() {
    localStorage.removeItem('toeicLearningData');
    localStorage.removeItem('scrollPosition');
    
    // ページをリロード
    alert('ローカルストレージのデータを消去しました。ページを再読み込みします。');
    window.location.reload();
}

// 日付をフォーマット
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// ウィンドウのクリックイベントでモーダルを閉じる
window.addEventListener('click', (e) => {
    const helpModal = document.getElementById('helpModal');
    if (e.target === helpModal) {
        helpModal.style.display = 'none';
    }
});