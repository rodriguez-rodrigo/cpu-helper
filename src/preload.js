const { resolve } = require('path');
const { execute, sudoExecute } = require('./helper/execute');
const Chart = require('chart.js');
const { off } = require('process');

window.addEventListener('DOMContentLoaded', async () => {

    //submit form
    document.getElementById('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const coreMaxClock = document.getElementById('core-max-clock').value;
        const turboBoost = document.getElementById('turbo-boost').checked ? 0 : 1;

        execute(`echo ${turboBoost} | tee cat /sys/devices/system/cpu/intel_pstate/no_turbo`);
        execute(`cpupower frequency-set -u ${coreMaxClock}000`);
    });

    // var chartHtml = document.getElementById('chartHtml');
    // new Chart(chartHtml, {
    //     type: 'scatter',
    //     data: {
    //         datasets: [{
    //             type: 'line',
    //             label: 'Clock',
    //             data: [10, 20, 30, 40],
    //             borderColor: 'rgb(255, 99, 132)',
    //             backgroundColor: 'rgba(255, 99, 132, 0.2)'
    //         }, {
    //             type: 'line',
    //             label: 'Temperature',
    //             data: [50, 50, 50, 50],
    //             fill: false,
    //             borderColor: 'rgb(54, 162, 235)'
    //         }]
    //     },
    //     options: {
    //         scales: {
    //             y: {
    //                 beginAtZero: true
    //             }
    //         },
    //         plugins: {
    //             title: {
    //                 display: true,
    //                 text: 'Core 0'
    //             }
    //         }
    //     }
    // });

    const totalCores = await execute(`lscpu | grep "On-line" | awk -F'-' '{print $3}'`);
    const minClock = (await execute(`cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq`)) / 1000;
    const actualClock = (await execute(`cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq`)) / 1000;
    const maxClock = (await execute(`lscpu | grep "max MHz" | awk '{print $4}'`)).split(',')[0];
    const turboBoost = await execute('cat /sys/devices/system/cpu/intel_pstate/no_turbo');
    const offsetCore = await sudoExecute(`undervolt --read | grep -w "core" | awk '{print $2}'`);
    const cpu = [];

    //functions
    const getTempColor = (min, temp, max) => {
        const range = max - min;
        const index = (temp - min) / range;
        const green = 255 * (1 - index)
        const red = 255 * index;
        return `rgb(${red},${green},0)`;
    }

    //set load data
    document.getElementById('core-max-clock').min = minClock;
    document.getElementById('core-max-clock').value = actualClock;
    document.getElementById('core-max-clock').max = maxClock;
    document.getElementById('core-max-clock-help').innerHTML = `Adjust core clock between ${minClock} and ${maxClock}.`;
    document.getElementById('turbo-boost').checked = turboBoost == 0 ? true : false
    document.getElementById('offset-core').innerHTML = offsetCore;
    document.getElementById('offset-cache').innerHTML = offsetCore;

    //inflate cpu
    for (let i = 0; i <= totalCores; i++) {
        cpu.push({ core: i });
    }

    const render = () => {
        const tableBody = document.querySelector('#cpu-table tbody');
        let tableBodyHtml = "";

        for (let i = 0; i <= totalCores; i++) {
            tableBodyHtml += `<tr><td>Core ${i}</td><td>${cpu[i].clock} MHz</td><td>${cpu[i].maxClock} MHz</td><td style="background-color:${getTempColor(cpu[i].minTemperature, cpu[i].temperature, 100)};">${cpu[i].temperature} C</td><td style="background-color:${getTempColor(cpu[i].minTemperature, cpu[i].maxTemperature, 95)};">${cpu[i].maxTemperature} C</td><td>${cpu[i].maxTemperatureClock} MHz</td><tr>`;

        }

        tableBody.innerHTML = tableBodyHtml;
    };

    setInterval(async () => {

        //get core clocks
        const coreClocks = (await execute(`cat /proc/cpuinfo | grep "MHz" | awk -F':' '{print $2}' | tr '\n' ','`)).split(',');

        //get core temps
        const coreTemps = (await execute(`sensors *-isa-* | grep Core | awk '{print $3}' | sed 's/+//g' | sed 's/°C//g' | tr '\n' ','`)).split(',');

        //set core data
        let j = 0;
        for (let i = 0; i <= totalCores; i++) {

            const oldMaxTemp = cpu[i].maxTemperature || 0;
            const oldMinTemp = cpu[i].minTemperature || 100;
            const newTemp = coreTemps[Math.floor(j)];
            const isMaxTemperature = oldMaxTemp < newTemp;
            const isMinTemperature = oldMinTemp > newTemp;
            const maxTemperature = isMaxTemperature ? newTemp : oldMaxTemp;
            const minTemperature = isMinTemperature ? newTemp : oldMinTemp;
            const oldClock = cpu[i].maxTemperatureClock || 0;
            const newClock = coreClocks[i];

            //set min temp
            cpu[i] = {
                clock: parseInt(coreClocks[i]),
                maxClock: (await execute(`cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq`)) / 1000,
                temperature: Math.round(coreTemps[Math.floor(j)]),
                minTemperature: Math.round(minTemperature),
                maxTemperature: Math.round(maxTemperature),
                maxTemperatureClock: parseInt(isMaxTemperature ? newClock : oldClock)
            }
            j += 0.5;
        }

        render();
    }, 500);

})