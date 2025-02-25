let isChanging = false;
function playAudioOnce(audioId) {
    document.getElementById(audioId).play();
}
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}
function shoot(newSrc, person) {
    if (isChanging) return;
    isChanging = true;
    let img = document.getElementById('image');
    let wound = document.getElementById('wound');
    let imgContainer = document.getElementById('imageContainer');
    let avatar = document.getElementById('player');
    img.src = newSrc;
    let patron_type = Math.random() >= 0.5;
    patron_type = true;
    if (person == 'self') {;
        if (patron_type) {
            timer = 2600;
            setTimeout(() => {
                playAudioOnce('self')
                imgContainer.classList.add('expanded');
                img.classList.add('expanded');
                take_heart('self', document.getElementById('player2').textContent);
            }, 2200);}
        else {
            playAudioOnce('blank')
            timer = 200;
        }
    }
    else {
        if (patron_type) {
        timer = 950;
        playAudioOnce('other')
        setTimeout(() => {
            wound.classList.toggle("hidden")
            avatar.style.marginBottom = "6%";
            setTimeout(() => {
                wound.classList.toggle("hidden");
            }, 300);
            setTimeout(() => {
                avatar.style.marginBottom = "0";
            }, 200);
            take_heart('enemy', document.getElementById('player1').textContent);
        }, 250);}
        else {
            playAudioOnce('blank')
            timer = 200;
        }
    }
    setTimeout(() => {
        playAudioOnce('reload')
        setTimeout(() => {
        isChanging = false;
        }, 450);
        img.src = 'data/still.png';
        imgContainer.classList.remove('expanded');
        img.classList.remove('expanded');
    }, timer);}
function blink(light, dark) {
    dark.style.display = 'block';
    light.style.display = 'none';
    setTimeout(() => {
    dark.style.display = 'none';
    light.style.display = '';
    }, 80);}
function lights_off() {
    if (Math.random() > 0.25) return;
    let light = document.getElementById('light');
    let dark = document.getElementById('dark');
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {blink(light, dark)}, i * 300);
    }
    setTimeout(() => {
        dark.style.display = 'block';
        light.style.display = 'none';
    }, 1200);

    setTimeout(() => {
        dark.style.display = 'none';
        light.style.display = '';
    }, 3500);
}
let light_flicking;
function take_heart(sub_name, person) {
    if (document.getElementById(sub_name + "_heart"))
        document.getElementById(sub_name + "_heart").remove();
    check_death(sub_name, person);
}
function show_credits(person) {
    playAudioOnce('game_over')
    clearInterval(light_flicking);
    document.getElementById('game').classList.add('hidden');
    document.getElementById('end_screen').classList.remove('hidden');
    document.getElementById('end_winner').textContent += person;
}
function check_death(sub_name, person) {
    if (!document.getElementById(sub_name + "_heart"))
        show_credits(person);
}
let loading1 = document.getElementById('player1');
let loading2 = document.getElementById('player2');
let loading_words = [false, false];
let dotsCount = 0;
intervalId1 = setInterval(() => updateDots(), 600);
function updateDots() {
    if (dotsCount == 3) {
        dotsCount = 0;
        if (!loading_words[0])
            loading1.textContent = 'Loading';
        loading2.textContent = 'Loading';}
    else {
        if (!loading_words[0])
            loading1.textContent += '.';
        loading2.textContent += '.';
        dotsCount++;
    }
}
const MAX_IMAGES = 10;
const BASE_SPEED = 1;
let imageInterval;
function createMovingImage() {
    if (document.getElementById('start_screen').classList.contains('hidden')) return;
    if (document.querySelectorAll('.moving-img').length >= MAX_IMAGES) return;
    let img = document.createElement('div');
    img.classList.add('moving-img');
    let spawnTop = Math.random() < 0.5;
    let sizeK = getRandomFloat(0.3, 0.8);
    let posY = spawnTop ? -10 : 100;
    let [randXmin, randXmax] = Math.random() < 0.5 ? [5, 25] : [75, 95];
    let posX = getRandomFloat(randXmin, randXmax);
    img.style.left = `${posX}%`;
    img.style.top = `${posY}%`;
    img.style.transform = `rotate(${(Math.random() * 60) - 30}deg)`;
    img.style.width = `${sizeK * 10}%`; 
    img.style.height = `${sizeK * 10}%`; 
    document.getElementById('start_screen').appendChild(img);
    animateImage(img, spawnTop, sizeK);
}
function animateImage(img, direction, sizeK) {
    let speed = BASE_SPEED + (1 - sizeK) * 2;
    function move() {
        if (document.getElementById('start_screen').classList.contains('hidden')) {
            img.remove();
            return;
        }
        let currentY = parseFloat(img.style.top);
        let newY = currentY + speed * (direction ? 1 : -1) / document.body.clientHeight * 100;
        if ((direction && newY > 100) || (!direction && newY < -10)) {
            img.remove();
            return;
        }
        img.style.top = `${newY}%`;
        requestAnimationFrame(move);
    }
    setTimeout(() => {move();}, 100);
}
function startImageSpawning() {
    stopAllImages();
    imageInterval = setInterval(createMovingImage, 600);
}
function stopAllImages() {
    clearInterval(imageInterval);
    document.querySelectorAll('.moving-img').forEach(img => img.remove());
}
setInterval(() => {if (!document.getElementById('start_screen').classList.contains('hidden')) createMovingImage();}, 600);
function get_started(nickname) {
    playAudioOnce('button');
    if (!loading_words[0]) {
        loading1.textContent = nickname;
        loading_words[0] = true;
    } else if (!loading_words[1]) { // nickname2 != nickname1 check
        loading2.textContent = nickname;
        loading_words[1] = true;
        clearInterval(intervalId1);
        document.getElementById('loading_names').innerHTML=`GO! GO! GO!<br><span id="player1">${loading1.textContent}</span> vs <span id="player2">${loading2.textContent}`;
        document.getElementById('loading_names').style.left = '35%';
        document.getElementById('menu_button').disabled = true;
        light_flicking = setInterval(lights_off, 6000);
        playAudioOnce('countdown')
        setTimeout(() => names_go(), 2400);
}
}
function start_game(own_name, other_name) {
    document.getElementById('own_name').textContent = own_name;
    document.getElementById('enemy_name').textContent = other_name;
    document.getElementById('start_screen').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
}
function names_go() {
    const player1 = document.getElementById('player1');
    const player2 = document.getElementById('player2');
    player1.style.transform = 'translate(80%, 260%)';
    player2.style.transform = 'translate(-80%, 260%)';
    setTimeout(() => {
        playAudioOnce('vzuh');
        player1.style.transform = 'translate(680%, 260%)';
        player2.style.transform = 'translate(620%, 260%)';
        document.getElementById('menu_button').style.transform = 'translate(360%, 0)';
        setTimeout(() => {start_game(loading1.textContent, loading2.textContent);}, 1000);
    }, 1600);
};
function restart() {
    location.reload();
}
let loadingTimeout;
function load_data() {
    var images = [
        'data/background.png',
        'data/dark.png',
        'data/end_credits.png',
        'data/GGs.png',
        'data/hp.png',
        'data/light.png',
        'data/opponent.jpg',
        'data/other.gif',
        'data/self.gif',
        'data/start_menu.png',
        'data/still.png',
        'data/wound.gif']; // Add audio files
    loadingTimeout = setTimeout(() => {
        let loadingScreen = document.createElement("div");
        loadingScreen.id = "loadingScreen";
        loadingScreen.className = "loadingScreen";
        loadingScreen.innerHTML = `
            <div class="spinner"></div>
            <p>Loading...</p>
        `;
        document.body.prepend(loadingScreen);
    }, 500);
    var loadedImages = [];
    for(var i in images) {
        var img = new Image();
        img.src = images[i];
        loadedImages.push(img);
    }
    window.onload = function () {
        clearTimeout(loadingTimeout);
        document.getElementById('start_screen').classList.remove('hidden');
        let loadingScreen = document.getElementById("loadingScreen");
        if (loadingScreen) {
            loadingScreen.remove();
        }
        loadedImages = null;
    };
}
load_data();
