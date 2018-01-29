/*global window, document, console*/
(function () {
    'use strict';

    var hoursPerDay = 24,
        minutesPerHour = 60,
        numberOfSubdivisionsPerHour = 4,
        totalNumberOfSubdivisions = hoursPerDay * numberOfSubdivisionsPerHour,
        htmlElements = {
            exampleTimes: document.getElementById('example-times')
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
        drawExampleTimes = function example_drawExampleTimes() {
            var i,
                timeElement;

            generateMinuteDivisions();

            for (i = 0; i < totalNumberOfSubdivisions; ++i) {
                timeElement = document.createElement('div');
                timeElement.classList.add('example-time');
                timeElement.innerHTML = getTimeText(i);
                htmlElements.exampleTimes.appendChild(timeElement);
            }
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
        initializeAppointments = function example_fillAppointments() {
            var i;

            appointments = [];

            for (i = 0; i < numberOfAppointments; ++i) {
                appointments.push(generateRandomAppointment());
            }
        },
        renderAppointmentsToScreen = function example_renderAppointmentsToScreen() {
            var i;

            for (i = 0; i < numberOfAppointments; ++i) {
                console.log(tiling.x[i] + ' - ' + tiling.dx[i]);
            }
        };

    drawExampleTimes();
    initializeAppointments();
    tiling = window.calendarTiler.tileAppointments(appointments);
    renderAppointmentsToScreen();
}());
