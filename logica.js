
import data from './data.json' assert{type: 'json'}; // Como importar un json


let BackgroundColors = [
    // cada color esta ordenado tal cual las posiciones de las tarjetas
    
    'hsl(15, 100%, 70%)',
    'hsl(195, 74%, 62%)',
    'hsl(348, 100%, 68%)',
    'hsl(145, 58%, 55%)',
    'hsl(264, 64%, 52%)',
    'hsl(43, 84%, 65%)'
]




// queySelector Agarra el elemento html que tenga el id y devuelve el valor que le asignes por funcion etc..


// map va a generar un nuevo arreglo de lo que le pase en este caso item.timeframes.daily y los demas
let ArregloDia = data.map(item => item.timeframes.daily);
let ArregloMes = data.map(item => item.timeframes.weekly);
let ArregloAnio = data.map(item => item.timeframes.monthly);


var sectionCards = document.querySelector('#sectionCards')

var DevuelveDia = document.querySelector('#Dia');
DevuelveDia.addEventListener('click', () => {
    Tarjetas(ArregloDia);
    var cardActive = document.getElementById('')

});

var DevuelveMes = document.querySelector('#Mes');
DevuelveMes.addEventListener('click', () => {
    Tarjetas(ArregloMes);
});

var DevuelveAnio = document.querySelector('#Anio');
DevuelveAnio.addEventListener('click', () => {
    Tarjetas(ArregloAnio);
});


function Tarjetas(array) {
    sectionCards.innerHTML = ' '; // borro los datos cuando se ingresan nuevos
    // cambiamos data del json por array 
    array.forEach( ( element, indice) => {
        
        let title = data[indice].title;
        let titleLowerCase = title.toLocaleLowerCase();

       

       // por en el nombre que tenemos en la imagen svg ya que contiene un espacio tenemos que hacer este condicional para que lo detecte
       if(titleLowerCase == 'cuidados personales'){
           titleLowerCase = 'cuidados-personales';
       }
       // por en el nombre que tenemos en la imagen svg ya que contiene un espacio tenemos que hacer este condicional para que lo detecte

        sectionCards.innerHTML += `
        
        <div class="Card">
          <div class="card-background-trabajo" style="background-color:${BackgroundColors[indice]}">
            <img src="/images/icon-${titleLowerCase}.svg">
          </div>

          <div class="card-detalles">
            <div class="card-actividad">
              <p class="Tipo-Actividad">${title}</p>
              <img class="imagen-puntos" src="./images/icon-ellipsis.svg">

            </div>

            <div class="card-horas">
              <p id="Hora" class="card-hora">${element.current}hs</p>
              <p id="Horas-Previa" class="horas-previas">Previuos - ${element.previous} hrs</p>
            </div>

          </div>
        </div>`
    });
}















