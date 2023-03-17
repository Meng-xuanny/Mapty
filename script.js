"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

let map, mapEvent;
class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDiscription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];

    this.discription = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    //this.type = 'cycling';
    this.calcPace();
    this._setDiscription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDiscription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const a = new Running([55, -35], 4, 30, 152);
// const b = new Cycling([44, -53], 3, 40, 525);
// console.log(a, b);

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zoomMap = 13;

  constructor() {
    //it's fine to call any methods in the constructor function
    this.#getposition();
    //pre-load the workouts in local storage
    this.#getLocalStorage();
    //event handlers
    //using bind method to set 'this' keyword to the class App
    form.addEventListener("submit", this.#newWorkout.bind(this));
    inputType.addEventListener("change", this.#toggleForm.bind(this));
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    //editWorkout.addEventListener('click',#editWO.bind(this));
    //workoutDiv.addEventListener("click", this.deleteWO.bind(this));
  }

  #getposition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert("Could not get your positon");
        }
      );
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    //#map variable is to get the position
    this.#map = L.map("map").setView(coords, this.#zoomMap);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
    }).addTo(this.#map);
    //show form when user click on the map
    //using bind method to set 'this' keyword to the class App
    //'on' is a built-in leaflet event handler which calls the callback function on the spot user clicks
    //and it uses a 'mapEvent'.'mapEvent is generated in the callback function
    this.#map.on("click", this.#showForm.bind(this));
    //show stored workout markers
    this.#workouts.forEach((workout) => this._renderWorkoutMarkers(workout));
  }

  #showForm(mapE) {
    //mapEvent is generated here
    this.#mapEvent = mapE;
    //console.log(mapE);
    //copy the value to a global variable
    //show the form
    form.classList.remove("hidden");
    //put the cursor
    inputDistance.focus();
  }

  #hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");

    setTimeout(() => (form.style.display = "grid"), 1000);
  }
  #toggleForm() {
    //select the closest parent element with class 'form__row'
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  #newWorkout(e) {
    e.preventDefault();
    let workout;
    // geting variables from form
    const type = inputType.value;
    const duration = Number(inputDuration.value);
    const distance = +inputDistance.value;
    //get the latitude and longitude from mapEvent
    const { lat, lng } = this.#mapEvent.latlng;
    //validation
    const validInputs = (...inputs) =>
      inputs.every((input) => Number.isFinite(input));
    const isPositive = (...inputs) => inputs.every((input) => input > 0);

    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !validInputs(duration, distance, cadence) ||
        !isPositive(duration, distance, cadence)
      )
        return alert("Inputs have to be positive numbers");
      //create workout object
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(duration, distance, elevation) ||
        !isPositive(duration, distance)
      )
        return alert("Distance and duration have to be positive numbers");
      //create workout object
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //add new object to workout array
    this.#workouts.push(workout);
    //console.log(workout);
    // display marker using the global event
    this._renderWorkoutMarkers(workout);
    // display rendered workouts
    this._renderWorkouts(workout);
    //hide form and clear input fields
    this.#hideForm();
    //store workouts in localStorage
    this.#storeWorkouts();
  }
  //display marker
  _renderWorkoutMarkers(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚵‍♀️"} ${workout.discription}`
      )
      .openPopup();
  }
  //render workout
  _renderWorkouts(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
      <h2 class="workout__title">${workout.discription}</h2>
      
      <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚵‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === "running")
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🏃‍♂️</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
  </li>
  `;

    if (workout.type === "cycling")
      html += `<div class="workout__details">
  <span class="workout__icon">⚡️</span>
  <span class="workout__value">${workout.speed.toFixed(1)}</span>
  <span class="workout__unit">km/h</span>
</div>
<div class="workout__details">
  <span class="workout__icon">⛰</span>
  <span class="workout__value">${workout.elevation}</span>
  <span class="workout__unit">m</span>
</div>
</li>
  `;

    //sticking the html code to form element as a sibling
    form.insertAdjacentHTML("afterend", html);
  }
  //move to popup area
  _moveToPopup(e) {
    //select the workout element
    const workoutEl = e.target.closest(".workout");
    //console.log(workoutEl);
    //find the workout that has the same id as the one that is clicked
    //here we use #workouts array to store the workout objects
    if (!workoutEl) return; //if no click on the workoutEl

    const workout = this.#workouts.find(
      (workout) => workout.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#zoomMap, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    //if ((e.target = deleteWorkout)) delete this.#workouts.workout;
    // workout.click();
    // console.log(workout);
  }

  #storeWorkouts() {
    //store objects as stings
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    //converting strings to objects. However the objects loses the protptype chain
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    //fill the #workouts array with stored wokouts for pre-loading
    this.#workouts = data;
    // render each  stored workout
    this.#workouts.forEach((workout) => this._renderWorkouts(workout));
  }

  //public mathod

  clearData() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
