let isChanging = false;
function shoot(newSrc, person) {
    if (isChanging) return;
    isChanging = true;
    let img = document.getElementById('image');
    let wound = document.getElementById('wound');
    let imgContainer = document.getElementById('imageContainer');
    let avatar = document.getElementById('player');
    img.src = newSrc;
    if (person == 'self') {
        timer = 2600;
        setTimeout(() => {
            imgContainer.classList.add('expanded');
            img.classList.add('expanded');
            take_heart('self', document.getElementById('player2').textContent);
        }, 2200);}
    else {
        timer = 950;
        setTimeout(() => {
            wound.classList.toggle("hidden")
            avatar.style.marginTop = "130px";
            setTimeout(() => {
                wound.classList.toggle("hidden");
            }, 300);
            setTimeout(() => {
                avatar.style.marginTop = "180px";
            }, 200);
        take_heart('enemy', document.getElementById('player1').textContent);
        }, 250);}
    setTimeout(() => {
        img.src = 'data/still.png';
        isChanging = false;
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
    clearInterval(light_flicking);
    document.getElementById('game').classList.add('hidden');
    document.getElementById('end_screen').classList.remove('hidden');
    document.getElementById('end_winner').textContent = person;
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
function get_started(nickname) {
    if (!loading_words[0]) {
        loading1.textContent = nickname;
        loading_words[0] = true;
    } else if (!loading_words[1]) { // nickname2 != nickname1 check
        loading2.textContent = nickname;
        loading_words[1] = true;
        clearInterval(intervalId1);
        document.getElementById('loading_names').innerHTML=`GO! GO! GO!<br><span id="player1">${loading1.textContent}</span> vs <span id="player2">${loading2.textContent}</span>`;
        document.getElementById('loading_names').style.left = '25%';
        light_flicking = setInterval(lights_off, 6000);
        setTimeout(() => names_go(), 800);
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
    player1.style.transform = 'translate(20px, 150px)';
    player2.style.transform = 'translate(-20px, 150px)';
    setTimeout(() => {
        player1.style.transform = 'translate(800px, 150px)';
        player2.style.transform = 'translate(800px, 150px)';
        document.getElementById('menu_button').style.transform = 'translate(800px, 0)';
        setTimeout(() => {start_game(loading1.textContent, loading2.textContent);}, 1000)
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
        'data/wound.gif'];
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
