// グローバル変数
let audioFiles = []; // 音声ファイルとテキストのデータ
let currentAudio = null; // 現在再生中の音声
let currentAudioId = null; // 現在再生中の音声ID
let lastAudioId = null; // 最後に再生したファイルのID
let evaluationData = {}; // 評価データを保持するオブジェクト
let playCountData = {}; // 再生回数データを保持するオブジェクト
let unitSize = 10; // 評価単位数M（デフォルト10）
let playbackRate = 1.0; // 再生速度（デフォルト1.0）
let activeAudioItem = null; // 現在アクティブな音声アイテム要素
let darkMode = false; // ダークモードフラグ

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', async () => {
    // localStorage からデータを読み込む
    loadDataFromLocalStorage();

    // ダークモード設定を適用
    applyTheme();

    // テーマ切替ボタンのイベントリスナー
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    
    // モバイル版のテーマ切替ボタンも連携させる
    document.getElementById('mobileThemeBtn').addEventListener('click', toggleTheme);

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
    
    // 各音声アイテムの再生回数を表示に反映する関数を追加
    function updateAllPlayCounts() {
        Object.keys(playCountData).forEach(fileId => {
            updatePlayCount(fileId);
        });
    }

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
        if (confirm('理解度評価値をリセットします。よろしいですか？')) {
            resetData();
        }
    });
    
    // モバイル版の評価データリセットボタンも連携
    document.getElementById('mobileEvalResetBtn').addEventListener('click', () => {
        if (confirm('理解度評価値をリセットします。よろしいですか？')) {
            resetData();
            closeMenu(); // メニューを閉じる
        }
    });
    
    // 全データ消去ボタンのイベントリスナー
    document.getElementById('clearStorageBtn').addEventListener('click', () => {
        if (confirm('理解度評価のデータのほか、設定、音声ファイル管理データなどをリセットします。よろしいですか？')) {
            clearLocalStorage();
        }
    });
    
    // モバイル版の全データ消去ボタンも連携
    document.getElementById('mobileClearStorageBtn').addEventListener('click', () => {
        if (confirm('理解度評価のデータのほか、設定、音声ファイル管理データなどをリセットします。よろしいですか？')) {
            clearLocalStorage();
        }
    });

    // ハンバーガーメニューのイベントリスナー
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    
    menuBtn.addEventListener('click', function(event) {
        event.stopPropagation(); // イベントの伝播を止める
        this.classList.toggle('open');
        if (this.classList.contains('open')) {
            menuDropdown.style.display = 'block';
        } else {
            menuDropdown.style.display = 'none';
        }
    });
    
    // 画面のどこかをクリックしたらメニューを閉じる
    document.addEventListener('click', function(event) {
        if (!menuBtn.contains(event.target) && !menuDropdown.contains(event.target)) {
            closeMenu();
        }
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
    
    // すべての再生回数表示を更新
    updateAllPlayCounts();
});

// メニューを閉じる
function closeMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    
    menuBtn.classList.remove('open');
    menuDropdown.style.display = 'none';
}

// テーマ切替機能
function toggleTheme() {
    darkMode = !darkMode;
    applyTheme();
    saveDataToLocalStorage();
    // モバイルメニューを閉じる
    closeMenu();
}

// テーマを適用
function applyTheme() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
        // PC版テーマ表示を更新
        document.getElementById('themeIcon').textContent = '☀️';
        document.getElementById('themeText').textContent = 'ライトモード';
        // モバイル版テーマ表示も更新
        document.getElementById('mobileThemeIcon').textContent = '☀️';
        document.getElementById('mobileThemeText').textContent = 'ライトモード';
    } else {
        document.body.classList.remove('dark-mode');
        // PC版テーマ表示を更新
        document.getElementById('themeIcon').textContent = '🌙';
        document.getElementById('themeText').textContent = 'ダークモード';
        // モバイル版テーマ表示も更新
        document.getElementById('mobileThemeIcon').textContent = '🌙';
        document.getElementById('mobileThemeText').textContent = 'ダークモード';
    }
}

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
        const response = await fetch('/toeic-learning-tool/E200/transcripts.csv');
        
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
        
        // スコア関連情報のコンテナ
        const sectionScoreContainer = document.createElement('div');
        sectionScoreContainer.className = 'section-score-container';
        
        // 評価日時の表示
        const evalDateDisplay = document.createElement('div');
        evalDateDisplay.className = 'eval-date-display';
        if (sectionScore.latestDate) {
            evalDateDisplay.textContent = formatDateFull(new Date(sectionScore.latestDate));
        }
        
        // スコア表示
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'score';
        scoreDisplay.textContent = sectionScore.label;
        
        // 星評価の表示
        const starRating = document.createElement('div');
        starRating.className = 'star-rating';
        starRating.textContent = sectionScore.stars;
        
        // 日時、スコア、星評価をコンテナに追加
        if (sectionScore.latestDate) {
            sectionScoreContainer.appendChild(evalDateDisplay);
        }
        sectionScoreContainer.appendChild(scoreDisplay);
        sectionScoreContainer.appendChild(starRating);
        
        sectionHeader.appendChild(sectionTitle);
        sectionHeader.appendChild(sectionScoreContainer);
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
    
    // 習練ボタンを追加
    const practiceBtn = document.createElement('button');
    practiceBtn.className = 'btn-practice';
    practiceBtn.textContent = '習練';
    practiceBtn.addEventListener('click', () => playAudioForPractice(file));
    
    // 再生回数表示の追加
    const playCountDisplay = document.createElement('div');
    playCountDisplay.className = 'play-count';
    playCountDisplay.id = `playCount_${file.id}`;
    playCountDisplay.textContent = `連続回数: ${playCountData[file.id] || 0}`;
    
    audioControls.appendChild(playBtn);
    audioControls.appendChild(pauseBtn);
    audioControls.appendChild(stopBtn);
    audioControls.appendChild(textBtn);
    audioControls.appendChild(practiceBtn); // 習練ボタンを追加
    audioControls.appendChild(playCountDisplay);
    
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
        // テキストノードの代わりにspanを追加
        const labelSpan = document.createElement('span');
        labelSpan.textContent = option.label;
        optionLabel.appendChild(labelSpan);
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
    // 同じファイルを再生する場合は再生回数をカウントアップ
    // 違うファイルを再生する場合は再生回数をリセット
    if (lastAudioId === file.id) {
        // 同じファイルを再生する場合（前回と同じファイルを再生）
        playCountData[file.id] = (playCountData[file.id] || 0) + 1;
        stopAudio();
    } else {
        // 前のファイルの再生があれば停止
        if (currentAudio && currentAudioId !== file.id) {
            stopAudio();
        }
        
        // 新しいファイルの場合は再生回数を1にセット
        playCountData[file.id] = 1;
    }
    
    // 最後に再生したファイルのIDを更新
    lastAudioId = file.id;
    
    // 再生回数を表示に反映
    updatePlayCount(file.id);
    
    // 再生回数に応じて評価を自動更新
    updateEvaluationBasedOnPlayCount(file.id);
    
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
            // lastAudioIdはそのまま保持（連続再生の判定のため）
        });
    }
    
    // アクティブな音声アイテムを設定
    if (activeAudioItem) {
        activeAudioItem.classList.remove('active');
    }
    activeAudioItem = document.querySelector(`.audio-item[data-id="${file.id}"]`);
    if (activeAudioItem) {
        activeAudioItem.classList.add('active');
        
        // 再生回数を表示する要素にフォーカスを当てる
        const playCountElement = activeAudioItem.querySelector('.play-count');
        if (playCountElement) {
            playCountElement.classList.add('highlight');
            // 1秒後にハイライトを消す
            setTimeout(() => {
                playCountElement.classList.remove('highlight');
            }, 1000);
        }
    }
    
    // 音声を再生
    currentAudio.play().catch(error => {
        console.error('音声の再生に失敗しました:', error);
        alert('音声ファイルの再生に失敗しました。ファイルが存在するか確認してください。');
    });
    
    // データを保存
    saveDataToLocalStorage();
}

// 習練モードで音声を再生（再生回数をカウントアップしない）
function playAudioForPractice(file) {
    stopAudio();
    // 再生回数はカウントアップしない（ここが通常再生と異なる）
    
    // 音声要素が存在しない場合は作成
    if (!currentAudio || currentAudioId !== file.id) {
        currentAudio = new Audio();
        currentAudioId = file.id;
        
        try {
            currentAudio.src = file.filePath || `/audio/${file.fileName}`;
        } catch (error) {
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
        
        // 習練モードを示すために別のスタイルを適用することもできます
        activeAudioItem.classList.add('practice-mode');
        
        // 1秒後に習練モードのスタイルを消す
        setTimeout(() => {
            activeAudioItem.classList.remove('practice-mode');
        }, 1000);
    }
    
    // 音声を再生
    currentAudio.play().catch(error => {
        console.error('音声の再生に失敗しました:', error);
        alert('音声ファイルの再生に失敗しました。ファイルが存在するか確認してください。');
    });
    
    // ここでデータを保存しない（再生回数が変わっていないため）
}

// 再生回数表示を更新
function updatePlayCount(fileId) {
    const playCountElement = document.getElementById(`playCount_${fileId}`);
    if (playCountElement) {
        playCountElement.textContent = `連続回数: ${playCountData[fileId] || 0}`;
        
        // 再生回数に応じて色を変える
        const count = playCountData[fileId] || 0;
        playCountElement.className = 'play-count';
        
        if (count >= 8) {
            playCountElement.classList.add('count-very-high');
        } else if (count >= 6) {
            playCountElement.classList.add('count-high');
        } else if (count >= 4) {
            playCountElement.classList.add('count-medium');
        } else if (count >= 2) {
            playCountElement.classList.add('count-low');
        }
    }
}

// 再生回数に応じて評価を自動更新
function updateEvaluationBasedOnPlayCount(fileId) {
    const count = playCountData[fileId] || 0;
    let rating = null;
    
    // 再生回数に基づいて評価を決定
    if (count === 0) {
        // 未評価
        rating = null;
    } else if (count === 1) {
        // 1回で理解
        rating = 1;
    } else if (count >= 2 && count <= 3) {
        // 3回で理解
        rating = 2;
    } else if (count >= 4 && count <= 5) {
        // 5回で理解
        rating = 3;
    } else if (count >= 6 && count <= 7) {
        // 7回で理解
        rating = 4;
    } else {
        // 理解できない
        rating = 5;
    }
    
    // 評価を更新
    if (rating !== null) {
        // ラジオボタンを選択
        const radioBtn = document.querySelector(`.audio-item[data-id="${fileId}"] input[value="${rating}"]`);
        if (radioBtn) {
            radioBtn.checked = true;
            // 評価データを保存
            saveEvaluation(fileId, rating);
        }
    }
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
        
        // 現在再生中だったファイルのIDを記録
        const stoppedAudioId = currentAudioId;
        
        currentAudio = null;
        currentAudioId = null;
        
        if (activeAudioItem) {
            activeAudioItem.classList.remove('active');
        }
        activeAudioItem = null;
        
        // 停止したファイルの再生回数表示を更新
        if (stoppedAudioId) {
            updatePlayCount(stoppedAudioId);
        }
    }
}

// 英文表示を切り替える (改修: 英文を表示した場合、連続回数を8に設定)
function toggleText(fileId) {
    const audioItem = document.querySelector(`.audio-item[data-id="${fileId}"]`);
    if (audioItem) {
        const textContent = audioItem.querySelector('.text-content');
        if (textContent) {
            const isShowing = textContent.style.display === 'none';
            
            // 英文を表示した場合、再生回数を8に設定(「理解できない」評価)
            if (isShowing) {
                playCountData[fileId] = 8;
                updatePlayCount(fileId);
                
                // 評価の更新
                const rating = 5; // 「理解できない」の評価値
                evaluationData[fileId] = {
                    rating: rating,
                    date: new Date().toISOString()
                };
                
                // ラジオボタンを選択（UIの部分更新のみ）
                const radioBtn = document.querySelector(`.audio-item[data-id="${fileId}"] input[value="${rating}"]`);
                if (radioBtn) {
                    radioBtn.checked = true;
                }
                
                // データを保存（UI更新なし）
                saveDataToLocalStorage();
            }
            
            // 最後に表示状態を変更
            textContent.style.display = isShowing ? 'block' : 'none';
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

// セクションのスコアを計算 (改修: 星評価と評価日時を返す)
function calculateSectionScore(sectionFiles) {
    let totalScore = 0;
    let evaluatedCount = 0;
    let latestDate = null;
    
    sectionFiles.forEach(file => {
        if (evaluationData[file.id]) {
            evaluatedCount++;
            const rating = evaluationData[file.id].rating;
            const date = evaluationData[file.id].date;
            
            // 最新の評価日時を追跡
            if (!latestDate || new Date(date) > new Date(latestDate)) {
                latestDate = date;
            }
            
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
        // 星評価の計算
        const starCount = Math.min(Math.ceil(totalScore / 20), 5);
        const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
        
        return {
            value: totalScore,
            label: `スコア: ${totalScore.toFixed(1)}`,
            stars: stars,
            latestDate: latestDate
        };
    } else {
        return {
            value: 0,
            label: '未評価',
            stars: '',
            latestDate: null
        };
    }
}

// 全体の進捗状況を更新 (改修: 総合得点を平均点に変更)
function updateProgress() {
    const totalFiles = audioFiles.length;
    const evaluatedFiles = Object.keys(evaluationData).length;
    const progressPercent = totalFiles > 0 ? (evaluatedFiles / totalFiles) * 100 : 0;
    
    // 進捗バーを更新
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    document.getElementById('progressText').textContent = `評価済み: ${evaluatedFiles}/${totalFiles} (${progressPercent.toFixed(1)}%)`;
    
    // セクションの平均点を計算
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
    
    // 平均点を計算して表示
    const averageScore = sectionsCompleted > 0 ? totalScore / sectionsCompleted : 0;
    document.getElementById('averageScore').textContent = `平均点: ${averageScore.toFixed(1)}`;
}

// 完全な日付フォーマット（YYYY年M月D日HH時MM分）
function formatDateFull(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}年${month}月${day}日${hours}時${minutes}分`;
}

// ローカルストレージからデータを読み込む
function loadDataFromLocalStorage() {
    const savedData = localStorage.getItem('toeicLearningData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            
            evaluationData = parsedData.evaluationData || {};
            playCountData = parsedData.playCountData || {};
            lastAudioId = parsedData.lastAudioId || null;
            unitSize = parsedData.unitSize || 10;
            playbackRate = parsedData.playbackRate || 1.0;
            darkMode = parsedData.darkMode || false;
            
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
    
    // システム設定に基づくダークモード初期値
    if (savedData === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        darkMode = true;
    }
}

// データをローカルストレージに保存
function saveDataToLocalStorage() {
    const dataToSave = {
        evaluationData: evaluationData,
        playCountData: playCountData,
        lastAudioId: lastAudioId,
        unitSize: unitSize,
        playbackRate: playbackRate,
        scrollPosition: document.getElementById('mainContent').scrollTop,
        audioFiles: audioFiles, // 音声ファイルデータも保存
        darkMode: darkMode // ダークモード設定を保存
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
    playCountData = {};
    lastAudioId = null;
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
    if (helpModal && e.target === helpModal) {
        helpModal.style.display = 'none';
    }
});

   