let BackgroundColors = [
  'hsl(15, 100%, 70%)',
  'hsl(195, 74%, 62%)',
  'hsl(348, 100%, 68%)',
  'hsl(145, 58%, 55%)',
  'hsl(264, 64%, 52%)',
  'hsl(43, 84%, 65%)'
]

// Cargar el JSON de forma dinámica
fetch('./data.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('No se pudo cargar el archivo JSON');
    }
    return response.json();
  })
  .then(data => {
    // Generar los arreglos de tiempo
    let ArregloDia = data.map(item => item.timeframes.daily);
    let ArregloMes = data.map(item => item.timeframes.weekly);
    let ArregloAnio = data.map(item => item.timeframes.monthly);

    // Elementos del DOM
    var sectionCards = document.querySelector('#sectionCards');
    var DevuelveDia = document.querySelector('#Dia');
    var DevuelveMes = document.querySelector('#Mes');
    var DevuelveAnio = document.querySelector('#Anio');

    // Asignar eventos
    DevuelveDia.addEventListener('click', () => Tarjetas(ArregloDia, data));
    DevuelveMes.addEventListener('click', () => Tarjetas(ArregloMes, data));
    DevuelveAnio.addEventListener('click', () => Tarjetas(ArregloAnio, data));

    // Cargar las tarjetas por defecto (día)
    Tarjetas(ArregloDia, data);
  })
  .catch(error => console.error('Error cargando JSON:', error));

// Función para renderizar las tarjetas
function Tarjetas(array, data) {
  sectionCards.innerHTML = ''; // Limpiar las tarjetas antes de actualizar

  array.forEach((element, indice) => {
    let title = data[indice].title;
    let titleLowerCase = title.toLowerCase().replace(' ', '-'); // Reemplazo espacios con guiones

    sectionCards.innerHTML += `
        <div class="Card">
          <div class="card-background" style="background-color: ${BackgroundColors[indice]}">
            <img src="/images/icon-${titleLowerCase}.svg">
          </div>

          <div class="card-detalles">
            <div class="card-actividad">
              <p class="Tipo-Actividad">${title}</p>
              <img class="imagen-puntos" src="./images/icon-ellipsis.svg">
            </div>

            <div class="card-horas">
              <p class="card-hora">${element.current}hs</p>
              <p class="horas-previas">Previous - ${element.previous} hrs</p>
            </div>
          </div>
        </div>`;
  });
}













