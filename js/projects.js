/* Compact project disclosures and on-demand STM32 demonstration videos. */
(function () {
  document.querySelectorAll('[data-project-toggle]').forEach(function (button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    panel.hidden = true;
    button.hidden = false;
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', function () {
      var expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  });

  var dialog = document.getElementById('project-demo-dialog');
  var video = document.getElementById('project-demo-video');
  if (!dialog || !video || typeof dialog.showModal !== 'function') return;

  var clips = {
    oscilloscope: {
      title: 'Digital oscilloscope',
      description: 'Timer-driven ADC capture and waveform display on an ILI9341 LCD.',
      file: 'oscilloscope'
    },
    sensors: {
      title: 'Sensor interfaces',
      description: 'Accelerometer, magnetometer and temperature readings over SPI, software I²C and One-Wire.',
      file: 'sensors'
    },
    'traffic-light': {
      title: 'Traffic-light controller',
      description: 'A table-driven state machine with button input and LCD output.',
      file: 'traffic-light'
    }
  };
  var title = document.getElementById('project-demo-title');
  var description = document.getElementById('project-demo-description');
  var error = dialog.querySelector('.project-video-error');
  var clipButtons = dialog.querySelectorAll('[data-demo-clip]');
  var opener;

  function selectClip(key) {
    var clip = clips[key];
    if (!clip) return;
    video.pause();
    error.hidden = true;
    title.textContent = clip.title;
    description.textContent = clip.description;
    video.setAttribute('aria-label', clip.title + ' demonstration');
    video.poster = 'assets/videos/stm32-' + clip.file + '.jpg';
    video.src = 'assets/videos/stm32-' + clip.file + '.mp4';
    clipButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.demoClip === key));
    });
    // Opening / changing a clip is a user gesture. Keep native controls available
    // if the browser declines autoplay; never start media before that gesture.
    var playback = video.play();
    if (playback) playback.catch(function () {});
  }

  document.querySelectorAll('[data-demo-open]').forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', function () {
      opener = button;
      dialog.showModal();
      document.documentElement.classList.add('project-dialog-open');
      selectClip('oscilloscope');
    });
  });
  clipButtons.forEach(function (button) {
    button.addEventListener('click', function () { selectClip(button.dataset.demoClip); });
  });
  dialog.querySelector('[data-demo-close]').addEventListener('click', function () {
    dialog.close();
  });
  // A click must both start and end on the backdrop, so dragging a video control
  // outside the panel cannot accidentally dismiss it.
  var backdropPress = false;
  function outsidePanel(event) {
    var box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom;
  }
  dialog.addEventListener('pointerdown', function (event) {
    backdropPress = event.target === dialog && outsidePanel(event);
  });
  dialog.addEventListener('click', function (event) {
    if (backdropPress && event.target === dialog && outsidePanel(event)) dialog.close();
    backdropPress = false;
  });
  dialog.addEventListener('close', function () {
    video.pause();
    video.removeAttribute('src');
    video.removeAttribute('poster');
    video.load();
    error.hidden = true;
    document.documentElement.classList.remove('project-dialog-open');
    if (opener) opener.focus({ preventScroll: true });
  });
  video.addEventListener('error', function () {
    if (dialog.open && video.getAttribute('src')) error.hidden = false;
  });
})();
