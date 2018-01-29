/*global window, document, console*/
(function () {
    'use strict';

    var hoursPerDay = 24,
        minutesPerHour = 60,
        numberOfSubdivisionsPerHour = 4,
        totalNumberOfSubdivisions = hoursPerDay * numberOfSubdivisionsPerHour,
        htmlElements = {
            exampleTimes: document.getElementById('example-times'),
            exampleAppointments: document.getElementById('example-appointments'),
            exampleNumberOfAppointmentsInput: document.getElementById('example-number-of-appointments-input'),
            exampleNumberOfAppointmentsButton: document.getElementById('example-number-of-appointments-button')
        },
        subdivisions = {},
        appointments,
        numberOfAppointments = 20,
        tiling,
        generateMinuteDivisions = function example_generateMinuteDivisions() {
            var i,
                minutes,
                minutesPerMinuteDivision = minutesPerHour / numberOfSubdivisionsPerHour;

            for (i = 0; i < numberOfSubdivisionsPerHour; ++i) {
                minutes = minutesPerMinuteDivision * i;

                subdivisions[i] = {
                    text: String((minutes < 10 ? '0' : '') + minutes),
                    value: minutes
                };
            }
        },
        getTimeText = function example_getTimeText(timeElementIndex) {
            var miniuteDivision = timeElementIndex % 4,
                hour = Math.floor(timeElementIndex / 4);

            return hour + ':' + subdivisions[miniuteDivision].text;
        },
        generateRandomAppointment = function example_generateRandomAppointment() {
            var startHour = Math.floor(Math.random() * (hoursPerDay - 1)),
                startMinutes = Math.floor(Math.random() * numberOfSubdivisionsPerHour),
                start = startHour + (startMinutes / numberOfSubdivisionsPerHour),
                remainingTime = hoursPerDay - start,
                end = Math.min(hoursPerDay, start + Math.max((Math.floor(Math.random() * remainingTime)), (1 / numberOfSubdivisionsPerHour)));

            return {
                start: start,
                end: end
            };
        },
        generateRandomSchedule = function example_generateRandomSchedule() {
            var i;

            numberOfAppointments = parseInt(htmlElements.exampleNumberOfAppointmentsInput.value, 10);
            appointments = [];

            for (i = 0; i < numberOfAppointments; ++i) {
                appointments.push(generateRandomAppointment());
            }

            tiling = window.calendarTiler.tileAppointments(appointments);

            for (i = 0; i < numberOfAppointments; ++i) {
                console.log(tiling.x[i] + ' - ' + tiling.dx[i]);
            }
        },
        initialize = function example_initialize() {
            var i,
                timeElement;

            generateMinuteDivisions();

            for (i = 0; i < totalNumberOfSubdivisions; ++i) {
                timeElement = document.createElement('div');
                timeElement.classList.add('example-time');
                timeElement.innerHTML = getTimeText(i);
                htmlElements.exampleTimes.appendChild(timeElement);
            }

            htmlElements.exampleNumberOfAppointmentsInput.value = numberOfAppointments;
            htmlElements.exampleNumberOfAppointmentsButton.onclick = generateRandomSchedule;
            generateRandomSchedule();
        };

    initialize();
}());
